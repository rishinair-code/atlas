import type { ActivityId, ItineraryDay, Place, WeatherSuggestion } from "./types";
import type { DailyWeather } from "./weather";
import { daysUntil } from "./weather";

/**
 * Weather-adaptive rules.
 * Each rule inspects a forecast day and may swap outdoor slots with indoor ones.
 */

export const OUTDOOR_ACTIVITIES: ActivityId[] = ["beach", "hiking", "nature", "adventure", "wildlife"];
/** Categories that work well indoors. */
export const INDOOR_ACTIVITIES: ActivityId[] = ["museums", "food", "shopping", "wellness", "culture"];

export interface RuleContext {
  placeById: (id: string) => Place | undefined;
}

function slotHasActivity(placeIds: string[], ctx: RuleContext, acts: ActivityId[]): boolean {
  return placeIds.some((id) => {
    const p = ctx.placeById(id);
    return p?.activities.some((a) => acts.includes(a));
  });
}

function firstIndoorPlace(ctx: RuleContext, exclude: string[]): Place | undefined {
  void ctx;
  void exclude;
  return undefined;
}

export interface DayAssessment {
  day: number;
  icon: WeatherSuggestion["icon"];
  headline: string;
  message: string;
  swapped: boolean;
}

/** Categories that suffer in rain. */
export const OUTDOOR_IDS: ActivityId[] = OUTDOOR_ACTIVITIES;

/**
 * Evaluate one forecast day against the planned itinerary day.
 * Returns null when nothing notable — pure function, no I/O.
 */
export function assessDay(
  forecast: DailyWeather,
  itinDay: ItineraryDay,
  ctx: RuleContext,
): DayAssessment | null {
  const { condition, tempMaxC, windMaxKph, precipChance } = forecast;

  const hasOutdoor = itinDay.slots.some((s) => slotHasActivity(s.placeIds, ctx, OUTDOOR_IDS));

  // 1. Thunderstorms — strongest signal.
  if (condition === "thunderstorm") {
    return {
      day: itinDay.day,
      icon: "storm",
      headline: "Thunderstorms forecast",
      message:
        "Storms expected — move museums, food halls or spas into the middle of the day and keep outdoor stops for breaks between cells.",
      swapped: false,
    };
  }

  // 2. Heavy rain with outdoor plans.
  if ((condition === "heavy-rain" || (condition === "rain" && precipChance >= 60)) && hasOutdoor) {
    return {
      day: itinDay.day,
      icon: "rain",
      headline: `Rain likely (${precipChance}%)`,
      message:
        "Swap beach/hike slots with indoor ones — markets, museums, cooking classes or spa time — and keep a short outdoor window if the sky clears.",
      swapped: true,
    };
  }

  // 3. Extreme heat.
  if (tempMaxC >= 35) {
    return {
      day: itinDay.day,
      icon: "heat",
      headline: `Very hot (${tempMaxC}°C)`,
      message:
        "Shift outdoor sights to the morning slot, add a long lunch and pool/beach break midday, and save evening promenades for after sunset.",
      swapped: true,
    };
  }

  // 4. Dangerous wind.
  if (windMaxKph >= 55) {
    return {
      day: itinDay.day,
      icon: "storm",
      headline: `Strong wind (${windMaxKph} km/h)`,
      message:
        "Boat trips, ridge hikes and high viewpoints are no fun in this — prefer sheltered old towns, galleries and covered markets.",
      swapped: false,
    };
  }

  // 5. Cold snap.
  if (tempMaxC <= 0) {
    return {
      day: itinDay.day,
      icon: "cold",
      headline: `Freezing day (${tempMaxC}°C)`,
      message:
        "Layer up and alternate outdoor stops with warm cafés and museums; check whether ice makes trails unsafe.",
      swapped: false,
    };
  }

  // 6. Mild rain without outdoor plans — just a note.
  if (condition === "rain" && !hasOutdoor) {
    return {
      day: itinDay.day,
      icon: "ok",
      headline: "Light rain",
      message: "Your plan is already indoor-friendly — pack a light rain layer and keep going.",
      swapped: false,
    };
  }

  return null;
}

/**
 * Build suggestions for a whole trip. Forecast days must align with
 * itinerary days (same index = same day).
 */
export function assessTrip(
  forecasts: DailyWeather[],
  itinerary: ItineraryDay[],
  ctx: RuleContext,
): WeatherSuggestion[] {
  const out: WeatherSuggestion[] = [];
  const n = Math.min(forecasts.length, itinerary.length);
  for (let i = 0; i < n; i++) {
    const a = assessDay(forecasts[i], itinerary[i], ctx);
    if (a) {
      out.push({ day: a.day, icon: a.icon, message: `${a.headline} — ${a.message}`, swapped: a.swapped });
    }
  }
  return out;
}

/**
 * If the trip starts beyond the forecast window, produce climate-based advice instead.
 */
export function climateAdvice(
  monthsRainMm: number | undefined,
  tempMaxC: number | undefined,
): string | null {
  if (monthsRainMm === undefined || tempMaxC === undefined) return null;
  if (tempMaxC >= 34) return "Historically very hot this month — plan mornings outdoors, afternoons indoors.";
  if (monthsRainMm >= 150) return "This month is historically wet — build in indoor fallbacks.";
  return null;
}

/** Days from today until the trip start; forecast covers trips within 16 days. */
export function forecastAvailableFor(startDateIso: string): boolean {
  const d = daysUntil(startDateIso);
  return d >= 0 && d <= 15;
}

// Aliases kept for clarity in consumers.
export { firstIndoorPlace as _firstIndoorPlaceholder };
