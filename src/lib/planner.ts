import type {
  ActivityId,
  DaySlot,
  ItineraryDay,
  Place,
  WeatherSuggestion,
} from "./types";
import type { DailyWeather } from "./weather";
import { haversineKm } from "./geo";
import { ACTIVITY_MAP } from "./activities";
import { ALL_PLACES } from "@/data";
import { assessDay, assessTrip, type RuleContext } from "./rules";
import { shiftDate } from "./weather";

/** Cluster radius used to group places into a day base. */
const CLUSTER_KM = 80;

export function scorePlace(
  place: Place,
  preferredActivities: ActivityId[],
  month?: number,
): number {
  let score = place.popularity / 100;
  if (preferredActivities.length) {
    const overlap = place.activities.filter((a) => preferredActivities.includes(a)).length;
    score += Math.min(overlap * 0.35, 1.05);
  }
  if (month && place.bestMonths.includes(month)) score += 0.3;
  return score;
}

/** Greedy geographic clustering: each seed grows a cluster within CLUSTER_KM. */
export function clusterPlaces(places: Place[]): Place[][] {
  const clusters: Place[][] = [];
  for (const p of places) {
    const found = clusters.find((c) =>
      c.some((q) => haversineKm(p.lat, p.lng, q.lat, q.lng) <= CLUSTER_KM),
    );
    if (found) found.push(p);
    else clusters.push([p]);
  }
  return clusters;
}

/** Merge the weakest cluster into its nearest neighbour until count fits. */
function fitClusters(clusters: Place[][], target: number, scoreOf: (c: Place[]) => number): Place[][] {
  const out = [...clusters];
  while (out.length > target) {
    // find weakest cluster (by cluster score) and merge into nearest other
    out.sort((a, b) => scoreOf(a) - scoreOf(b));
    const weakest = out.shift()!;
    let bestIdx = 0;
    let bestDist = Infinity;
    out.forEach((c, i) => {
      const d = haversineKm(weakest[0].lat, weakest[0].lng, c[0].lat, c[0].lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    out[bestIdx] = [...out[bestIdx], ...weakest];
    out.sort((a, b) => scoreOf(b) - scoreOf(a));
  }
  return out;
}

function dominantActivity(places: Place[]): ActivityId | null {
  const counts = new Map<ActivityId, number>();
  places.forEach((p) => p.activities.forEach((a) => counts.set(a, (counts.get(a) ?? 0) + 1)));
  let best: ActivityId | null = null;
  let bestN = 0;
  counts.forEach((n, a) => {
    if (n > bestN) {
      bestN = n;
      best = a;
    }
  });
  return best;
}

function slotTitle(acts: ActivityId[] | ActivityId | null, placeNames: string[]): string {
  const list = acts === null ? [] : Array.isArray(acts) ? acts : [acts];
  if (!list.length) return "Free time";
  const a = ACTIVITY_MAP[list[0]];
  const label = a ? `${a.emoji} ${a.label}` : "Exploring";
  return placeNames.length ? `${label} · ${placeNames[0]}` : label;
}

export interface BuildOptions {
  days: number;
  startDate: string;
  pace: "relaxed" | "balanced" | "packed";
  preferredActivities: ActivityId[];
  month?: number;
}

/** How many place-visits a day can hold, by pace. */
export function capacityForPace(pace: BuildOptions["pace"]): number {
  return pace === "relaxed" ? 2 : pace === "packed" ? 4 : 3;
}

/**
 * Build a day-by-day itinerary from selected places.
 * Clusters geographically, orders clusters by score, fills morning/afternoon/evening.
 */
export function buildItinerary(selected: Place[], opts: BuildOptions): ItineraryDay[] {
  const days = Math.max(1, opts.days);
  const scored = selected
    .map((p) => ({ p, s: scorePlace(p, opts.preferredActivities, opts.month) }))
    .sort((a, b) => b.s - a.s);

  const clusterScore = (c: Place[]) => c.reduce((s, p) => s + scorePlace(p, opts.preferredActivities, opts.month), 0);
  let clusters = clusterPlaces(scored.map((x) => x.p));
  clusters = fitClusters(clusters, days, clusterScore);
  clusters.sort((a, b) => clusterScore(b) - clusterScore(a));

  const capacity = capacityForPace(opts.pace);
  const out: ItineraryDay[] = [];

  for (let d = 0; d < days; d++) {
    const date = shiftDate(opts.startDate, d);
    const cluster = clusters[d % clusters.length] ?? [];
    const dayPlaces = cluster.slice(0, capacity);

    if (!dayPlaces.length) {
      out.push({
        day: d + 1,
        date,
        basePlaceId: "",
        slots: [
          { slot: "morning", title: "🌅 Free morning", placeIds: [] },
          { slot: "afternoon", title: "☀️ Free afternoon — add a stop", placeIds: [] },
          { slot: "evening", title: "🌇 Local dinner", placeIds: [] },
        ],
      });
      continue;
    }

    // distribute places across slots: last place → evening, rest split morning/afternoon
    const names = dayPlaces.map((p) => p.name);
    const acts = dayPlaces.map((p) => p.activities).flat();
    const morningIds = dayPlaces.slice(0, 1).map((p) => p.id);
    const afternoonIds = dayPlaces.slice(1, Math.max(2, dayPlaces.length - 1)).map((p) => p.id);
    const eveningIds = dayPlaces.length > 2 ? [dayPlaces[dayPlaces.length - 1].id] : [];

    out.push({
      day: d + 1,
      date,
      basePlaceId: dayPlaces[0].id,
      slots: [
        {
          slot: "morning",
          title: slotTitle(dominantActivity(morningIds.map((id) => dayPlaces.find((p) => p.id === id)!).filter(Boolean)), morningIds.map((id) => dayPlaces.find((p) => p.id === id)!.name)),
          placeIds: morningIds,
          note: "Best light for photos — go early to beat crowds.",
        },
        {
          slot: "afternoon",
          title: slotTitle(acts, names.slice(1)),
          placeIds: afternoonIds,
          note: afternoonIds.length ? undefined : "Long lunch, then wander.",
        },
        {
          slot: "evening",
          title: eveningIds.length ? slotTitle(acts, names.slice(-1)) : "🌇 Sunset & dinner",
          placeIds: eveningIds,
        },
      ],
    });
  }
  return out;
}

/**
 * Top up the selected pool with nearby dataset places so every day has content.
 * Pure: works off the bundled dataset only.
 */
export function expandPlaces(
  selected: Place[],
  preferredActivities: ActivityId[],
  month: number | undefined,
  days: number,
): Place[] {
  const capacity = days * capacityForPace("balanced");
  const pool = [...selected];
  if (pool.length >= capacity) return pool;

  const anchors = pool.length ? pool : ALL_PLACES.slice(0, 1);
  const candidates = ALL_PLACES.filter((p) => !pool.some((q) => q.id === p.id))
    .map((p) => ({
      p,
      d: Math.min(...anchors.map((a) => haversineKm(a.lat, a.lng, p.lat, p.lng))),
      s: scorePlace(p, preferredActivities, month),
    }))
    .filter((c) => c.d <= 300)
    .sort((a, b) => b.s - a.s || a.d - b.d);

  for (const c of candidates) {
    if (pool.length >= capacity) break;
    pool.push(c.p);
  }
  return pool;
}

/**
 * Apply weather-driven adjustments to an itinerary.
 * Heat days: move outdoor-heavy places into the morning slot.
 * Rain days: move outdoor-heavy places out of the morning, prefer indoor stops.
 * Pure function — returns a new itinerary.
 */
export function applyWeatherAdjustments(
  itinerary: ItineraryDay[],
  forecasts: DailyWeather[],
  placeById: (id: string) => Place | undefined,
): ItineraryDay[] {
  const ctx: RuleContext = { placeById };
  const isOutdoor = (id: string) => {
    const p = placeById(id);
    return p ? p.activities.some((a) => assessIsOutdoor(a)) : false;
  };
  const n = Math.min(itinerary.length, forecasts.length);

  return itinerary.map((day, i) => {
    if (i >= n) return day;
    const f = forecasts[i];
    const assessment = assessDay(f, day, ctx);
    if (!assessment) return day;

    const slots: DaySlot[] = day.slots.map((s) => ({ ...s, placeIds: [...s.placeIds] }));
    const morning = slots[0];
    const afternoon = slots[1] ?? morning;
    const morningOutdoor = morning.placeIds.filter(isOutdoor);
    const afternoonOutdoor = afternoon.placeIds.filter(isOutdoor);

    if (f.tempMaxC >= 35 && afternoonOutdoor.length) {
      // heat: outdoor goes first
      morning.placeIds = [...afternoonOutdoor, ...morning.placeIds.filter((id) => !afternoonOutdoor.includes(id))];
      afternoon.placeIds = [...morningOutdoor, ...afternoon.placeIds.filter((id) => !morningOutdoor.includes(id))];
      morning.note = "Moved outdoors early — heat peaks midday.";
    }
    if ((f.condition === "heavy-rain" || f.condition === "rain") && morningOutdoor.length && afternoon.placeIds.length) {
      // rain: indoor-first morning when possible
      const indoorFirst = [...afternoon.placeIds.filter((id) => !isOutdoor(id)), ...morning.placeIds.filter((id) => !isOutdoor(id))];
      if (indoorFirst.length) {
        morning.placeIds = indoorFirst;
        morning.note = "Rain swap: indoor stops first.";
      }
    }
    return { ...day, slots };
  });
}

function assessIsOutdoor(a: ActivityId): boolean {
  const OUT = new Set<ActivityId>(["beach", "hiking", "nature", "adventure", "wildlife"]);
  return OUT.has(a);
}

/** Full pipeline: build itinerary, then produce suggestions for forecast days. */
export function planTrip(args: {
  selected: Place[];
  opts: BuildOptions;
  forecasts?: DailyWeather[];
}): { itinerary: ItineraryDay[]; suggestions: WeatherSuggestion[] } {
  const { selected, opts, forecasts } = args;
  const placeById = new Map(selected.map((p) => [p.id, p]));
  const ctx: RuleContext = { placeById: (id) => placeById.get(id) };
  let itinerary = buildItinerary(selected, opts);
  const suggestions: WeatherSuggestion[] = forecasts
    ? assessTrip(forecasts, itinerary, ctx)
    : [];
  if (forecasts) itinerary = applyWeatherAdjustments(itinerary, forecasts, (id) => placeById.get(id));
  return { itinerary, suggestions };
}
