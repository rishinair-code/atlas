"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityId, CostTier, PlaceKind } from "@/lib/types";
import { ALL_PLACES, REGIONS } from "@/data";
import { haversineKm } from "@/lib/geo";
import { ACTIVITY_MAP, KINDS_BY_ACTIVITY } from "@/lib/activities";
import PlaceCard from "./PlaceCard";
import LivePoiCard, { type LivePoi } from "./LivePoiCard";
import {
  loadLocation,
  saveLocation,
  clearLocation,
  locationDisplayName,
  type SavedLocation,
} from "@/lib/location";

const RADIUS_OPTIONS = [50, 150, 400, 1000];
const RADIUS_LABELS: Record<number, string> = {
  50: "50 km",
  150: "150 km",
  400: "400 km",
  1000: "1,000 km",
};

/** Overpass query radius cap (metres) enforced by /api/places/nearby. */
const LIVE_RADIUS_CAP_M = 50_000;

/** How many curated results render before "Show more". */
const PAGE_SIZE = 24;

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
 * The Atlas search page, embedded on the home page. Two modes:
 *  - Global: browse everything (text search, region, activity, type, budget).
 *  - Located: same filters scoped to a radius around a saved point, sorted
 *    by real distance, plus live OpenStreetMap results.
 * All state is reflected in the URL (?activity=..&lat=..) so filtered views
 * are shareable and survive back-navigation — read from location.search on
 * mount, written with history.replaceState on change (no rerenders pushed
 * through the router).
 */
export default function Discover() {
  const [point, setPoint] = useState<SavedLocation | null>(null);
  const [radiusKm, setRadiusKm] = useState(150);
  const [activity, setActivity] = useState<ActivityId | "">("");
  const [kind, setKind] = useState<PlaceKind | "">("");
  const [maxTier, setMaxTier] = useState<CostTier | "">("");
  const [sort, setSort] = useState<SortKey>("popularity");
  const [region, setRegion] = useState<string>("");
  const [text, setText] = useState("");
  const [cap, setCap] = useState(PAGE_SIZE);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<"denied" | "failed" | null>(null);

  // Restore state from the URL (then localStorage for the location) on mount.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const qAct = sp.get("activity") as ActivityId | null;
    if (qAct && ACTIVITY_MAP[qAct]) setActivity(qAct);
    const qKind = sp.get("kind") as PlaceKind | null;
    if (qKind) setKind(qKind);
    const qTier = Number(sp.get("budget"));
    if (qTier >= 1 && qTier <= 5) setMaxTier(qTier as CostTier);
    const qRegion = sp.get("region");
    if (qRegion && (REGIONS as readonly string[]).includes(qRegion)) setRegion(qRegion);
    const qText = sp.get("q");
    if (qText) setText(qText);
    const qRadius = Number(sp.get("radius"));
    if ([50, 150, 400, 1000].includes(qRadius)) setRadiusKm(qRadius);
    const qSort = sp.get("sort") as SortKey | null;
    if (qSort === "distance" || qSort === "popularity" || qSort === "budget") setSort(qSort);

    const lat = Number(sp.get("lat"));
    const lng = Number(sp.get("lng"));
    if (Number.isFinite(lat) && Number.isFinite(lng) && (sp.has("lat") || sp.has("lng"))) {
      const fromUrl: SavedLocation = {
        lat,
        lng,
        label: sp.get("label") ?? "your location",
        source: "city",
      };
      setPoint(fromUrl);
      setSort(sp.get("sort") === "popularity" ? "popularity" : sp.get("sort") === "budget" ? "budget" : "distance");
      saveLocation(fromUrl);
    } else {
      const saved = loadLocation();
      if (saved) {
        setPoint(saved);
        setSort((s) => (s === "popularity" ? "distance" : s));
      }
    }
  }, []);

  // Reflect filter state in the URL without a router round-trip.
  const syncedOnce = useRef(false);
  useEffect(() => {
    if (!syncedOnce.current) {
      // Let the mount-effect land first so we don't clobber URL params.
      syncedOnce.current = true;
      return;
    }
    const sp = new URLSearchParams();
    if (activity) sp.set("activity", activity);
    if (kind) sp.set("kind", kind);
    if (maxTier) sp.set("budget", String(maxTier));
    if (region) sp.set("region", region);
    if (text.trim()) sp.set("q", text.trim());
    if (point) {
      sp.set("lat", point.lat.toFixed(5));
      sp.set("lng", point.lng.toFixed(5));
      sp.set("label", point.label);
      sp.set("radius", String(radiusKm));
      sp.set("sort", sort);
    } else if (sort !== "popularity") {
      sp.set("sort", sort);
    }
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `/?${qs}` : "/");
  }, [activity, kind, maxTier, region, text, point, radiusKm, sort]);

  // Reset pagination whenever the result set changes shape.
  useEffect(() => {
    setCap(PAGE_SIZE);
  }, [activity, kind, maxTier, region, text, point, radiusKm, sort]);

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

  // Live OpenStreetMap POIs — fetched whenever the point/radius/activity
  // changes. Only shown when a location is set.
  useEffect(() => {
    if (!point) {
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
    const fetchOnce = async () => {
      const res = await fetch(`/api/places/nearby?${params.toString()}`);
      const json = (await res.json()) as { pois?: LivePoi[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? `status ${res.status}`);
      return json.pois ?? [];
    };
    (async () => {
      try {
        let pois: LivePoi[];
        try {
          pois = await fetchOnce();
        } catch {
          // Overpass mirrors fail transiently — one retry after a beat.
          await new Promise((r) => setTimeout(r, 5_000));
          if (seq !== liveSeq.current) return;
          pois = await fetchOnce();
        }
        if (seq !== liveSeq.current) return;
        setLive(pois);
        setLiveState("ok");
      } catch {
        if (seq !== liveSeq.current) return;
        setLive([]);
        setLiveState("error");
      }
    })();
  }, [point, radiusKm, activity]);

  function setAndRemember(p: { lat: number; lng: number; label: string; source: "detected" | "city" } | null) {
    setPoint(p);
    if (p) {
      saveLocation(p);
      if (sort === "popularity") setSort("distance");
    } else {
      clearLocation();
      if (sort === "distance") setSort("popularity");
    }
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

  // Curated results: all filters apply globally; distance only when located.
  const results = useMemo(() => {
    const needle = text.trim().toLowerCase();
    const list = ALL_PLACES.map((place) => ({
      place,
      distanceKm: point ? haversineKm(point.lat, point.lng, place.lat, place.lng) : null,
    }))
      .filter((r) => (point ? (r.distanceKm ?? 0) <= radiusKm : true))
      .filter((r) => (activity ? r.place.activities.includes(activity) : true))
      .filter((r) => (kind ? r.place.kind === kind : true))
      .filter((r) => (maxTier ? r.place.costTier <= maxTier : true))
      .filter((r) => (region ? r.place.region === region : true))
      .filter((r) =>
        needle
          ? r.place.name.toLowerCase().includes(needle) ||
            r.place.country.toLowerCase().includes(needle) ||
            r.place.blurb.toLowerCase().includes(needle)
          : true,
      );
    if (point && sort === "distance") list.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    else if (sort === "budget")
      list.sort((a, b) => a.place.costTier - b.place.costTier || b.place.popularity - a.place.popularity);
    else list.sort((a, b) => b.place.popularity - a.place.popularity);
    return list;
  }, [point, radiusKm, activity, kind, maxTier, region, text, sort]);

  // Live POIs, deduped against curated cards by name, sorted by distance.
  const liveResults = useMemo(() => {
    if (!point) return [];
    const curatedNames = new Set(results.slice(0, cap).map((r) => r.place.name.toLowerCase()));
    return live
      .map((poi) => ({ poi, distanceKm: haversineKm(point.lat, point.lng, poi.lat, poi.lng) }))
      .filter((r) => !curatedNames.has(r.poi.name.toLowerCase()))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 24);
  }, [live, point, results, cap]);

  // Subtypes for the Type dropdown: restricted to the chosen activity when
  // one is active, otherwise all kinds.
  const kindsAvailable = useMemo(() => {
    if (activity) {
      // Always keep the currently selected subtype visible, even if the
      // mapping wouldn't list it — clearing it silently is worse.
      const list = new Set<PlaceKind>(KINDS_BY_ACTIVITY[activity]);
      if (kind) list.add(kind);
      return [...list];
    }
    const set = new Set<PlaceKind>();
    for (const p of ALL_PLACES) set.add(p.kind);
    return [...set].sort();
  }, [activity, kind]);

  const activeFilters = Boolean(activity || kind || maxTier || region || text.trim());

  return (
    <section>
      {/* Location row */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
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
        {point && (
          <button
            onClick={() => setAndRemember(null)}
            className="rounded-full px-3 py-1 border border-slate-700 text-slate-400 hover:border-red-400 hover:text-red-300"
          >
            ✕ Clear location
          </button>
        )}
      </div>

      {point && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
          <span aria-hidden>📍</span>
          <span>
            Using: <strong className="font-semibold">{locationDisplayName(point)}</strong>
          </span>
        </p>
      )}

      {/* City search — 16px text so iOS doesn't zoom on focus */}
      <div className="relative mt-3 max-w-md">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Or search any city worldwide…"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-base outline-none focus:border-emerald-500"
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

      {/* Filter bar — works identically with or without a location */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search places, countries…"
          className="w-full sm:w-56 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-base outline-none focus:border-emerald-500"
        />
        <div className="flex items-center gap-2">
          <label className="text-slate-500" htmlFor="disc-activity">
            Doing
          </label>
          <select
            id="disc-activity"
            value={activity}
            onChange={(e) => {
              const next = e.target.value as ActivityId | "";
              setActivity(next);
              // Drop a subtype that no longer applies to the new activity.
              const allowed = next ? KINDS_BY_ACTIVITY[next] : undefined;
              if (kind && allowed && !allowed.includes(kind)) setKind("");
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base"
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
            {activity ? "Subtype" : "Type"}
          </label>
          <select
            id="disc-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as PlaceKind | "")}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base"
          >
            <option value="">Any {activity ? "subtype" : "type"}</option>
            {kindsAvailable.map((k) => (
              <option key={k} value={k}>
                {kindLabel(k)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-slate-500" htmlFor="disc-region">
            Region
          </label>
          <select
            id="disc-region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base"
          >
            <option value="">Worldwide</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
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
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base"
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
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base"
          >
            {point && <option value="distance">Closest first</option>}
            <option value="popularity">Most popular</option>
            <option value="budget">Cheapest first</option>
          </select>
        </div>
        {point && (
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
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        {results.length} place{results.length === 1 ? "" : "s"}
        {point
          ? ` within ${RADIUS_LABELS[radiusKm]} of ${point.label}`
          : region
            ? ` in ${region}`
            : " worldwide"}
        {activeFilters ? " matching your filters" : ""}
        {point && liveState === "ok" && (
          <>
            {" · "}
            {liveResults.length} live from OpenStreetMap
            {radiusKm > 50 && " (live search capped at 50 km)"}
          </>
        )}
        {point && liveState === "loading" && " · searching the live map…"}
      </p>

      {results.length > 0 && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.slice(0, cap).map(({ place, distanceKm }) => (
            <div key={place.id} className="relative">
              <PlaceCard place={place} />
              {distanceKm !== null && (
                <span className="absolute right-3 top-3 z-10 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  {distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {results.length > cap && (
        <div className="mt-5 text-center">
          <button
            onClick={() => setCap((c) => c + PAGE_SIZE)}
            className="rounded-lg border border-slate-700 px-5 py-2 text-sm text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
          >
            Show more ({results.length - cap} remaining)
          </button>
        </div>
      )}

      {point && liveResults.length > 0 && (
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

      {results.length === 0 && liveResults.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">
          Nothing matches — {point ? "widen the radius or " : ""}relax a filter.
          {point && liveState === "loading" ? " The live map is still searching…" : ""}
        </p>
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
