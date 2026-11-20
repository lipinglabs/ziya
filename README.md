# 字芽 · 幼儿识字与语音意识启蒙

给 4 岁孩子的识字游戏。不是把一年级课本做成题，而是按年龄窗口拆成三层：

```
现在（4 岁）      识字认读 + 语音意识
5 岁后            拼音符号系统
5 岁半            拼音 ↔ 识字打通，进入指读
```

**为什么 4 岁不教拼音**：拼音是抽象符号系统，前置能力是「音素意识」（押韵、首音、音节切分、声调），多数儿童 5 岁后才成熟。4 岁硬上，典型结果是 b/d、p/q 反复分不清，形成「学习=难受」的初始印象。

## 现状（v0.1）

| 模块 | 状态 |
|---|---|
| M1 识字 · 300 字 / 30 主题组 | 已实现（4 种题型，拼音题型由开关控制） |
| M2 语音意识 · 押韵 / 首音 / 音节 / 声调 | 已实现（程序化出题，无限关） |
| M3 拼音（63 符号 + 300 音节） | 未开始，计划 2027 年秋 |
| M4 笔顺描红 | 未开始 |
| M5 阅读短句 | 未开始 |

## 目录

```
index.html          壳
css/app.css         全部样式
js/data/chars.js    300 字表（唯一内容源）
js/core/pinyin.js   拼音解析：声母/韵母/声调/押韵
js/core/store.js    localStorage 存档 + 导入导出
js/core/srs.js      间隔重复引擎（掌握度 0-5，1/3/7/15/30 天）
js/core/audio.js    音频包懒加载与播放
js/game/gen.js      题目生成器（从字表推导，不预写题库）
js/app.js           界面与流程
audio/gNN.js        每 10 字一个音频包（base64 data URI）
audio/src/*.mp3     音频母版，不入库
sw.js               离线缓存
tools/              生产与发布工具
```

## 铁律（继承自 lilearn-english）

1. **音频按主题组打包成独立 `.js`**，严禁内联进 `index.html`。
2. **凭据不进仓库**：豆包 TTS 的 Key 只从环境变量或 `~/.workbuddy/secrets/doubao.env` 读取。
3. **禁止 `git push`**：本机推送被网络拦截，必须用 `tools/publish.js` 走 GitHub Data API。
4. 本项目为中文识字内容，属「沉浸感铁律（纯英文）」的**明确例外**。

## 常用命令

```bash
node tools/check_data.js        # 字表自检（改字后必跑）
python tools/gen_audio.py       # 生成缺失语音并重新打包 audio/*.js
python tools/gen_audio.py --pack-only
node tools/publish.js           # 走 Data API 发布到 GitHub Pages
python -m http.server 8777      # 本地预览
```

## 设计要点

- **间隔重复取代通关制**：每个字有独立掌握度，每次打开看到的是「今天该复习什么」，不是「上次玩到第几关」。
- **错题不惩罚**：答错只重听、再试一次；两次未对自动揭示答案，永不卡住。
- **单次 12 分钟**：到点温和收尾。
- **零网络依赖**：全部资源本地，PWA 首次打开后离线可玩。

## 数据

进度存在 `localStorage`（键 `ziya.v1`）。换设备走家长面板「导出备份 / 导入备份」。
