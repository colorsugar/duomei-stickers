#!/usr/bin/env node
/**
 * 多美表情包流水线：视频 → 无缝循环 GIF → 自动质检 → 上架。
 * 依赖：ffmpeg、gifsicle（mac: brew install ffmpeg gifsicle）。
 *
 *   node scripts/sticker.mjs make <video.mp4> --pack set-08 --id angry [--mode auto|cut|boomerang] [--start N --len N] [--speed 1.5]
 *   node scripts/sticker.mjs qa <pack> [id ...]        # 不合格 exit 1，并生成逐帧对照图
 *   node scripts/sticker.mjs publish <pack>            # 更新 manifest / sizes / index，刷新 ?v= 缓存版本
 *
 * 规则写在 .grok/skills/duomei-stickers/SKILL.md，本脚本是它的执行版。
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STICKERS = join(ROOT, "public", "stickers");
const QA_DIR = join(ROOT, ".sticker-qa");

export const SPEC = {
  size: 240,
  maxBytes: 495_000, // 微信上限 500KB，留余量
  minFps: 14,
  minSec: 2,
  maxSec: 4.5,
  maxSeamRatio: 1.5, // 首尾跳变 / 平均每帧变化
  minMotion: 1.5, // 平均每帧变化（64px 灰度），低于此 = 几乎不动
  maxFrozenShare: 0.3, // 停住帧占比
  maxJerkShare: 0.15, // 突跳帧占比
};

// 体积阶梯：先保帧率和颜色，最后才降
const LADDER = [
  [20, 192, 40], [20, 128, 60], [16, 128, 60], [16, 96, 100], [16, 64, 140], [14, 64, 160],
];

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { maxBuffer: 1 << 30, ...opts });

function grayFrames(file, W = 64) {
  const buf = run("ffmpeg", ["-v", "error", "-i", file, "-vf", `scale=${W}:${W},format=gray`, "-f", "rawvideo", "-"]);
  const n = buf.length / (W * W);
  return Array.from({ length: n }, (_, i) => buf.subarray(i * W * W, (i + 1) * W * W));
}

const diff = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};

/** 在源视频里找最佳循环窗口。cut：首尾最像的一段；boomerang：动作最大的一段，正放再倒放。 */
export function findLoop(video, fps = 24, fixedLen = 0) {
  const fr = grayFrames(video);
  const step = fr.slice(1).map((x, i) => diff(fr[i], x));
  const meanStep = step.reduce((a, b) => a + b, 0) / step.length;
  const motionOf = (s, L) => step.slice(s, s + L).reduce((a, b) => a + b, 0) / L;

  let cut = null;
  const [lo, hi] = fixedLen ? [fixedLen, fixedLen] : [Math.round(2.5 * fps), Math.round(3.5 * fps)];
  for (let L = lo; L <= hi; L++)
    for (let s = 0; s + L < fr.length; s++) {
      const mot = motionOf(s, L);
      if (mot < 0.5 * meanStep) continue;
      const ratio = diff(fr[s + L], fr[s]) / mot;
      if (!cut || ratio < cut.ratio) cut = { mode: "cut", start: s, len: L, ratio };
    }

  let boom = null;
  for (let N = Math.round(1.25 * fps); N <= Math.round(1.8 * fps); N++)
    for (let s = 0; s + N < fr.length; s++) {
      const mot = motionOf(s, N);
      if (!boom || mot > boom.mot) boom = { mode: "boomerang", start: s, len: N, mot };
    }

  return { cut, boom, best: cut && cut.ratio <= 1.0 ? cut : boom };
}

function encode(video, out, { mode, start, len }, speed = 1) {
  const tmp = mkdtempSync(join(tmpdir(), "sticker-"));
  try {
    // 先降帧率再拼循环：否则 boomerang 接缝处的帧会被丢掉
    const loopGraph = (fps) => {
      const trim = `trim=start_frame=${start}:end_frame=${start + len},setpts=(PTS-STARTPTS)/${speed},fps=${fps},scale=${SPEC.size}:${SPEC.size}:flags=lanczos`;
      // 不做首尾淡入淡出：会出重影。接不上就用 boomerang。
      return mode === "boomerang"
        ? `[0:v]${trim},split[f][r];[r]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[rv0];[rv0]reverse,trim=start_frame=1,reverse,setpts=PTS-STARTPTS[rv];[f][rv]concat=n=2:v=1[o]`
        : `[0:v]${trim}[o]`;
    };
    let bytes = 0, used;
    for (const [fps, colors, lossy] of LADDER) {
      used = { fps, colors, lossy };
      const loop = join(tmp, `loop${fps}.mkv`);
      if (!existsSync(loop)) run("ffmpeg", ["-v", "error", "-y", "-i", video, "-filter_complex", loopGraph(fps), "-map", "[o]", "-c:v", "ffv1", "-r", String(fps), loop]);
      run("ffmpeg", ["-v", "error", "-y", "-i", loop, "-vf",
        `hqdn3d=4:3:6:6,split[a][b];[a]palettegen=max_colors=${colors}:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`,
        "-loop", "0", out]);
      run("gifsicle", ["-O3", `--lossy=${lossy}`, out, "-o", out]);
      bytes = statSync(out).size;
      if (bytes <= SPEC.maxBytes) break;
    }
    run("ffmpeg", ["-v", "error", "-y", "-i", out, "-frames:v", "1", out.replace(/\.gif$/, ".png")]);
    return { bytes, ...used };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** 自动质检。返回 { ok, problems, metrics }。 */
export function qaGif(gif) {
  const probe = JSON.parse(run("ffprobe", ["-v", "error", "-count_frames", "-show_entries",
    "stream=width,height,nb_read_frames,r_frame_rate:format=duration", "-of", "json", gif]).toString());
  const st = probe.streams[0];
  const [a, b] = st.r_frame_rate.split("/").map(Number);
  const fps = a / b, sec = Number(probe.format.duration), bytes = statSync(gif).size;
  const fr = grayFrames(gif);
  const step = fr.slice(1).map((x, i) => diff(fr[i], x));
  const motion = step.reduce((s, x) => s + x, 0) / step.length;
  // 接缝和它附近几帧的正常变化比：快动作中间接上不算跳
  const n = step.length, local = Math.max(motion, step[0], step[1] ?? 0, step[n - 1], step[n - 2] ?? 0);
  const seamRatio = diff(fr[fr.length - 1], fr[0]) / local;
  const frozen = step.filter((x) => x < 0.4).length / step.length;
  const jerks = step.filter((x) => x > 2.5 * motion).length / step.length;
  const m = { w: st.width, h: st.height, fps: +fps.toFixed(1), sec: +sec.toFixed(2), kb: Math.round(bytes / 1024),
    motion: +motion.toFixed(1), seamRatio: +seamRatio.toFixed(2), frozen: +frozen.toFixed(2), jerks: +jerks.toFixed(2) };
  const p = [];
  if (st.width !== SPEC.size || st.height !== SPEC.size) p.push(`尺寸 ${st.width}×${st.height}，要 240×240`);
  if (bytes > SPEC.maxBytes) p.push(`体积 ${m.kb}KB 超 500KB`);
  if (fps < SPEC.minFps) p.push(`帧率 ${m.fps} 太低，会卡`);
  if (sec < SPEC.minSec || sec > SPEC.maxSec) p.push(`时长 ${m.sec}s，要 2–4.5s`);
  if (motion < SPEC.minMotion) p.push(`几乎不动（动作量 ${m.motion}），重生成视频`);
  if (seamRatio > SPEC.maxSeamRatio) p.push(`循环接缝跳 ${m.seamRatio}x，改用 boomerang 或换片段`);
  if (frozen > SPEC.maxFrozenShare) p.push(`停住帧占 ${Math.round(frozen * 100)}%，动作不连贯`);
  if (jerks > SPEC.maxJerkShare) p.push(`突跳帧占 ${Math.round(jerks * 100)}%，动作不连贯`);
  return { ok: p.length === 0, problems: p, metrics: m };
}

/** 逐帧对照图：每张一行，每 4 帧取一格。人眼查重影、发色、描边、字。 */
function contactSheet(pack, ids, out) {
  const rows = ids.map((id) => {
    const f = join(QA_DIR, `${pack}-${id}.png`);
    run("ffmpeg", ["-v", "error", "-y", "-i", join(STICKERS, pack, `${id}.gif`), "-vf",
      "select=not(mod(n\\,4)),scale=120:120,tile=16x1", "-frames:v", "1", f]);
    return f;
  });
  if (rows.length === 1) return run("cp", [rows[0], out]);
  run("ffmpeg", ["-v", "error", "-y", ...rows.flatMap((r) => ["-i", r]), "-filter_complex",
    `${rows.map((_, i) => `[${i}:v]`).join("")}vstack=inputs=${rows.length}`, out]);
}

function packIds(pack) {
  return readdirSync(join(STICKERS, pack)).filter((f) => f.endsWith(".gif")).map((f) => f.slice(0, -4));
}

function stickerNames(pack) {
  const src = readFileSync(join(ROOT, "src/lib/packs.ts"), "utf8");
  const block = src.slice(src.indexOf(`id: "${pack}"`));
  const end = block.indexOf("],");
  return Object.fromEntries([...block.slice(0, end).matchAll(/\{ id: "([^"]+)", name: "([^"]+)"/g)].map((m) => [m[1], m[2]]));
}

function publish(pack) {
  const dir = join(STICKERS, pack);
  const names = stickerNames(pack);
  const order = Object.keys(names).filter((id) => existsSync(join(dir, `${id}.gif`)));
  const missing = Object.keys(names).filter((id) => !existsSync(join(dir, `${id}.gif`)));
  if (missing.length) console.warn(`⚠️  packs.ts 里有但没有 GIF：${missing.join(", ")}`);

  const manifest = order.map((id) => ({ id, name: names[id], gif: `/stickers/${pack}/${id}.gif`,
    png: `/stickers/${pack}/${id}.png`, bytes: statSync(join(dir, `${id}.gif`)).size }));
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  const sizesFile = join(STICKERS, "sizes.json"), indexFile = join(STICKERS, "index.json");
  const sizes = JSON.parse(readFileSync(sizesFile, "utf8"));
  sizes[pack] = Object.fromEntries(manifest.map((x) => [x.id, x.bytes]));
  writeFileSync(sizesFile, JSON.stringify(sizes));
  const index = JSON.parse(readFileSync(indexFile, "utf8"));
  index[pack] = order;
  writeFileSync(indexFile, JSON.stringify(index, null, 2) + "\n");

  // 换了文件就要换 ?v=，否则浏览器和微信会一直显示旧图
  const packsFile = join(ROOT, "src/lib/packs.ts");
  const packs = readFileSync(packsFile, "utf8");
  const v = Number(packs.match(/\?v=(\d+)/)?.[1] ?? 0) + 1;
  writeFileSync(packsFile, packs.replace(/\?v=\d+/g, `?v=${v}`));

  const ready = packs.match(/READY_PACK_IDS = \[([^\]]*)\]/)?.[1] ?? "";
  if (!ready.includes(`"${pack}"`)) console.warn(`⚠️  ${pack} 不在 READY_PACK_IDS，线上不会显示`);
  console.log(`${pack}: ${manifest.length} 张已写入 manifest / sizes / index，缓存版本 v=${v}`);
}

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) o[argv[i].slice(2)] = argv[++i];
    else o._.push(argv[i]);
  }
  return o;
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const a = args(rest);
  mkdirSync(QA_DIR, { recursive: true });

  if (cmd === "make") {
    const [video] = a._;
    if (!video || !a.pack || !a.id) throw new Error("用法: make <video> --pack set-XX --id <id>");
    // 加速时按加速后的时长选片段（源视频 24fps）
    const { cut, boom, best } = findLoop(video, 24 * Number(a.speed ?? 1), a.start ? 0 : Number(a.len ?? 0));
    let plan = best;
    if (a.mode === "cut") plan = cut;
    if (a.mode === "boomerang") plan = boom;
    if (a.start) plan = { ...plan, start: Number(a.start), len: Number(a.len ?? plan.len) };
    mkdirSync(join(STICKERS, a.pack), { recursive: true });
    const out = join(STICKERS, a.pack, `${a.id}.gif`);
    const speed = Number(a.speed ?? 1);
    const enc = encode(video, out, plan, speed);
    const q = qaGif(out);
    console.log(JSON.stringify({ id: a.id, plan: { mode: plan.mode, start: plan.start, len: plan.len }, ...enc, ...q.metrics }));
    if (!q.ok) { console.log(`❌ ${a.id}: ${q.problems.join("；")}`); process.exitCode = 1; }
    else console.log(`✅ ${a.id} 自动质检通过。还要看对照图：node scripts/sticker.mjs qa ${a.pack} ${a.id}`);
    return;
  }

  if (cmd === "qa") {
    const [pack, ...ids] = a._;
    const list = ids.length ? ids : packIds(pack);
    let fail = 0;
    for (const id of list) {
      const q = qaGif(join(STICKERS, pack, `${id}.gif`));
      console.log(`${q.ok ? "✅" : "❌"} ${id.padEnd(12)} ${JSON.stringify(q.metrics)}${q.ok ? "" : "  → " + q.problems.join("；")}`);
      if (!q.ok) fail++;
    }
    const sheet = join(QA_DIR, `${pack}-sheet.png`);
    contactSheet(pack, list, sheet);
    console.log(`\n逐帧对照图：${sheet}\n必须打开看：重影、发色、白描边、字、有没有多手多脚。`);
    if (fail) { console.log(`\n${fail} 张不合格，不许上架。`); process.exitCode = 1; }
    return;
  }

  if (cmd === "publish") {
    const [pack] = a._;
    const bad = packIds(pack).map((id) => [id, qaGif(join(STICKERS, pack, `${id}.gif`))]).filter(([, q]) => !q.ok);
    if (bad.length && !a.force) {
      for (const [id, q] of bad) console.log(`❌ ${id}: ${q.problems.join("；")}`);
      console.log("有不合格的，已拒绝上架。确认要上用 --force yes。");
      process.exitCode = 1;
      return;
    }
    publish(pack);
    return;
  }

  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 11).join("\n"));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
