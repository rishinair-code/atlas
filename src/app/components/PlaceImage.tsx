"use client";

import { useEffect, useState } from "react";
import type { WikiMediaList } from "./PlaceImageTypes";

/**
 * Place imagery from Wikipedia. Uses the Wikipedia REST "media-list" of the
 * place's page (identified by the same name users search with), which needs
 * no API key. When nothing sensible is found — or the fetch fails — a
 * deterministic gradient + emoji tile keeps the layout intact.
 *
 * Results are cached per place id in a module-level map so lists render
 * consistently and don't refetch on remount.
 */

const cache = new Map<string, string | null>();

/** Non-photo images that look wrong as covers. */
const REJECT = [
  "icon", "logo", "flag", "map", "coat_of_arms", "seal", "stamp", "signature",
  "symbol", "ambox", "question", "edit", "padlock", "pictogram", "disambig",
];

/** Largest srcset entry (the 1280px/2x variant) or the only one present. */
function bestSrc(item: import("./PlaceImageTypes").WikiMediaItem): string | null {
  const set = item.srcset ?? [];
  if (set.length === 0) return null;
  const last = set[set.length - 1];
  return last?.src ?? null;
}

function pickImage(lead: WikiMediaList): string | null {
  const items = lead.items ?? [];
  const acceptable = items.filter((i) => {
    if (i.type !== "image") return false;
    const title = i.title?.toLowerCase() ?? "";
    return !REJECT.some((bad) => title.includes(bad));
  });
  // The article's lead image is the canonical "what this place looks like".
  const leadItem = acceptable.find((i) => (i as { leadImage?: boolean }).leadImage);
  const chosen = leadItem ?? acceptable[0];
  return chosen ? bestSrc(chosen) : null;
}

export default function PlaceImage({
  placeId,
  placeName,
  emoji = "🧭",
  heightClass = "h-40",
}: {
  placeId: string;
  placeName: string;
  emoji?: string;
  heightClass?: string;
}) {
  const [url, setUrl] = useState<string | null | undefined>(() => cache.get(placeId));

  useEffect(() => {
    if (cache.has(placeId)) {
      setUrl(cache.get(placeId));
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const title = encodeURIComponent(placeName.replace(/\s+/g, "_"));
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/media-list/${title}`,
          { headers: { Accept: "application/json" } },
        );
        if (!res.ok) throw new Error(`wiki ${res.status}`);
        const json = (await res.json()) as WikiMediaList;
        const found = pickImage(json);
        if (!alive) return;
        cache.set(placeId, found);
        setUrl(found);
      } catch {
        if (!alive) return;
        cache.set(placeId, null);
        setUrl(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [placeId, placeName]);

  if (url === undefined) {
    return <div className={`${heightClass} w-full bg-slate-800/60`} />;
  }

  if (url === null) {
    // Deterministic gradient from the place id so tiles vary but stay stable.
    const hue = [...placeId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
    return (
      <div
        className={`${heightClass} w-full flex items-center justify-center text-5xl`}
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 40% 22%), hsl(${(hue + 60) % 360} 45% 30%))`,
        }}
      >
        <span aria-hidden>{emoji}</span>
      </div>
    );
  }

  return (
    <div className={`${heightClass} w-full overflow-hidden bg-slate-800`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={placeName}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
