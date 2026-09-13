"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ActivityId, CostTier, PlaceKind } from "@/lib/types";
import { ALL_PLACES } from "@/data";
import { haversineKm } from "@/lib/geo";
import { ACTIVITY_MAP } from "@/lib/activities";
import PlaceCard from "./PlaceCard";
import LivePoiCard, { type LivePoi } from "./LivePoiCard";
import { loadLocation, saveLocation, clearLocation } from "@/lib/location";
const RADIUS_OPTIONS = [50, 150, 400, 1000];
const RADIUS_LABELS: Record<number, string> = {
  50: "50 km",
  150: "150 km",
  400: "400 km",
  1000: "1,000 km",
};

/** Overpass query radius cap (metres) enforced by /api/places/nearby. */
const LIVE_RADIUS_CAP_M = 50_000;

const CITY_PRESETS: { label: string; lat: number; lng: number }[] = [
  { label: "Hamilton", lat: 43.2563, lng: -79.8689 },
  { label: "Toronto", lat: 43.6532, lng: -79.3832 },
  { label: "Miami", lat: 25.7617, lng: -80.1918 },
  { label: "New York", lat: 40.7128, lng: -74.006 },
  { label: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { label: "London", lat: 51.5072, lng: -0.1276 },
];

type SortKey = "distance" | "popularity" | "budget";

interface GeocodeHit {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

/**
 * Discovery panel: pick any location (detect, presets, or worldwide city
 * search), then filter by activity, place type, budget, radius and sort.
 * Results fuse the curated dataset with live OpenStreetMap POIs.
 */
export default function Discover() {
  const [point, setPoint] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [radiusKm, setRadiusKm] = useState(150);
  const [activity, setActivity] = useState<ActivityId | "">("");
  const [kind, setKind] = useState<PlaceKind | "">("");
  const [maxTier, setMaxTier] = useState<CostTier | "">("");
  const [sort, setSort] = useState<SortKey>("distance");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<"denied" | "failed" | null>(null);

  // Restore a saved location once on mount so the pick survives reloads
  // and navigation between the home and Explore pages.
  useEffect(() => {
    setPoint(loadLocation());
  }, []);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  const [live, setLive] = useState<LivePoi[]>([]);
  const [liveState, setLiveState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const liveSeq = useRef(0);

  // Worldwide city autocomplete via Open-Meteo geocoding (free, no key).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,
        );
        const json = await res.json();
        if (seq === searchSeq.current) setHits(json.results ?? []);
      } catch {
        if (seq === searchSeq.current) setHits([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Live OpenStreetMap POIs — fetched whenever a point is set and the
  // dataset-only filters (type/budget) are off.
  useEffect(() => {
    if (!point || kind || maxTier) {
      setLive([]);
      setLiveState("idle");
      return;
    }
    const seq = ++liveSeq.current;
    setLiveState("loading");
    // The live OSM query is capped at 50 km — larger areas make Overpass
    // crawl; the curated dataset still covers the wide radii.
    const liveRadiusM = Math.min(radiusKm * 1000, LIVE_RADIUS_CAP_M);
    const params = new URLSearchParams({
      lat: String(point.lat),
      lng: String(point.lng),
      radius: String(liveRadiusM),
    });
    if (activity) params.set("category", activity);
    (async () => {
      try {
        const res = await fetch(`/api/places/nearby?${params.toString()}`);
        const json = (await res.json()) as { pois?: LivePoi[] };
        if (seq !== liveSeq.current) return;
        setLive(json.pois ?? []);
        setLiveState("ok");
      } catch {
        if (seq !== liveSeq.current) return;
        setLive([]);
        setLiveState("error");
      }
    })();
  }, [point, radiusKm, activity, kind, maxTier]);

  function setAndRemember(p: { lat: number; lng: number; label: string; source: "detected" | "city" } | null) {
    setPoint(p);
    if (p) saveLocation(p);
    else clearLocation();
  }

  function pick(hit: GeocodeHit) {
    setAndRemember({
      lat: hit.latitude,
      lng: hit.longitude,
      label: hit.name,
      source: "city",
    });
    setQuery("");
    setHits([]);
  }

  function locate() {
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAndRemember({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "your location",
          source: "detected",
        });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocError(err.code === err.PERMISSION_DENIED ? "denied" : "failed");
      },
      { timeout: 8000 },
    );
  }

  const results = useMemo(() => {
    if (!point) return [];
    const list = ALL_PLACES.map((place) => ({
      place,
      distanceKm: haversineKm(point.lat, point.lng, place.lat, place.lng),
    }))
      .filter((r) => r.distanceKm <= radiusKm)
      .filter((r) => (activity ? r.place.activities.includes(activity) : true))
      .filter((r) => (kind ? r.place.kind === kind : true))
      .filter((r) => (maxTier ? r.place.costTier <= maxTier : true));
    if (sort === "distance") list.sort((a, b) => a.distanceKm - b.distanceKm);
    if (sort === "popularity") list.sort((a, b) => b.place.popularity - a.place.popularity);
    if (sort === "budget") list.sort((a, b) => a.place.costTier - b.place.costTier || a.distanceKm - b.distanceKm);
    return list.slice(0, 12);
  }, [point, radiusKm, activity, kind, maxTier, sort]);

  // Live POIs, deduped against curated cards by name, sorted by distance.
  const liveResults = useMemo(() => {
    if (!point) return [];
    const curatedNames = new Set(results.map((r) => r.place.name.toLowerCase()));
    return live
      .map((poi) => ({ poi, distanceKm: haversineKm(point.lat, point.lng, poi.lat, poi.lng) }))
      .filter((r) => !curatedNames.has(r.poi.name.toLowerCase()))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 12);
  }, [live, point, results]);

  const showLive = Boolean(point) && !kind && !maxTier;

  const kindsAvailable = useMemo(() => {
    if (!point) return [];
    const set = new Set<PlaceKind>();
    for (const p of ALL_PLACES) {
      if (haversineKm(point.lat, point.lng, p.lat, p.lng) <= radiusKm) set.add(p.kind);
    }
    return [...set].sort();
  }, [point, radiusKm]);

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Discover near you</h2>
      <p className="mt-1 text-sm text-slate-400">
        Set your location — detect it or search any city on Earth — then filter
        by what you want to do. Results combine the curated atlas with live
        OpenStreetMap places.
      </p>

      {/* Location row */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={locate}
          disabled={locating}
          className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {locating ? "Locating…" : "📍 Detect my location"}
        </button>
        {CITY_PRESETS.map((c) => (
          <button
            key={c.label}
            onClick={() => setAndRemember({ lat: c.lat, lng: c.lng, label: c.label, source: "city" })}
            className={`rounded-full px-3 py-1 border ${
              point?.label === c.label
                ? "border-emerald-500 text-emerald-400"
                : "border-slate-700 hover:border-slate-500"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* City search */}
      <div className="relative mt-3 max-w-md">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Or search any city worldwide…"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm outline-none focus:border-emerald-500"
        />
        {searching && (
          <span className="absolute right-3 top-2.5 text-xs text-slate-500">…</span>
        )}
        {hits.length > 0 && (
          <ul className="absolute z-30 mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 shadow-xl overflow-hidden">
            {hits.map((h) => (
              <li key={`${h.id}`}>
                <button
                  onClick={() => pick(h)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-800"
                >
                  {h.name}
                  <span className="text-slate-500"> · {h.country}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {locError === "denied" && (
        <p className="mt-2 text-xs text-amber-400">
          Location permission denied — search a city above instead.
        </p>
      )}
      {locError === "failed" && (
        <p className="mt-2 text-xs text-amber-400">
          Couldn&apos;t detect your location — search a city above instead.
        </p>
      )}

      {point && (
        <>
          {/* Filters row */}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Radius</span>
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadiusKm(r)}
                  className={`rounded-full px-3 py-1 border ${
                    radiusKm === r
                      ? "border-emerald-500 text-emerald-400"
                      : "border-slate-700 hover:border-slate-500"
                  }`}
                >
                  {RADIUS_LABELS[r]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-500" htmlFor="disc-activity">
                Doing
              </label>
              <select
                id="disc-activity"
                value={activity}
                onChange={(e) => setActivity(e.target.value as ActivityId | "")}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
              >
                <option value="">Anything</option>
                {Object.values(ACTIVITY_MAP).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.emoji} {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-500" htmlFor="disc-kind">
                Type
              </label>
              <select
                id="disc-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as PlaceKind | "")}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
              >
                <option value="">Any type</option>
                {kindsAvailable.map((k) => (
                  <option key={k} value={k}>
                    {kindLabel(k)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-500" htmlFor="disc-tier">
                Max budget
              </label>
              <select
                id="disc-tier"
                value={maxTier}
                onChange={(e) => setMaxTier((e.target.value || "") as CostTier | "")}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
              >
                <option value="">Any</option>
                {[1, 2, 3, 4, 5].map((t) => (
                  <option key={t} value={t}>
                    {"$".repeat(t)} or less
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-500" htmlFor="disc-sort">
                Sort
              </label>
              <select
                id="disc-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
              >
                <option value="distance">Closest first</option>
                <option value="popularity">Most popular</option>
                <option value="budget">Cheapest first</option>
              </select>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            {results.length} curated place{results.length === 1 ? "" : "s"} within{" "}
            {RADIUS_LABELS[radiusKm]} of {point.label}
            {showLive && liveState === "ok" && (
              <>
                {" · "}
                {liveResults.length} live from OpenStreetMap
                {radiusKm > 50 && " (live search capped at 50 km)"}
              </>
            )}
            {showLive && liveState === "loading" && " · searching the live map…"}
          </p>

          {results.length > 0 && (
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map(({ place, distanceKm }) => (
                <div key={place.id} className="relative">
                  <PlaceCard place={place} />
                  <span className="absolute right-3 top-3 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                    {distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km
                  </span>
                </div>
              ))}
            </div>
          )}

          {showLive && liveResults.length > 0 && (
            <>
              <h3 className="mt-8 text-lg font-semibold">
                More near {point.label}
                <span className="ml-2 align-middle text-xs font-normal text-slate-500">
                  live · OpenStreetMap
                </span>
              </h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {liveResults.map(({ poi, distanceKm }) => (
                  <LivePoiCard key={poi.id} poi={poi} distanceKm={distanceKm} />
                ))}
              </div>
            </>
          )}

          {results.length === 0 && liveResults.length === 0 && liveState !== "loading" && (
            <p className="mt-4 text-sm text-slate-500">
              Nothing matches here — widen the radius or relax a filter.
            </p>
          )}

          <Link
            href={`/explore?lat=${point.lat}&lng=${point.lng}&radius=${radiusKm}${activity ? `&activity=${activity}` : ""}`}
            className="mt-6 inline-block text-sm text-emerald-400 hover:text-emerald-300"
          >
            Browse the atlas on the Explore page →
          </Link>
        </>
      )}
    </section>
  );
}

function kindLabel(kind: PlaceKind): string {
  const labels: Record<PlaceKind, string> = {
    city: "City",
    town: "Town",
    village: "Village",
    island: "Island",
    "national-park": "National park",
    landmark: "Landmark",
    waterfall: "Waterfall",
    nature: "Nature area",
    beach: "Beach",
    mountain: "Mountain",
    lake: "Lake",
    desert: "Desert",
    ruins: "Ruins",
    resort: "Resort",
  };
  return labels[kind] ?? kind;
}
