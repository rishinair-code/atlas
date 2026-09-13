/** Core domain types for Atlas. */

export type ActivityId =
  | "beach"
  | "hiking"
  | "architecture"
  | "food"
  | "museums"
  | "nightlife"
  | "nature"
  | "waterfalls"
  | "wildlife"
  | "winter"
  | "wellness"
  | "shopping"
  | "culture"
  | "adventure"
  | "romantic"
  | "family"
  | "cycling"
  | "boating"
  | "swimming";

export type PlaceKind =
  | "city"
  | "town"
  | "village"
  | "island"
  | "national-park"
  | "landmark"
  | "waterfall"
  | "nature"
  | "beach"
  | "mountain"
  | "lake"
  | "desert"
  | "ruins"
  | "resort";

/** 1 = backpacker, 5 = luxury. */
export type CostTier = 1 | 2 | 3 | 4 | 5;

export interface Place {
  /** Stable slug used in URLs and Firebase keys. */
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region: string;
  kind: PlaceKind;
  lat: number;
  lng: number;
  activities: ActivityId[];
  /** 1–12. Best months to visit (northern-hemisphere framing). */
  bestMonths: number[];
  costTier: CostTier;
  /** 0–100 relative fame; low values surface hidden gems. */
  popularity: number;
  blurb: string;
}

export interface VisitedEntry {
  placeId: string;
  placeName: string;
  country: string;
  lat: number;
  lng: number;
  /** ISO date the visit started. */
  date: string;
  /** Optional year override for very old trips. */
  year?: number;
  rating?: number;
  notes?: string;
  createdAt: number;
}

export interface WishlistEntry {
  placeId: string;
  placeName: string;
  country: string;
  lat: number;
  lng: number;
  targetYear?: number;
  priority: "low" | "medium" | "high";
  notes?: string;
  createdAt: number;
}

export type TransportMode = "flight" | "drive" | "train" | "bus";

export interface TripBudgetConfig {
  travelers: number;
  days: number;
  budgetTier: CostTier;
  origin?: { name: string; lat: number; lng: number };
  modes?: TransportMode[];
}

export interface DaySlot {
  slot: "morning" | "afternoon" | "evening";
  title: string;
  placeIds: string[];
  note?: string;
}

export interface ItineraryDay {
  day: number;
  /** ISO date, derived from start + day index. */
  date: string;
  slots: DaySlot[];
  /** Cluster/base for this day. */
  basePlaceId: string;
}

export interface WeatherSuggestion {
  day: number;
  icon: "rain" | "heat" | "cold" | "storm" | "ok";
  message: string;
  /** Place ids the rule moved from their original slot. */
  swapped: boolean;
}

export interface PlannedTrip {
  id: string;
  title: string;
  origin: string;
  startDate: string;
  days: number;
  travelers: number;
  budgetTier: CostTier;
  preferredActivities: ActivityId[];
  placeIds: string[];
  itinerary: ItineraryDay[];
  suggestions: WeatherSuggestion[];
  budget: TripBudgetResult | null;
  createdAt: number;
}

export interface TripBudgetResult {
  transport: { mode: TransportMode; distanceKm: number; cost: number; note: string }[];
  lodgingLow: number;
  lodgingHigh: number;
  foodLow: number;
  foodHigh: number;
  activitiesLow: number;
  activitiesHigh: number;
  localLow: number;
  localHigh: number;
  totalLow: number;
  totalHigh: number;
  currency: string;
  perPerson: boolean;
}

export interface Trip {
  id: string;
  title: string;
  origin: string;
  startDate: string;
  days: number;
  travelers: number;
  budgetTier: CostTier;
  preferredActivities: ActivityId[];
  placeIds: string[];
  itinerary: ItineraryDay[] | null;
  suggestions: WeatherSuggestion[] | null;
  budget: TripBudgetResult | null;
  createdAt: number;
}
