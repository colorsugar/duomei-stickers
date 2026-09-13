import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { hasStickerGif, useStickerIndex } from "@/lib/available";
import { peekGif, requestGif, subscribeGif } from "@/lib/gif-load";
import { stickerGif, stickerPng } from "@/lib/packs";

export function StickerGif({
  packId,
  stickerId,
  alt,
  className = "h-full w-full object-contain p-2",
  animated = true,
  eager = false,
}: {
  packId: string;
  stickerId: string;
  alt: string;
  className?: string;
  animated?: boolean;
  eager?: boolean;
}) {
  const availability = useStickerIndex();
  const available = hasStickerGif(packId, stickerId, availability);
  const [failed, setFailed] = useState(false);
  const [pngOn, setPngOn] = useState(false);
  const [visible, setVisible] = useState(eager);
  const box = useRef<HTMLDivElement>(null);
  const pngSrc = stickerPng(packId, stickerId);
  const gifSrc = stickerGif(packId, stickerId);
  const gif = useSyncExternalStore(
    (fn) => subscribeGif(gifSrc, fn),
    () => peekGif(gifSrc),
    () => peekGif(gifSrc),
  );
  const show = available && !failed;
  const playGif = animated && (eager || visible) && gif.status === "ready" && gif.url;

  useEffect(() => {
    setFailed(false);
    setPngOn(false);
  }, [packId, stickerId, gifSrc]);

  useEffect(() => {
    if (eager && animated) requestGif(gifSrc, 10);
  }, [eager, animated, gifSrc]);

  useEffect(() => {
    if (!animated || eager) return;
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const on = entry.isIntersecting;
        setVisible(on);
        if (on) requestGif(gifSrc, 0);
      },
      { rootMargin: "40px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animated, eager, gifSrc]);

  const loadingGif = animated && show && gif.status === "loading";
  const waitingGif = animated && show && visible && gif.status === "idle";

  return (
    <div ref={box} className="sticker-checker relative grid h-full w-full place-items-center">
      {show ? (
        <>
          <img
            src={pngSrc}
            alt={alt}
            draggable={false}
            className={`${className} pointer-events-none ${pngOn ? "opacity-100" : "opacity-0"}`}
            width={240}
            height={240}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={eager ? "high" : "low"}
            onLoad={() => setPngOn(true)}
            onError={() => setFailed(true)}
          />
          {playGif ? (
            <img
              src={gif.url ?? undefined}
              alt=""
              draggable={false}
              className={`${className} pointer-events-none absolute inset-0`}
              width={240}
              height={240}
              decoding="async"
            />
          ) : null}
          {loadingGif || waitingGif || (!pngOn && !playGif) ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
              <div className="sticker-loadbar">
                <span
                  style={{
                    transform: `scaleX(${loadingGif ? Math.max(0.06, gif.progress) : waitingGif ? 0.06 : pngOn ? 0 : 0.12})`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="grid h-full w-full place-items-center px-3 text-center text-xs font-medium text-muted">
          制作中
        </div>
      )}
    </div>
  );
}
