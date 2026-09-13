import type { ActivityId } from "./types";

export interface ActivityDef {
  id: ActivityId;
  label: string;
  emoji: string;
  /** Short descriptor used in blurbs and itinerary slot titles. */
  tagline: string;
}

export const ACTIVITIES: ActivityDef[] = [
  { id: "beach", label: "Beach & Chill", emoji: "🏖️", tagline: "Sand, sun and slow afternoons" },
  { id: "hiking", label: "Hiking & Trails", emoji: "🥾", tagline: "Trails, summits and viewpoints" },
  { id: "architecture", label: "Architecture", emoji: "🏛️", tagline: "Buildings, squares and skylines" },
  { id: "food", label: "Food & Markets", emoji: "🍜", tagline: "Street food, markets and famous kitchens" },
  { id: "museums", label: "Museums & Art", emoji: "🖼️", tagline: "Galleries, museums and history" },
  { id: "nightlife", label: "Nightlife", emoji: "🌃", tagline: "Bars, clubs and late nights" },
  { id: "nature", label: "Nature & Scenery", emoji: "🌿", tagline: "Landscapes, waterfalls and lookouts" },
  { id: "waterfalls", label: "Waterfalls", emoji: "💦", tagline: "Chutes, cascades and gorge walks" },
  { id: "wildlife", label: "Wildlife", emoji: "🦜", tagline: "Safari, dives and animal encounters" },
  { id: "winter", label: "Snow & Winter", emoji: "🎿", tagline: "Ski, aurora and cozy winters" },
  { id: "wellness", label: "Wellness & Spa", emoji: "🧘", tagline: "Hot springs, yoga and retreats" },
  { id: "shopping", label: "Shopping", emoji: "🛍️", tagline: "Bazaars, boutiques and malls" },
  { id: "culture", label: "Culture & Traditions", emoji: "🎭", tagline: "Festivals, temples and local life" },
  { id: "adventure", label: "Adventure Sports", emoji: "🪂", tagline: "Dive, raft, climb and fly" },
  { id: "romantic", label: "Romantic Escapes", emoji: "🌅", tagline: "Sunsets, sails and quiet corners" },
  { id: "family", label: "Family Friendly", emoji: "👨‍👩‍👧", tagline: "Easy days that keep everyone happy" },
  { id: "cycling", label: "Cycling", emoji: "🚴", tagline: "Rail trails, bike paths and gravel grinds" },
  { id: "boating", label: "Boating & Paddling", emoji: "🛶", tagline: "Kayaks, canoes and island ferries" },
  { id: "swimming", label: "Swimming", emoji: "🏊", tagline: "Beaches, quarries and clear-water coves" },
];

export const ACTIVITY_MAP: Record<ActivityId, ActivityDef> = Object.fromEntries(
  ACTIVITIES.map((a) => [a.id, a]),
) as Record<ActivityId, ActivityDef>;

export function activityLabel(id: ActivityId): string {
  return ACTIVITY_MAP[id]?.label ?? id;
}

export function activityEmoji(id: ActivityId): string {
  return ACTIVITY_MAP[id]?.emoji ?? "📍";
}
