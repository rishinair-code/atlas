import type { Place } from "@/lib/types";
import { EUROPE_PLACES } from "./europe";
import { ASIA_PLACES } from "./asia";
import { AMERICAS_PLACES } from "./americas";
import { AFRICA_PLACES } from "./africa";
import { OCEANIA_PLACES } from "./oceania";

export const ALL_PLACES: Place[] = [
  ...EUROPE_PLACES,
  ...ASIA_PLACES,
  ...AMERICAS_PLACES,
  ...AFRICA_PLACES,
  ...OCEANIA_PLACES,
].filter((p, i, arr) => arr.findIndex((q) => q.id === p.id) === i);

const BY_ID = new Map(ALL_PLACES.map((p) => [p.id, p]));

export function getPlace(id: string): Place | undefined {
  return BY_ID.get(id);
}

export function searchPlaces(query: string): Place[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_PLACES.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q) ||
      p.region.toLowerCase().includes(q) ||
      p.kind.includes(q),
  );
}

export const REGIONS = ["Europe", "Asia", "Americas", "Africa", "Oceania"] as const;
