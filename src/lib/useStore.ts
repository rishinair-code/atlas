"use client";

import { useEffect, useState } from "react";
import {
  initStore,
  subscribe,
  storeReady,
  getData,
  type AtlasData,
} from "./store";

/**
 * Subscribe the component tree to the Atlas data store (visited / wishlist /
 * trips). Boots the store on first mount and re-renders on every change —
 * works identically in Firebase mode and guest/localStorage mode.
 */
export function useStore(): AtlasData & { ready: boolean } {
  const [state, setState] = useState<AtlasData>(() => getData());
  const [ready, setReady] = useState(() => storeReady());

  useEffect(() => {
    void initStore();
    const sync = () => {
      setState(getData());
      setReady(storeReady());
    };
    sync(); // catch data that arrived between render and subscribe
    return subscribe(sync);
  }, []);

  return { ...state, ready };
}
