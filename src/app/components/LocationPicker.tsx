"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadLocation,
  saveLocation,
  clearLocation,
  locationDisplayName,
  type SavedLocation,
} from "@/lib/location";

interface GeocodeHit {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

const CITY_PRESETS = [
  { label: "Hamilton", lat: 43.2563, lng: -79.8689 },
  { label: "Toronto", lat: 43.6532, lng: -79.3832 },
  { label: "New York", lat: 40.7128, lng: -74.006 },
  { label: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { label: "London", lat: 51.5072, lng: -0.1276 },
];

/**
 * Location controls for URL-driven pages: detect, presets, and worldwide
 * city search. Selection updates ?lat/?lng in the address bar AND is saved
 * to localStorage, so it survives reloads and navigation. A saved location
 * is restored on mount unless the URL already pins one.
 */
export default function LocationPicker({
  lat,
  lng,
  radius,
  keepParams,
}: {
  lat?: string;
  lng?: string;
  radius?: string;
  keepParams?: Record<string, string>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [locating, setLocating] = useState(false);
  const [active, setActive] = useState<SavedLocation | null>(null);
  const seq = useRef(0);

  // Reflect whichever location is in effect (URL pin or saved pick) so the
  // user can see Atlas is using it without re-detecting every visit.
  useEffect(() => {
    const saved = loadLocation();
    if (lat && lng) {
      const matchesSaved = saved && within1km(lat, lng, saved.lat, saved.lng);
      setActive(
        matchesSaved
          ? saved
          : { lat: Number(lat), lng: Number(lng), label: "Selected point", source: "city" },
      );
    } else if (saved) {
      setActive(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A location in the URL wins; otherwise restore the saved one so users
  // don't re-detect on every visit.
  useEffect(() => {
    if (lat && lng) return;
    const saved = loadLocation();
    if (saved) {
      go({
        lat: saved.lat.toFixed(4),
        lng: saved.lng.toFixed(4),
        radius: radius ?? "150",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const s = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,
        );
        const json = await res.json();
        if (s === seq.current) setHits(json.results ?? []);
      } catch {
        if (s === seq.current) setHits([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function go(newParams: Record<string, string>) {
    const params = new URLSearchParams({ ...keepParams, ...newParams });
    router.push(`/explore?${params.toString()}`);
  }

  /** Push the new coordinates into the URL and persist them. */
  function pickAndGo(p: { lat: number; lng: number; label: string; source: "detected" | "city" }) {
    saveLocation(p);
    setActive(p);
    go({
      lat: p.lat.toFixed(4),
      lng: p.lng.toFixed(4),
      radius: radius ?? "150",
    });
  }

  function clearAndGo() {
    clearLocation();
    setActive(null);
    const params = new URLSearchParams({ ...(keepParams ?? {}) });
    router.push(`/explore?${params.toString()}`);
  }

  const hasLocation = Boolean(lat && lng);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={() => {
            setLocating(true);
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                setLocating(false);
                pickAndGo({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  label: "your location",
                  source: "detected",
                });
              },
              () => setLocating(false),
              { timeout: 8000 },
            );
          }}
          disabled={locating}
          className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {locating ? "Locating…" : "📍 Detect my location"}
        </button>
        {CITY_PRESETS.map((c) => (
          <button
            key={c.label}
            onClick={() =>
              pickAndGo({ lat: c.lat, lng: c.lng, label: c.label, source: "city" })
            }
            className={`rounded-full px-3 py-1 border ${
              hasLocation && within1km(lat, lng, c.lat, c.lng)
                ? "border-emerald-500 text-emerald-400"
                : "border-slate-700 hover:border-slate-500"
            }`}
          >
            {c.label}
          </button>
        ))}
        {hasLocation && (
          <button
            onClick={clearAndGo}
            className="rounded-full px-3 py-1 border border-slate-700 text-slate-400 hover:border-red-500 hover:text-red-400"
          >
            ✕ Clear location
          </button>
        )}
      </div>

      {active && (
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
          <span aria-hidden>📍</span>
          <span>
            Using: <strong className="font-semibold">{locationDisplayName(active)}</strong>
          </span>
          <button
            onClick={clearAndGo}
            className="ml-1 rounded text-emerald-500/70 hover:text-red-400"
            aria-label="Clear saved location"
          >
            ✕
          </button>
        </p>
      )}

      <div className="relative max-w-md">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Or search any city worldwide…"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm outline-none focus:border-emerald-500"
        />
        {hits.length > 0 && (
          <ul className="absolute z-30 mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 shadow-xl overflow-hidden">
            {hits.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => {
                    pickAndGo({
                      lat: h.latitude,
                      lng: h.longitude,
                      label: h.name,
                      source: "city",
                    });
                    setQuery("");
                    setHits([]);
                  }}
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
    </div>
  );
}

function within1km(aLat?: string, aLng?: string, bLat = 0, bLng = 0): boolean {
  if (!aLat || !aLng) return false;
  return Math.abs(Number(aLat) - bLat) < 0.01 && Math.abs(Number(aLng) - bLng) < 0.01;
}
