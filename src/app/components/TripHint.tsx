"use client";

import { useEffect, useState } from "react";
import type { Place } from "@/lib/types";
import { loadLocation } from "@/lib/location";
import { estimateTravel, formatHours, type TravelEstimate } from "@/lib/tripEstimate";

/**
 * Reads the persisted location and renders a real "how do I get there"
 * estimate. Renders nothing until the user has a location set.
 */
export function useTravelEstimate(place: Place): TravelEstimate | null {
  const [estimate, setEstimate] = useState<TravelEstimate | null>(null);

  useEffect(() => {
    const loc = loadLocation();
    setEstimate(loc ? estimateTravel(place, loc) : null);
  }, [place]);

  return estimate;
}

/**
 * Compact transport hint for cards — e.g. "🚗 63 km · ~$14 · 1h 5m".
 */
export default function TripHint({ place }: { place: Place }) {
  const estimate = useTravelEstimate(place);
  if (!estimate) return null;

  const best = estimate.modes.find((m) => m.mode === estimate.best && m.feasible);
  if (!best) return null;

  return (
    <span
      title={`${estimate.originName} → ${place.name}\n${best.label}: ≈$${best.cost} · ${best.timeLabel} · ${best.costNote}`}
      className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-emerald-300 whitespace-nowrap"
    >
      {best.emoji} {best.distanceKm >= 100 ? Math.round(best.distanceKm) : best.distanceKm} km · ${best.cost} · {best.timeLabel}
    </span>
  );
}
