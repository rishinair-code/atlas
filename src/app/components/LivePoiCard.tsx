"use client";

import PlaceImage from "./PlaceImage";

/** Compact card for a live OpenStreetMap point of interest (no detail page — external links). */
export interface LivePoi {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: string;
}

/** Emoji fallback per OSM feature kind. */
function kindEmoji(kind: string): string {
  const k = kind.toLowerCase();
  if (k.includes("beach")) return "🏖️";
  if (k.includes("marina") || k.includes("harbour")) return "⛵";
  if (k.includes("museum") || k.includes("gallery") || k.includes("artwork")) return "🖼️";
  if (k.includes("park") || k.includes("garden")) return "🌿";
  if (k.includes("waterfall")) return "💦";
  if (k.includes("peak")) return "⛰️";
  if (k.includes("castle") || k.includes("fort")) return "🏰";
  if (k.includes("ruins") || k.includes("archaeological")) return "🏛️";
  if (k.includes("zoo") || k.includes("aquarium") || k.includes("wildlife")) return "🦜";
  if (k.includes("spa") || k.includes("bath") || k.includes("hot_spring")) return "♨️";
  if (k.includes("restaurant") || k.includes("cafe") || k.includes("marketplace")) return "🍜";
  if (k.includes("nightclub") || k.includes("bar")) return "🌃";
  if (k.includes("theme_park") || k.includes("water_park")) return "🎡";
  if (k.includes("viewpoint")) return "🌅";
  if (k.includes("cave")) return "🕳️";
  if (k.includes("swimming") || k.includes("pool")) return "🏊";
  return "📍";
}

export default function LivePoiCard({
  poi,
  distanceKm,
}: {
  poi: LivePoi;
  distanceKm: number;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col overflow-hidden">
      <PlaceImage
        placeId={poi.id}
        placeName={poi.name}
        emoji={kindEmoji(poi.kind)}
        heightClass="h-32"
      />
      <div className="p-5 flex flex-col flex-1">
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
    </div>
  );
}

function prettyKind(kind: string): string {
  if (!kind) return "Place";
  return kind.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
