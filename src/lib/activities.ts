import type { ActivityId, PlaceKind } from "./types";

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

/**
 * Place subtypes that make sense as results for each activity. When an
 * activity filter is active, the "Type" dropdown narrows to these instead
 * of listing every kind (no more "Beach" while filtering Architecture).
 */
export const KINDS_BY_ACTIVITY: Partial<Record<ActivityId, PlaceKind[]>> = {
  beach: ["beach", "island", "resort"],
  hiking: ["mountain", "national-park", "nature", "waterfall"],
  architecture: ["city", "town", "village", "landmark", "ruins"],
  food: ["city", "town", "village"],
  museums: ["city", "town", "landmark"],
  nightlife: ["city", "town"],
  nature: ["nature", "national-park", "lake", "mountain", "waterfall", "beach", "island", "desert"],
  waterfalls: ["waterfall", "nature", "national-park"],
  wildlife: ["national-park", "nature", "island", "lake"],
  winter: ["mountain", "resort", "town", "village"],
  wellness: ["resort", "town", "nature"],
  shopping: ["city", "town"],
  culture: ["city", "town", "village", "ruins", "landmark"],
  adventure: ["island", "mountain", "nature", "national-park", "lake", "resort"],
  romantic: ["island", "beach", "resort", "town", "city"],
  family: ["beach", "island", "city", "town", "national-park", "resort"],
  cycling: ["town", "village", "nature", "national-park", "island"],
  boating: ["lake", "island", "beach", "town", "nature"],
  swimming: ["beach", "lake", "island", "nature", "waterfall"],
};

export function activityLabel(id: ActivityId): string {
  return ACTIVITY_MAP[id]?.label ?? id;
}

export function activityEmoji(id: ActivityId): string {
  return ACTIVITY_MAP[id]?.emoji ?? "📍";
}
