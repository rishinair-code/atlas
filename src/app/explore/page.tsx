import Link from "next/link";
import { ALL_PLACES, REGIONS } from "@/data";
import { ACTIVITY_MAP, activityEmoji, activityLabel } from "@/lib/activities";
import { formatMonth } from "@/lib/format";
import { activityCounts } from "@/lib/discover";
import { haversineKm } from "@/lib/geo";
import type { ActivityId, PlaceKind } from "@/lib/types";
import LocationPicker from "../components/LocationPicker";
import AutoSelect from "../components/AutoSelect";
import LiveResults from "../components/LiveResults";

export const metadata = { title: "Explore — Atlas" };

const RADIUS_OPTIONS = [50, 150, 400, 1000];
const SORT_OPTIONS = ["distance", "popularity", "budget"] as const;
type SortKey = (typeof SORT_OPTIONS)[number];

const KIND_LABELS: Record<PlaceKind, string> = {
  city: "City",
  town: "Town",
  village: "Village",
  island: "Island",
  "national-park": "National park",
  landmark: "Landmark",
  waterfall: "Waterfall",
  nature: "Nature area",
  beach: "Beach",
  mountain: "Mountain",
  lake: "Lake",
  desert: "Desert",
  ruins: "Ruins",
  resort: "Resort",
};

interface ExploreProps {
  region?: string;
  q?: string;
  activity?: string;
  kind?: string;
  maxTier?: string;
  lat?: string;
  lng?: string;
  radius?: string;
  sort?: string;
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<ExploreProps>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().toLowerCase();
  const activity = sp.activity && sp.activity in ACTIVITY_MAP ? sp.activity : undefined;
  const kind = sp.kind && sp.kind in KIND_LABELS ? sp.kind : undefined;
  const maxTier = [1, 2, 3, 4, 5].includes(Number(sp.maxTier))
    ? Number(sp.maxTier)
    : undefined;
  const hasLocation =
    sp.lat !== undefined && sp.lng !== undefined && sp.lat !== "" && sp.lng !== "";
  const lat = hasLocation ? Number(sp.lat) : null;
  const lng = hasLocation ? Number(sp.lng) : null;
  const radius = [50, 150, 400, 1000].includes(Number(sp.radius))
    ? Number(sp.radius)
    : 150;
  const sort: SortKey = SORT_OPTIONS.includes(sp.sort as SortKey)
    ? (sp.sort as SortKey)
    : hasLocation
      ? "distance"
      : "popularity";

  let results = ALL_PLACES.map((place) => ({
    place,
    distanceKm:
      lat !== null && lng !== null
        ? haversineKm(lat, lng, place.lat, place.lng)
        : null,
  }));

  if (hasLocation) results = results.filter((r) => (r.distanceKm ?? 0) <= radius);
  if (sp.region && (REGIONS as readonly string[]).includes(sp.region))
    results = results.filter((r) => r.place.region === sp.region);
  if (activity)
    results = results.filter((r) => r.place.activities.includes(activity as ActivityId));
  if (kind) results = results.filter((r) => r.place.kind === kind);
  if (maxTier) results = results.filter((r) => r.place.costTier <= maxTier);
  if (query)
    results = results.filter(
      (r) =>
        r.place.name.toLowerCase().includes(query) ||
        r.place.country.toLowerCase().includes(query) ||
        r.place.blurb.toLowerCase().includes(query),
    );

  results.sort((a, b) => {
    if (sort === "distance") return (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9);
    if (sort === "budget")
      return a.place.costTier - b.place.costTier || (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
    return b.place.popularity - a.place.popularity;
  });
  results = results.slice(0, 90);

  const counts = activityCounts();
  const keep: Record<string, string> = {};
  if (activity) keep.activity = activity;
  if (kind) keep.kind = kind;
  if (maxTier) keep.maxTier = String(maxTier);
  if (sp.region) keep.region = sp.region;
  if (query) keep.q = query;
  if (hasLocation) {
    keep.lat = String(sp.lat);
    keep.lng = String(sp.lng);
    keep.radius = String(radius);
  }
  const keepQS = new URLSearchParams(keep).toString();

  function pageHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(keep);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    }
    return `/explore?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Explore destinations</h1>
      <p className="mt-2 text-slate-400">
        {ALL_PLACES.length} places — filter by activity, type, budget, and how
    far you&apos;re willing to go.
      </p>

      {/* Location */}
      <div className="mt-5">
        <LocationPicker
          lat={sp.lat}
          lng={sp.lng}
          radius={String(radius)}
          keepParams={Object.fromEntries(
            Object.entries({ activity, kind, region: sp.region, q: sp.q, maxTier: maxTier ? String(maxTier) : undefined }).filter(
              ([, v]) => v !== undefined,
            ) as [string, string][],
          )}
        />
      </div>

      {/* Search box (GET form — works without JS) */}
      <form className="mt-3 flex flex-wrap gap-2" action="/explore" method="get">
        {activity && <input type="hidden" name="activity" value={activity} />}
        {kind && <input type="hidden" name="kind" value={kind} />}
        {maxTier && <input type="hidden" name="maxTier" value={maxTier} />}
        {sp.region && <input type="hidden" name="region" value={sp.region} />}
        {hasLocation && (
          <>
            <input type="hidden" name="lat" value={sp.lat} />
            <input type="hidden" name="lng" value={sp.lng} />
            <input type="hidden" name="radius" value={radius} />
          </>
        )}
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search places, countries…"
          className="flex-1 min-w-56 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
        >
          Search
        </button>
      </form>

      {/* Activity chips */}
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link
          href={pageHref({ activity: undefined })}
          className={`rounded-full px-3 py-1 border ${
            !activity ? "border-emerald-500 text-emerald-400" : "border-slate-700"
          }`}
        >
          All activities
        </Link>
        {Object.values(ACTIVITY_MAP).map((a) => (
          <Link
            key={a.id}
            href={pageHref({ activity: a.id })}
            className={`rounded-full px-3 py-1 border ${
              activity === a.id
                ? "border-emerald-500 text-emerald-400"
                : "border-slate-700 hover:border-slate-500"
            }`}
          >
            {a.emoji} {a.label}
            <span className="ml-1 text-xs text-slate-500">{counts[a.id] ?? 0}</span>
          </Link>
        ))}
      </div>

      {/* Type + budget + sort + region rows */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Type</span>
          <form action="/explore" method="get" className="inline">
            {Object.entries(keep)
              .filter(([k]) => k !== "kind")
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <AutoSelect
              name="kind"
              defaultValue={kind ?? ""}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
            >
              <option value="">Any type</option>
              {(Object.keys(KIND_LABELS) as PlaceKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </AutoSelect>
          </form>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Max budget</span>
          <form action="/explore" method="get" className="inline">
            {Object.entries(keep)
              .filter(([k]) => k !== "maxTier")
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <AutoSelect
              name="maxTier"
              defaultValue={maxTier ? String(maxTier) : ""}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
            >
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((t) => (
                <option key={t} value={t}>
                  {"$".repeat(t)} or less
                </option>
              ))}
            </AutoSelect>
          </form>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Sort</span>
          <form action="/explore" method="get" className="inline">
            {Object.entries(keep)
              .filter(([k]) => k !== "sort")
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <AutoSelect
              name="sort"
              defaultValue={sort}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
            >
              {hasLocation && <option value="distance">Closest first</option>}
              <option value="popularity">Most popular</option>
              <option value="budget">Cheapest first</option>
            </AutoSelect>
          </form>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Region</span>
          <Link
            href={pageHref({ region: undefined })}
            className={`rounded-full px-3 py-1 border ${
              !sp.region ? "border-emerald-500 text-emerald-400" : "border-slate-700"
            }`}
          >
            All
          </Link>
          {REGIONS.map((r) => (
            <Link
              key={r}
              href={pageHref({ region: r })}
              className={`rounded-full px-3 py-1 border ${
                sp.region === r
                  ? "border-emerald-500 text-emerald-400"
                  : "border-slate-700 hover:border-slate-500"
              }`}
            >
              {r}
            </Link>
          ))}
        </div>
        {hasLocation && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Radius</span>
            {RADIUS_OPTIONS.map((r) => (
              <Link
                key={r}
                href={pageHref({ radius: String(r) })}
                className={`rounded-full px-3 py-1 border ${
                  radius === r
                    ? "border-emerald-500 text-emerald-400"
                    : "border-slate-700 hover:border-slate-500"
                }`}
              >
                {r} km
              </Link>
            ))}
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-500">
        {results.length} result{results.length === 1 ? "" : "s"}
        {hasLocation ? ` within ${radius} km` : ""}
      </p>

      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map(({ place, distanceKm }) => (
          <div key={place.id} className="relative">
            <Link
              href={`/place/${place.id}`}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col hover:border-emerald-500 transition-colors h-full"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{place.name}</h2>
                  <div className="text-xs text-slate-500">
                    {place.country} · {KIND_LABELS[place.kind]}
                  </div>
                </div>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300 whitespace-nowrap">
                  ≈${place.costTier * 20}/day
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400 flex-1">{place.blurb}</p>
              <div className="mt-3 text-xs text-slate-500">
                Best: {place.bestMonths.slice(0, 4).map(formatMonth).join(", ")}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {place.activities.slice(0, 4).map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                  >
                    {activityEmoji(a)} {activityLabel(a)}
                  </span>
                ))}
              </div>
            </Link>
            {distanceKm !== null && (
              <span className="absolute right-3 top-3 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                {distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km
              </span>
            )}
          </div>
        ))}
      </div>

      {results.length === 0 && (
        <p className="mt-10 text-center text-slate-500">
          No curated places match here — the live map below still has you
          covered. Try removing a filter, too.
        </p>
      )}

      {/* Live OpenStreetMap results for the same location + activity — the
          curated dataset is deliberately small, so the real world fills in
          the gaps (e.g. museums in Hamilton, beaches in Miami). */}
      {hasLocation && lat !== null && lng !== null && !kind && !maxTier && (
        <LiveResults
          lat={lat}
          lng={lng}
          category={activity ?? ""}
          radiusKm={radius}
          excludeNames={results.map((r) => r.place.name)}
        />
      )}
    </div>
  );
}
