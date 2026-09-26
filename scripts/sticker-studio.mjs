#!/usr/bin/env node
/**
 * 多美表情包工作台（本地）：并排看「线上现在的」和「候选版」GIF，点一下选用，再一键上架。
 *
 *   node scripts/sticker-studio.mjs            # 打开 http://localhost:5178
 *
 * 候选来自 .sticker-candidates/<pack>/<id>/<n>.gif（sticker.mjs make --cand / fetch / gen 生成）。
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { CANDIDATES, ROOT, STICKERS, publish, qaGif } from "./sticker.mjs";

const PORT = Number(process.env.PORT ?? 5178);
const MIME = { ".gif": "image/gif", ".png": "image/png", ".json": "application/json", ".html": "text/html; charset=utf-8" };

function packsInfo() {
  const src = readFileSync(join(ROOT, "src/lib/packs.ts"), "utf8");
  return [...src.matchAll(/id: "(set-\d+)",\s*slug: "[^"]*",\s*name: "([^"]+)"/g)].map((m) => ({ id: m[1], name: m[2] }));
}

function stickerNames(pack) {
  const src = readFileSync(join(ROOT, "src/lib/packs.ts"), "utf8");
  const block = src.slice(src.indexOf(`id: "${pack}"`));
  return [...block.slice(0, block.indexOf("],")).matchAll(/\{ id: "([^"]+)", name: "([^"]+)"/g)].map((m) => ({ id: m[1], name: m[2] }));
}

const qaCache = new Map();
function qaCached(file) {
  const key = `${file}:${statSync(file).mtimeMs}`;
  if (!qaCache.has(key)) qaCache.set(key, qaGif(file));
  return qaCache.get(key);
}

function state(pack) {
  return stickerNames(pack).map(({ id, name }) => {
    const cur = join(STICKERS, pack, `${id}.gif`);
    const dir = join(CANDIDATES, pack, id);
    const cands = existsSync(dir)
      ? readdirSync(dir).filter((f) => f.endsWith(".gif")).sort().map((f) => {
          const file = join(dir, f);
          const metaFile = file.replace(/\.gif$/, ".json");
          const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, "utf8")) : {};
          const q = qaCached(file);
          return { cand: f.slice(0, -4), url: `/files/.sticker-candidates/${pack}/${id}/${f}?t=${statSync(file).mtimeMs}`, ok: q.ok, problems: q.problems, m: q.metrics, plan: meta.plan };
        })
      : [];
    const current = existsSync(cur)
      ? { url: `/files/public/stickers/${pack}/${id}.gif?t=${statSync(cur).mtimeMs}`, ...(({ ok, problems, metrics }) => ({ ok, problems, m: metrics }))(qaCached(cur)) }
      : null;
    return { id, name, current, cands };
  });
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT }).toString();
}

async function body(req) {
  let s = "";
  for await (const c of req) s += c;
  return JSON.parse(s || "{}");
}

const send = (res, code, data, type = "application/json") => {
  res.writeHead(code, { "content-type": type, "cache-control": "no-store" });
  res.end(typeof data === "string" || Buffer.isBuffer(data) ? data : JSON.stringify(data));
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (url.pathname === "/") return send(res, 200, PAGE, MIME[".html"]);
    if (url.pathname === "/api/packs") return send(res, 200, packsInfo());
    if (url.pathname === "/api/state") return send(res, 200, state(url.searchParams.get("pack")));
    if (url.pathname.startsWith("/files/")) {
      const file = normalize(join(ROOT, decodeURIComponent(url.pathname.slice(7))));
      if (!file.startsWith(ROOT) || !existsSync(file)) return send(res, 404, "not found", "text/plain");
      return send(res, 200, readFileSync(file), MIME[extname(file)] ?? "application/octet-stream");
    }
    if (url.pathname === "/api/pick" && req.method === "POST") {
      const { pack, id, cand } = await body(req);
      const from = join(CANDIDATES, pack, id, `${cand}.gif`);
      copyFileSync(from, join(STICKERS, pack, `${id}.gif`));
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", from, "-frames:v", "1", join(STICKERS, pack, `${id}.png`)]);
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/api/discard" && req.method === "POST") {
      const { pack, id } = await body(req);
      rmSync(join(CANDIDATES, pack, id), { recursive: true, force: true });
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/api/publish" && req.method === "POST") {
      const { pack, message } = await body(req);
      publish(pack);
      git(["add", "-A", `public/stickers/${pack}`, "public/stickers/sizes.json", "public/stickers/index.json", "src/lib/packs.ts"]);
      const changed = git(["diff", "--cached", "--name-only"]).trim();
      if (!changed) return send(res, 200, { ok: true, log: "没有改动，不用上架。" });
      git(["commit", "-m", `${message || `feat: update ${pack} stickers from studio`}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`]);
      git(["pull", "--rebase", "-q"]);
      git(["push", "-q", "origin", "main"]);
      return send(res, 200, { ok: true, log: `已推送，约 1 分钟后线上生效：\n${changed}` });
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, 500, { error: String(e.message ?? e) });
  }
}).listen(PORT, () => console.log(`多美表情包工作台：http://localhost:${PORT}`));

const PAGE = /* html */ `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>多美工作台</title>
<style>
:root{--bg:#fbf6ef;--card:#fff;--ink:#3b2a24;--muted:#9a877c;--line:#eadfd4;--red:#d9463a;--ok:#2f8f5b;--bad:#c2410c}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 -apple-system,"PingFang SC",sans-serif}
header{position:sticky;top:0;z-index:2;background:#fffaf4ee;backdrop-filter:blur(8px);border-bottom:1px solid var(--line);padding:12px 20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
h1{font-size:18px;margin:0 8px 0 0}select,button{font:inherit;border-radius:10px;border:1px solid var(--line);padding:6px 12px;background:#fff;color:var(--ink);cursor:pointer}
button.primary{background:var(--red);border-color:var(--red);color:#fff}button:disabled{opacity:.5;cursor:default}
label{color:var(--muted);display:flex;gap:6px;align-items:center}
#status{color:var(--muted);white-space:pre-wrap;flex:1;min-width:200px}
main{padding:16px 20px;display:grid;gap:14px}
.row{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px}
.row h2{font-size:15px;margin:0 0 10px}.row h2 small{color:var(--muted);font-weight:400;margin-left:6px}
.tiles{display:flex;gap:12px;overflow-x:auto;padding-bottom:4px}
.tile{flex:0 0 auto;width:200px;border:2px solid var(--line);border-radius:12px;padding:8px;background:#fffdfa}
.tile.cur{border-style:dashed}.tile img{width:180px;height:180px;display:block;border-radius:8px;background:#f4ede4}
.tag{font-size:12px;color:var(--muted);margin-top:6px}.ok{color:var(--ok)}.bad{color:var(--bad)}
.tile button{width:100%;margin-top:6px}.empty{color:var(--muted);align-self:center}
</style></head><body>
<header><h1>多美工作台</h1>
<select id="pack"></select>
<label><input type="checkbox" id="only"> 只看有候选的</label>
<button id="reload">刷新</button>
<button class="primary" id="publish">上架到网站</button>
<span id="status"></span></header>
<main id="list"></main>
<script>
const $=s=>document.querySelector(s);let pack;
const status=t=>$("#status").textContent=t||"";
const fmt=m=>m?m.kb+"KB · "+m.fps+"fps · "+m.sec+"s":"";
async function j(u,o){const r=await fetch(u,o);const d=await r.json();if(!r.ok)throw new Error(d.error);return d}
async function load(){
  status("加载中…");const rows=await j("/api/state?pack="+pack);status("");
  const only=$("#only").checked;$("#list").innerHTML="";
  for(const s of rows){ if(only&&!s.cands.length)continue;
    const row=document.createElement("section");row.className="row";
    row.innerHTML='<h2>'+s.name+'<small>'+s.id+(s.cands.length?' · '+s.cands.length+' 个候选':'')+'</small></h2><div class="tiles"></div>';
    const tiles=row.querySelector(".tiles");
    const tile=(title,x,cur)=>{const d=document.createElement("div");d.className="tile"+(cur?" cur":"");
      d.innerHTML='<img loading="lazy" src="'+x.url+'"><div class="tag"><b>'+title+'</b> · '+fmt(x.m)+'</div><div class="tag '+(x.ok?'ok">✓ 自动检查通过':'bad">✗ '+(x.problems||[]).join("；"))+'</div>';return d};
    if(s.current)tiles.append(tile("线上现在",s.current,true));
    for(const c of s.cands){const d=tile("候选 "+c.cand,c);const b=document.createElement("button");b.textContent="用这个";
      b.onclick=async()=>{b.disabled=true;await j("/api/pick",{method:"POST",body:JSON.stringify({pack,id:s.id,cand:c.cand})});status("已选用 "+s.name+" 候选 "+c.cand+"（还没上架）");load()};d.append(b);tiles.append(d)}
    if(s.cands.length){const b=document.createElement("button");b.textContent="清掉候选";b.style.marginLeft="10px";b.style.fontSize="12px";
      b.onclick=async()=>{await j("/api/discard",{method:"POST",body:JSON.stringify({pack,id:s.id})});status("已清掉 "+s.name+" 的候选");load()};row.querySelector("h2").append(b)}
    else tiles.insertAdjacentHTML("beforeend",'<span class="empty">没有候选</span>');
    $("#list").append(row)}
}
$("#pack").onchange=e=>{pack=e.target.value;try{localStorage.pack=pack}catch{}load()};
$("#only").onchange=load;$("#reload").onclick=load;
$("#publish").onclick=async()=>{if(!confirm("把 "+pack+" 当前选用的图推到 duomei.vercel.app？"))return;
  $("#publish").disabled=true;status("上架中…");try{const r=await j("/api/publish",{method:"POST",body:JSON.stringify({pack})});status(r.log)}catch(e){status("失败："+e.message)}$("#publish").disabled=false};
(async()=>{const ps=await j("/api/packs");let saved;try{saved=localStorage.pack}catch{}
  $("#pack").innerHTML=ps.map(p=>'<option value="'+p.id+'">'+p.name+' ('+p.id+')</option>').join("");
  pack=ps.some(p=>p.id===saved)?saved:"set-08";$("#pack").value=pack;load()})();
</script></body></html>`;
