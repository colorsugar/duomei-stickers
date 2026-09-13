#!/usr/bin/env node
/**
 * Production build that keeps Nitro from inlining `assets/` (1.5GB of source
 * videos/stills) as serverAssets — that OOMs the Vercel compile.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const assets = join(root, "assets");
const hidden = join(root, ".sticker-source");

function hideSourceAssets() {
  if (existsSync(hidden) && existsSync(assets)) {
    rmSync(assets, { recursive: true, force: true });
  } else if (existsSync(assets) && !existsSync(hidden)) {
    renameSync(assets, hidden);
  }
  mkdirSync(assets, { recursive: true });
}

function restoreSourceAssets() {
  if (!existsSync(hidden)) return;
  rmSync(assets, { recursive: true, force: true });
  renameSync(hidden, assets);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=2048" },
    });
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(signal ? `${command} ${signal}` : `${command} exited ${code}`));
    });
  });
}

hideSourceAssets();
try {
  await run("node", [join(root, "scripts/with-app-env.mjs"), "vite", "build"]);
  await run("node", [join(root, "scripts/copy-public-static.mjs")]);
  await run("npm", ["run", "db:migrate"]);
} finally {
  restoreSourceAssets();
}
