# dsh-intent-translator 实现计划

> 调研基线：本机 DSH **0.2.1-rc.2**（Cordis 4.0.5）。已重新解包当前 `app.asar`，
> 按 0.2.1 的官方 skill 文档、`dsh-client-ui-conversation` 源码与槽位目录核对。
> 参考实现：`windrover/dsh-prompt-optimizer`、`linzimu666/dsh-intent-suggest`、
> `Anionex/dsh-suggested-replies`。

## 1. 命名与交付边界

- 最终插件名：**`dsh-intent-translator`**（包名、Client module id、bundle 行 id 三者一致）。
- 中文显示名：**意图翻译器**。
- 本次只交付 V1：点击 → 一次 LLM 分叉 → 卡片 → 点选替换 → 撤销。
- V2 只留接口：点选方向后可调用 `dsh-prompt-optimizer` 精修；V1 不自动调用。

## 2. 文件结构

```text
plugins/dsh-intent-translator/
├─ package.json              # bundle 清单 + dsh.client + exports + peerDependencies
├─ cordis.patch.yml          # 把 Host 行 insert 进 profile
├─ index.js                  # Host 入口：name / inject / apply
├─ lib/
│  ├─ engine.js              # 纯逻辑：提示词、JSON 解析、校验、去重、span 匹配/替换
│  └─ host.js                # Host：webServer 路由、ctx.llm 调用、超时、错误映射、V2 桥
├─ client.src.js             # Client 源码（带 /*@@ENGINE@@*/ 占位）
├─ client.js                 # 构建产物，DSH 实际加载；仓库内直接可用
├─ scripts/build-client.mjs  # 零依赖构建：把 engine.js 内联进 client.src.js
├─ locale/{zh,en}.json       # 插件卡片显示名/描述
├─ icon.svg                  # 原创图标
├─ test/engine.test.mjs      # 解析/校验/去重/替换/降级单测
├─ test/host.test.mjs        # Host 路由 + 假 LLM 流 + 超时/错误单测
└─ README.md                 # 安装、配置、V2 接口、验收步骤
```

不引入任何运行时依赖。`client.js` 已提交，不需要在用户机器上构建。

## 3. Host / Client 职责

### Host（`index.js` + `lib/host.js`）

| 职责 | 做法 |
| --- | --- |
| 暴露接口 | `POST /api/dsh-intent-translator/fork`，只接受 loopback + same-origin；body `{ text, sessionId?, refine? }` |
| LLM 调用 | `ctx.llm.stream({ provider, model, system, messages, temperature, maxTokens, reasoningEffort: 'off', signal })` |
| 路由解析 | 配置 `provider`+`model` 优先 → `ctx.get('agentDefaultModel').currentSelection()` → 第一个 provider 的第一个 model |
| 超时 | 默认 15s（可配置），覆盖 body 读取 + 模型调用；客户端断开也 abort |
| 输出校验 | 严格 JSON 提取；confidence 钳制；候选 1–3；label 人话守卫；方向去重；span 精确匹配校验 |
| 错误 | 返回 `{ ok:false, error:{ code, message } }`，HTTP 200；输入为空/过大才 400/413；不写 session、不改草稿 |
| V2 预留 | `refineCandidate(ctx, ...)` 只查 `ctx.get('promptOptimizer')` 能力并抛 `NOT_IMPLEMENTED`；响应候选类型预留 `refinement` 字段 |

`inject = ['webServer', 'llm']`；`agentDefaultModel` 用 `ctx.get()` 软探测，缺失时回退，不阻止插件激活。
路由注册包在 `ctx.effect(() => ctx.webServer.register(...))` 中。

### Client（`client.js`）

| 组件 | 槽位 | 职责 |
| --- | --- | --- |
| `ToolbarButton` | `conversation.input.left`，`order: 60` | ✨ 按钮；loading 时转圈并可取消；成功后显示撤销按钮 |
| `IntentCardDock` | `conversation.input.dock`，`order: 15` | 识别片段提示、2–3 张横向卡片、错误条、loading 条；替换后整块收起 |

- 两个组件通过模块内 per-session store 共享状态（按钮与卡片在不同 slot）。
- 草稿读取：`props.useInput(s => s.draft)`；写回：`props.inputActions.setDraft(text)`（与参考插件一致，整体替换草稿）。
- 点击时捕获 `original`；响应回来若 `draft !== original` 则丢弃结果并提示，绝不覆盖用户新输入。
- 点选卡片：`engine.applyCandidate(original, candidate, ambiguousSpan)` → `setDraft(newText)` → 记录 `{before, after}` → 卡片收起。
- 撤销：工具行出现 ↺；仅当当前草稿仍等于 `after` 时可用；恢复 `before`。
- 卡片：标题（label）→ 一句话解释 → 折叠 prompt（默认收）→ 复制 / 插入；技术参数不进入首屏。
- 高置信度：`confidence >= 0.85` 只渲染第一张，并显示“首选方向”。
- 并行精修占位：`candidate.refinement?.status` 为 `pending|ready|error` 时卡片底部渲染对应占位/结果；V1 永远不产生。
- 文案走 `ctx.locale.register('dsh-intent-translator', { zh, en })`，缺失时中文兜底。
- 样式只用 `--dsw-alias-*` / `--dsw-radius-*` 主题 token，不 require 宿主 UI 包。

## 4. LLM 调用点

只在一个地方调用：`lib/host.js` 的 `forkText()`。

```js
const stream = ctx.llm.stream({
  provider, model,
  system: engine.SYSTEM_PROMPT,
  messages: [{ id, role: 'user', content: [{ type: 'text', text: engine.buildUserMessage(text) }],
               source: { kind: 'plugin:dsh-intent-translator' } }],
  temperature: 0.4,
  maxTokens: 1400,
  reasoningEffort: 'off',
  signal: deadline.signal,
})
```

- 若模型明确不支持 `off`，去掉该字段重试一次（不无限重试）。
- 聚合 `text-delta`，记录 `usage`、`finish`；`finish.kind === 'error'` 映射为可读错误。
- 15s deadline 同时 race 整个调用，防止旧适配器忽略 signal。
- 超时文案：`拆解超时（15 秒），请重试`。

## 5. 数据结构

```ts
type Candidate = {
  id: string
  label: string                 // 人话方向标签，<= 12 字，尽量无术语
  explanation: string           // 一句话，面向小白
  prompt: string                // 可替换进原文的技术写法
  replace_span: string          // 原文中的精确子串
  fallback_used?: boolean       // Host 侧发现 span 对不上
  refinement?: {                // V2 预留
    status: 'pending' | 'ready' | 'error'
    text?: string
    message?: string
  }
}

type ForkResult = {
  confidence: number            // 0..1
  ambiguous_span: string
  candidates: Candidate[]
  warnings?: string[]           // 如 directions_collapsed / span_fallback
}

type ForkResponse =
  | { ok: true; result: ForkResult; meta: { ms: number; provider: string; model: string; usage?: object } }
  | { ok: false; error: { code: string; message: string } }
```

Client store：

```js
{
  phase: 'idle' | 'loading' | 'ready' | 'applied' | 'error',
  original: string,
  result: ForkResult | null,
  error: { code, message } | null,
  undo: { before: string, after: string } | null,
  notice: string | null,
  expanded: Set<candidateId>,
  request: { controller, seq } | null
}
```

## 6. 输出校验与降级

1. 提取首个平衡 `{...}`，去代码围栏；解析失败 → `INVALID_JSON`（可读文案，不改草稿）。
2. `confidence` 转数字并 clamp 到 0..1；缺失按 0.5。
3. `candidates` 截断到 3；缺 `id/label/explanation/prompt` 的候选丢弃；不足 1 条 → `NO_CANDIDATES`。
4. `label` 人话守卫：含 ASCII 技术词/CSS 单位/明显术语时清洗；清洗不出 2–12 字则从 explanation 取人话短语；再不行用“方向 N”。
5. 方向去重：`label + explanation` 的 CJK 二元组 Jaccard，阈值 0.60；同 id 直接去重；只剩 1 条时加 `directions_collapsed` 警告。
6. `ambiguous_span` 必须能在原文中精确匹配；不匹配则尝试候选 span；都不匹配 → 空串，候选标 `fallback_used`。
7. 每个 `replace_span` 校验：精确匹配 → 保留；否则用 `ambiguous_span`；再否则空串并 `fallback_used: true`。
8. 客户端替换：精确 span → 定位替换；找不到 → 用 `ambiguous_span`；再找不到 → 整段替换为候选 prompt，并显示“未能精确定位原片段，已整段替换”+ 撤销。

## 7. 验收映射

| 验收点 | 实现 |
| --- | --- |
| 示例输入出 2–3 张方向不同的人话卡片 | 系统提示词强制方向分叉 + 人话标签 + 服务端去重 |
| 点选只换“毛玻璃效果，高级感” | `replace_span` 精确字符串匹配，保留“背景有图片” |
| 高置信度单卡片 | `confidence >= 0.85` 只渲染首张 |
| LLM 失败不破坏草稿 | 只有 `setDraft` 在显式点选后调用；失败仅显示错误条 |
| 按钮在输入框工具行 | `conversation.input.left`，与 prompt-optimizer 的 ✨ 同槽位 |
| 可撤销 | 工具行 ↺，恢复替换前草稿 |

## 8. 验证方式

- `node --test plugins/dsh-intent-translator/test/*.test.mjs`
- `node --check index.js lib/*.js client.js scripts/build-client.mjs`
- `node scripts/build-client.mjs` 后确认 `client.js` 含内联 engine 且无 `@@ENGINE@@`
- `node -e` 校验 package.json / locale JSON / patch YAML 结构
- 安装到 `desktop` profile 后：
  - `GET /plugins/dsh-intent-translator/client.js` 返回 bundle；
  - `POST /api/dsh-intent-translator/fork` 用真实模型跑通示例输入；
  - 无浏览器控制时，明确报告“按钮视觉位置/点选交互未在页面内亲眼验证”。

## 9. V1.1 增补（已实现）

- 响应从单片段改为 `segments[]`（最多 3 个），每个片段独立 `confidence`、候选和
  `span`；原文里不同位置/不同对象的模糊描述分别成组，卡片按片段分区。
- 原文标记和输入框内都使用 `#66ccff`；输入框使用 CSS Custom Highlight API
  做只影响绘制的蓝色高亮，不修改草稿正文。
- 卡片区增加「换一组」：请求带 `avoid`（上一组 label/explanation）和 `attempt`；
  Host 过滤重复方向，过滤后无新方向返回 `NO_NEW_DIRECTIONS`，Client 保留旧卡片。
- 每次替换记录 `undo.before`；工具行「撤回」在卡片关闭后仍可用，恢复第一次替换
  前的自然语言；整组应用后底部还有「撤回全部替换」。
- 新增重复前导词守卫：原文「按钮要[赛博朋克一点]」+ prompt「按钮用…」会拼成
  「按钮要用…」，避免「按钮要按钮用…」。
- 验证：33 个 Node 测试；隔离 DSH Web 实例用真实模型验证两片段、逐段替换、
  全部撤回、关闭后工具行撤回、换一组；无头 Edge 截图见
  `plugins/dsh-intent-translator/docs/preview.png`。
