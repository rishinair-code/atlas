"use client";

import { useEffect, useState } from "react";
import type { Place } from "@/lib/types";
import { loadLocation } from "@/lib/location";
import { estimateTravel, type TravelEstimate } from "@/lib/tripEstimate";

/**
 * "Getting there" panel — a per-mode comparison (drive / fly / train / bus)
 * with cost, time and what the cost is made of, anchored at the user's
 * saved location. Prompts to set a location when none exists.
 */
export default function GettingThere({ place }: { place: Place }) {
  const [estimate, setEstimate] = useState<TravelEstimate | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const loc = loadLocation();
    setEstimate(loc ? estimateTravel(place, loc) : null);
    setChecked(true);
  }, [place]);

  if (!checked) return null;

  if (!estimate) {
    return (
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
        <span className="font-medium text-slate-300">Getting there:</span> set your location on
        the <a href="/" className="text-emerald-400 hover:underline">home page</a> to see drive,
        flight, train and bus estimates from where you actually live.
      </div>
    );
  }

  const feasible = estimate.modes.filter((m) => m.feasible);
  feasible.sort((a, b) => a.cost - b.cost);

  return (
    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Getting there from {estimate.originName}
        </h2>
        <span className="text-xs text-slate-500">
          {estimate.distanceKm.toLocaleString()} km away · one-way, per person
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {feasible.map((m) => (
          <div
            key={m.mode}
            className={`rounded-lg border p-3 ${
              m.mode === estimate.best
                ? "border-emerald-500/60 bg-emerald-500/5"
                : "border-slate-700 bg-slate-950/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {m.emoji} {m.label}
              </span>
              {m.mode === estimate.best && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-400">
                  best value
                </span>
              )}
            </div>
            <div className="mt-2 text-lg font-semibold">${m.cost}</div>
            <div className="text-xs text-slate-400">{m.timeLabel} door to door</div>
            <div className="mt-1 text-[11px] leading-snug text-slate-500">{m.costNote}</div>
            {m.caveat && (
              <div className="mt-1 text-[11px] leading-snug text-amber-500/80">{m.caveat}</div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-slate-600">
        Rough estimates for comparison — straight-line distance × road factor for driving,
        distance-tier fare models for flights and rail. Driving includes ~20-min breaks every 4 h.
      </p>
    </div>
  );
}
