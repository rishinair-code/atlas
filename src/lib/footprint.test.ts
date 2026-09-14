import { describe, expect, it } from "vitest";
import { computeFootprintStats } from "./footprint";
import type { VisitedEntry } from "./types";

function entry(partial: Partial<VisitedEntry> & { placeId: string }): VisitedEntry {
  return {
    placeName: partial.placeId,
    country: "Canada",
    lat: 43,
    lng: -79,
    date: "2024-01-01",
    createdAt: 0,
    ...partial,
  };
}

const empty = computeFootprintStats([]);

describe("computeFootprintStats", () => {
  it("handles the empty state", () => {
    expect(empty.count).toBe(0);
    expect(empty.journeyKm).toBe(0);
    expect(empty.countries).toBe(0);
    expect(empty.longestHop).toBeNull();
    expect(empty.ratingAvg).toBeNull();
    expect(empty.firstYear).toBeNull();
  });

  it("sums the journey chronologically and finds the longest hop", () => {
    const stats = computeFootprintStats([
      entry({ placeId: "a", placeName: "A", lat: 0, lng: 0, date: "2024-03-01" }),
      entry({ placeId: "b", placeName: "B", lat: 0, lng: 1, date: "2024-01-01" }),
      entry({ placeId: "c", placeName: "C", lat: 0, lng: 3, date: "2024-02-01" }),
    ]);
    // Sorted: B (lng 1) → C (lng 3) → A (lng 0) = 2° + 3° of arc at the equator.
    expect(stats.journeyKm).toBeGreaterThan(500);
    expect(stats.journeyKm).toBeLessThan(600);
    expect(stats.longestHop?.from).toBe("C");
    expect(stats.longestHop?.to).toBe("A");
  });

  it("counts unique countries and orders country names", () => {
    const stats = computeFootprintStats([
      entry({ placeId: "a", country: "Canada" }),
      entry({ placeId: "b", country: "Canada" }),
      entry({ placeId: "c", country: "Japan" }),
    ]);
    expect(stats.countries).toBe(2);
    expect(stats.countryNames).toEqual(["Canada", "Japan"]);
  });

  it("splits hemispheres and finds extremes", () => {
    const stats = computeFootprintStats([
      entry({ placeId: "ham", placeName: "Hamilton", lat: 43.26, lng: -79.87 }),
      entry({ placeId: "syd", placeName: "Sydney", lat: -33.87, lng: 151.21 }),
    ]);
    expect(stats.northCount).toBe(1);
    expect(stats.southCount).toBe(1);
    expect(stats.extremes.north?.name).toBe("Hamilton");
    expect(stats.extremes.south?.name).toBe("Sydney");
    expect(stats.extremes.east?.name).toBe("Sydney");
    expect(stats.extremes.west?.name).toBe("Hamilton");
  });

  it("derives earth-lap and coverage percentages", () => {
    const stats = computeFootprintStats([
      entry({ placeId: "a", lat: 0, lng: 0, date: "2020-01-01" }),
      entry({ placeId: "b", lat: 0, lng: 90, date: "2021-01-01" }),
      entry({ placeId: "c", lat: 0, lng: 180, date: "2022-01-01" }),
      entry({ placeId: "d", lat: 0, lng: -90, date: "2023-01-01" }),
    ]);
    // Three quarter-lap hops (the journey doesn't loop home) ≈ 3/4 lap.
    expect(stats.earthLaps).toBeGreaterThan(0.7);
    expect(stats.earthLaps).toBeLessThan(0.8);
    expect(stats.worldWalkPercent).toBeGreaterThan(70);
    expect(stats.worldWalkPercent).toBeLessThan(80);
    // Four disjoint 100 km circles on the equator should stay well under 0.01%.
    expect(stats.worldCoveredPercent).toBeGreaterThan(0);
    expect(stats.worldCoveredPercent).toBeLessThan(0.01);
  });

  it("averages ratings and takes the earliest year", () => {
    const stats = computeFootprintStats([
      entry({ placeId: "a", rating: 3, date: "2019-06-01" }),
      entry({ placeId: "b", rating: 5, year: 2012, date: "" }),
    ]);
    expect(stats.ratingAvg).toBe(4);
    expect(stats.firstYear).toBe(2012);
  });
});
