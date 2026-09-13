import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { type Pack, type Sticker, STORE_SPEC, stickerGif } from "@/lib/packs";
import { hasStickerGif, formatKb, stickerBytes, useStickerIndex, useStickerSizes } from "@/lib/available";
import { downloadSticker } from "@/lib/download";
import { StickerGif } from "@/components/sticker-gif";
import { requestGif } from "@/lib/gif-load";

export function StickerModal({
  pack,
  sticker,
  onClose,
}: {
  pack: Pack;
  sticker: Sticker;
  onClose: () => void;
}) {
  const availability = useStickerIndex();
  const sizes = useStickerSizes();
  const available = hasStickerGif(pack.id, sticker.id, availability);
  const kb = formatKb(stickerBytes(pack.id, sticker.id, sizes));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    requestGif(stickerGif(pack.id, sticker.id), 20);
  }, [pack.id, sticker.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-seed/45 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sticker-modal-title"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-line bg-surface shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="aspect-square">
          <StickerGif
            packId={pack.id}
            stickerId={sticker.id}
            alt={sticker.name}
            eager
            animated
            className="h-full w-full object-contain p-6"
          />
        </div>
        <div className="space-y-3 p-5">
          <div>
            <p id="sticker-modal-title" className="font-display text-2xl text-ink">
              {sticker.name}
            </p>
            <p className="mt-1 text-sm text-muted">
              {pack.name} · {STORE_SPEC.size} · {kb || STORE_SPEC.format}
            </p>
          </div>
          {msg ? <p className="text-sm text-muted">{msg}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-melon pl-4 pr-3.5 text-sm font-semibold text-cream transition-transform duration-150 ease-out active:not-disabled:scale-[0.96] disabled:opacity-60"
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                try {
                  await downloadSticker(pack.id, sticker.id, sticker.name);
                } catch {
                  setMsg(available ? "下载失败，请再试一次" : "这张还在制作中");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Download className="h-4 w-4" />
              {busy ? "下载中…" : "下载 GIF"}
            </button>
            <button
              type="button"
              className="tap-target h-11 rounded-md border border-line px-4 text-sm font-medium text-ink transition-transform duration-150 ease-out active:scale-[0.96]"
              onClick={onClose}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
