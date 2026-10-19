# dsh-intent-translator

**意图翻译器**：把一句不精确的 vibecoding 描述里的 **1–3 处模糊片段**分别拆成
2–3 个方向不同的「人话」候选，模糊片段用亮蓝色 `#66ccff` 标出。点选一张卡片只替换
它所属的那一处片段，其余原文不动；支持**撤回**和**换一组**。

> DSH 0.2.1-rc.2 / Cordis 4.0.5。包名、Client module id、bundle 行 id 均为
> `dsh-intent-translator`。

![多片段候选卡片](docs/preview.png)

## 效果

```text
输入：我想要设计一个网页界面，背景有图片，前景是毛玻璃效果，高级感
点击 ✨ 拆解 → 「毛玻璃效果，高级感」标蓝，分叉出：
  · 毛玻璃透叠感  半透明前景压在图片上，边缘有隐约反光
  · 极简留白感    减少装饰，让画面留出呼吸空间
  · 暗色高级感    整体压暗提高对比，让图片成为主体

点「极简留白感」→ 只替换「毛玻璃效果，高级感」，「背景有图片」原样保留
```

## 安装

```powershell
dsh plugin --profile desktop add "C:\path\to\Hackathon--Plug-In\plugins\dsh-intent-translator"
```

按钮出现在输入框工具行左侧（`conversation.input.left`，与 `dsh-prompt-optimizer` 的
✨ 同槽位），候选卡片在输入框上方（`conversation.input.dock`）。安装后重启一次让
Host 新代码生效。

## 交互

- 写完一句话，点工具行的 **✨ 拆解**，Host 做一次 LLM 调用定位模糊片段并分叉。
- 每个片段独立判断：`confidence >= 0.85` 只显示首选一张，否则 2–3 张。
- 卡片默认只显示**人话标题 + 一句话解释**，点「查看技术写法」才展开 prompt（可复制/插入）。
- 点卡片 = 选中方向并替换该片段；「↻ 换一组」带上一组方向重新生成，避免重复。
- 「撤回全部替换」恢复第一次替换前的自然语言。

## 配置

`cordis.patch.yml` 插件行里的可选 `config`（均有默认值，非法值自动钳制）：

```yaml
timeoutMs: 15000       # 10–60000
maxInputChars: 8000    # 200–20000
maxTokens: 1400        # 256–4096
provider: ''           # 留空跟随 DSH 默认模型
model: ''              # 与 provider 同时填写或同时留空
reasoningEffort: 'off' # off | inherit
```

模型路由优先级：显式 `provider`+`model` → `agentDefaultModel.currentSelection()` →
第一个 provider 的第一个 model。

## 架构与数据契约

Host 面 `POST /api/dsh-intent-translator/fork` 调用 `ctx.llm.stream()`，负责 JSON 校验、
同源闸、错误映射；Client 面只调这个本地路由，不碰模型、session 和草稿写入（点选后才写）。

请求（首次只发 `text` / `sessionId`）：

```json
{ "text": "原始草稿", "sessionId": "可选", "attempt": 1, "retry": true, "avoid": [{"label": "极简留白感"}] }
```

成功：

```json
{
  "ok": true,
  "result": {
    "segments": [
      { "id": "seg-1", "span": "毛玻璃效果，高级感", "confidence": 0.62,
        "candidates": [{ "label": "毛玻璃透叠感", "explanation": "…", "prompt": "…", "replace_span": "毛玻璃效果，高级感" }] }
    ]
  }
}
```

失败统一 HTTP 200 + `{"ok": false, "error": {"code": "TIMEOUT", "message": "…"}}`，
常见 code：`TIMEOUT` / `NO_MODEL` / `AUTH` / `RATE_LIMIT` / `INVALID_JSON` /
`NO_CANDIDATES` / `NO_NEW_DIRECTIONS` / `DRAFT_CHANGED`。

关键校验（`lib/engine.js`）：只收严格 JSON；片段最多 3 个、重叠只留靠前的；label
必须是人话，术语只在 explanation/prompt 里；候选按 label+explanation 去重；
`replace_span` 被约束在片段 span 内，定位失败逐级回退到整段替换。

## V2 预留

`lib/host.js` 暴露 `resolveOptimizer` / `refineCandidate`，未来点选方向后可通过 `ctx`
调用 `dsh-prompt-optimizer` 精修。V1 不调用、不复制其代码，只报告能力是否存在。

## 开发与测试

```powershell
cd plugins\dsh-intent-translator
npm test     # 构建 client.js，再跑 34 个 Node 测试
```

## 已知限制

- 需要 DSH 已配置可用模型；失败时显示可读错误，不改草稿。
- 输入框内蓝色高亮依赖 CSS Custom Highlight API（Chromium 105+）；不支持时卡片面板
  顶部仍以 `#66ccff` 标出片段。
- 插件不写 session、不落盘草稿；刷新后撤回记录不保留。
- 换一组依赖模型配合 avoid；若模型坚持重复，报 `NO_NEW_DIRECTIONS` 保留原卡片。
