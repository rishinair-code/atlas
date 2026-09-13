import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const OVERPASS_ENDPOINTS = [
  // Kumi Systems public mirror first — it is usually faster and less
  // loaded than the main instance, which 504s under load.
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  // Official main instance — third cab off the rank.
  "https://overpass.private.coffee/api/interpreter",
];
const OVERPASS_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  // Overpass's front proxy 406s requests without a descriptive UA / Accept.
  "User-Agent": "AtlasTravelApp/0.1 (personal travel planner)",
  Accept: "application/json",
};

/** Activity id → OSM tag selectors (OR'd together). */
const CATEGORY_FILTERS: Record<string, string[]> = {
  beach: ['["natural"="beach"]', '["leisure"="beach_resort"]'],
  hiking: ['["highway"="trail"]', '["natural"="peak"]', '["route"="hiking"]'],
  architecture: ['["historic"="castle"]', '["historic"="monument"]', '["building"="cathedral"]'],
  food: ['["amenity"="marketplace"]', '["amenity"="restaurant"]["cuisine"]'],
  museums: ['["tourism"="museum"]', '["tourism"="gallery"]'],
  nightlife: ['["amenity"="nightclub"]', '["amenity"="bar"]["brewery"]'],
  nature: ['["natural"="waterfall"]', '["natural"="canyon"]', '["leisure"="park"]'],
  wildlife: ['["tourism"="zoo"]', '["leisure"="nature_reserve"]'],
  winter: ['["amenity"="ski_school"]', '["piste:type"]'],
  wellness: ['["leisure"="spa"]', '["amenity"="public_bath"]', '["natural"="hot_spring"]'],
  shopping: ['["shop"="mall"]', '["amenity"="marketplace"]'],
  culture: ['["historic"="temple"]', '["amenity"="place_of_worship"]', '["historic"="ruins"]'],
  adventure: ['["start_date"]["sport"="climbing"]', '["leisure"="water_park"]', '["aeroway"="aerodrome"]["sport"]'],
  romantic: ['["tourism"="viewpoint"]', '["natural"="beach"]'],
  family: ['["tourism"="aquarium"]', '["tourism"="theme_park"]'],
  cycling: ['["cycleway"]', '["route"="bicycle"]', '["amenity"="bicycle_rental"]'],
  boating: ['["leisure"="marina"]', '["amenity"="ferry_terminal"]', '["harbour"]'],
  swimming: ['["leisure"="swimming_pool"]["access"!="no"]', '["natural"="beach"]', '["sport"="swimming"]'],
};

/**
 * Extras for activities whose OSM coverage needs broadening:
 * "beach"/"swimming" include waterfront features so cities whose shoreline is
 * tagged as water/promenade rather than natural=beach still return results.
 */
const CATEGORY_EXTRA: Record<string, string[]> = {
  beach: ['["leisure"="marina"]'],
  swimming: ['["leisure"="marina"]'],
};

/**
 * Used when an unknown category is requested — deliberately narrow, since
 * wide historic/natural queries time out on Overpass.
 */
const FALLBACK: string[] = ['["tourism"="attraction"]', '["natural"="peak"]'];

/**
 * No category at all ("show me anything interesting") — curated shortlist of
 * high-signal, fast-resolving features rather than everything with a name.
 */
const ANYTHING_FILTERS: string[] = [
  '["tourism"="attraction"]',
  '["tourism"="museum"]',
  '["tourism"="viewpoint"]',
  '["historic"="castle"]',
  '["historic"="monument"]',
  '["leisure"="park"]',
  '["natural"="beach"]',
  '["natural"="peak"]',
  '["waterway"="waterfall"]',
];

/** Overpass radius cap in metres — larger queries time out. */
const RADIUS_CAP_M = 100_000;

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** GET /api/places/nearby?lat=..&lng=..&category=beach&radius=30000 (metres) */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const lat = parseFloat(sp.get("lat") ?? "");
  const lng = parseFloat(sp.get("lng") ?? "");
  const category = sp.get("category") ?? "";
  const radius = Math.min(RADIUS_CAP_M, Math.max(1000, parseInt(sp.get("radius") ?? "20000", 10)));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  // Resolve the activity id to a deduped list of tag selectors.
  const base = CATEGORY_FILTERS[category] ?? [];
  const extra = CATEGORY_EXTRA[category] ?? [];
  const tags = [...new Set([...base, ...extra])];
  if (tags.length === 0) {
    // No (or unknown) category → "anything interesting" mode.
    tags.push(...(category ? FALLBACK : ANYTHING_FILTERS));
  }

  const around = `(around:${radius},${lat},${lng})`;
  // Explicit node/way/relation statements — the `nwr` shorthand times out on
  // the main instance. Each tag-selector becomes three OR'd clauses.
  const clauses = tags.map((tag) => `node${around}${tag};way${around}${tag};relation${around}${tag};`).join("");
  const query = `[out:json][timeout:25];(${clauses});out center 60;`;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** One fetch attempt against a single endpoint. */
  const attempt = async (query: string, endpoint: string) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: OVERPASS_HEADERS,
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(40_000),
    });
    if (!res.ok) throw new Error(`overpass ${res.status}`);
    return (await res.json()) as { elements: OverpassElement[] };
  };

  /** Race every mirror; on total failure, pause and retry the race once. */
  async function runOverpass(query: string) {
    try {
      return await Promise.any(OVERPASS_ENDPOINTS.map((e) => attempt(query, e)));
    } catch (firstErr) {
      // Mirrors often fail transiently under load — one round of retries
      // rescues most otherwise-empty responses.
      await sleep(4_000);
      try {
        return await Promise.any(OVERPASS_ENDPOINTS.map((e) => attempt(query, e)));
      } catch {
        throw firstErr;
      }
    }
  }

  try {
    const json = await runOverpass(query);

    const toPois = (elements: OverpassElement[]) => {
      const seen = new Set<string>();
      return elements
        .map((e) => {
          const c = e.center ?? { lat: e.lat!, lon: e.lon! };
          const name = e.tags?.["name:en"] ?? e.tags?.name;
          return {
            id: `${e.type}/${e.id}`,
            name,
            lat: c.lat,
            lng: c.lon,
            kind:
              e.tags?.leisure ??
              e.tags?.tourism ??
              e.tags?.historic ??
              e.tags?.natural ??
              e.tags?.amenity ??
              "attraction",
          };
        })
        .filter((p) => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .filter((p) => {
          const key = p.name!.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    };

    let pois = toPois(json.elements);

    // Sparse activity coverage (e.g. small cities) — broaden with any named
    // tourism/historic feature in the radius so the section is never empty.
    if (pois.length < 8) {
      const broad = `(around:${radius},${lat},${lng})`;
      const broadTags = ['["name"]["tourism"]', '["name"]["historic"]'];
      const broadClauses = broadTags
        .map((tag) => `node${broad}${tag};way${broad}${tag};relation${broad}${tag};`)
        .join("");
      const broadQuery = `[out:json][timeout:20];(${broadClauses});out center 40;`;
      try {
        const broadJson = await runOverpass(broadQuery);
        const merged = [...toPois(broadJson.elements), ...pois];
        const seen = new Set<string>();
        pois = merged.filter((p) => {
          const key = p.name!.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      } catch {
        // Broadening is best-effort; return what we have.
      }
    }

    pois = pois.slice(0, 40);

      return NextResponse.json(
        { pois },
        { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } },
      );
  } catch (err) {
    const lastError = err instanceof AggregateError
      ? err.errors.map((e) => (e instanceof Error ? e.message : "overpass failed")).join("; ")
      : err instanceof Error
        ? err.message
        : "overpass failed";
    return NextResponse.json({ error: lastError, pois: [] }, { status: 502 });
  }
}
