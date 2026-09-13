import Link from "next/link";
import { ALL_PLACES, REGIONS } from "@/data";
import { ACTIVITY_MAP, activityEmoji, activityLabel } from "@/lib/activities";
import { formatMonth } from "@/lib/format";
import { activityCounts } from "@/lib/discover";

export const metadata = { title: "Explore — Atlas" };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; q?: string; activity?: string }>;
}) {
  const { region, q, activity } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  let places = ALL_PLACES;
  if (region && (REGIONS as readonly string[]).includes(region)) {
    places = places.filter((p) => p.region === region);
  }
  if (activity && activity in ACTIVITY_MAP) {
    places = places.filter((p) => p.activities.includes(activity as never));
  }
  if (query) {
    places = places.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.country.toLowerCase().includes(query) ||
        p.blurb.toLowerCase().includes(query),
    );
  }
  places = [...places].sort((a, b) => b.popularity - a.popularity).slice(0, 90);

  const counts = activityCounts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Explore destinations</h1>
      <p className="mt-2 text-slate-400">
        {ALL_PLACES.length} places — filter by activity, region, or search.
      </p>

      <form className="mt-6 flex flex-wrap gap-2" action="/explore">
        {activity && <input type="hidden" name="activity" value={activity} />}
        {region && <input type="hidden" name="region" value={region} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
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

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link
          href="/explore"
          className={`rounded-full px-3 py-1 border ${
            !activity ? "border-emerald-500 text-emerald-400" : "border-slate-700"
          }`}
        >
          All activities
        </Link>
        {Object.values(ACTIVITY_MAP).map((a) => (
          <Link
            key={a.id}
            href={`/explore?activity=${a.id}${region ? `&region=${encodeURIComponent(region)}` : ""}`}
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

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <Link
          href={`/explore${activity ? `?activity=${activity}` : ""}`}
          className={`rounded-full px-3 py-1 border ${
            !region ? "border-emerald-500 text-emerald-400" : "border-slate-700"
          }`}
        >
          All regions
        </Link>
        {REGIONS.map((r) => (
          <Link
            key={r}
            href={`/explore?${activity ? `activity=${activity}&` : ""}region=${encodeURIComponent(r)}`}
            className={`rounded-full px-3 py-1 border ${
              region === r ? "border-emerald-500 text-emerald-400" : "border-slate-700 hover:border-slate-500"
            }`}
          >
            {r}
          </Link>
        ))}
      </div>

      <p className="mt-6 text-xs text-slate-500">
        {places.length} result{places.length === 1 ? "" : "s"}
      </p>

      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <Link
            key={place.id}
            href={`/place/${place.id}`}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col hover:border-emerald-500 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{place.name}</h2>
                <div className="text-xs text-slate-500">
                  {place.country} · {place.region}
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
        ))}
      </div>

      {places.length === 0 && (
        <p className="mt-10 text-center text-slate-500">
          No places match. Try removing a filter.
        </p>
      )}
    </div>
  );
}
