import type { TransportMode } from "./types";
import { haversineKm } from "./geo";

/**
 * Travel estimates — how do I actually get there, and what does it cost?
 *
 * Unlike the abstract `costTier * 20/day` badge, these are grounded in
 * transport physics: road distance, fuel burn, average speeds and
 * distance-based fare models (shared with the trip-planner budget engine).
 *
 * All figures are rough one-way estimates for one traveler, meant for
 * comparison ("drive vs fly"), not ticket quotes.
 */

const FUEL_USD_PER_L = 1.65;
const LITERS_PER_100KM = 7.5;
/** What an hour of travel is "worth" when picking the best mode. */
const HOUR_VALUE_USD = 9;

/** Great-circle → approximate road distance factor. */
const ROAD_FACTOR = 1.25;

export interface TravelOrigin {
  name?: string;
  lat: number;
  lng: number;
}

export interface TravelModeEstimate {
  mode: TransportMode;
  label: string;
  emoji: string;
  /** One-way cost in USD for one traveler. */
  cost: number;
  /** What the cost is made of, e.g. "≈19 L fuel @ $1.65/L". */
  costNote: string;
  /** Door-to-door hours including airport/station overhead. */
  hours: number;
  /** Human time string, e.g. "4h 15m". */
  timeLabel: string;
  /** Road/rail distance used for cost+time. */
  distanceKm: number;
  feasible: boolean;
  /** Why it's not offered, when infeasible. */
  caveat?: string;
}

export interface TravelEstimate {
  originName: string;
  /** Straight-line km. */
  distanceKm: number;
  /** Estimated road km (distanceKm × 1.25) used for driving. */
  roadKm: number;
  modes: TravelModeEstimate[];
  /** Mode with the best cost+time blend, or null when no origin. */
  best: TransportMode | null;
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** 20-min break per ~4 h of driving, rounded humanely. */
function driveBreaks(hours: number): number {
  return Math.max(0, Math.floor(hours / 4));
}

export function estimateTravel(
  dest: { lat: number; lng: number },
  origin?: TravelOrigin | null,
): TravelEstimate | null {
  if (!origin) return null;

  const distanceKm = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
  const roadKm = Math.round(distanceKm * ROAD_FACTOR);
  const modes: TravelModeEstimate[] = [];

  // ── Drive ──────────────────────────────────────────────────────────────────
  {
    const liters = (roadKm / 100) * LITERS_PER_100KM;
    const fuelCost = liters * FUEL_USD_PER_L;
    // Tolls/parking/contingency, proportional with a small floor so short
    // day-trips aren't swamped by a flat fee.
    const tollsContingency = 3 + roadKm * 0.03;
    const pureHours = roadKm / 85; // mixed highway/rural average
    const hours = pureHours + driveBreaks(pureHours) * 0.33;
    const feasible = roadKm < 2000;
    modes.push({
      mode: "drive",
      label: "Drive",
      emoji: "🚗",
      cost: Math.round(fuelCost + tollsContingency),
      costNote: `≈${Math.round(liters)} L fuel @ $${FUEL_USD_PER_L.toFixed(2)}/L + tolls`,
      hours,
      timeLabel: formatHours(hours),
      distanceKm: roadKm,
      feasible,
      caveat: feasible
        ? roadKm > 800
          ? "long haul — plan an overnight stop"
          : undefined
        : "over 2,000 km — flying is saner",
    });
  }

  // ── Flight ─────────────────────────────────────────────────────────────────
  if (distanceKm > 150) {
    // Cruise ~780 km/h + climb/descent + 1.5 h airport overhead each way.
    const flightHours = distanceKm / 780 + 0.5;
    const hours = flightHours + 3;
    const fare =
      distanceKm <= 800
        ? 45 + distanceKm * 0.11
        : distanceKm <= 4000
          ? 70 + distanceKm * 0.085
          : 120 + distanceKm * 0.06;
    modes.push({
      mode: "flight",
      label: "Fly",
      emoji: "✈️",
      cost: Math.round(fare),
      costNote:
        distanceKm <= 800
          ? "short-haul fare estimate"
          : distanceKm <= 4000
            ? "medium-haul fare estimate"
            : "long-haul fare estimate",
      hours,
      timeLabel: formatHours(hours),
      distanceKm: Math.round(distanceKm),
      feasible: true,
      caveat: distanceKm < 400 ? "not faster than driving at this range" : undefined,
    });
  }

  // ── Train ──────────────────────────────────────────────────────────────────
  if (distanceKm < 1600) {
    const ratePerKm = distanceKm > 1500 ? 0.045 : distanceKm > 400 ? 0.07 : 0.09;
    const hours = distanceKm / 110 + 1; // avg speed incl. stops + station overhead
    modes.push({
      mode: "train",
      label: "Train",
      emoji: "🚆",
      cost: Math.round(12 + distanceKm * ratePerKm),
      costNote: "rail distance-rate estimate",
      hours,
      timeLabel: formatHours(hours),
      distanceKm: Math.round(distanceKm),
      feasible: distanceKm > 40,
      caveat: distanceKm <= 40 ? "too short — walk, bike or drive" : undefined,
    });
  }

  // ── Bus ────────────────────────────────────────────────────────────────────
  if (distanceKm < 900) {
    const ratePerKm = distanceKm > 1000 ? 0.035 : 0.05;
    const hours = distanceKm / 70 + 1;
    modes.push({
      mode: "bus",
      label: "Bus",
      emoji: "🚌",
      cost: Math.round(8 + distanceKm * ratePerKm),
      costNote: "coach fare estimate",
      hours,
      timeLabel: formatHours(hours),
      distanceKm: Math.round(distanceKm),
      feasible: distanceKm > 40,
      caveat: distanceKm <= 40 ? "too short to be useful" : undefined,
    });
  }

  // Best = cheapest when you value your time at $9/h.
  let best: TransportMode | null = null;
  let bestScore = Infinity;
  for (const m of modes) {
    if (!m.feasible) continue;
    const score = m.cost + m.hours * HOUR_VALUE_USD;
    if (score < bestScore) {
      bestScore = score;
      best = m.mode;
    }
  }

  return {
    originName: origin.name ?? "your location",
    distanceKm: Math.round(distanceKm),
    roadKm,
    modes,
    best,
  };
}
