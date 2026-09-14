/** Minimal shape of the Wikipedia media-list response we consume. */
export interface WikiMediaItem {
  type: string;
  title?: string;
  srcset?: { src: string; scale?: string }[];
  original?: { source: string; width: number; height: number };
}

export interface WikiMediaList {
  items?: WikiMediaItem[];
}
