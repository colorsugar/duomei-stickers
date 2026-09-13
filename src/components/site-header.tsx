import { Link } from "@tanstack/react-router";
import { STORE_SPEC } from "@/lib/packs";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-melon"
        >
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-melon font-display text-base font-semibold text-cream shadow-card">
            美
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg tracking-tight text-ink">多美表情包</span>
            <span className="mt-0.5 text-xs text-muted">Duomei Sticker Studio</span>
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-muted">
          <Link
            to="/"
            hash="packs"
            className="tap-target inline-flex items-center whitespace-nowrap rounded-md px-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-melon sm:px-3"
          >
            套装
          </Link>
          <Link
            to="/refs"
            className="tap-target inline-flex items-center whitespace-nowrap rounded-md px-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-melon sm:px-3"
          >
            设定图
          </Link>
          <Link
            to="/"
            hash="spec"
            className="tap-target inline-flex items-center whitespace-nowrap rounded-md px-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-melon sm:px-3"
          >
            规格
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-center sm:px-6">
        <p className="font-display text-lg text-ink">多美表情包工坊</p>
        <p className="text-sm text-muted">
          西瓜多美 · {STORE_SPEC.size} · {STORE_SPEC.format} · {STORE_SPEC.maxBytes}
        </p>
      </div>
    </footer>
  );
}
