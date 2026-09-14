"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { VisitedEntry } from "@/lib/types";

/**
 * Zoomable dark world map showing the user's travel footprint:
 * a soft 100 km circle around every visited place (the "territory"),
 * a solid dot per visit, and the great-circle journey linking visits
 * oldest → newest. Raw Leaflet, lazily imported to keep SSR happy.
 */

function greatCirclePoints(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  n = 64,
): [number, number][] {
  const rad = (d: number) => (d * Math.PI) / 180;
  const deg = (r: number) => (r * 180) / Math.PI;
  const φ1 = rad(a.lat), λ1 = rad(a.lng), φ2 = rad(b.lat), λ2 = rad(b.lng);
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2,
      ),
    );
  if (d < 1e-9) return [[a.lat, a.lng], [b.lat, b.lng]];
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
    // Unwrap longitude so the line never jumps across the antimeridian.
    let dλ = Math.atan2(y, x) - λ1;
    while (dλ > Math.PI) dλ -= 2 * Math.PI;
    while (dλ < -Math.PI) dλ += 2 * Math.PI;
    pts.push([deg(φ), deg(λ1 + dλ)]);
  }
  return pts;
}

export default function FootprintMap({ entries }: { entries: VisitedEntry[] }) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      const L = await import("leaflet");
      if (disposed || !divRef.current || mapRef.current) return;

      const map = L.map(divRef.current, {
        center: [25, 0],
        zoom: 2,
        minZoom: 2,
        worldCopyJump: true,
        scrollWheelZoom: true,
        attributionControl: true,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      // Trigger a resize pass once mounted so tiles fill the container.
      setTimeout(() => map.invalidateSize(), 50);
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const L = await import("leaflet");
      const map = mapRef.current;
      const layer = layerRef.current;
      if (!map || !layer) return;

      layer.clearLayers();
      const sorted = [...entries].sort((a, b) =>
        (a.date || String(a.year ?? "")).localeCompare(b.date || String(b.year ?? "")),
      );

      // Soft "territory" circles: 100 km around each visit.
      for (const e of sorted) {
        L.circle([e.lat, e.lng], {
          radius: 100_000,
          color: "#34d399",
          weight: 1,
          opacity: 0.25,
          fillColor: "#34d399",
          fillOpacity: 0.08,
          interactive: false,
        }).addTo(layer);
      }

      // Journey line, oldest → newest.
      for (let i = 1; i < sorted.length; i++) {
        L.polyline(greatCirclePoints(sorted[i - 1], sorted[i]), {
          color: "#38bdf8",
          weight: 1.5,
          opacity: 0.7,
          dashArray: "4 6",
        }).addTo(layer);
      }

      // Visit dots.
      const bounds: [number, number][] = [];
      sorted.forEach((e, idx) => {
        L.circleMarker([e.lat, e.lng], {
          radius: 6,
          color: "#0f172a",
          weight: 1.5,
          fillColor: idx === sorted.length - 1 ? "#fbbf24" : "#34d399",
          fillOpacity: 1,
        })
          .bindTooltip(
            `<strong>${e.placeName}</strong><br/>${e.country}${e.date ? ` · ${e.date}` : ""}`,
            { direction: "top", offset: [0, -6] },
          )
          .addTo(layer);
        bounds.push([e.lat, e.lng]);
      });

      if (bounds.length === 1) {
        map.setView(bounds[0], 5);
      } else if (bounds.length > 1) {
        map.fitBounds(L.latLngBounds(bounds).pad(0.25));
      }
    })();
  }, [entries]);

  return <div ref={divRef} className="h-[70vh] min-h-[420px] w-full rounded-xl z-0" />;
}
