import Link from "next/link";
import type { Place } from "@/lib/types";
import { ACTIVITY_MAP, activityEmoji, activityLabel } from "@/lib/activities";
import TripHint from "./TripHint";
import VisitedButton from "./VisitedButton";
import PlaceImage from "./PlaceImage";

/**
 * Curated place card. The whole card is clickable via the stretched link
 * on the title (after:inset-0), while interactive controls (visited
 * toggle) sit above it with z-10 — so clicks never fight the navigation.
 */
export default function PlaceCard({ place }: { place: Place }) {
  const crowd =
    place.popularity >= 80 ? "Very popular" : place.popularity >= 50 ? "Popular" : "Hidden gem";

  return (
    <div className="relative rounded-xl border border-slate-800 bg-slate-900 flex flex-col hover:border-emerald-500 transition-colors overflow-hidden">
      <PlaceImage
        placeId={place.id}
        placeName={place.name}
        emoji={ACTIVITY_MAP[place.activities[0]]?.emoji ?? "🧭"}
      />
      <div className="p-5 flex flex-col flex-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">
            <Link
              href={`/place/${place.id}`}
              className="after:absolute after:inset-0 hover:text-emerald-400"
            >
              {place.name}
            </Link>
          </h3>
          <div className="text-xs text-slate-500">
            {place.country} · {place.kind}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {/* Real travel estimate from the user's saved location (empty until
              a location is set, in which case only the crowd level shows). */}
          <TripHint place={place} />
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400 whitespace-nowrap">
            {crowd}
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-400 flex-1 line-clamp-3">{place.blurb}</p>
      <div className="mt-3 flex flex-wrap gap-1.5 items-center relative z-10">
        {place.activities.slice(0, 3).map((a) => (
          <span
            key={a}
            className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
          >
            {activityEmoji(a)} {activityLabel(a)}
          </span>
        ))}
        <span className="ml-auto">
          <VisitedButton place={place} compact />
        </span>
      </div>
      </div>
    </div>
  );
}
