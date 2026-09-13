import Link from "next/link";
import { ALL_PLACES, REGIONS } from "@/data";
import { ACTIVITY_MAP } from "@/lib/activities";
import { activityCounts, topAndHidden } from "@/lib/discover";
import PlaceCard from "./components/PlaceCard";
import NearYou from "./components/NearYou";

export default function HomePage() {
  const { top, hidden } = topAndHidden();
  const counts = activityCounts();
  const topActivities = Object.values(ACTIVITY_MAP)
    .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="text-center py-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Plan your next adventure
        </h1>
        <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
          {ALL_PLACES.length} places — from the waterfalls down the road to the
          far side of the world. Filter by what you love doing.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/explore"
            className="rounded-lg bg-emerald-500 px-6 py-3 font-medium text-slate-950 hover:bg-emerald-400"
          >
            Explore everything
          </Link>
          <Link
            href="/explore?activity=waterfalls"
            className="rounded-lg border border-slate-700 px-6 py-3 font-medium hover:border-emerald-500 hover:text-emerald-400"
          >
            💦 Find waterfalls
          </Link>
        </div>
      </section>

      <section className="py-8">
        <h2 className="text-xl font-semibold mb-4">What do you feel like doing?</h2>
        <div className="flex flex-wrap gap-2">
          {topActivities.map((a) => (
            <Link
              key={a.id}
              href={`/explore?activity=${a.id}`}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm hover:border-emerald-500 hover:text-emerald-400"
            >
              {a.emoji} {a.label}
              <span className="ml-1.5 text-xs text-slate-500">{counts[a.id] ?? 0}</span>
            </Link>
          ))}
        </div>
      </section>

      <NearYou />

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Top destinations worldwide</h2>
          <Link href="/explore" className="text-sm text-emerald-400 hover:text-emerald-300">
            See all →
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Hidden gems</h2>
        <p className="mt-1 text-sm text-slate-400">
          Low-key spots the crowds haven't found yet.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hidden.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Browse by region</h2>
        <div className="flex flex-wrap gap-3">
          {REGIONS.map((r) => (
            <Link
              key={r}
              href={`/explore?region=${encodeURIComponent(r)}`}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm hover:border-emerald-500 hover:text-emerald-400"
            >
              {r}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
