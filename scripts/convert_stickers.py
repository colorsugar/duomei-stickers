#!/usr/bin/env python3
"""Magenta-ish sticker video → looping transparent GIF + publish to public/."""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import tempfile
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

MAGENTA = np.array([255, 0, 255], dtype=np.float32)
ROOT = Path("/workspace")
NAMES = {
    "set-01": ["hi","happy","laugh","love","cry","angry","shock","sleepy","fight","ok","thanks","please","think","shy","night","bye"],
    "set-02": ["surf","cool","sip","float","sand","sun","shell","wind","hot","splash","photo","sea","dance","melon","wave-sea","sunset"],
    "set-03": ["fest","missyou","alone","reunion","full","yum","moon","share","box","rabbit","wine","nosleep","round","cheers","cantgo","pricey"],
    "set-04": ["off","lol","checkin","soldout","jam","crowd","arrive","home","give","late","drool","miss","flag","slip","tiaoxiu","bing"],
    "set-05": ["hungry","yum","treat","full","want","eat","host","delivery","spicy","more","smell","diet","night","pricey","clean","wait"],
    "set-06": ["login","come","coming","hmph","no","nohang","envy","work","glass","face","ow","party","rank","first","feed","bye"],
    "set-07": ["lol","drama","bye","juice","haha","hehe","speechless","wild","sleepy","here","yes","fold","insane","real","six","love"],
    "set-08": ["punch","slap","dummy","kick","bite","flick","stomp","throw","hammer","glare","hmph","tantrum","angry","eyeroll","pout","flykick","niu","bukui"],
    "set-09": ["sip","sugar","freeze","queue","boba","more","spill","hug","die","treat","wait","wrong","night","pudding","empty","love"],
    "set-10": ["boil","dunk","spicy","numb","raw","steal","give","stolen","full","more","sesame","potato","timeout","cheers","steam","left"],
    "set-11": ["skewer","cumin","beer","give","wait","greasy","spicy","midnight","smoke","more","burnt","full","finish","pay","wing","sneak"],
    "set-12": ["tent","fire","marsh","star","bug","rain","coffee","photo","bag","mosquito","guitar","bbq","hike","sunrise","lost","hammock"],
}

ZH = {
    "set-01": ["美滋滋","吃瓜","笑死","贴贴","逆天","裂开","救命","不想活","冲","绝了","收到","破防","尊嘟假嘟","摆烂","晚安","拜拜了您"],
    "set-02": ["冲浪啦","墨镜酷","喝果汁","小黄鸭","踩沙滩","晒太阳","捡贝壳","吹海风","好热呀","泼水","拍照","看大海","嗨起来","冰西瓜","招手","日落"],
    "set-03": ["祭","转圈","烟花","章鱼烧","鞠躬","灯笼","金鱼","糖苹果","比心","害羞","你好","超开心","好吃","等我","夜祭","走咯"],
    "set-04": ["咬一口","好吃","吃饱啦","吐籽","汁液","分你","想吃","好冰","再来一块","野餐","数籽","西瓜脸","黏糊糊","透心凉","贪吃","吃完啦"],
    "set-05": ["微笑","嘿嘿","嘟嘴","不理你","哇","无语","尴尬","暴怒","闪亮","晕乎乎","得意","害怕","疑惑","感动","发呆","心动"],
    "set-06": ["好的","不行","等一下","什么","真的吗","收到","待会聊","忙着呢","过来","快走","对不起","没关系","同意","怀疑","已读","正在输入"],
    "set-07": ["抱抱","啾咪","眨眼","偷看","躺平","打滚","可怜巴巴","粘人","可爱","摸摸头","转呀转","手指心","坐好","咯咯笑","鼓脸","蹦蹦"],
    "set-08": ["早呀","冲鸭","有力量","鼓掌","赢啦","冲冲冲","充满电","跳舞","跳起来","耶","流汗","歇一会","认真","为你加油","小太阳","完成"],
    "set-09": ["送你","好运","送花","生日快乐","红包","干杯","恭喜","新年快乐","情人节","中秋快乐","许愿","平安","发财","在一起","感恩","祝福抱"],
    "set-10": ["打哈欠","抱枕","睡着了","盖被","做梦","月亮","数星星","还不睡","热牛奶","小熊","晚好","关灯","闹钟","打呼噜","好梦","起床啦"],
    "set-11": ["翻白眼","戴耳机","靠墙","暗黑比心","凌晨消息","冷笑","转身走","涂指甲","口罩","心碎","看月亮","撕信","冷暴力","假笑","坐音箱","独自淋雨"],
    "set-12": ["火箭冲","后空翻","击掌","功能饮料","狂奔","哑铃","教练哨","冲线","甩毛巾","高抬腿","满电","弹簧跳","敲鼓","吹号","燃起来","胜利"],
    "set-13": ["拉长尖叫","压扁","陀螺转","眼珠弹出","下巴掉地","头冒蒸汽","弹簧跳","抡臂","劈叉","速度线","巨大拳","面条身","星星晕","超长舌","跳出画","惊叹号"],
    "set-14": ["躺平","葛优躺","不上班","叉掉日历","合上电脑","泡面","死鱼眼","被窝","咸鱼","罢工牌","摸鱼","已读不回","周一","遥控器","叹气烟","摆烂奖"],
    "set-15": ["跳出来","偷西瓜","藏花","变魔术","吓人","挤脸","藤蔓勾","倒立","问号变感叹","扮猫","泡泡糖","镜子鬼脸","偷比耶","纸飞机","躲西瓜后","阴谋眨眼"],
    "set-16": ["加载中","404","大脑过载","选择困难","吐槽框","地球当瓜","重力反了","条码脸","沙漏","沉思像","空白气泡","研究籽","专属雨云","象棋困住","长收据","开讲"],
    "set-17": ["拍桌","扔粉笔","就是你","不及格","撕卷子","杀气","迟到","作业风暴","吹哨","点名","青筋","摔书","罚抄","走廊盯","火冒三丈","最后警告"],
}

SET_BG = {
    "set-01": (255, 245, 232),
    "set-02": (222, 242, 255),
    "set-03": (255, 236, 226),
    "set-04": (255, 242, 234),
    "set-05": (255, 247, 238),
    "set-06": (236, 242, 255),
    "set-07": (255, 236, 244),
    "set-08": (228, 252, 232),
    "set-09": (255, 242, 214),
    "set-10": (42, 36, 72),
    "set-11": (34, 30, 46),
    "set-12": (255, 246, 214),
    "set-13": (255, 236, 226),
    "set-14": (236, 230, 220),
    "set-15": (230, 252, 232),
    "set-16": (232, 236, 255),
    "set-17": (255, 238, 228),
}


def run(cmd: list[str]) -> None:
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def extract_frames(video: Path, out_dir: Path, fps: int = 12, start: float = 1.0, dur: float = 3.0) -> list[Path]:
    """Pull a full 3s consecutive action — never sparse-sample, never reverse."""
    out_dir.mkdir(parents=True, exist_ok=True)
    run(
        [
            "ffmpeg", "-y",
            "-ss", f"{start:.2f}", "-t", f"{dur:.2f}",
            "-i", str(video),
            "-vf", f"fps={fps},scale=480:480:flags=lanczos",
            "-an", str(out_dir / "f_%04d.png"),
        ]
    )
    frames = sorted(out_dir.glob("f_*.png"))
    if len(frames) < 20:
        run(
            [
                "ffmpeg", "-y", "-i", str(video),
                "-vf", f"fps={fps},scale=480:480:flags=lanczos",
                "-an", str(out_dir / "f_%04d.png"),
            ]
        )
        frames = sorted(out_dir.glob("f_*.png"))
    if not frames:
        raise RuntimeError(f"No frames from {video}")
    return frames


def flood_from_edges(bg_mask: np.ndarray) -> np.ndarray:
    """Keep only background that touches the frame edge — drops interior false magenta."""
    h, w = bg_mask.shape
    reach = np.zeros((h, w), dtype=bool)
    stack = []
    for x in range(w):
        stack.append((0, x))
        stack.append((h - 1, x))
    for y in range(h):
        stack.append((y, 0))
        stack.append((y, w - 1))
    while stack:
        y, x = stack.pop()
        if y < 0 or y >= h or x < 0 or x >= w or reach[y, x] or not bg_mask[y, x]:
            continue
        reach[y, x] = True
        stack.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))
    return reach


def paint_background(img: Image.Image, bg: tuple[int, int, int]) -> Image.Image:
    """Replace chroma magenta with pack bg. If the shot already has a scene, leave it."""
    arr = np.asarray(img.convert("RGB")).astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    h, w = r.shape
    corners = np.stack([arr[1, 1], arr[1, w - 2], arr[h - 2, 1], arr[h - 2, w - 2]])
    corner = np.median(corners, axis=0)
    dist_c = float(np.linalg.norm(corner - MAGENTA))
    # Already a cream/scene background — do not flatten it.
    if dist_c > 90:
        return Image.fromarray(arr.astype(np.uint8), "RGB")
    dist = np.linalg.norm(arr - MAGENTA, axis=2)
    tight = (r > 190) & (b > 175) & (g < 90) & ((r - g) > 90) & ((b - g) > 80)
    near = (r > 160) & (b > 130) & (g < 130) & ((r - g) > 45) & ((b - g) > 30)
    bg_dist = np.linalg.norm(arr - corner, axis=2)
    mask = near | (dist < 40) | (bg_dist < 30)
    kill = flood_from_edges(mask) | tight
    target = np.array(bg, dtype=np.float32)
    rim = (~kill) & (dist < 58)
    t = np.clip((dist - 40) / 18.0, 0.0, 1.0)
    for c in range(3):
        ch = arr[:, :, c]
        ch = np.where(kill, target[c], ch)
        ch = np.where(rim, ch * t + target[c] * (1.0 - t), ch)
        arr[:, :, c] = ch
    excess = np.minimum(arr[:, :, 0], arr[:, :, 2]) - arr[:, :, 1]
    spill = (~kill) & (excess > 10)
    if np.any(spill):
        corr = np.clip(excess, 0, None) * 0.85
        arr[:, :, 0] = np.where(spill, np.clip(arr[:, :, 0] - corr, 0, 255), arr[:, :, 0])
        arr[:, :, 2] = np.where(spill, np.clip(arr[:, :, 2] - corr, 0, 255), arr[:, :, 2])
    return Image.fromarray(arr.astype(np.uint8), "RGB")


def subject_bbox(img: Image.Image, pad_ratio: float = 0.16) -> tuple[int, int, int, int]:
    a = np.asarray(img.split()[3])
    ys, xs = np.where(a > 24)
    if len(xs) == 0:
        return (0, 0, img.width, img.height)
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    pad = int(max(x1 - x0, y1 - y0) * pad_ratio)
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(img.width, x1 + pad), min(img.height, y1 + pad)
    side = max(x1 - x0, y1 - y0, 32)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    x0 = max(0, cx - side // 2)
    y0 = max(0, cy - side // 2)
    x1 = min(img.width, x0 + side)
    y1 = min(img.height, y0 + side)
    x0 = max(0, x1 - side)
    y0 = max(0, y1 - side)
    return (x0, y0, x1, y1)


def union_bbox(frames: list[Image.Image]) -> tuple[int, int, int, int]:
    step = max(1, len(frames) // 8)
    boxes = [subject_bbox(im) for im in frames[::step]]
    x0 = min(b[0] for b in boxes)
    y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes)
    y1 = max(b[3] for b in boxes)
    side = max(x1 - x0, y1 - y0, 32)
    w, h = frames[0].size
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    x0 = max(0, min(w - side, cx - side // 2))
    y0 = max(0, min(h - side, cy - side // 2))
    return (x0, y0, min(w, x0 + side), min(h, y0 + side))


def fit_square(img: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    w, h = img.size
    scale = min(size / w, size / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    resized = img.convert("RGBA").resize((nw, nh), Image.Resampling.LANCZOS)
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return canvas


def best_consecutive(frames: list[Image.Image], count: int) -> list[Image.Image]:
    n = len(frames)
    if n <= count:
        return frames
    small = [
        np.asarray(fr.convert("L").resize((40, 40), Image.Resampling.BILINEAR), dtype=np.int16)
        for fr in frames
    ]
    delta = [0.0]
    for a, b in zip(small, small[1:]):
        delta.append(float(np.abs(a - b).mean()))
    best_i, best_s = 0, -1.0
    for i in range(0, n - count + 1):
        s = sum(delta[i + 1 : i + count])
        if s > best_s:
            best_s, best_i = s, i
    return frames[best_i : best_i + count]


def pick_loop_frames(frames: list[Image.Image], count: int = 36) -> list[Image.Image]:
    """Consecutive forward 3s clip. Never reverse-play."""
    seq = best_consecutive(frames, count)
    return seq if seq else frames[:count]


def quantize_gif(frames: list[Image.Image], duration_ms: int = 62, colors: int = 255) -> list[Image.Image]:
    """Opaque palette. No transparency index — background is baked in."""
    rgb_frames = [fr.convert("RGB") for fr in frames]
    ncolors = max(32, min(256, colors))
    base = rgb_frames[0].convert("P", palette=Image.Palette.ADAPTIVE, colors=ncolors)
    out = []
    for rgb in rgb_frames:
        p = rgb.quantize(palette=base, dither=Image.Dither.NONE)
        p.info["duration"] = duration_ms
        out.append(p)
    return out


def save_gif(frames: list[Image.Image], path: Path, duration_ms: int = 62, colors: int = 255) -> None:
    pal = quantize_gif(frames, duration_ms, colors=colors)
    tmp = Path("/tmp") / f"{path.stem}-{os.getpid()}.gif"
    pal[0].save(
        tmp,
        save_all=True,
        append_images=pal[1:],
        loop=0,
        duration=duration_ms,
        disposal=2,
        optimize=False,
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(tmp, path)
    tmp.unlink(missing_ok=True)


def process(video: Path, out_dir: Path, name: str, fps: int = 12, sizes=(240,), bg=(255, 246, 238)) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        raw_paths = extract_frames(video, Path(td) / "raw", fps=fps)
        painted = [paint_background(Image.open(p), bg) for p in raw_paths]
        looped = pick_loop_frames(painted, count=36)
        duration_ms = 84
        meta = {"source": str(video), "frames_gif": len(looped), "files": {}}
        for size in sizes:
            fitted = [fr.resize((size, size), Image.Resampling.LANCZOS) for fr in looped]
            gif_path = out_dir / f"{name}-{size}.gif"
            save_gif(fitted, gif_path, duration_ms=duration_ms, colors=255)
            if size == 240 and gif_path.stat().st_size > 490_000:
                fitted = [fr.resize((size, size), Image.Resampling.LANCZOS) for fr in pick_loop_frames(painted, count=32)]
                save_gif(fitted, gif_path, duration_ms=84, colors=255)
            if size == 240 and gif_path.stat().st_size > 490_000:
                fitted = [fr.resize((size, size), Image.Resampling.LANCZOS) for fr in pick_loop_frames(painted, count=30)]
                save_gif(fitted, gif_path, duration_ms=90, colors=220)
            png_path = out_dir / f"{name}-{size}.png"
            fitted[0].save(png_path)
            meta["files"][str(size)] = {
                "gif": str(gif_path),
                "png": str(png_path),
                "bytes": gif_path.stat().st_size,
            }
        return meta


def find_video(set_id: str, name: str) -> Path | None:
    for root in (ROOT / "assets" / "videos", ROOT / "artifacts" / "videos"):
        p = root / set_id / f"{name}.mp4"
        if p.exists():
            return p
    return None


def process_from_gif(gif_path: Path, out_dir: Path, name: str) -> dict:
    """Smooth an existing GIF when the source video is gone (blend in-betweens)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    src = Image.open(gif_path)
    frames = []
    for i in range(getattr(src, "n_frames", 1)):
        src.seek(i)
        frames.append(src.convert("RGBA"))
    if len(frames) >= 4:
        blended = [frames[0]]
        for a, b in zip(frames, frames[1:]):
            blended.append(Image.blend(a, b, 0.5))
            blended.append(b)
        frames = blended
    looped = pick_loop_frames(frames, count=min(24, len(frames)))
    fitted = [fit_square(fr, 240) for fr in looped]
    gif_out = out_dir / f"{name}-240.gif"
    save_gif(fitted, gif_out, duration_ms=50)
    png_path = out_dir / f"{name}-240.png"
    fitted[0].save(png_path)
    return {
        "source": str(gif_path),
        "frames_gif": len(looped),
        "files": {"240": {"bytes": gif_out.stat().st_size}},
    }


def ffmpeg_gif(video: Path, dest: Path, start: float = 0.0, dur: float = 3.0, speed: float = 1.0) -> tuple[int, str]:
    """Video to GIF: ~3s, 30fps, 240px, 400–500KB. Never drop below 30fps."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = Path("/tmp") / f"{dest.stem}-{os.getpid()}.gif"
    ladders = [(30, 128, 2), (30, 96, 3), (30, 80, 3), (30, 64, 3), (30, 64, 5), (30, 56, 5), (30, 48, 5)]
    used = "ff"
    speed_vf = f"setpts={1.0 / speed:.3f}*PTS," if speed and speed != 1.0 else ""
    chosen = None
    chosen_used = used
    for fps, colors, bayer in ladders:
        vf = (
            f"{speed_vf}fps={fps},scale=240:240:flags=lanczos,"
            f"split[a][b];[a]palettegen=max_colors={colors}:reserve_transparent=0:stats_mode=full[p];"
            f"[b][p]paletteuse=dither=bayer:bayer_scale={bayer}"
        )
        run(
            [
                "ffmpeg", "-y",
                "-ss", f"{start:.2f}", "-t", f"{dur:.2f}",
                "-i", str(video),
                "-loop", "0",
                "-vf", vf,
                str(tmp),
            ]
        )
        size = tmp.stat().st_size
        used = f"ff-{fps}fps-{colors}c"
        if 400_000 <= size <= 500_000:
            chosen = tmp
            chosen_used = used
            break
        if size <= 500_000:
            shutil.copy2(tmp, str(tmp) + ".best")
            chosen = Path(str(tmp) + ".best")
            chosen_used = used
            if size < 400_000:
                break
    src = chosen if chosen and Path(chosen).exists() else tmp
    shutil.copy2(src, dest)
    tmp.unlink(missing_ok=True)
    Path(str(tmp) + ".best").unlink(missing_ok=True)
    png = dest.with_suffix(".png")
    run(
        [
            "ffmpeg", "-y",
            "-i", str(dest),
            "-frames:v", "1",
            str(png),
        ]
    )
    return dest.stat().st_size, chosen_used


def convert_one(set_id: str, name: str, force: bool) -> tuple[str, int, str]:
    pub = ROOT / "public" / "stickers" / set_id
    pub.mkdir(parents=True, exist_ok=True)
    dest = pub / f"{name}.gif"
    video = find_video(set_id, name)
    if video is None:
        return name, dest.stat().st_size if dest.exists() else 0, "missing-video"
    speed = 1.0
    b, st = ffmpeg_gif(video, dest, speed=speed)
    return name, b, st


def _convert_job(args: tuple[str, str, bool]) -> tuple[str, str, int, str]:
    set_id, name, force = args
    try:
        n, b, st = convert_one(set_id, name, force)
        return set_id, n, b, st
    except Exception as e:
        return set_id, name, 0, f"err:{e}"


def load_gif_frames(path: Path) -> list[Image.Image]:
    src = Image.open(path)
    frames = []
    for i in range(getattr(src, "n_frames", 1)):
        src.seek(i)
        frames.append(src.convert("RGBA"))
    return frames


def shrink_gif(path: Path, limit: int = 490_000) -> tuple[int, str]:
    """Forward-only. Never reverse. Never drop below ~16fps / 180 colors."""
    if not path.exists() or path.stat().st_size <= limit:
        return path.stat().st_size if path.exists() else 0, "ok"
    frames = load_gif_frames(path)
    dest = path
    for colors, count in ((220, 24), (200, 22), (180, 20)):
        use = frames[: min(count, len(frames))]
        fitted = [fr.convert("RGB").resize((240, 240), Image.Resampling.LANCZOS) for fr in use]
        save_gif(fitted, dest, duration_ms=62, colors=colors)
        if dest.stat().st_size <= limit:
            return dest.stat().st_size, f"shrink-{colors}-{len(use)}"
    return dest.stat().st_size, "still-over"


def convert_set(set_id: str, force: bool = False) -> None:
    names = NAMES[set_id]
    zh = ZH[set_id]
    rows = []
    jobs = [(set_id, n, force) for n in names]
    with ProcessPoolExecutor(max_workers=3) as ex:
        futs = [ex.submit(_convert_job, job) for job in jobs]
        for f in as_completed(futs):
            sid, n, b, st = f.result()
            print(f"{sid:7} {n:16} {st:14} {b:8d}", flush=True)
            rows.append((n, b, st))
    order = {n: i for i, n in enumerate(names)}
    rows.sort(key=lambda r: order.get(r[0], 99))
    pub = ROOT / "public" / "stickers" / set_id
    pub.mkdir(parents=True, exist_ok=True)
    manifest = []
    for n, z in zip(names, zh):
        gif = pub / f"{n}.gif"
        if gif.exists():
            manifest.append(
                {
                    "id": n,
                    "name": z,
                    "gif": f"/stickers/{set_id}/{n}.gif",
                    "png": f"/stickers/{set_id}/{n}.png",
                    "bytes": gif.stat().st_size,
                }
            )
    (pub / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(f"{set_id} published {len(manifest)}/16", flush=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", default="all")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--shrink", action="store_true")
    args = ap.parse_args()
    sets = list(NAMES) if args.set == "all" else [args.set]
    if args.shrink:
        for s in sets:
            for n in NAMES[s]:
                p = ROOT / "public" / "stickers" / s / f"{n}.gif"
                b, st = shrink_gif(p)
                print(f"{s:7} {n:16} {st:16} {b:8d}", flush=True)
        return
    for s in sets:
        convert_set(s, force=args.force)


if __name__ == "__main__":
    main()
