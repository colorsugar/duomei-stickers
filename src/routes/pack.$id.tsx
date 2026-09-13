import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { StickerCard } from "@/components/sticker-card";
import { StickerModal } from "@/components/sticker-modal";
import { StickerGif } from "@/components/sticker-gif";
import { packHasAnyGif, useStickerIndex } from "@/lib/available";
import { getPack, STORE_SPEC, sortStickers, type Sticker, type StickerSort } from "@/lib/packs";
import { downloadPackZip } from "@/lib/download";

export const Route = createFileRoute("/pack/$id")({
  loader: ({ params }) => {
    const pack = getPack(params.id);
    if (!pack) throw notFound();
    return { pack };
  },
  component: PackPage,
});

function PackPage() {
  const { pack } = Route.useLoaderData();
  const availability = useStickerIndex();
  const [active, setActive] = useState<Sticker | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sort, setSort] = useState<StickerSort>("default");
  const inProgress = !packHasAnyGif(pack.id, availability);
  const stickers = sortStickers(pack.stickers, sort);

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link
          to="/"
          hash="packs"
          className="tap-target inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-melon"
        >
          <ArrowLeft className="h-4 w-4" />
          全部套装
        </Link>

        <div className="mt-5 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <span className={`block h-1 ${pack.accent === "rind" ? "bg-rind" : pack.accent === "blush" ? "bg-blush" : "bg-melon"}`} />
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-4">
            <div className="size-20 shrink-0 overflow-hidden rounded-md border border-line">
              <StickerGif packId={pack.id} stickerId={pack.stickers[0].id} alt={pack.name} animated={false} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-melon">
                {pack.nameEn}
              </p>
              <h1 className="mt-1 font-display text-4xl text-ink">{pack.name}</h1>
              <p className="mt-2 text-sm text-muted sm:text-base">
                {pack.tagline} · {pack.stickers.length} 张 · {STORE_SPEC.size}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || inProgress}
            onClick={async () => {
              setBusy(true);
              setMsg(null);
              try {
                const n = await downloadPackZip(pack);
                setMsg(`已打包 ${n} 张`);
              } catch {
                setMsg("这套还在制作中");
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-melon pl-5 pr-4 text-sm font-semibold text-cream transition-transform duration-150 ease-out active:not-disabled:scale-[0.96] disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {busy ? "打包中…" : inProgress ? "制作中" : "下载整套 ZIP"}
          </button>
          {inProgress ? null : (
            <a
              href={`/downloads/${pack.id}.zip?v=76`}
              download={`${pack.name}.zip`}
              className="inline-flex h-11 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-ink"
            >
              直链下载
            </a>
          )}
          </div>
          </div>
        </div>
        {inProgress ? (
          <p className="mt-3 rounded-md border border-line bg-surface px-4 py-3 text-sm text-muted">
            这套还在制作中。格子会显示名称，GIF 完成后会自动出现。
          </p>
        ) : null}
        {msg ? <p className="mt-2 text-sm text-muted">{msg}</p> : null}

        <div className="mt-8 mb-3 flex items-end justify-between gap-3">
          <h2 className="font-display text-xl text-ink">{pack.name}</h2>
          <label className="flex items-center gap-2 text-sm text-muted">
            排序
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as StickerSort)}
              className="h-9 rounded-md border border-line bg-surface px-2 text-sm text-ink"
            >
              <option value="default">默认顺序</option>
              <option value="name">名称</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stickers.map((s) => (
            <StickerCard key={s.id} packId={pack.id} sticker={s} onOpen={() => setActive(s)} />
          ))}
        </div>
      </main>
      <SiteFooter />
      {active ? <StickerModal pack={pack} sticker={active} onClose={() => setActive(null)} /> : null}
    </div>
  );
}
