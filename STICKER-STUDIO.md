# 多美表情包工作台（给所有 AI 的入口）

Claude、Cursor、grok 命令行、Codex 都按这份做。画风、角色、设计规则见 `.grok/skills/duomei-stickers/SKILL.md`，开工前读完。

## 分工

- **AI**：改 `briefs/<pack>.json`、生成候选、跑检查、在回复里说明每个候选好在哪/差在哪。
- **用户**：在工作台 http://localhost:5178 里看、选，点「上架到网站」。
- **AI 不许自己上架**（不许跑 `publish`、不许 push `public/stickers`），除非用户在对话里明确说「这张上架」。

## 内容写在哪

`briefs/<pack>.json`，每张一条：

```json
{ "id": "pout", "caption": "不想理你", "hit": false, "action": "英文动作描述：起始姿势→动作→回到起始附近" }
```

- `caption`：画面底部的字，也是聊天里会打出来的那句话。
- `hit`：打击类（打、抽、踢、捶、踩）设 `true`，会做得更快更连贯；表情类 `false`，保持正常节奏。
- `action`：一件事、3 秒内看懂、可爱适度。离场类（踢飞、滚出去）要写清楚「整个出画面」。

## 命令（都在本目录下跑）

```bash
node scripts/sticker.mjs gen set-08 pout hmph --versions 2   # 本机 grok 生成视频 → 候选
node scripts/sticker.mjs list set-08                         # 每张：线上是否合格、有哪些候选
node scripts/sticker.mjs qa set-08 pout                      # 详细检查 + 逐帧对照图 .sticker-qa/
node scripts/sticker.mjs pick set-08 pout 2                  # 用候选 2 替换（未上架，仅在用户选定后）
node scripts/sticker.mjs discard set-08 pout                 # 清掉候选
node scripts/sticker.mjs make <video.mp4> --pack set-08 --id pout --cand 3 --mode cut [--start N --len N] [--speed 1.3]
node scripts/sticker.mjs fetch set-08 grok回复.txt            # 网页版 Grok 给的 tmpfiles 链接 → 候选
```

- 候选在 `.sticker-candidates/<pack>/<id>/<n>.gif`（旁边的 `.json` 记着截取参数和检查结果），源视频在 `.sticker-sources/`。这两处不进 git。
- 自动选的片段不一定是有梗的那段：看对照图，不对就 `make --start/--len` 手动截。
- 流泪、喷气、踢飞、打滚这类动作不要用 `--mode boomerang`（倒放穿帮）。
- 生成一张大约几分钟，`gen` 可以放后台跑。

## 工作台

开机自动运行在 http://localhost:5178（macOS LaunchAgent `com.duomei.sticker-studio`）。
没开的话：`node scripts/sticker-studio.mjs`。

## 交付时在对话里写

每个候选一行：动作是否对题、自动检查结果（KB / fps / 秒）、看对照图的结论、推荐选哪个。然后请用户去工作台挑。
