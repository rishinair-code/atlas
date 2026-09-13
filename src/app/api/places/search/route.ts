import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    country?: string;
    state?: string;
    city?: string;
    postcode?: string;
    street?: string;
    extent?: number[];
  };
}

const PHOTON = "https://photon.komoot.io/api/";

/** GET /api/places/search?q=kyoto — global search down to villages via Photon (OSM-based, keyless). */
export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ results: [] });

  const url = `${PHOTON}?q=${encodeURIComponent(q)}&limit=10&lang=en`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`photon ${res.status}`);
    const json = (await res.json()) as { features?: PhotonFeature[] };

    const results = (json.features ?? [])
      .map((f) => {
        const p = f.properties;
        const [lng, lat] = f.geometry.coordinates;
        const parts = [p.name, p.state, p.country].filter(Boolean);
        return {
          id: `${(p.osm_type ?? "n").toLowerCase()}-${p.osm_id ?? 0}`,
          name: p.name ?? "Unknown",
          displayName: parts.join(", "),
          lat,
          lng,
          type: p.osm_value ?? "",
          category: p.osm_key ?? "",
        };
      })
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));

    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "search failed", results: [] },
      { status: 502 },
    );
  }
}
