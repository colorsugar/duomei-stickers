import { type Sticker } from "@/lib/packs";
import { StickerGif } from "@/components/sticker-gif";
import { formatKb, stickerBytes, useStickerSizes } from "@/lib/available";

export function StickerCard({
  packId,
  sticker,
  onOpen,
}: {
  packId: string;
  sticker: Sticker;
  onOpen: () => void;
}) {
  const sizes = useStickerSizes();
  const kb = formatKb(stickerBytes(packId, sticker.id, sizes));
  return (
    <div className="sticker-tile flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card">
      <div className="relative aspect-square">
        <StickerGif packId={packId} stickerId={sticker.id} alt={sticker.name} animated />
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${sticker.name}，放大下载`}
          className="absolute inset-0 z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-melon"
        />
      </div>
      <div className="flex min-h-11 items-center justify-between gap-2 border-t border-line px-3">
        <span className="text-sm font-medium text-ink">{sticker.name}</span>
        <span className="text-xs text-subtle">{kb || "点击放大下载"}</span>
      </div>
    </div>
  );
}
