"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ActivityId } from "@/lib/types";
import { ALL_PLACES } from "@/data";
import { haversineKm } from "@/lib/geo";
import { ACTIVITY_MAP } from "@/lib/activities";

const RADIUS_OPTIONS = [50, 150, 400];

const CITY_PRESETS: { label: string; lat: number; lng: number }[] = [
  { label: "Hamilton", lat: 43.2563, lng: -79.8689 },
  { label: "Toronto", lat: 43.6532, lng: -79.3832 },
  { label: "Ottawa", lat: 45.4215, lng: -75.6972 },
  { label: "Montréal", lat: 45.5017, lng: -73.5673 },
  { label: "New York", lat: 40.7128, lng: -74.006 },
  { label: "Vancouver", lat: 49.2827, lng: -123.1207 },
];

export default function NearYou() {
  const [point, setPoint] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [radiusKm, setRadiusKm] = useState(150);
  const [activity, setActivity] = useState<ActivityId | "">("");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(false);

  const results = useMemo(() => {
    if (!point) return [];
    return ALL_PLACES.map((place) => ({
      place,
      distanceKm: haversineKm(point.lat, point.lng, place.lat, place.lng),
    }))
      .filter((r) => r.distanceKm <= radiusKm)
      .filter((r) => (activity ? r.place.activities.includes(activity) : true))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 12);
  }, [point, radiusKm, activity]);

  function locate() {
    setLocating(true);
    setLocError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPoint({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "your location",
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocError(true);
      },
      { timeout: 8000 },
    );
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold">Near you</h2>
      <p className="mt-1 text-sm text-slate-400">
        Waterfalls, trails and escapes within a road-trip radius.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={locate}
          disabled={locating}
          className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {locating ? "Locating…" : "📍 Use my location"}
        </button>
        {CITY_PRESETS.map((c) => (
          <button
            key={c.label}
            onClick={() => setPoint({ lat: c.lat, lng: c.lng, label: c.label })}
            className={`rounded-full px-3 py-1 border ${
              point?.label === c.label
                ? "border-emerald-500 text-emerald-400"
                : "border-slate-700 hover:border-slate-500"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {locError && (
        <p className="mt-2 text-xs text-amber-400">
          Location unavailable — pick a city below instead.
        </p>
      )}

      {point && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Radius:</span>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`rounded-full px-3 py-1 border ${
                  radiusKm === r
                    ? "border-emerald-500 text-emerald-400"
                    : "border-slate-700 hover:border-slate-500"
                }`}
              >
                {r} km
              </button>
            ))}
            <span className="ml-3 text-slate-500">Activity:</span>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityId | "")}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
            >
              <option value="">Everything</option>
              {Object.values(ACTIVITY_MAP).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.emoji} {a.label}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            {results.length} place{results.length === 1 ? "" : "s"} within {radiusKm} km of{" "}
            {point.label}
          </p>

          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(({ place, distanceKm }) => (
              <Link
                key={place.id}
                href={`/place/${place.id}`}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-emerald-500"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{place.name}</h3>
                  <span className="text-xs text-emerald-400 whitespace-nowrap">
                    {distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {place.country} · {place.kind}
                </p>
                <p className="mt-2 text-sm text-slate-400 line-clamp-2">{place.blurb}</p>
              </Link>
            ))}
          </div>

          {results.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">
              Nothing within {radiusKm} km — try a bigger radius or a different activity.
            </p>
          )}
        </>
      )}
    </section>
  );
}
