import { useEffect, useState, useSyncExternalStore } from "react";
import { PACKS } from "./packs";

export type StickerIndex = Record<string, string[]>;
export type StickerSizes = Record<string, Record<string, number>>;

function allPackIndex(): StickerIndex {
  const out: StickerIndex = {};
  for (const pack of PACKS) {
    out[pack.id] = pack.stickers.map((s) => s.id);
  }
  return out;
}

const SERVER_INDEX: StickerIndex = allPackIndex();

let index: StickerIndex = SERVER_INDEX;
let sizes: StickerSizes = {};
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function peekIndex() {
  return index;
}

export function peekSizes() {
  return sizes;
}

function getServerSnapshot() {
  return SERVER_INDEX;
}

export function hasStickerGif(packId: string, stickerId: string, data: StickerIndex = index) {
  if (PACKS.find((p) => p.id === packId)?.stickers.some((s) => s.id === stickerId)) {
    return true;
  }
  return data[packId]?.includes(stickerId) ?? false;
}

export function packHasAnyGif(packId: string, data: StickerIndex = index) {
  return (data[packId]?.length ?? 0) > 0;
}

export function stickerBytes(packId: string, stickerId: string, data: StickerSizes = sizes) {
  return data[packId]?.[stickerId] ?? 0;
}

export function formatKb(bytes: number) {
  if (!bytes) return "";
  return `${Math.round(bytes / 1024)} KB`;
}

export function subscribeIndex(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isComplete(data: StickerIndex) {
  return PACKS.every((pack) => (data[pack.id]?.length ?? 0) >= pack.stickers.length);
}

async function refreshIndex() {
  try {
    const [idxRes, sizeRes] = await Promise.all([
      fetch("/stickers/index.json"),
      fetch("/stickers/sizes.json"),
    ]);
    if (idxRes.ok) {
      const data = (await idxRes.json()) as StickerIndex;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const merged: StickerIndex = { ...data };
        for (const [id, ids] of Object.entries(SERVER_INDEX)) {
          merged[id] = [...new Set([...(merged[id] ?? []), ...ids])];
        }
        index = merged;
      }
    }
    if (sizeRes.ok) {
      const data = (await sizeRes.json()) as StickerSizes;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        sizes = data;
      }
    }
    emit();
    return isComplete(index);
  } catch {
    return false;
  }
}

if (typeof window !== "undefined") {
  void refreshIndex();
}

export function useStickerIndex() {
  const live = useSyncExternalStore(subscribeIndex, peekIndex, getServerSnapshot);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    void refreshIndex();
  }, []);
  return hydrated ? live : SERVER_INDEX;
}

export function useStickerSizes() {
  useStickerIndex();
  return useSyncExternalStore(subscribeIndex, peekSizes, () => sizes);
}
