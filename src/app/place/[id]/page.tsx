import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_PLACES, getPlace } from "@/data";
import { ACTIVITY_MAP } from "@/lib/activities";
import { formatMonth } from "@/lib/format";
import { haversineKm } from "@/lib/geo";
import type { NearbyResult } from "@/lib/discover";
import PlaceGuide from "@/app/components/PlaceGuide";
import VisitedButton from "@/app/components/VisitedButton";
import GettingThere from "@/app/components/GettingThere";
import PlaceImage from "@/app/components/PlaceImage";

export function generateStaticParams() {
  return ALL_PLACES.map((p) => ({ id: p.id }));
}

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const place = getPlace(id);
  if (!place) notFound();

  const nearby: NearbyResult[] = ALL_PLACES.filter((p) => p.id !== place.id)
    .map((p) => ({ place: p, distanceKm: haversineKm(place.lat, place.lng, p.lat, p.lng) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 6);

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/" className="text-sm text-slate-400 hover:text-white">
        ← Back to discover
      </Link>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800">
        <PlaceImage
          placeId={place.id}
          placeName={place.name}
          emoji={ACTIVITY_MAP[place.activities[0]]?.emoji ?? "🧭"}
          heightClass="h-56 sm:h-72"
        />
      </div>

      <header className="mt-6">
        <div className="text-sm text-slate-500">
          {place.region} · {place.country} · {place.kind}
        </div>
        <h1 className="mt-1 text-4xl font-bold tracking-tight">{place.name}</h1>
        <p className="mt-3 max-w-2xl text-slate-300">{place.blurb}</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="mr-2">
          <VisitedButton place={place} />
        </span>
        {place.activities.map((a) => {
          const def = ACTIVITY_MAP[a];
          return (
            <Link
              key={a}
              href={`/?activity=${a}`}
              className="rounded-full border border-slate-700 px-3 py-1 text-sm hover:border-emerald-500 hover:text-emerald-400"
            >
              {def ? `${def.emoji} ${def.label}` : a}
            </Link>
          );
        })}
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Best months</dt>
          <dd className="mt-1 text-sm">
            {place.bestMonths.map(formatMonth).join(", ")}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Crowd level</dt>
          <dd className="mt-1 text-sm">
            {place.popularity >= 80 ? "Very popular" : place.popularity >= 50 ? "Popular" : "Hidden gem"}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-500">On-site costs</dt>
          <dd className="mt-1 text-sm">
            {place.costTier <= 2 ? "Budget-friendly once you're there" : place.costTier === 3 ? "Moderate prices on the ground" : "Pricier destination once you're there"}
          </dd>
        </div>
      </dl>

      <GettingThere place={place} />

      <a
        href={mapUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-block rounded-lg bg-emerald-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
      >
        Open in Google Maps ↗
      </a>

      <PlaceGuide details={place.details ?? {}} />

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Closest other places</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nearby.map(({ place: p, distanceKm }) => (
            <Link
              key={p.id}
              href={`/place/${p.id}`}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-emerald-500"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">{p.name}</h3>
                <span className="text-xs text-slate-400">{Math.round(distanceKm)} km</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{p.country} · {p.kind}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
