"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { haversineKm } from "@/lib/geo";
import LivePoiCard, { type LivePoi } from "./LivePoiCard";

/**
 * Live OpenStreetMap results for the Explore page. Fetches whenever the
 * point/activity/radius changes (dataset-only filters like type and budget
 * disable it, since OSM POIs carry neither).
 */
export default function LiveResults({
  lat,
  lng,
  category,
  radiusKm,
  excludeNames,
}: {
  lat: number;
  lng: number;
  category: string;
  radiusKm: number;
  /** Curated place names already shown above — deduped by lowercase name. */
  excludeNames: string[];
}) {
  const [live, setLive] = useState<LivePoi[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const seq = useRef(0);

  useEffect(() => {
    const s = ++seq.current;
    setState("loading");
    // Overpass crawls on wide areas — the API caps at 50 km regardless.
    const liveRadiusM = Math.min(radiusKm * 1000, 50_000);
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius: String(liveRadiusM),
    });
    if (category) params.set("category", category);
    (async () => {
      try {
        const res = await fetch(`/api/places/nearby?${params.toString()}`);
        const json = (await res.json()) as { pois?: LivePoi[] };
        if (s !== seq.current) return;
        setLive(json.pois ?? []);
        setState("ok");
      } catch {
        if (s !== seq.current) return;
        setLive([]);
        setState("error");
      }
    })();
  }, [lat, lng, category, radiusKm]);

  const results = useMemo(() => {
    const excluded = new Set(excludeNames.map((n) => n.toLowerCase()));
    return live
      .map((poi) => ({ poi, distanceKm: haversineKm(lat, lng, poi.lat, poi.lng) }))
      .filter((r) => !excluded.has(r.poi.name.toLowerCase()))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, lat, lng, JSON.stringify(excludeNames)]);

  if (state === "loading" && results.length === 0) {
    return (
      <p className="mt-6 text-xs text-slate-500">Searching the live map near you…</p>
    );
  }

  if (results.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">
        More near you
        <span className="ml-2 align-middle text-xs font-normal text-slate-500">
          live · OpenStreetMap
          {radiusKm > 50 && " (live search capped at 50 km)"}
        </span>
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map(({ poi, distanceKm }) => (
          <LivePoiCard key={poi.id} poi={poi} distanceKm={distanceKm} />
        ))}
      </div>
    </section>
  );
}
