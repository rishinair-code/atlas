"use client";

import { useMemo } from "react";
import Link from "next/link";
import FootprintMap from "../components/FootprintMap";
import { useStore } from "@/lib/useStore";
import { computeFootprintStats } from "@/lib/footprint";
import { formatDate } from "@/lib/format";

function StatCard({
  value,
  label,
  sub,
}: {
  value: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-3xl font-bold tracking-tight text-emerald-400">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-300">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function FootprintPage() {
  const { visited, ready } = useStore();

  const entries = useMemo(() => Object.values(visited), [visited]);
  const stats = useMemo(() => computeFootprintStats(entries), [entries]);
  const timeline = useMemo(
    () =>
      [...entries].sort((a, b) =>
        (b.date || String(b.year ?? "")).localeCompare(a.date || String(a.year ?? "")),
      ),
    [entries],
  );

  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-slate-500">Loading your footprint…</div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Your footprint</h1>
        <p className="mt-3 max-w-xl text-slate-400">
          Nothing here yet — your map fills in as you travel. Mark places as visited while
          browsing and they&apos;ll show up as glowing pins on your world map.
        </p>
        <Link
          href="/explore"
          className="mt-6 inline-block rounded-lg bg-emerald-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
        >
          Explore places →
        </Link>
      </div>
    );
  }

  const lapsLabel =
    stats.earthLaps >= 1
      ? `${stats.earthLaps.toFixed(1)}×`
      : `${Math.round(stats.earthLaps * 100)}%`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Your footprint</h1>
        <p className="mt-2 text-slate-400">
          Every place you&apos;ve marked visited — your territory, your journey, your stats.
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          value={String(stats.count)}
          label={stats.count === 1 ? "place visited" : "places visited"}
          sub={stats.countries > 0 ? `across ${stats.countries} ${stats.countries === 1 ? "country" : "countries"}` : undefined}
        />
        <StatCard
          value={`${stats.journeyKm.toLocaleString()} km`}
          label="journey traced"
          sub={
            stats.longestHop
              ? `longest hop: ${stats.longestHop.from} → ${stats.longestHop.to}`
              : undefined
          }
        />
        <StatCard
          value={lapsLabel}
          label="of the way around Earth"
          sub="if you'd walked your journey in a straight line"
        />
        <StatCard
          value={`${stats.worldCoveredPercent < 0.01 ? stats.worldCoveredPercent.toFixed(3) : stats.worldCoveredPercent.toFixed(2)}%`}
          label="of Earth's surface"
          sub="100 km around each visit, combined"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          value={`${stats.northCount} / ${stats.southCount}`}
          label="northern / southern hemisphere"
        />
        <StatCard
          value={
            stats.extremes.north && stats.extremes.south
              ? `${stats.extremes.north.name} ↔ ${stats.extremes.south.name}`
              : "—"
          }
          label="north–south span"
          sub="your latitudinal extremes"
        />
        <StatCard
          value={
            stats.extremes.west && stats.extremes.east
              ? `${stats.extremes.west.name} ↔ ${stats.extremes.east.name}`
              : "—"
          }
          label="east–west span"
          sub="your longitudinal extremes"
        />
        <StatCard
          value={stats.ratingAvg ? `★ ${stats.ratingAvg.toFixed(1)}` : "—"}
          label="average rating you gave"
          sub={stats.firstYear ? `traveling since ${stats.firstYear}` : undefined}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">The map</h2>
        <p className="mt-1 text-sm text-slate-500">
          Glowing areas show 100 km around each visit. The dashed line traces your journey,
          oldest to newest. <span className="text-amber-400">Amber</span> is your latest trip.
          Zoom, pan, click pins.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
          <FootprintMap entries={timeline} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Timeline</h2>
        <ol className="mt-4 space-y-3">
          {timeline.map((e) => (
            <li
              key={e.placeId}
              className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="w-24 shrink-0 text-xs text-slate-500">
                {e.date ? formatDate(e.date) : e.year ?? "—"}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/place/${e.placeId}`} className="font-medium hover:text-emerald-400">
                  {e.placeName}
                </Link>
                <div className="text-xs text-slate-500">{e.country}</div>
                {e.notes && <p className="mt-1 text-sm text-slate-400">{e.notes}</p>}
              </div>
              {e.rating ? (
                <div className="shrink-0 text-amber-400" title={`${e.rating}/5`}>
                  {"★".repeat(e.rating)}
                  <span className="text-slate-700">{"★".repeat(5 - e.rating)}</span>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
