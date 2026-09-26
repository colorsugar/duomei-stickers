#!/usr/bin/env node
/**
 * 多美表情包流水线：视频 → 无缝循环 GIF → 自动质检 → 上架。
 * 依赖：ffmpeg、gifsicle（mac: brew install ffmpeg gifsicle）。
 *
 *   node scripts/sticker.mjs make <video.mp4> --pack set-08 --id angry [--mode auto|cut|boomerang] [--start N --len N] [--speed 1.5]
 *   node scripts/sticker.mjs fetch <pack> <grok回复.txt> [--hits punch,kick]   # 下载 Grok 的视频并做成候选
 *   node scripts/sticker.mjs new "上班摸鱼" [--count 8] [--versions 2]   # 一句话主题 → 自动策划整套 → 生成候选
 *   node scripts/sticker.mjs plan "上班摸鱼" [--count 8]                 # 只策划，写 briefs/，不生成
 *   node scripts/sticker.mjs gen <pack> [id ...] [--versions 2]   # 本机 grok 按 briefs/<pack>.json 生成视频→候选
 *   node scripts/sticker.mjs list <pack>                     # 每张的线上状态和候选
 *   node scripts/sticker.mjs pick <pack> <id> <候选号>        # 选用候选（不上架）
 *   node scripts/sticker.mjs discard <pack> <id>             # 清掉候选
 *   node scripts/sticker.mjs qa <pack> [id ...]        # 不合格 exit 1，并生成逐帧对照图
 *   node scripts/sticker.mjs publish <pack>            # 更新 manifest / sizes / index，刷新 ?v= 缓存版本
 *
 * 规则写在 .grok/skills/duomei-stickers/SKILL.md，本脚本是它的执行版。
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STICKERS = join(ROOT, "public", "stickers");
const QA_DIR = join(ROOT, ".sticker-qa");
export const CANDIDATES = join(ROOT, ".sticker-candidates");
export { STICKERS, ROOT };

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

const PLAN_RULES = `你是国内热门 Q 版表情包的策划。主角永远是「多美」：爱吃西瓜的元气小女孩（西瓜原皮：棕色短发+西瓜髻、白T、樱桃红西瓜籽背带短裤、西瓜挎包、红鞋），常用配角是一只粉色小猪。
为主题策划一套表情包，要求：
- 每张是年轻人在微信聊天里真会发的一句话（caption，2–6 个汉字，可带！或…），优先用大家都懂的说法和梗，不要生造没人说的句子。
- 每张一个动作，3 秒内看懂，意思和 caption 一眼对上；一套里动作互不相同（站、坐、躺、跳、转身、和小猪互动都要有）。
- 打击类（打、抽、踢、捶、踩、拍）hit=true：快、连打、可爱不暴力；其余 hit=false：可爱适度、正常节奏，特效小（小乌云、汗滴、星星、青筋），不许把脸变形成别的东西、不许大爆炸大团烟雾。
- 离场类动作（踢飞、滚走、跑掉）写清楚「整个出画面」。
- action 用英文写：起始姿势 → 动作 → 结束接近起始姿势，一两句，给图生视频模型看。
- id 用简短英文小写（字母数字），互不重复。`;

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "套装中文名，2–6 字" },
    nameEn: { type: "string" },
    slug: { type: "string", description: "英文小写短横线" },
    tagline: { type: "string", description: "三个代表性 caption 用空格连接" },
    stickers: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, caption: { type: "string" }, hit: { type: "boolean" }, action: { type: "string" } },
        required: ["id", "caption", "hit", "action"],
      },
    },
  },
  required: ["name", "nameEn", "slug", "tagline", "stickers"],
};

function nextPackId() {
  const src = readFileSync(join(ROOT, "src/lib/packs.ts"), "utf8");
  const used = [...src.matchAll(/id: "set-(\d+)"/g)].map((m) => Number(m[1]));
  const briefs = existsSync(join(ROOT, "briefs")) ? readdirSync(join(ROOT, "briefs")).map((f) => Number(f.match(/set-(\d+)/)?.[1] ?? 0)) : [];
  return `set-${String(Math.max(0, ...used, ...briefs) + 1).padStart(2, "0")}`;
}

export function planPack(theme, count, pack) {
  const prompt = `${PLAN_RULES}\n\n主题：${theme}\n张数：${count}\n只输出 JSON。`;
  const outStr = run("grok", ["-p", prompt, "--json-schema", JSON.stringify(PLAN_SCHEMA), "--cwd", ROOT]).toString();
  const data = JSON.parse(outStr).structuredOutput;
  const brief = { pack, theme, ...data, stickers: data.stickers.slice(0, count) };
  mkdirSync(join(ROOT, "briefs"), { recursive: true });
  writeFileSync(join(ROOT, "briefs", `${pack}.json`), JSON.stringify(brief, null, 2) + "\n");
  return brief;
}

/** 新套装第一次上架：按 brief 登记到 packs.ts（PACKS + READY_PACK_IDS）。 */
function registerPack(pack) {
  const file = join(ROOT, "src/lib/packs.ts");
  let src = readFileSync(file, "utf8");
  if (src.includes(`id: "${pack}"`)) return;
  const b = JSON.parse(readFileSync(join(ROOT, "briefs", `${pack}.json`), "utf8"));
  const entry = `  {
    id: "${pack}",
    slug: "${b.slug}",
    name: "${b.name}",
    nameEn: "${b.nameEn}",
    outfit: "watermelon",
    tagline: "${b.tagline}",
    accent: "melon",
    updatedAt: "${new Date().toISOString().slice(0, 10)}",
    stickers: [
${b.stickers.map((x) => `      { id: "${x.id}", name: "${x.caption.replace(/[！!…]+$/, "")}", motion: ${JSON.stringify(x.action.slice(0, 40))} },`).join("\n")}
    ],
  },
`;
  const start = src.indexOf("export const PACKS");
  const i = start < 0 ? -1 : src.indexOf("\n];", start) + 1;
  if (i <= 0) throw new Error("packs.ts 结构变了，找不到 PACKS 结尾，手动登记");
  src = src.slice(0, i) + entry + src.slice(i);
  src = src.replace(/READY_PACK_IDS = \[([^\]]*)\]/, (m, list) => `READY_PACK_IDS = [${list.replace(/,\s*$/, "")}, "${pack}"]`);
  writeFileSync(file, src);
  console.log(`已把新套装 ${pack}「${b.name}」登记到 packs.ts`);
}

const LOOK = "Same locked watermelon-skin Duomei as the reference image public/refs/watermelon-white.jpg: chibi girl, WARM CHOCOLATE-BROWN short bob with blunt bangs (NOT black), round watermelon bun on the crown with a curly green vine and one small leaf, pink oval blush, big round dark-brown eyes. White T-shirt under cherry-watermelon-red overall shorts with black seed dots, watermelon-slice crossbody bag, white socks, red sneakers. Thick clean WHITE STICKER DIE-CUT OUTLINE around the character. Plain cream background, flat clean colors, cute sticker illustration, square 1:1. Full body centered. Any pig is the same small cute pink piglet.";
const STYLE_HIT = "Fast snappy cartoon hitting: rapid consecutive hits with no pause between them, small impact lines on each hit. Cute, not violent.";
const STYLE_FACE = "Cute and restrained chibi expression animation at a normal natural pace: clear readable facial expression, small effects only (a tiny cloud, sweat drop, sparkle or anger mark). Do NOT turn the face into another shape, no big explosions, no big clouds covering the character, not frantic.";
const LOCK = "Locked camera, no zoom, no pan, no tilt. Character stays full-body in frame. Background still. One complete action within about 3 seconds, ending close to the starting pose. Same face, hair and outfit throughout. No extra limbs, no text generated inside the video.";

/** 给 grok 命令行的单张任务：先 image_edit 出静帧，再 image_to_video，mp4 存到指定路径。 */
function grokPrompt(s, out, ver) {
  return [
    `你在做多美表情包的一张：${s.caption}（id: ${s.id}，第 ${ver} 版）。只做这一张，做完只回复视频路径。`,
    `1. 用 image_edit，以 public/refs/watermelon-white.jpg 为参考图，出一张 1:1 静帧（动作的起始姿势），提示词：${LOOK} Starting pose for: ${s.action}. Bold red Chinese caption "${s.caption}" with thick white outline at the very bottom, not covering the face.`,
    `2. 用 image_to_video，以这张静帧为首帧，生成 6 秒 1:1 视频，提示词：${s.action}. ${s.hit ? STYLE_HIT : STYLE_FACE} ${LOCK}${ver !== "1" ? " Make this take noticeably different in timing and details from other takes." : ""}`,
    `3. 把视频保存为 ${out}（用 run_terminal_command 复制或移动过去，确认文件存在）。`,
    "不要改仓库里的任何其他文件，不要 git 提交或推送。",
  ].join("\n");
}

/** tmpfiles 的 /dl/ 链接直接下会拿到 HTML：先打开页面取真正的下载地址。 */
function downloadTmpfiles(url, out) {
  const m = url.match(/tmpfiles\.org\/(?:dl\/[^/]+\/)?([^/]+\/[^/?#]+)/);
  const page = run("curl", ["-sL", `https://tmpfiles.org/${m[1]}`]).toString();
  const dl = page.match(/https:\/\/tmpfiles\.org\/dl\/[^"]+/)?.[0];
  if (!dl) throw new Error(`下载失败（链接可能过期）：${url}`);
  run("curl", ["-sL", "-o", out, dl]);
  const head = readFileSync(out).subarray(4, 8).toString();
  if (head !== "ftyp") throw new Error(`下到的不是视频：${url}`);
  console.log(`⬇️  ${out.split("/").pop()}`);
}

/** 生成一张：a.cand 有值时写进候选区 .sticker-candidates/<pack>/<id>/<cand>.gif，不碰正式文件。 */
export function makeSticker(video, a) {
  const speed = Number(a.speed ?? 1);
  // 加速时按加速后的时长选片段（源视频 24fps）
  const { cut, boom, best } = findLoop(video, 24 * speed, a.start ? 0 : Number(a.len ?? 0));
  let plan = best;
  if (a.mode === "cut") plan = cut;
  if (a.mode === "boomerang") plan = boom;
  if (a.start) plan = { ...plan, start: Number(a.start), len: Number(a.len ?? plan.len) };
  const dir = a.cand ? join(CANDIDATES, a.pack, a.id) : join(STICKERS, a.pack);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${a.cand ?? a.id}.gif`);
  const enc = encode(video, out, plan, speed);
  const q = qaGif(out);
  const info = { id: a.id, cand: a.cand, plan: { mode: plan.mode, start: plan.start, len: plan.len, speed }, source: video, ...enc, ...q.metrics };
  writeFileSync(out.replace(/\.gif$/, ".json"), JSON.stringify({ ...info, ok: q.ok, problems: q.problems }, null, 2));
  console.log(`${q.ok ? "✅" : "❌"} ${a.id}${a.cand ? "-" + a.cand : ""} ${q.metrics.kb}KB ${q.metrics.fps}fps ${q.metrics.sec}s${q.ok ? "" : "  → " + q.problems.join("；")}`);
  return { ...q, out };
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

export function publish(pack) {
  if (existsSync(join(ROOT, "briefs", `${pack}.json`))) registerPack(pack);
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

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const a = args(rest);
  mkdirSync(QA_DIR, { recursive: true });

  if (cmd === "make") {
    const [video] = a._;
    if (!video || !a.pack || !a.id) throw new Error("用法: make <video> --pack set-XX --id <id> [--cand 1]");
    const r = makeSticker(video, a);
    if (!r.ok) process.exitCode = 1;
    return;
  }

  if (cmd === "fetch") {
    // 把 Grok 回复（含「id-版本 https://tmpfiles.org/...」行）存成文本，一次下载并做成候选
    const [pack, textFile] = a._;
    if (!pack || !textFile) throw new Error("用法: fetch <pack> <grok回复.txt> [--hits id1,id2]");
    const hits = new Set((a.hits ?? "").split(",").filter(Boolean));
    const lines = [...readFileSync(textFile, "utf8").matchAll(/([a-z0-9]+)-(\d+)\s+(https:\/\/tmpfiles\.org\/\S+)/gi)];
    if (!lines.length) throw new Error("文本里没找到「id-版本 链接」格式的行");
    const srcDir = join(ROOT, ".sticker-sources", pack);
    mkdirSync(srcDir, { recursive: true });
    for (const [, id, ver, url] of lines) {
      const mp4 = join(srcDir, `${id}-${ver}.mp4`);
      if (!existsSync(mp4)) downloadTmpfiles(url, mp4);
      const opts = { pack, id, cand: ver, mode: "cut", ...(hits.has(id) ? { speed: "1.6" } : {}) };
      makeSticker(mp4, opts);
    }
    console.log(`\n候选已生成。打开工作台挑选：node scripts/sticker-studio.mjs`);
    return;
  }

  if (cmd === "plan" || cmd === "new") {
    // 一句话主题 → grok 按规范策划整套 briefs/<pack>.json；new 还会接着生成全部候选
    const theme = a._.join(" ");
    if (!theme) throw new Error('用法: new "上班摸鱼" [--count 8] [--versions 2] [--pack set-20]');
    const pack = a.pack ?? nextPackId();
    const brief = planPack(theme, Number(a.count ?? 8), pack);
    console.log(`📝 ${pack} ${brief.name}：${brief.stickers.map((x) => x.caption).join(" / ")}`);
    if (cmd === "plan") return;
    process.argv = [process.argv[0], process.argv[1], "gen", pack, "--versions", String(a.versions ?? 2)];
    return main();
  }

  if (cmd === "gen") {
    // 让本机 grok 命令行按 briefs/<pack>.json 生成视频，再自动做成候选
    const [pack, ...ids] = a._;
    const brief = JSON.parse(readFileSync(join(ROOT, "briefs", `${pack}.json`), "utf8"));
    const list = brief.stickers.filter((s) => !ids.length || ids.includes(s.id));
    const versions = Number(a.versions ?? 2);
    const jobs = list.flatMap((s) => Array.from({ length: versions }, (_, i) => ({ s, ver: String(i + 1 + Number(a.from ?? 0)) })));
    const parallel = Number(a.parallel ?? Math.min(16, jobs.length)); // 默认全部并行，总时间≈单张
    const runOne = ({ s, ver }) => new Promise((resolve) => {
      const out = join(ROOT, ".sticker-sources", pack, `${s.id}-${ver}.mp4`);
      mkdirSync(dirname(out), { recursive: true });
      console.log(`🎬 生成中 ${s.id}-${ver} …`);
      const child = spawn("grok", ["-p", grokPrompt(s, out, ver), "--always-approve", "--cwd", ROOT], { stdio: ["ignore", "pipe", "pipe"] });
      let log = "";
      child.stdout.on("data", (d) => (log += d));
      child.stderr.on("data", (d) => (log += d));
      child.on("close", () => {
        if (!existsSync(out)) { console.log(`❌ ${s.id}-${ver} 没生成出视频：${log.slice(-300)}`); return resolve(); }
        try { makeSticker(out, { pack, id: s.id, cand: ver, mode: "cut", ...(s.hit ? { speed: "1.3" } : {}) }); }
        catch (e) { console.log(`❌ ${s.id}-${ver} 做 GIF 失败：${e.message}`); }
        resolve();
      });
    });
    const queue = [...jobs];
    await Promise.all(Array.from({ length: parallel }, async () => { while (queue.length) await runOne(queue.shift()); }));
    console.log("\n全部完成。打开工作台挑选：node scripts/sticker-studio.mjs");
    return;
  }

  if (cmd === "list") {
    // 每张：线上是否通过 + 有哪些候选及其检查结果（给 AI 看的纯文本）
    const [pack] = a._;
    for (const id of Object.keys(stickerNames(pack))) {
      const cur = join(STICKERS, pack, `${id}.gif`);
      const q = existsSync(cur) ? qaGif(cur) : null;
      const dir = join(CANDIDATES, pack, id);
      const cands = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".gif")).sort() : [];
      console.log(`${id.padEnd(10)} 线上:${q ? (q.ok ? "✅" : "❌") + q.metrics.kb + "KB" : "无"}  候选:${cands.length ? cands.map((f) => { const r = qaGif(join(dir, f)); return f.slice(0, -4) + (r.ok ? "✅" : "❌"); }).join(" ") : "-"}`);
    }
    return;
  }

  if (cmd === "pick") {
    // 用候选替换正式文件（还没上架；上架要用户在工作台点，或用户明确同意后 publish）
    const [pack, id, cand] = a._;
    const from = join(CANDIDATES, pack, id, `${cand}.gif`);
    if (!existsSync(from)) throw new Error(`没有这个候选：${from}`);
    run("cp", [from, join(STICKERS, pack, `${id}.gif`)]);
    run("ffmpeg", ["-v", "error", "-y", "-i", from, "-frames:v", "1", join(STICKERS, pack, `${id}.png`)]);
    console.log(`已选用 ${pack}/${id} 候选 ${cand}（未上架）`);
    return;
  }

  if (cmd === "discard") {
    const [pack, id] = a._;
    rmSync(join(CANDIDATES, pack, id), { recursive: true, force: true });
    console.log(`已清掉 ${pack}/${id} 的候选`);
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
