/**
 * Persisted user location — shared by the Discover panel and the Explore
 * page so a detected/picked location survives reloads and page navigation.
 *
 * Stored under one localStorage key as
 * `{ lat, lng, label, source }` where source is "detected" | "city".
 * Access is guarded: localStorage can throw in private modes or be absent
 * during SSR, in which case calls degrade to null no-ops.
 */

export interface SavedLocation {
  lat: number;
  lng: number;
  label: string;
  source: "detected" | "city";
}

const KEY = "atlas.location.v1";

export function loadLocation(): SavedLocation | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedLocation>;
    if (
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number" ||
      !Number.isFinite(parsed.lat) ||
      !Number.isFinite(parsed.lng)
    ) {
      return null;
    }
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      label: typeof parsed.label === "string" ? parsed.label : "your location",
      source: parsed.source === "city" ? "city" : "detected",
    };
  } catch {
    return null;
  }
}

export function saveLocation(loc: SavedLocation): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(loc));
  } catch {
    // Private mode / storage full — persistence is best-effort.
  }
}

export function clearLocation(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}

/**
 * Short display name for the "using location" chip: a city preset or
 * geocode hit shows its name; a detected GPS fix reads as "Current".
 */
export function locationDisplayName(loc: SavedLocation): string {
  return loc.source === "detected" ? "Current location" : loc.label;
}
