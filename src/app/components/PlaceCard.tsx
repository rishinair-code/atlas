import Link from "next/link";
import type { Place } from "@/lib/types";
import { activityEmoji, activityLabel } from "@/lib/activities";

export default function PlaceCard({ place }: { place: Place }) {
  return (
    <Link
      href={`/place/${place.id}`}
      className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col hover:border-emerald-500 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{place.name}</h3>
          <div className="text-xs text-slate-500">
            {place.country} · {place.kind}
          </div>
        </div>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300 whitespace-nowrap">
          ≈${place.costTier * 20}/day
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-400 flex-1 line-clamp-3">{place.blurb}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {place.activities.slice(0, 3).map((a) => (
          <span
            key={a}
            className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
          >
            {activityEmoji(a)} {activityLabel(a)}
          </span>
        ))}
      </div>
    </Link>
  );
}
