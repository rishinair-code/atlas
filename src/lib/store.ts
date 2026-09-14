"use client";

/**
 * Data store — Firebase Realtime Database when configured,
 * localStorage fallback (guest mode) otherwise.
 */

import type { CostTier, Place, Trip, VisitedEntry, WishlistEntry } from "./types";
import { getFirebase, isFirebaseConfigured } from "./firebase";

type Listener = () => void;

export interface AtlasData {
  visited: Record<string, VisitedEntry>;
  wishlist: Record<string, WishlistEntry>;
  trips: Record<string, Trip>;
}

const LS_KEY = "atlas:data:v1";

function readLocal(): AtlasData {
  if (typeof window === "undefined") return { visited: {}, wishlist: {}, trips: {} };
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as AtlasData;
  } catch {
    // corrupted — reset
  }
  return { visited: {}, wishlist: {}, trips: {} };
}

function writeLocal(data: AtlasData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(data));
  emit();
}

let data: AtlasData = { visited: {}, wishlist: {}, trips: {} };
let mode: "local" | "firebase" = "local";
let inited = false;
let ready = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

/** Subscribe to data changes. Returns unsubscribe. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function storeMode(): "local" | "firebase" {
  return mode;
}

/** True once the initial load (local or Firebase) has completed. */
export function storeReady(): boolean {
  return ready;
}

function markReady() {
  if (!ready) {
    ready = true;
  }
  emit();
}

export async function initStore(): Promise<void> {
  if (inited || typeof window === "undefined") return;
  inited = true;

  if (!isFirebaseConfigured()) {
    data = readLocal();
    mode = "local";
    markReady();
    return;
  }

  const fb = getFirebase();

  try {
    const { signInAnonymously, onAuthStateChanged } = await import("firebase/auth");
    const { ref, onValue } = await import("firebase/database");
    const fbAuth = fb.auth;

    onAuthStateChanged(fbAuth, async (user) => {
      if (!user) {
        try {
          await signInAnonymously(fbAuth);
          return; // onAuthStateChanged fires again
        } catch {
          mode = "local";
          data = readLocal();
          markReady();
          return;
        }
      }

      const root = ref(fb.db, `users/${user.uid}`);
      onValue(root, (snap) => {
        const val = snap.val() as AtlasData | null;
        data = {
          visited: val?.visited ?? {},
          wishlist: val?.wishlist ?? {},
          trips: val?.trips ?? {},
        };
        mode = "firebase";
        markReady();
      });
    });
  } catch (err) {
    console.warn("Firebase unavailable, using local mode.", err);
    mode = "local";
    data = readLocal();
    markReady();
  }
}

// ── Reads ────────────────────────────────────────────────────────────────────

export function getData(): AtlasData {
  return data;
}

export function getVisited(): VisitedEntry[] {
  return Object.entries(data.visited).sort((a, b) => (b[1].date || "").localeCompare(a[1].date || "")).map(([, v]) => v);
}

export function getWishlist(): WishlistEntry[] {
  return Object.values(data.wishlist);
}

export function getTrips(): Trip[] {
  return Object.values(data.trips).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export function isWishlisted(placeId: string): boolean {
  return Boolean(data.wishlist[placeId]);
}

export function isVisited(placeId: string): boolean {
  return Boolean(data.visited[placeId]);
}

// ── Writes ───────────────────────────────────────────────────────────────────

function fbPath(): string | null {
  if (!isFirebaseConfigured()) return null;
  const fb = getFirebase();
  const user = fb.auth.currentUser;
  if (!fb || !user) return null;
  return `users/${user.uid}`;
}

export async function toggleWishlist(place: Place): Promise<boolean> {
  const nowWishlisted = !isWishlisted(place.id);
  const path = fbPath();
  if (path && mode === "firebase") {
    const { ref, set, remove } = await import("firebase/database");
    const r = ref(getFirebase().db, `${path}/wishlist/${place.id}`);
    if (nowWishlisted) {
      await set(r, {
        placeId: place.id,
        placeName: place.name,
        country: place.country,
        lat: place.lat,
        lng: place.lng,
        priority: "medium",
        createdAt: Date.now(),
      });
    } else {
      await remove(r);
    }
  } else {
    const local = readLocal();
    if (nowWishlisted) {
      local.wishlist[place.id] = {
        placeId: place.id,
        placeName: place.name,
        country: place.country,
        lat: place.lat,
        lng: place.lng,
        priority: "medium",
        createdAt: Date.now(),
      };
    } else {
      delete local.wishlist[place.id];
    }
    data = local;
    writeLocal(data);
  }
  return nowWishlisted;
}

export async function markVisited(
  place: Place,
  details: { date: string; rating?: number; notes?: string },
): Promise<void> {
  const path = fbPath();
  const entry: VisitedEntry = {
    placeId: place.id,
    placeName: place.name,
    country: place.country,
    lat: place.lat,
    lng: place.lng,
    date: details.date,
    rating: details.rating,
    notes: details.notes,
    createdAt: Date.now(),
  };
  if (path && mode === "firebase") {
    const { ref, set } = await import("firebase/database");
    await set(ref(getFirebase().db, `${path}/visited/${place.id}`), entry);
  } else {
    const local = readLocal();
    local.visited[place.id] = entry;
    data = local;
    writeLocal(data);
  }
}

export async function removeVisited(placeId: string): Promise<void> {
  const path = fbPath();
  if (path && mode === "firebase") {
    const { ref, remove } = await import("firebase/database");
    await remove(ref(getFirebase().db, `${path}/visited/${placeId}`));
  } else {
    const local = readLocal();
    delete local.visited[placeId];
    data = local;
    writeLocal(data);
  }
}

export async function saveTrip(trip: Omit<Trip, "id"> & { id?: string }): Promise<string> {
  const id = trip.id ?? `trip_${Date.now().toString(36)}`;
  const full: Trip = { ...(trip as Trip), id };
  const path = fbPath();
  if (path && mode === "firebase") {
    const { ref, set } = await import("firebase/database");
    await set(ref(getFirebase().db, `${path}/trips/${id}`), full);
  } else {
    const local = readLocal();
    local.trips[id] = full;
    data = local;
    writeLocal(data);
  }
  return id;
}

export async function deleteTrip(id: string): Promise<void> {
  const path = fbPath();
  if (path && mode === "firebase") {
    const { ref, remove } = await import("firebase/database");
    await remove(ref(getFirebase().db, `${path}/trips/${id}`));
  } else {
    const local = readLocal();
    delete local.trips[id];
    data = local;
    writeLocal(data);
  }
}

export async function updateTrip(id: string, patch: Partial<Trip>): Promise<void> {
  const path = fbPath();
  if (path && mode === "firebase") {
    const { ref, update } = await import("firebase/database");
    await update(ref(getFirebase().db, `${path}/trips/${id}`), patch);
  } else {
    const local = readLocal();
    if (local.trips[id]) {
      local.trips[id] = { ...local.trips[id], ...patch };
      data = local;
      writeLocal(data);
    }
  }
}

export function budgetTierOf(trip: Trip): CostTier {
  return trip.budgetTier;
}
