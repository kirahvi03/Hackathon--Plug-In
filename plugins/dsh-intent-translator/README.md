# dsh-intent-translator

**意图翻译器**：把一句不精确的 vibecoding 描述里 **1–3 处模糊片段分别**拆成
2–3 个方向不同的「人话」候选；模糊片段用亮蓝色 `#66ccff` 标出。
点选一张卡片只替换它所属的那一处片段，其余原文（包括其他片段）不动；
支持 **撤回**（恢复自然语言）和 **换一组**（避开上一组方向重新生成）。

> 最终命名：`dsh-intent-translator`（包名、Client module id、bundle 行 id 一致）。
> 当前实现基线：DSH **0.2.1-rc.2** / Cordis **4.0.5**。

![意图翻译器多片段候选卡片](docs/preview.png)

> 上图为两处模糊片段各自分叉的效果；单片段验收示例见
> [docs/preview-single.png](docs/preview-single.png)。

## 它解决什么

```text
输入：我想要设计一个网页界面，背景有图片，前景是毛玻璃效果，高级感
点击工具行的「拆解」→
  原文标记：我想要设计一个网页界面，背景有图片，前景是[毛玻璃效果，高级感]
                                                   ↑ 只有模糊片段是蓝色 #66ccff

  片段 1「毛玻璃效果，高级感」
  ┌ 毛玻璃透叠感  半透明前景压在图片上……
  ├ 极简留白感    减少装饰，让画面留出呼吸空间……
  └ 暗色高级感    整体压暗提高对比，让图片成为主体……

点「极简留白感」→
  「毛玻璃效果，高级感」被替换；「背景有图片」原样保留
  顶部出现「撤回全部替换」，其他片段仍可继续选
```

决策发生在标题层，交付物（prompt）折叠在卡片里：用户先选方向，再决定要不要看参数。
原文里连续出现、属于同一处表达的模糊描述会合并为一个片段；不同位置或不同对象的
模糊描述会各成一区，分别生成候选。

高亮有两层：卡片面板顶部始终有一段「原文标记」，用 `#66ccff` 着色；如果浏览器支持
CSS Custom Highlight API，输入框里的对应文字也会实时变成同一种蓝色（不改 DOM、
不改草稿）。不支持时只保留面板里的标记。

## 安装

在 DSH 会话里用 `plugin_manager`，`target` 必须是绝对路径：

```text
plugin_manager { "action": "install_bundle", "target": "C:\\path\\to\\Hackathon--Plug-In\\plugins\\dsh-intent-translator" }
```

或使用 CLI（安装后按提示重启正在运行的 Desktop / web 进程）：

```powershell
dsh plugin --profile desktop add "C:\path\to\Hackathon--Plug-In\plugins\dsh-intent-translator"
```

安装后按钮出现在输入框工具行左侧（与 `dsh-prompt-optimizer` 的 ✨ 同一槽位
`conversation.input.left`），候选卡片出现在输入框上方
（`conversation.input.dock`）。

## 交互

1. 在输入框写完一句话，点工具行的 **✨ 拆解**。
2. Host 做一次 LLM 调用：找出 1–3 处模糊片段，并为每一处分叉方向。
3. 每个片段独立判断：`confidence >= 0.85` 只显示该片段的首选一张；否则显示 2–3 张。
4. 卡片默认只显示 **人话标题 + 一句话解释**；点「查看技术写法」才展开 prompt，
   可复制或插入。
5. 点卡片 = 选中该片段的方向并替换；只替换这个片段的 span，其他片段和确定信息
   原样保留。已应用的片段显示「已选」，其他片段继续展示卡片。
6. 顶部「↻ 换一组」会带上上一组的 label/explanation 作为 avoid 列表重新调用；
   Host 会过滤重复方向，若模型只给出旧方向则报 `NO_NEW_DIRECTIONS`，保留原卡片。
7. 点「撤回全部替换」（或工具行的「撤回」）会把草稿恢复到第一次替换前的
   自然语言状态，并重新展示卡片，方便重选。
8. 需要继续精修时，再点原来的 ✨ 优化按钮即可（V1 不自动调用 optimizer）。

## 配置

在 `cordis.patch.yml` 的插件行里可选配置：

```yaml
- insert:
    - id: dsh-intent-translator
      name: 'dsh-intent-translator'
      config:
        timeoutMs: 15000       # 10–60000，默认 15000
        maxInputChars: 8000    # 200–20000
        maxTokens: 1400        # 256–4096
        provider: ''           # 留空跟随 DSH 默认模型
        model: ''              # 与 provider 同时留空或同时填写
        reasoningEffort: 'off' # off | inherit
```

不带 `Config` schema，所有字段都有安全默认值；配置非法值会被钳制或忽略。
模型路由优先级：显式 `provider`+`model` → `agentDefaultModel.currentSelection()`
→ 第一个 provider 的第一个 model。

## Host / Client 分工

| 半边 | 文件 | 职责 |
| --- | --- | --- |
| Host | `index.js`、`lib/host.js` | `POST /api/dsh-intent-translator/fork`；`ctx.llm.stream()`；15s deadline；retry avoid 透传；JSON 校验；同源/loopback 闸；错误映射；V2 optimizer 桥 |
| Host 纯逻辑 | `lib/engine.js` | 系统提示词、JSON 提取、多片段校验、confidence/label 校验、方向去重、span 定位与替换、retry avoid 过滤 |
| Client | `client.js`（由 `client.src.js` 构建） | 工具行按钮、多片段分区卡片、`#66ccff` 高亮、折叠 prompt、复制/插入、逐段替换、撤回、换一组、i18n、主题 token |

Client 不直接调模型，也不读写 session；只调用本地 HTTP 路由。Host 不写草稿、
不写 session，失败时输入框内容完全不变。

### 数据契约

请求：

```json
{
  "text": "原始草稿",
  "sessionId": "可选的会话 id",
  "attempt": 1,
  "retry": true,
  "avoid": [{ "label": "极简留白感", "explanation": "减少装饰，让画面留出呼吸空间。" }]
}
```

`attempt` / `retry` / `avoid` 仅用于「换一组」；首次拆解只发 `text` 和 `sessionId`。
`avoid` 最多 20 条，Host 会截断并清洗。

成功：

```json
{
  "ok": true,
  "result": {
    "segments": [
      {
        "id": "seg-1",
        "span": "毛玻璃效果，高级感",
        "confidence": 0.62,
        "start": 21,
        "end": 30,
        "candidates": [
          {
            "id": "glass-overlay",
            "label": "毛玻璃透叠感",
            "explanation": "半透明前景压在图片上，边缘有隐约反光。",
            "prompt": "12px 高斯模糊叠加 15% 透明白",
            "replace_span": "毛玻璃效果，高级感",
            "refinement": { "status": "pending" }
          }
        ],
        "warnings": []
      }
    ],
    "warnings": [],
    "noChange": false
  },
  "meta": { "ms": 1830, "provider": "deepseek", "model": "deepseek-v4-flash", "attempt": 0, "retry": false, "usage": {} }
}
```

只有一个片段时，`result` 还会附带 `confidence` / `ambiguous_span` / `candidates`
三个兼容字段；Client 优先读 `segments`，同时也能处理旧的单片段响应。

失败统一返回 HTTP 200 + `{ "ok": false, "error": { "code": "...", "message": "..." } }`，
只有空输入/超大输入使用 400/413。常见 code：`TIMEOUT`、`NO_MODEL`、`AUTH`、
`RATE_LIMIT`、`INVALID_JSON`、`NO_CANDIDATES`、`NO_NEW_DIRECTIONS`、
`DRAFT_CHANGED`、`FORBIDDEN`。

### 输出校验与降级

- 只接受严格 JSON；模型若包了代码围栏或开场白，提取第一个平衡 `{...}`。
- `segments` 最多保留 3 个，按原文位置排序；重叠片段只保留靠前的一个并给出
  `overlapping_segments` 警告，避免同一段文字被替换两次。
- 每个片段的 `confidence` 独立判断；`label` 必须是人话：含 ASCII/数字/CSS 术语时
  自动清洗；清洗失败从 `explanation` 提人话短语，再不行用「方向一/二/三」。
- 每个片段的候选只在片段内部去重：`label + explanation` 的 CJK 二元组 Jaccard
  ≥ 0.6 视为同向，合并并给出 `directions_collapsed` 警告。
- 候选的 `replace_span` 被强制约束在该片段的 `span` 内（通常直接等于 `span`）；
  模型给的 span 不在原文中时，回退到候选自带的 replace_span；再不行客户端整段
  替换并显示可撤回提示。空格差异用「去空白比对」定位，不猜标点。
- 若 prompt 开头重复了 span 前紧邻的词（原文「按钮要[赛博朋克一点]」+ prompt
  「按钮用…」），Host 会剥掉重复词与连接词，避免拼成「按钮要按钮用…」。
- 「换一组」时，Host 用 `avoid` 的 label/explanation 过滤掉高度相似的新候选
  （Jaccard ≥ 0.55，或 label 完全相同）；若过滤后没有片段/没有新 label，抛出
  `NO_NEW_DIRECTIONS`，Client 保留上一组卡片并提示再试。
- 模型返回空候选（原文已经足够具体）时显示「不需要分叉」，不硬造卡片。

## V2 预留（不实现）

`lib/host.js` 暴露了 `resolveOptimizer(ctx)` / `refineCandidate(ctx, candidate, options)`：

- 通过 `ctx.get('promptOptimizer')` 或 `ctx.get('dshPromptOptimizer')` 查找
  `dsh-prompt-optimizer` 暴露的 `refine({ text, sessionId, signal, direction })`。
- V1 不调用它；`/fork` 的 `meta.refinement.available` 只报告能力是否存在。
- 数据契约已预留 `candidate.refinement: { status: 'pending' | 'ready' | 'error',
  text?, message? }`；Client 卡片会渲染 pending 占位、ready 结果或单卡失败提示。
- 未来若 optimizer 只暴露 HTTP 路由，只需在这里加一个薄适配器，调用
  `/api/dsh-prompt-optimizer/optimize`，**不要复制它的代码**。
- 并行精修的渲染契约：先到先显示（`ready`），未到显示占位（`pending`），
  单卡失败只影响该卡（`error`），不影响其他卡。

## 开发与验证

```powershell
cd plugins\dsh-intent-translator
node scripts/build-client.mjs
node --test test/engine.test.mjs test/host.test.mjs test/client.test.mjs
node --check index.js
node --check lib\engine.js
node --check lib\host.js
node --check client.js
```

测试覆盖：JSON 提取、人话标签清洗、方向去重、多片段解析与重叠裁剪、片段内
replace_span 约束、span 精确/空白匹配、整段降级、重复前导词剥离、高置信度阈值、
retry avoid 过滤、`NO_NEW_DIRECTIONS`、错误映射、模型拒绝 `reasoningEffort` 时的
一次重试、同源闸、Client bundle 的模块注册与槽位注册、`#66ccff` 高亮与多片段
UI 字符串。

## 已知限制

- 需要当前 DSH 已配置至少一个可用模型；没有模型时显示可读错误，不改草稿。
- 一次点击只做一次分叉调用；若模型给出高度相似的方向，Host 会合并而不是二次调用。
- 输入框内的蓝色高亮依赖 CSS Custom Highlight API（Chromium 105+）；不支持时
  卡片面板顶部的「原文标记」仍然用 `#66ccff` 标出所有片段。
- 「换一组」依赖模型配合 avoid 列表；若模型坚持重复，Host 会拒绝并用
  `NO_NEW_DIRECTIONS` 保留原卡片，而不是展示一组几乎相同的方向。
- 插件不写 session、不落盘草稿；刷新页面后撤回记录不保留。
- 当前运行中的 Desktop 若是安装/更新前启动的，需要重启一次让 Host 侧新代码生效。
