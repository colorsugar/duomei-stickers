import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/refs")({ component: RefsPage });

const SHEETS = [
  {
    src: "/refs/watermelon-white.jpg",
    name: "西瓜原皮",
    note: "默认。红背带、白T、西瓜包、西瓜髻。没指定皮肤就用这张。",
  },
  {
    src: "/refs/watermelon-magenta.jpg",
    name: "西瓜原皮（品红底）",
    note: "同一张原皮，品红底便于抠图。",
  },
  {
    src: "/refs/duomei-master-sheet.jpg",
    name: "设定总图",
    note: "多角度参考。生成新皮肤时另存一张到这里。",
  },
];

function RefsPage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-xs uppercase tracking-[0.16em] text-melon">Character sheets</p>
        <h1 className="mt-2 font-display text-4xl text-ink">设定图</h1>
        <p className="mt-3 max-w-xl text-sm text-muted">
          默认西瓜原皮。指定皮肤或生成新皮肤时，新图会存进这里，后面套装都锁这张脸。
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SHEETS.map((s) => (
            <figure key={s.src} className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
              <img src={s.src} alt={s.name} className="aspect-square w-full object-cover" />
              <figcaption className="space-y-1 px-4 py-3">
                <p className="font-display text-lg text-ink">{s.name}</p>
                <p className="text-xs text-muted">{s.note}</p>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted">
          <Link to="/" hash="packs" className="text-melon hover:underline">
            回套装
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
