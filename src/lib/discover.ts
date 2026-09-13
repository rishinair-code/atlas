import type { ActivityId, Place } from "./types";
import { ALL_PLACES } from "@/data";
import { haversineKm } from "./geo";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Places matching an activity, most popular first. */
export function placesByActivity(activity: ActivityId): Place[] {
  return ALL_PLACES.filter((p) => p.activities.includes(activity)).sort(
    (a, b) => b.popularity - a.popularity,
  );
}

/** How many places offer each activity — drives the filter chips' counts. */
export function activityCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of ALL_PLACES) {
    for (const a of p.activities) {
      counts[a] = (counts[a] ?? 0) + 1;
    }
  }
  return counts;
}

export interface NearbyOptions {
  /** Km radius; defaults to 150. */
  radiusKm?: number;
  /** Only include places tagged with this activity. */
  activity?: ActivityId;
  limit?: number;
}

export interface NearbyResult {
  place: Place;
  distanceKm: number;
}

/** Places within radiusKm of a point, closest first. */
export function placesNear(point: LatLng, options: NearbyOptions = {}): NearbyResult[] {
  const { radiusKm = 150, activity, limit = 24 } = options;
  return ALL_PLACES.map((place) => ({
    place,
    distanceKm: haversineKm(point.lat, point.lng, place.lat, place.lng),
  }))
    .filter((r) => r.distanceKm <= radiusKm)
    .filter((r) => (activity ? r.place.activities.includes(activity) : true))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

/** High-signal picks: famous spots plus low-popularity hidden gems. */
export function topAndHidden(): { top: Place[]; hidden: Place[] } {
  const sorted = [...ALL_PLACES].sort((a, b) => b.popularity - a.popularity);
  return {
    top: sorted.slice(0, 12),
    hidden: [...sorted].reverse().slice(0, 6),
  };
}
