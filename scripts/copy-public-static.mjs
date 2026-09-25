#!/usr/bin/env node
/**
 * Copy `public/` onto the Vercel static output after the JS bundle.
 * Vite/Nitro must not ingest hundreds of GIFs during transform (OOM).
 * Only ship packs the site actually lists (READY_PACK_IDS). Source GIFs stay in public/.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "public");
const dest = join(root, ".vercel", "output", "static");
// 唯一来源：src/lib/packs.ts 的 READY_PACK_IDS（以前这里另抄了一份，漏改就 404）
const packsSrc = readFileSync(join(root, "src", "lib", "packs.ts"), "utf8");
const READY = JSON.parse(`[${packsSrc.match(/READY_PACK_IDS = \[([^\]]*)\]/)[1].replace(/,\s*$/, "")}]`);

if (!existsSync(src)) {
  console.log("[copy-public] no public/ directory — skip");
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true, dereference: true });

const stickersDest = join(dest, "stickers");
if (existsSync(stickersDest)) {
  for (const name of readdirSync(stickersDest)) {
    if (!name.startsWith("set-")) continue;
    if (READY.includes(name)) continue;
    rmSync(join(stickersDest, name), { recursive: true, force: true });
  }
}

const downloadsDest = join(dest, "downloads");
if (existsSync(downloadsDest)) {
  for (const name of readdirSync(downloadsDest)) {
    if (!name.endsWith(".zip")) continue;
    const id = name.slice(0, -4);
    if (READY.includes(id)) continue;
    rmSync(join(downloadsDest, name), { force: true });
  }
}

console.log("[copy-public] synced public/ → .vercel/output/static (ready packs only)");
