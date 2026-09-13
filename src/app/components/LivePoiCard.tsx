"use client";

/** Compact card for a live OpenStreetMap point of interest (no detail page — external links). */
export interface LivePoi {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: string;
}

export default function LivePoiCard({
  poi,
  distanceKm,
}: {
  poi: LivePoi;
  distanceKm: number;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{poi.name}</h3>
          <div className="text-xs text-slate-500">{prettyKind(poi.kind)} · OpenStreetMap</div>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400 whitespace-nowrap">
          {distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        <a
          href={`https://www.openstreetmap.org/?mlat=${poi.lat}&mlon=${poi.lng}#map=17/${poi.lat}/${poi.lng}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300 hover:bg-slate-700"
        >
          Map ↗
        </a>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300 hover:bg-slate-700"
        >
          Directions ↗
        </a>
      </div>
    </div>
  );
}

function prettyKind(kind: string): string {
  if (!kind) return "Place";
  return kind.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
