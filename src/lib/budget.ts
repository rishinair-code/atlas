import type { CostTier, Place, TransportMode, TripBudgetResult } from "./types";
import { haversineKm } from "./geo";
import { costForCountry } from "./countries";

/**
 * Budget engine — deterministic and inspectable.
 * All rates are rough USD baselines meant for relative comparison,
 * not live ticket prices.
 */

const DEFAULT_FUEL_USD_PER_L = 1.65;
const LITERS_PER_100KM = 7.5;

/** Flight cost model: distance-based tiers with airport overheads. */
export function flightCost(distanceKm: number): { cost: number; note: string } {
  if (distanceKm < 1) return { cost: 0, note: "no flight needed" };
  if (distanceKm <= 800) {
    // short-haul LCC ~ $0.11/km + $45 overhead
    return { cost: 45 + distanceKm * 0.11, note: "short-haul flight estimate" };
  }
  if (distanceKm <= 4000) {
    // medium-haul ~ $0.085/km + $70 overhead
    return { cost: 70 + distanceKm * 0.085, note: "medium-haul flight estimate" };
  }
  // long-haul ~ $0.06/km + $120 overhead
  return { cost: 120 + distanceKm * 0.06, note: "long-haul flight estimate" };
}

/** Drive cost model: road distance (OSRM when available) × fuel + extras. */
export function driveCost(
  roadKm: number,
  fuelPricePerL?: number,
): { cost: number; note: string } {
  const fuel = fuelPricePerL ?? DEFAULT_FUEL_USD_PER_L;
  const fuelCost = (roadKm / 100) * LITERS_PER_100KM * fuel;
  const extras = 15 + roadKm * 0.02; // tolls / contingency
  return {
    cost: fuelCost + extras,
    note: `fuel @ ${LITERS_PER_100KM} L/100km + tolls`,
  };
}

/** Train cost model: distance-based regional rates. */
export function trainCost(distanceKm: number): { cost: number; note: string } {
  const ratePerKm = distanceKm > 1500 ? 0.045 : distanceKm > 400 ? 0.07 : 0.09;
  return { cost: 12 + distanceKm * ratePerKm, note: "rail distance-rate estimate" };
}

/** Bus/coach cost model. */
export function busCost(distanceKm: number): { cost: number; note: string } {
  const ratePerKm = distanceKm > 1000 ? 0.035 : 0.05;
  return { cost: 8 + distanceKm * ratePerKm, note: "coach distance-rate estimate" };
}

/** A drive is only suggested when the road trip is realistic. */
export function isFeasibleDrive(distanceKm: number): boolean {
  return distanceKm > 0 && distanceKm < 12000;
}

export function estimateTripBudget(
  places: Place[],
  cfg: {
    days: number;
    travelers: number;
    budgetTier: CostTier;
    origin?: { name: string; lat: number; lng: number };
    roadKm?: number | null;
    modes?: TransportMode[];
  },
): TripBudgetResult {
  const tier = Math.min(5, Math.max(1, cfg.budgetTier));
  const days = Math.max(1, cfg.days);
  const travelers = Math.max(1, cfg.travelers);

  const dest = places[0];
  const countryCost = costForCountry(dest?.countryCode ?? "");

  const origin = cfg.origin;
  const distKm = origin
    ? haversineKm(origin.lat, origin.lng, dest?.lat ?? 0, dest?.lng ?? 0)
    : 6000; // assume intercontinental default when no origin set
  const roadKm = cfg.roadKm ?? Math.round(distKm * 1.25);

  const modes: TransportMode[] =
    cfg.modes && cfg.modes.length
      ? cfg.modes
      : distKm > 1500
        ? ["flight", "drive"]
        : ["flight", "train", "bus"];

  const transport = modes.map((mode) => {
    if (mode === "flight") {
      const { cost, note } = flightCost(distKm);
      return { mode, distanceKm: Math.round(distKm), cost: Math.round(cost * travelers), note };
    }
    if (mode === "drive") {
      const { cost, note } = driveCost(roadKm);
      return { mode, distanceKm: roadKm, cost: Math.round(cost * travelers), note };
    }
    if (mode === "train") {
      const { cost, note } = trainCost(distKm);
      return { mode, distanceKm: Math.round(distKm), cost: Math.round(cost * travelers), note };
    }
    const { cost, note } = busCost(distKm);
    return { mode, distanceKm: Math.round(distKm), cost: Math.round(cost * travelers), note };
  });

  const lodging = countryCost.lodging[tier - 1];
  const food = countryCost.food[tier - 1];
  const local = countryCost.localTransport;

  const lodgingLow = lodging * days * travelers * 0.85;
  const lodgingHigh = lodging * days * travelers * 1.25;
  const foodLow = food * days * travelers * 0.8;
  const foodHigh = food * days * travelers * 1.3;
  const activitiesLow = 8 * days * travelers * tier * 0.8;
  const activitiesHigh = 8 * days * travelers * tier * 1.4;
  const localLow = local * days * travelers * 0.7;
  const localHigh = local * days * travelers * 1.4;

  const cheapestTransport = transport.length
    ? Math.min(...transport.map((t) => t.cost))
    : 0;
  const dearestTransport = transport.length
    ? Math.max(...transport.map((t) => t.cost))
    : 0;

  return {
    transport,
    lodgingLow: Math.round(lodgingLow),
    lodgingHigh: Math.round(lodgingHigh),
    foodLow: Math.round(foodLow),
    foodHigh: Math.round(foodHigh),
    activitiesLow: Math.round(activitiesLow),
    activitiesHigh: Math.round(activitiesHigh),
    localLow: Math.round(localLow),
    localHigh: Math.round(localHigh),
    totalLow: Math.round(lodgingLow + foodLow + activitiesLow + localLow + cheapestTransport),
    totalHigh: Math.round(lodgingHigh + foodHigh + activitiesHigh + localHigh + dearestTransport),
    currency: "USD",
    perPerson: false,
  };
}
