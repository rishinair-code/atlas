import type { VisitedEntry } from "./types";
import { haversineKm } from "./geo";

/**
 * Travel-footprint statistics — the "cool stats" behind /footprint.
 * Pure functions over VisitedEntry[] so they're trivially testable.
 */

/** ~40,075 km around the equator; used for "% of the way around Earth". */
const EARTH_CIRCUMFERENCE_KM = 40_075;
const EARTH_SURFACE_KM2 = 510_072_000;

export interface FootprintStats {
  count: number;
  countries: number;
  countryNames: string[];
  /** Total straight-line distance of the journey linking visits oldest → newest. */
  journeyKm: number;
  /** Longest single hop between consecutive visits. */
  longestHopKm: number;
  longestHop: { from: string; to: string; km: number } | null;
  /** If you walked the total distance: laps of the Earth / % of the way around. */
  earthLaps: number;
  worldWalkPercent: number;
  /** 100 km-radius circles around each visit, unioned, as % of Earth's surface. */
  worldCoveredPercent: number;
  northCount: number;
  southCount: number;
  /** Year of first (oldest) visit, when known. */
  firstYear: number | null;
  /** Northernmost / southernmost points visited. */
  extremes: {
    north: { name: string; lat: number } | null;
    south: { name: string; lat: number } | null;
    east: { name: string; lng: number } | null;
    west: { name: string; lng: number } | null;
  };
  ratingAvg: number | null;
}

/** Union area of same-radius circles via grid sampling — good enough for a stat card. */
function unionAreaKm2(
  points: { lat: number; lng: number }[],
  radiusKm: number,
  samplesPerCircle = 300,
): number {
  if (points.length === 0) return 0;
  const seen = new Set<string>();
  for (const p of points) {
    for (let i = 0; i < samplesPerCircle; i++) {
      const theta = (2 * Math.PI * i) / samplesPerCircle;
      const lat = p.lat + (radiusKm / 111) * Math.sin(theta) * 0.7;
      const lng =
        p.lng +
        ((radiusKm / (111 * Math.max(0.2, Math.cos((p.lat * Math.PI) / 180)))) * Math.cos(theta) * 0.7);
      const cell = `${lat.toFixed(2)},${lng.toFixed(2)}`;
      seen.add(cell);
    }
  }
  // Each grid cell (0.01° sampled at 0.7× density) ≈ (7.77 km)² × 0.49
  const cellArea = (radiusKm / 111 / (samplesPerCircle / (2 * Math.PI))) ** 2 * 3;
  return seen.size * cellArea;
}

export function computeFootprintStats(entries: VisitedEntry[]): FootprintStats {
  const sorted = [...entries].sort((a, b) => {
    const ad = a.date || String(a.year ?? "");
    const bd = b.date || String(b.year ?? "");
    return ad.localeCompare(bd);
  });

  const countrySet = new Set(sorted.map((e) => e.country));
  const ratings = sorted.map((e) => e.rating).filter((r): r is number => typeof r === "number");

  let journeyKm = 0;
  let longestHopKm = 0;
  let longestHop: FootprintStats["longestHop"] = null;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    const km = haversineKm(a.lat, a.lng, b.lat, b.lng);
    journeyKm += km;
    if (km > longestHopKm) {
      longestHopKm = km;
      longestHop = { from: a.placeName, to: b.placeName, km: Math.round(km) };
    }
  }

  const latSum = sorted.reduce((acc, e) => acc + (e.lat >= 0 ? 1 : 0), 0);
  const years = sorted
    .map((e) => (e.date ? Number(e.date.slice(0, 4)) : e.year))
    .filter((y): y is number => y !== undefined && Number.isFinite(y) && y > 1900);
  const rated = ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : null;

  const north = sorted.reduce<VisitedEntry | null>(
    (best, e) => (!best || e.lat > best.lat ? e : best),
    null,
  );
  const south = sorted.reduce<VisitedEntry | null>(
    (best, e) => (!best || e.lat < best.lat ? e : best),
    null,
  );
  const east = sorted.reduce<VisitedEntry | null>(
    (best, e) => (!best || e.lng > best.lng ? e : best),
    null,
  );
  const west = sorted.reduce<VisitedEntry | null>(
    (best, e) => (!best || e.lng < best.lng ? e : best),
    null,
  );

  const coveredKm2 = unionAreaKm2(
    sorted.map((e) => ({ lat: e.lat, lng: e.lng })),
    100,
  );

  return {
    count: sorted.length,
    countries: countrySet.size,
    countryNames: [...countrySet].sort(),
    journeyKm: Math.round(journeyKm),
    longestHopKm: Math.round(longestHopKm),
    longestHop,
    earthLaps: journeyKm / EARTH_CIRCUMFERENCE_KM,
    worldWalkPercent: (journeyKm / EARTH_CIRCUMFERENCE_KM) * 100,
    worldCoveredPercent: (coveredKm2 / EARTH_SURFACE_KM2) * 100,
    northCount: latSum,
    southCount: sorted.length - latSum,
    firstYear: years.length ? Math.min(...years) : null,
    extremes: {
      north: north ? { name: north.placeName, lat: north.lat } : null,
      south: south ? { name: south.placeName, lat: south.lat } : null,
      east: east ? { name: east.placeName, lng: east.lng } : null,
      west: west ? { name: west.placeName, lng: west.lng } : null,
    },
    ratingAvg: rated,
  };
}
