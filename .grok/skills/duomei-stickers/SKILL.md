---
name: duomei-stickers
description: >
  多美表情包通用制作流程。主角永远是多美。用户只说主题时先读本 skill 再开工。
  生成 6 秒视频 → scripts/sticker.mjs 自动截无缝循环、压 240×240 ≤500KB、自动质检 → 看对照图 → 上架。
  Triggers: 表情包, sticker, GIF, 多美, 贴纸, 皮肤, 设定图.
metadata:
  short-description: "多美表情包：6s 视频 → sticker.mjs make/qa/publish，质检不过不许交"
user-invocable: true
---

# 硬规矩（违反任何一条 = 没交付）

1. **GIF 只能用 `scripts/sticker.mjs make` 生成**。禁止手写 ffmpeg 截取、禁止自己加首尾淡入淡出（会出重影）。
2. **`node scripts/sticker.mjs qa <pack>` 全部 ✅ 才能交付**。有 ❌ 就按提示改（换片段 / 重生成视频），不许解释为什么"其实可以"。
3. **必须打开 `.sticker-qa/<pack>-sheet.png` 逐行看**，并在回复里逐张写一句看到了什么（动作、发色、描边、字）。没看图 = 没检查。
4. **上架只用 `node scripts/sticker.mjs publish <pack>`**。它会更新 manifest / sizes / index 和缓存版本号，并拒绝上架不合格的图。
5. 上架后打开线上套装页确认图片真的能显示（不是 404、不是旧图）。
6. 用户没点名的旧表情禁止重做。

# 画风（参考 set-05 美食篇、set-06 上号）

- 人物外一圈**白色贴纸描边**，奶油底或干净纯色底，色块平整、自然鲜艳。
- 字：粗体大字 + 白色描边，放底部，不挡脸，一套里字体统一。
- **不要用调色（eq / saturation / colorbalance）把灰图"拉鲜艳"**：会发冲、头发变橙、底发黄。颜色不好 = 重新生成。

# 角色

- 主角永远是多美。脸、发型、体型不许换。一套一种皮，禁止中途换脸换头。
- 没说皮肤 = 西瓜原皮：**棕色短发**（不是黑色）+ 西瓜髻和藤叶、白 T、樱桃红西瓜籽背带、西瓜包、红鞋。
- 设定图：`public/refs/watermelon-white.jpg`。

# 提示词（每张都要带）

静帧锁皮（英文，放每张静帧提示词开头）：

```
Same locked watermelon-skin Duomei as the classic character sheet: chibi girl, WARM CHOCOLATE-BROWN short bob with blunt bangs (NOT black), round watermelon bun on the crown with a curly green vine and one small leaf, pink oval blush, huge round dark-brown eyes. White T-shirt under SATURATED cherry-watermelon-red overall shorts with black seed dots, watermelon-slice crossbody bag, white socks, bright red sneakers. Thick clean WHITE STICKER DIE-CUT OUTLINE around the whole character. Cream paper background, flat colors, cute sticker illustration, square 1:1. Bold Chinese caption at the BOTTOM with thick white outline, not covering face. Full body centered, head-to-shoes visible.
```

视频镜头锁（放每张视频提示词末尾）：

```
Locked camera, no zoom, no pan, no tilt. Square 1:1. Character stays full-body centered the entire time. Background and bottom caption stay completely still. One complete action in 3 seconds: anticipation → big climax → return to the exact starting pose, then repeat. First frame pose equals last frame pose. Large continuous motion, no freeze-frame, no sudden jump. Same face, hair, outfit throughout. No extra limbs.
```

打击类（打、抽、踢、捶、踩）要**快、连续**：3 秒内连打 3–4 下，中间不停顿（视频提示词写 rapid consecutive hits, no pause between hits）；做 GIF 时加 `--mode cut --speed 1.6`，不要用 boomerang（倒放会让被打的飞回来）。

动作要大、要有情绪高潮：打/抽/踢要凶要快；"无语""白眼"这类表情也要有完整动作（耸肩、仰头翻眼），不能只是站着眨眼。

# 流程

1. 写动作清单（每张：动作、情绪、打谁、字）。动作互不相同，站、坐、躺、转身、特写都要有。
2. 出静帧 → 看过再出 **6 秒 1:1 视频**。视频里出现分身、多手、脸漂、黑发、残字 = 重生成。
3. 每张：
   ```
   node scripts/sticker.mjs make <video.mp4> --pack set-XX --id <id>
   ```
   自动选片段：首尾接得上就直接截（cut），接不上就正放+倒放（boomerang）。
   **自动选的片段不一定是"有梗"的那段**（比如"不想理你"应该是转身背对，而不是转回来）。看对照图不对就手动指定：
   ```
   node scripts/sticker.mjs make <video.mp4> --pack set-XX --id <id> --mode boomerang --start 4 --len 38
   ```
   `--start/--len` 是源视频的帧号（24fps），先抽帧条看动作在哪几帧。
4. `node scripts/sticker.mjs qa set-XX` → 全 ✅ + 看对照图。
5. `src/lib/packs.ts` 里登记这套（PACKS + READY_PACK_IDS），再 `node scripts/sticker.mjs publish set-XX`，commit + push main（Vercel 自动部署）。
6. 打开 `https://duomei.vercel.app/pack/set-XX` 确认。

# 质检标准（sticker.mjs 自动判）

| 项 | 标准 |
|---|---|
| 尺寸 | 240×240 |
| 体积 | ≤ 495KB（微信 500KB） |
| 帧率 | ≥ 14fps（通常 16–20） |
| 时长 | 2–4.5 秒 |
| 动作量 | 平均每帧变化 ≥ 1.5，否则"几乎不动" |
| 循环接缝 | 首尾跳变 ≤ 附近正常变化的 1.5 倍 |
| 停住帧 | ≤ 30% |
| 突跳帧 | ≤ 15% |

自动检查看不出：重影、发色、描边、字错、多手多脚、动作没梗 —— 这些靠看对照图。

# 交付给用户

- 逐张一句话：动作 + 质检数值（fps / KB）+ 看图结论。
- 有问题的明确说哪张、什么问题、下一步怎么办。不许只说"都没问题"。
- 用户那边（Claude / 另一个助手）会复查。如果只交视频不上架，mp4 传 tmpfiles.org 给 `/dl/` 直链（assets.grok.com 需要登录，外面下载不了）。
