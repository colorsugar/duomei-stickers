type GifStatus = "idle" | "loading" | "ready" | "error";

export type GifSnap = {
  status: GifStatus;
  progress: number;
  url: string | null;
};

type Entry = {
  status: GifStatus;
  progress: number;
  url: string | null;
  snap: GifSnap;
  listeners: Set<() => void>;
};

const MAX = 2;
const IDLE: GifSnap = { status: "idle", progress: 0, url: null };
const entries = new Map<string, Entry>();
const queue: { src: string; priority: number }[] = [];
let active = 0;

function snapshot(e: Entry): GifSnap {
  return { status: e.status, progress: e.progress, url: e.url };
}

function get(src: string): Entry {
  let e = entries.get(src);
  if (!e) {
    e = { status: "idle", progress: 0, url: null, snap: IDLE, listeners: new Set() };
    entries.set(src, e);
  }
  return e;
}

function emit(e: Entry) {
  e.snap = snapshot(e);
  for (const fn of e.listeners) fn();
}

export function peekGif(src: string): GifSnap {
  return get(src).snap;
}

export function subscribeGif(src: string, fn: () => void) {
  const e = get(src);
  e.listeners.add(fn);
  return () => {
    e.listeners.delete(fn);
  };
}

export function requestGif(src: string, priority = 0) {
  const e = get(src);
  if (e.status === "ready" || e.status === "loading") return;
  const existing = queue.find((q) => q.src === src);
  if (existing) {
    existing.priority = Math.max(existing.priority, priority);
    queue.sort((a, b) => b.priority - a.priority);
    return;
  }
  queue.push({ src, priority });
  queue.sort((a, b) => b.priority - a.priority);
  pump();
}

function pump() {
  while (active < MAX && queue.length) {
    const job = queue.shift();
    if (!job) return;
    const e = get(job.src);
    if (e.status === "ready" || e.status === "loading") continue;
    e.status = "loading";
    e.progress = 0.02;
    emit(e);
    active += 1;
    void load(job.src).finally(() => {
      active -= 1;
      pump();
    });
  }
}

async function load(src: string) {
  const e = get(src);
  try {
    const res = await fetch(src, { cache: "force-cache" });
    if (!res.ok) throw new Error("fail");
    const total = Number(res.headers.get("content-length")) || 0;
    const reader = res.body?.getReader();
    if (!reader) {
      const blob = await res.blob();
      e.url = URL.createObjectURL(blob);
      e.progress = 1;
      e.status = "ready";
      emit(e);
      return;
    }
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      e.progress = total ? Math.min(0.99, received / total) : Math.min(0.92, e.progress + 0.08);
      emit(e);
    }
    const blob = new Blob(chunks as BlobPart[], { type: "image/gif" });
    if (e.url) URL.revokeObjectURL(e.url);
    e.url = URL.createObjectURL(blob);
    e.progress = 1;
    e.status = "ready";
    emit(e);
  } catch {
    e.status = "error";
    emit(e);
  }
}
