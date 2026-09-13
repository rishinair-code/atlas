import Link from "next/link";
import { ALL_PLACES, REGIONS } from "@/data";
import { activityLabel } from "@/lib/activities";

export default function HomePage() {
  const featured = ALL_PLACES.slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="text-center py-10">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Plan your next adventure
        </h1>
        <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
          Discover places, plan weather-aware itineraries, budget every trip, and
          keep a lifetime travel timeline.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/explore"
            className="rounded-lg bg-emerald-500 px-6 py-3 font-medium text-slate-950 hover:bg-emerald-400"
          >
            Start exploring
          </Link>
        </div>
      </section>

      <section className="py-10">
        <h2 className="text-xl font-semibold mb-6">Featured destinations</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((place) => (
            <article
              key={place.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="text-xs text-slate-500">
                {place.country} · {place.kind}
              </div>
              <h3 className="mt-1 font-semibold">{place.name}</h3>
              <p className="mt-2 text-sm text-slate-400 line-clamp-2">{place.blurb}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {place.activities.slice(0, 3).map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                  >
                    {activityLabel(a)}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="py-10">
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
