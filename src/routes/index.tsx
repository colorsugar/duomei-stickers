import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { StickerGif } from "@/components/sticker-gif";
import { PACKS, STORE_SPEC, readyPacks, sortPacks, type Pack, type PackSort } from "@/lib/packs";

export const Route = createFileRoute("/")({ component: Home });

const ACCENT = {
  melon: "bg-melon",
  rind: "bg-rind",
  blush: "bg-blush",
} as const;

function PackCard({ pack, index: packNo }: { pack: Pack; index: number }) {
  return (
    <Link
      to="/pack/$id"
      params={{ id: pack.id }}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-melon"
    >
      <span className={`block h-1 ${ACCENT[pack.accent]}`} />
      <div className="bg-seed px-3 py-2.5">
        <p className="font-display text-lg font-semibold leading-tight text-cream sm:text-xl">
          {pack.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-cream/70">{pack.tagline}</p>
      </div>
      <div className="relative aspect-[4/3]">
        <StickerGif
          packId={pack.id}
          stickerId={pack.stickers[0].id}
          alt={pack.name}
          animated={false}
          className="h-full w-full object-contain p-3"
        />
        <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-2 py-0.5 text-xs text-cream">
          {String(packNo + 1).padStart(2, "0")}
        </span>
      </div>
    </Link>
  );
}

function Home() {
  const [sort, setSort] = useState<PackSort>("updated");
  const packs = sortPacks(readyPacks(), sort);

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-melon">
              Watermelon Duomei
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight text-ink sm:text-6xl">
              多美表情包工坊
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              西瓜日常、海边、中秋、国庆、运动会、亚运会。每套 3 秒完整动作，240×240，500KB 内可上架。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["中秋国庆", "运动会", "亚运会", "年轻人"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/pack/$id"
              params={{ id: "set-19" }}
              className="inline-flex h-11 items-center justify-center rounded-md bg-melon px-5 text-sm font-semibold text-cream transition-transform duration-150 ease-out active:scale-[0.96]"
            >
              打开亚运会
            </Link>
            <Link
              to="/"
              hash="packs"
              className="inline-flex h-11 items-center justify-center rounded-md border border-line px-5 text-sm font-semibold text-ink"
            >
              浏览套装
            </Link>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <div className="grid grid-cols-4 gap-2">
              {PACKS[0].stickers.slice(0, 4).map((s) => (
                <div key={s.id} className="aspect-square overflow-hidden rounded-md">
                  <StickerGif
                    packId="set-01"
                    stickerId={s.id}
                    alt={s.name}
                    animated={false}
                    eager
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-center font-display text-sm text-ink">西瓜日常</p>
            <p className="mt-0.5 text-center text-xs text-muted">第一套 · 已完成</p>
          </div>
        </section>

        <section id="packs" className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-3xl text-ink">上架表情</h2>
            <label className="flex items-center gap-2 text-sm text-muted">
              排序
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as PackSort)}
                className="h-9 rounded-md border border-line bg-surface px-2 text-sm text-ink"
              >
                <option value="updated">更新时间</option>
                <option value="name">名称</option>
                <option value="default">默认编号</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {packs.map((pack, i) => (
              <PackCard key={pack.id} pack={pack} index={i} />
            ))}
          </div>
        </section>

        <section id="spec" className="border-t border-line bg-surface/70">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
            {(
              [
                ["尺寸", STORE_SPEC.size],
                ["格式", STORE_SPEC.format],
                ["时长", STORE_SPEC.duration],
                ["体积", STORE_SPEC.maxBytes],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs uppercase tracking-[0.16em] text-subtle">{k}</p>
                <p className="mt-1 font-display text-xl text-ink">{v}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
