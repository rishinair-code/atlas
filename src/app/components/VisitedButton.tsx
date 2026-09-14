"use client";

import { useEffect, useState } from "react";
import type { Place } from "@/lib/types";
import { isVisited, markVisited, removeVisited } from "@/lib/store";
import { useStore } from "@/lib/useStore";

interface Props {
  place: Place;
  /** Compact variant for cards/lists; default is a full button. */
  compact?: boolean;
}

/**
 * "Mark as visited" — opens a small modal for date, rating and notes,
 * then persists via the Atlas store (Firebase when signed in, localStorage
 * as guest). Toggling back removes the visit.
 */
export default function VisitedButton({ place, compact = false }: Props) {
  const { ready } = useStore();
  const visited = ready && isVisited(place.id);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");

  async function save() {
    setSaving(true);
    try {
      await markVisited(place, { date, rating: rating || undefined, notes: notes.trim() || undefined });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function unmark() {
    await removeVisited(place.id);
  }

  const base = compact
    ? "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
    : "rounded-lg px-5 py-2 text-sm font-medium transition-colors";

  return (
    <>
      {visited ? (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void unmark();
          }}
          title="Click to remove from visited"
          className={`${base} border-emerald-500/60 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 ${
            compact ? "" : "inline-flex items-center gap-2"
          }`}
        >
          ✓ Visited
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className={`${base} border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-emerald-400`}
        >
          {compact ? "+ Visited?" : "📍 Mark as visited"}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => {
            // This button lives inside PlaceCard's <Link> — never navigate.
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <h3 className="text-lg font-semibold">When did you visit {place.name}?</h3>

            <label className="mt-4 block text-xs uppercase tracking-wide text-slate-500">
              Date
              <input
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              />
            </label>

            <div className="mt-4">
              <span className="text-xs uppercase tracking-wide text-slate-500">Rating</span>
              <div className="mt-1 flex gap-1 text-2xl">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(rating === n ? 0 : n)}
                    className={n <= rating ? "text-amber-400" : "text-slate-700 hover:text-slate-500"}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-4 block text-xs uppercase tracking-wide text-slate-500">
              Notes (optional)
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Who you went with, what you'd do differently…"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
              />
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => void save()}
                disabled={saving || !date}
                className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save visit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
