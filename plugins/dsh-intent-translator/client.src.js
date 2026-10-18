window.__ModuleLoader__.load({
  id: 'dsh-intent-translator',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useMemo, useRef, useState } = React;
    const engine = /*@@ENGINE@@*/;

    const NS = 'dsh-intent-translator';
    const API_PATH = '/api/dsh-intent-translator/fork';
    const CLIENT_TIMEOUT_MS = 18000;
    const HIGHLIGHT_NAME = 'dsh-intent-translator-ambiguous';

    const ZH = {
      pluginTitle: '意图翻译器',
      buttonLabel: '拆解',
      buttonTitle: '拆解意图：标出模糊片段并分叉方向',
      buttonBusyTitle: '正在拆解…（点击取消）',
      buttonEmptyTitle: '先写点内容，再拆解意图',
      undoLabel: '撤回',
      undoTitle: '撤回替换，恢复自然语言',
      loading: '正在识别模糊片段…',
      loadingHint: '只替换蓝色标记的片段，其余原文不动',
      cancel: '取消',
      errorTitle: '没能拆解这次输入',
      retry: '重试',
      forkHeader: '你想往哪个方向走？',
      forkHeaderMulti: '找到 {n} 处模糊描述，分别选个方向',
      ambiguousLabel: '模糊片段',
      firstChoice: '首选方向',
      directionLabel: '方向 {n}',
      segmentLabel: '片段 {n}',
      markedOriginal: '原文标记（蓝色为待拆解片段）',
      showPrompt: '查看技术写法',
      hidePrompt: '收起技术写法',
      promptLabel: '技术写法',
      copy: '复制',
      copied: '已复制',
      copyFailed: '复制失败，请手动选中文本复制。',
      insert: '插入原文',
      inserted: '已插入并替换该片段',
      chooseThis: '选这个方向',
      chooseHint: '点卡片 = 替换该片段，不是复制',
      applied: '已替换模糊片段',
      appliedTag: '已选',
      appliedChoice: '已选：{label}',
      appliedOne: '已替换「{label}」',
      applyProgress: '已应用 {done}/{total} 个片段，可继续选其他片段',
      allApplied: '全部片段已应用',
      undo: '撤回',
      undoAll: '撤回全部替换',
      undoDone: '已撤回，恢复自然语言',
      undoUnavailable: '草稿已修改，无法撤回这次替换。',
      close: '关闭',
      retryGroup: '换一组',
      retryGroupTitle: '重新生成一组与当前不同的方向',
      retrying: '正在换一组方向…',
      retryHint: '会避开上一组方向，生成新的解读',
      retryDone: '已换一组新方向',
      retryNoNew: '模型这次没有给出新方向，请再试一次。',
      retryCanceled: '已取消换一组，保留原卡片。',
      noCandidatesForSegment: '这个片段这次没有可用方向。',
      fallbackSpan: '未能精确定位原片段，已按整段替换；可撤回。',
      looseSpan: '原片段有空格差异，已按最接近的位置替换。',
      spanWarning: '模型给的定位片段和原文有出入，点选时会自动校正。',
      noAmbiguity: '这句话已经很具体了，没有需要分叉的模糊片段。',
      noAmbiguityHint: '可以直接发送，或再补充一点风格/效果描述。',
      collapsed: '模型给的方向太像，已合并重复项。',
      approx: '定位近似',
      refining: '正在精修这个方向…',
      refined: '精修结果',
      refineFailed: '这个方向精修失败，其他方向不受影响。',
      errTimeout: '拆解超时了，请重试。',
      errNoModel: '没有可用的模型，请先在 DSH 设置里选择默认模型。',
      errNoAdapter: '当前没有可用的模型提供方，请先配置模型。',
      errAuth: '模型认证失败，请检查 DSH 的模型设置。',
      errRate: '模型限流了，请稍后再试。',
      errInvalidJson: '模型没有按约定返回结果，请重试。',
      errNoCandidates: '没有找到可用的方向，换一种说法再试。',
      errNoNew: '模型没有给出新的方向，请再试一次。',
      errNetwork: '连不上本地插件服务，请确认 DSH 正在运行。',
      errForbidden: '仅允许本机请求。',
      errTooLong: '输入太长了，请截短后再试。',
      errEmpty: '输入框是空的。',
      errDraftChanged: '草稿已修改，这次结果已丢弃；请对最新内容重新拆解。',
      errNoWrite: '宿主没有提供草稿写回能力，无法替换输入框内容。',
      errUnknown: '拆解失败，请重试。',
    };

    const EN = {
      pluginTitle: 'Intent Translator',
      buttonLabel: 'Fork',
      buttonTitle: 'Fork the vague parts of this request into directions',
      buttonBusyTitle: 'Forking… (click to cancel)',
      buttonEmptyTitle: 'Write something first',
      undoLabel: 'Undo',
      undoTitle: 'Undo the replacement and restore the natural language',
      loading: 'Finding the vague fragments…',
      loadingHint: 'Only the blue-marked fragments change; the rest stays intact',
      cancel: 'Cancel',
      errorTitle: 'Could not fork this request',
      retry: 'Retry',
      forkHeader: 'Which direction do you want?',
      forkHeaderMulti: 'Found {n} vague fragments; choose a direction for each',
      ambiguousLabel: 'Vague fragment',
      firstChoice: 'Best direction',
      directionLabel: 'Direction {n}',
      segmentLabel: 'Fragment {n}',
      markedOriginal: 'Marked original (blue = vague fragments)',
      showPrompt: 'Show technical wording',
      hidePrompt: 'Hide technical wording',
      promptLabel: 'Technical wording',
      copy: 'Copy',
      copied: 'Copied',
      copyFailed: 'Copy failed. Select the text and copy it manually.',
      insert: 'Insert',
      inserted: 'Inserted into the draft',
      chooseThis: 'Choose this direction',
      chooseHint: 'Clicking a card replaces that fragment; it does not copy the prompt',
      applied: 'Vague fragment replaced',
      appliedTag: 'Chosen',
      appliedChoice: 'Chosen: {label}',
      appliedOne: 'Replaced “{label}”',
      applyProgress: '{done}/{total} fragments applied; choose the rest',
      allApplied: 'All fragments applied',
      undo: 'Undo',
      undoAll: 'Undo all replacements',
      undoDone: 'Undone; the natural language is restored',
      undoUnavailable: 'The draft changed, so this replacement cannot be undone.',
      close: 'Close',
      retryGroup: 'New set',
      retryGroupTitle: 'Generate a different set of directions',
      retrying: 'Generating a new set…',
      retryHint: 'The previous directions will be avoided',
      retryDone: 'A new set of directions is ready',
      retryNoNew: 'The model did not return new directions. Please try again.',
      retryCanceled: 'New-set request canceled; the previous cards are kept.',
      noCandidatesForSegment: 'No usable direction for this fragment this time.',
      fallbackSpan: 'Could not locate the exact fragment, so the whole draft was replaced. You can undo.',
      looseSpan: 'Whitespace differed, so the closest matching fragment was replaced.',
      spanWarning: 'A model-provided fragment did not match exactly; clicking will correct it.',
      noAmbiguity: 'This request is already specific enough to send.',
      noAmbiguityHint: 'Send it as-is, or add a little more style or effect detail.',
      collapsed: 'The model returned near-duplicate directions; duplicates were merged.',
      approx: 'Approximate match',
      refining: 'Refining this direction…',
      refined: 'Refined result',
      refineFailed: 'Refining this direction failed; the other directions are unaffected.',
      errTimeout: 'Forking timed out. Please retry.',
      errNoModel: 'No model is available. Choose a default model in DSH settings.',
      errNoAdapter: 'No model provider is available. Configure one first.',
      errAuth: 'Model authentication failed. Check the DSH model settings.',
      errRate: 'The model is rate-limited. Try again shortly.',
      errInvalidJson: 'The model did not return the expected JSON. Please retry.',
      errNoCandidates: 'No usable direction was found. Rephrase and retry.',
      errNoNew: 'The model did not return new directions. Please try again.',
      errNetwork: 'Could not reach the local plugin service. Is DSH running?',
      errForbidden: 'Local requests only.',
      errTooLong: 'The input is too long. Shorten it and retry.',
      errEmpty: 'The input is empty.',
      errDraftChanged: 'The draft changed, so this result was discarded. Fork the latest text again.',
      errNoWrite: 'The host did not provide a draft write-back action.',
      errUnknown: 'Forking failed. Please retry.',
    };

    function initialLanguage() {
      try {
        const language = (navigator.languages && navigator.languages[0]) || navigator.language || 'zh';
        return String(language).toLowerCase().startsWith('zh') ? ZH : EN;
      } catch {
        return ZH;
      }
    }

    let fallbackMessages = initialLanguage();
    let boundTranslate = null;

    function interpolate(template, params) {
      let text = String(template ?? '');
      if (!params) return text;
      for (const key of Object.keys(params)) {
        text = text.split(`{${key}}`).join(String(params[key]));
      }
      return text;
    }

    function t(key, params) {
      let value = null;
      if (boundTranslate) {
        try {
          value = boundTranslate(key);
        } catch {
          value = null;
        }
      }
      if (!value || value === key) value = fallbackMessages[key] ?? ZH[key] ?? key;
      return interpolate(value, params);
    }

    function setupLocale(ctx) {
      try {
        const locale = (typeof ctx.get === 'function' ? ctx.get('locale') : null) || ctx.locale;
        if (!locale) return;
        try {
          const register = () => locale.register(NS, { zh: ZH, en: EN });
          if (typeof ctx.effect === 'function') ctx.effect(register, `${NS}: locale`);
          else register();
        } catch (error) {
          console.warn('dsh-intent-translator: locale registration unavailable', error);
        }
        if (typeof locale.bind === 'function') boundTranslate = locale.bind(NS);
      } catch (error) {
        console.warn('dsh-intent-translator: locale unavailable', error);
      }
    }

    const ERROR_KEYS = {
      TIMEOUT: 'errTimeout',
      NO_MODEL: 'errNoModel',
      NO_ADAPTER: 'errNoAdapter',
      CONFIG_ERROR: 'errNoModel',
      MISSING_CREDENTIAL: 'errAuth',
      INVALID_CREDENTIAL: 'errAuth',
      AUTH: 'errAuth',
      RATE_LIMIT: 'errRate',
      QUOTA: 'errRate',
      CONTEXT_WINDOW_EXCEEDED: 'errTooLong',
      INPUT_TOO_LARGE: 'errTooLong',
      EMPTY_INPUT: 'errEmpty',
      INVALID_JSON: 'errInvalidJson',
      NO_CANDIDATES: 'errNoCandidates',
      NO_NEW_DIRECTIONS: 'errNoNew',
      FORBIDDEN: 'errForbidden',
      DRAFT_CHANGED: 'errDraftChanged',
      NETWORK: 'errNetwork',
      NO_INPUT_ACTIONS: 'errNoWrite',
    };

    function errorText(error) {
      if (!error) return t('errUnknown');
      const key = ERROR_KEYS[error.code];
      if (key) return t(key);
      return error.message || t('errUnknown');
    }

    function initialState() {
      return {
        phase: 'idle',
        original: '',
        expectedDraft: '',
        result: null,
        error: null,
        undo: null,
        notice: null,
        noticeError: false,
        applied: {},
        expanded: [],
        request: null,
        seq: 0,
        attempt: 0,
        retrying: false,
        previousResult: null,
      };
    }

    const stores = new Map();

    function storeFor(sessionId) {
      const key = sessionId === undefined || sessionId === null ? 'default' : String(sessionId);
      let store = stores.get(key);
      if (!store) {
        store = { state: initialState(), listeners: new Set() };
        stores.set(key, store);
      }
      return store;
    }

    function setStore(store, patch) {
      const next = typeof patch === 'function' ? patch(store.state) : patch;
      store.state = Object.assign({}, store.state, next);
      for (const listener of Array.from(store.listeners)) {
        try {
          listener();
        } catch (error) {
          console.warn('dsh-intent-translator: store listener failed', error);
        }
      }
    }

    function useStore(store) {
      const [snapshot, setSnapshot] = useState(store.state);
      useEffect(() => {
        const listener = () => setSnapshot(store.state);
        store.listeners.add(listener);
        setSnapshot(store.state);
        return () => {
          store.listeners.delete(listener);
        };
      }, [store]);
      return snapshot;
    }

    const selectAllInput = (state) => state;

    function useDraft(props) {
      const inputHookRef = useRef(props.useInput);
      const inputHook = inputHookRef.current;
      const snapshot = typeof inputHook === 'function' ? inputHook(selectAllInput) : props.input;
      return snapshot && typeof snapshot.draft === 'string' ? snapshot.draft : '';
    }

    function keepFocus(event) {
      event.preventDefault();
    }

    function normalizeClientResult(result) {
      if (!result || typeof result !== 'object') return null;
      let rawSegments = [];
      if (Array.isArray(result.segments)) {
        rawSegments = result.segments;
      } else if (Array.isArray(result.candidates)) {
        rawSegments = [
          {
            id: 'seg-1',
            span: result.ambiguous_span,
            confidence: result.confidence,
            candidates: result.candidates,
            warnings: result.warnings,
          },
        ];
      } else {
        return null;
      }
      const segments = [];
      for (let index = 0; index < rawSegments.length; index += 1) {
        const segment = rawSegments[index];
        if (!segment || typeof segment !== 'object' || !Array.isArray(segment.candidates) || segment.candidates.length === 0) continue;
        const span = String(segment.span || segment.ambiguous_span || '').trim();
        if (!span) continue;
        segments.push({
          id: String(segment.id || `seg-${index + 1}`),
          span,
          confidence: engine.normalizeConfidence(segment.confidence),
          candidates: segment.candidates,
          warnings: Array.isArray(segment.warnings) ? segment.warnings : [],
        });
      }
      return {
        segments,
        warnings: Array.isArray(result.warnings) ? result.warnings : [],
        noChange: Boolean(result.noChange) || segments.length === 0,
      };
    }

    function resultSegments(result) {
      if (!result) return [];
      if (Array.isArray(result.segments)) return result.segments;
      const normalized = normalizeClientResult(result);
      return normalized ? normalized.segments : [];
    }

    function collectAvoid(result) {
      const avoid = [];
      for (const segment of resultSegments(result)) {
        for (const candidate of segment.candidates || []) {
          avoid.push({
            label: String(candidate.label || ''),
            explanation: String(candidate.explanation || ''),
          });
          if (avoid.length >= 20) return avoid;
        }
      }
      return avoid;
    }

    function hasNewLabels(result, avoid) {
      const oldLabels = new Set(avoid.map((item) => item.label).filter(Boolean));
      if (oldLabels.size === 0) return true;
      return resultSegments(result).some((segment) =>
        (segment.candidates || []).some((candidate) => !oldLabels.has(candidate.label)),
      );
    }

    function clearComposerHighlight() {
      try {
        if (typeof CSS !== 'undefined' && CSS.highlights) CSS.highlights.delete(HIGHLIGHT_NAME);
      } catch {
        /* The Highlight API is optional. */
      }
    }

    function pointAtTextNode(nodes, offset) {
      for (const item of nodes) {
        if (offset <= item.end && offset >= item.start) {
          return { node: item.node, offset: offset - item.start };
        }
      }
      return null;
    }

    function highlightComposerSpans(spans) {
      clearComposerHighlight();
      try {
        if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight !== 'function') return;
        const editor = document.querySelector('[data-composer-input]');
        if (!editor) return;
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
        const nodes = [];
        let full = '';
        let node = walker.nextNode();
        while (node) {
          nodes.push({ node, start: full.length, end: full.length + node.data.length });
          full += node.data;
          node = walker.nextNode();
        }
        const ranges = [];
        for (const span of spans) {
          const location = engine.locateSpan(full, span);
          if (!location || location.end <= location.start) continue;
          const start = pointAtTextNode(nodes, location.start);
          const end = pointAtTextNode(nodes, location.end);
          if (!start || !end) continue;
          const range = document.createRange();
          range.setStart(start.node, start.offset);
          range.setEnd(end.node, end.offset);
          ranges.push(range);
        }
        if (ranges.length > 0) CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
      } catch {
        /* A paint-only highlight must never break the interaction. */
      }
    }

    function markedSegments(text, segments) {
      const ranges = [];
      for (const segment of segments) {
        const location = engine.locateSpan(text, segment.span);
        if (location && location.end > location.start) ranges.push(location);
      }
      ranges.sort((a, b) => a.start - b.start);
      const merged = [];
      for (const range of ranges) {
        const last = merged[merged.length - 1];
        if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
        else merged.push({ start: range.start, end: range.end });
      }
      const parts = [];
      let cursor = 0;
      merged.forEach((range, index) => {
        if (range.start > cursor) parts.push(text.slice(cursor, range.start));
        parts.push(h('span', { className: 'dit-blue', key: `dit-blue-${index}` }, text.slice(range.start, range.end)));
        cursor = range.end;
      });
      if (cursor < text.length) parts.push(text.slice(cursor));
      return parts;
    }

    async function requestFork(store, sessionId, text, draftRef, inputActions, options = {}) {
      const retry = Boolean(options.retry);
      const previousResult = options.previousResult || null;
      const attempt = Math.max(0, Number(options.attempt) || 0);
      const avoid = Array.isArray(options.avoid) ? options.avoid : [];
      const previous = store.state.request;
      if (previous) {
        previous.canceled = true;
        previous.controller.abort();
      }
      const controller = new AbortController();
      const request = {
        controller,
        seq: (store.state.seq || 0) + 1,
        original: text,
        canceled: false,
        timedOut: false,
        timer: null,
      };
      request.timer = setTimeout(() => {
        request.timedOut = true;
        controller.abort();
      }, CLIENT_TIMEOUT_MS);
      setStore(store, {
        phase: 'loading',
        original: text,
        expectedDraft: text,
        result: retry ? previousResult : null,
        error: null,
        undo: null,
        notice: null,
        noticeError: false,
        applied: {},
        expanded: [],
        request,
        seq: request.seq,
        attempt,
        retrying: retry,
        previousResult,
      });
      try {
        const response = await fetch(API_PATH, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            text,
            sessionId: sessionId === undefined || sessionId === null ? undefined : String(sessionId),
            attempt: retry ? attempt : undefined,
            retry: retry ? true : undefined,
            avoid: retry ? avoid : undefined,
          }),
          signal: controller.signal,
        });
        const raw = await response.text();
        let body = null;
        try {
          body = raw ? JSON.parse(raw) : null;
        } catch {
          body = null;
        }
        if (store.state.request !== request) return;
        if (!response.ok) {
          const error = body && body.error ? body.error : { code: `HTTP_${response.status}`, message: '' };
          if (retry && previousResult) {
            setStore(store, {
              phase: 'ready',
              result: previousResult,
              error: null,
              request: null,
              retrying: false,
              previousResult: null,
              notice: errorText(error),
              noticeError: true,
            });
          } else {
            setStore(store, { phase: 'error', error, request: null, retrying: false });
          }
          return;
        }
        if (!body || body.ok !== true) {
          const error = body && body.error ? body.error : { code: 'FORK_FAILED', message: '' };
          if (retry && previousResult) {
            setStore(store, {
              phase: 'ready',
              result: previousResult,
              error: null,
              request: null,
              retrying: false,
              previousResult: null,
              notice: errorText(error),
              noticeError: true,
            });
          } else {
            setStore(store, { phase: 'error', error, request: null, retrying: false });
          }
          return;
        }
        if (draftRef.current !== request.original) {
          setStore(store, { phase: 'error', error: { code: 'DRAFT_CHANGED', message: '' }, request: null, retrying: false });
          return;
        }
        const result = normalizeClientResult(body.result);
        if (!result) {
          setStore(store, { phase: 'error', error: { code: 'INVALID_JSON', message: '' }, request: null, retrying: false });
          return;
        }
        if (retry && (result.segments.length === 0 || !hasNewLabels(result, avoid))) {
          setStore(store, {
            phase: 'ready',
            result: previousResult,
            error: null,
            request: null,
            retrying: false,
            previousResult: null,
            notice: t('retryNoNew'),
            noticeError: true,
          });
          return;
        }
        let notice = null;
        if (retry) {
          notice = t('retryDone');
        } else {
          const warnings = result.warnings.concat(result.segments.flatMap((segment) => segment.warnings || []));
          if (warnings.indexOf('span_fallback') >= 0) notice = t('spanWarning');
          else if (warnings.indexOf('directions_collapsed') >= 0) notice = t('collapsed');
        }
        setStore(store, {
          phase: 'ready',
          result,
          error: null,
          request: null,
          retrying: false,
          previousResult: null,
          applied: {},
          undo: null,
          expectedDraft: text,
          notice,
          noticeError: false,
        });
      } catch (error) {
        if (request.canceled || store.state.request !== request) return;
        const publicError = {
          code: request.timedOut ? 'TIMEOUT' : error && error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK',
          message: '',
        };
        if (retry && previousResult) {
          setStore(store, {
            phase: 'ready',
            result: previousResult,
            error: null,
            request: null,
            retrying: false,
            previousResult: null,
            notice: errorText(publicError),
            noticeError: true,
          });
        } else {
          setStore(store, { phase: 'error', error: publicError, request: null, retrying: false });
        }
      } finally {
        if (request.timer) clearTimeout(request.timer);
      }
    }

    async function startFork(store, sessionId, draft, draftRef, inputActions) {
      const text = String(draft ?? '');
      if (!text.trim()) return;
      if (!inputActions || typeof inputActions.setDraft !== 'function') {
        setStore(store, { phase: 'error', error: { code: 'NO_INPUT_ACTIONS', message: '' } });
        return;
      }
      await requestFork(store, sessionId, text, draftRef, inputActions, { retry: false, attempt: 0, avoid: [] });
    }

    function retryFork(store, sessionId, draftRef, inputActions) {
      const state = store.state;
      if (!state.result || state.phase !== 'ready' || state.result.noChange) return;
      if (Object.keys(state.applied || {}).length > 0) return;
      if (draftRef.current !== state.expectedDraft) {
        setStore(store, { notice: t('errDraftChanged'), noticeError: true });
        return;
      }
      requestFork(store, sessionId, state.expectedDraft, draftRef, inputActions, {
        retry: true,
        previousResult: state.result,
        attempt: (state.attempt || 0) + 1,
        avoid: collectAvoid(state.result),
      });
    }

    function cancelFork(store) {
      const state = store.state;
      const request = state.request;
      if (request) {
        request.canceled = true;
        request.controller.abort();
      }
      if (state.retrying && state.previousResult) {
        setStore(store, {
          phase: 'ready',
          result: state.previousResult,
          error: null,
          request: null,
          retrying: false,
          previousResult: null,
          notice: t('retryCanceled'),
          noticeError: false,
        });
      } else {
        setStore(store, Object.assign({}, initialState(), { seq: state.seq }));
      }
    }

    function applySelection(store, segment, candidate, draftRef, inputActions, viaInsert) {
      const state = store.state;
      if (!state.result) return;
      if (draftRef.current !== state.expectedDraft) {
        setStore(store, { notice: t('errDraftChanged'), noticeError: true });
        return;
      }
      if (state.applied && state.applied[segment.id]) return;
      if (!inputActions || typeof inputActions.setDraft !== 'function') {
        setStore(store, { phase: 'error', error: { code: 'NO_INPUT_ACTIONS', message: '' } });
        return;
      }
      const current = draftRef.current;
      const applied = engine.applyCandidate(current, candidate, segment.span);
      if (!applied || applied.mode === 'noop') return;
      const next = applied.text;
      inputActions.setDraft(next);
      let notice = null;
      if (applied.mode === 'whole') notice = t('fallbackSpan');
      else if (applied.warning === 'loose_span') notice = t('looseSpan');
      if (viaInsert) notice = notice ? `${t('inserted')} ${notice}` : t('inserted');
      const appliedMap = Object.assign({}, state.applied || {}, {
        [segment.id]: { candidateId: candidate.id, label: candidate.label, span: segment.span },
      });
      const allApplied = resultSegments(state.result).every((item) => appliedMap[item.id]);
      setStore(store, {
        phase: 'ready',
        expectedDraft: next,
        applied: appliedMap,
        undo: state.undo ? { before: state.undo.before, after: next } : { before: current, after: next },
        notice: notice || (allApplied ? t('allApplied') : t('appliedOne', { label: candidate.label })),
        noticeError: false,
        expanded: (state.expanded || []).filter((key) => key.indexOf(`${segment.id}:`) !== 0),
      });
    }

    function undoSelection(store, draftRef, inputActions) {
      const state = store.state;
      const undo = state.undo;
      if (!undo) return;
      if (draftRef.current !== undo.after) {
        setStore(store, { notice: t('undoUnavailable'), noticeError: true });
        return;
      }
      if (!inputActions || typeof inputActions.setDraft !== 'function') {
        setStore(store, { phase: 'error', error: { code: 'NO_INPUT_ACTIONS', message: '' } });
        return;
      }
      inputActions.setDraft(undo.before);
      setStore(store, {
        phase: state.result ? 'ready' : 'idle',
        expectedDraft: undo.before,
        applied: {},
        undo: null,
        notice: t('undoDone'),
        noticeError: false,
        error: null,
        expanded: [],
      });
    }

    function closeResult(store) {
      const state = store.state;
      const request = state.request;
      if (request) {
        request.canceled = true;
        request.controller.abort();
      }
      setStore(store, {
        phase: 'idle',
        request: null,
        error: null,
        notice: null,
        noticeError: false,
        expanded: [],
      });
    }

    function toggleExpanded(store, key) {
      const expanded = (store.state.expanded || []).indexOf(key) >= 0
        ? store.state.expanded.filter((item) => item !== key)
        : (store.state.expanded || []).concat([key]);
      setStore(store, { expanded });
    }

    function SparklesIcon() {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: 14,
          height: 14,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        h('path', { d: 'M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z' }),
        h('path', { d: 'M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z' }),
      );
    }

    function SpinnerIcon() {
      return h(
        'svg',
        { viewBox: '0 0 24 24', width: 14, height: 14, className: 'dit-spin', 'aria-hidden': true },
        h('circle', { cx: 12, cy: 12, r: 9, fill: 'none', stroke: 'currentColor', strokeOpacity: 0.25, strokeWidth: 2.5 }),
        h('path', { d: 'M21 12a9 9 0 0 0-9-9', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' }),
      );
    }

    function UndoIcon() {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: 14,
          height: 14,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        h('path', { d: 'M9 7H5V3' }),
        h('path', { d: 'M5 7a8 8 0 1 0 2.3-2.3' }),
      );
    }

    function RetryIcon() {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: 13,
          height: 13,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.9,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        h('path', { d: 'M20 11a8 8 0 1 0-2.3 6.7' }),
        h('path', { d: 'M20 4v7h-7' }),
      );
    }

    async function copyText(text) {
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {
        /* fall through to execCommand */
      }
      try {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(area);
        return Boolean(ok);
      } catch {
        return false;
      }
    }

    function ToolbarButton(props) {
      const sessionKey = props.sessionId === undefined || props.sessionId === null ? 'default' : String(props.sessionId);
      const store = useMemo(() => storeFor(sessionKey), [sessionKey]);
      const state = useStore(store);
      const draft = useDraft(props);
      const draftRef = useRef(draft);
      draftRef.current = draft;
      const busy = state.phase === 'loading';
      const canUndo = Boolean(state.undo && draft === state.undo.after);
      const disabled = !busy && !draft.trim();
      const title = busy
        ? t('buttonBusyTitle')
        : disabled
          ? t('buttonEmptyTitle')
          : state.phase === 'error'
            ? `${t('buttonTitle')} · ${errorText(state.error)}`
            : t('buttonTitle');
      const onClick = busy
        ? () => cancelFork(store)
        : () => startFork(store, props.sessionId, draft, draftRef, props.inputActions);
      return h(
        React.Fragment,
        null,
        h('style', { key: 'dit-style' }, STYLE),
        h(
          'span',
          { className: 'dit-toolbar', 'data-dsh-intent-translator': 'toolbar' },
          h(
            'button',
            {
              type: 'button',
              className: `dit-tool${busy ? ' is-busy' : ''}${state.phase === 'error' ? ' is-error' : ''}`,
              title,
              'aria-label': busy ? t('cancel') : t('buttonTitle'),
              'aria-busy': busy ? 'true' : 'false',
              disabled,
              onMouseDown: keepFocus,
              onClick,
            },
            busy ? h(SpinnerIcon) : h(SparklesIcon),
            h('span', { className: 'dit-tool-label' }, busy ? t('cancel') : t('buttonLabel')),
          ),
          canUndo
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'dit-tool dit-undo',
                  title: t('undoTitle'),
                  'aria-label': t('undoTitle'),
                  onMouseDown: keepFocus,
                  onClick: () => undoSelection(store, draftRef, props.inputActions),
                },
                h(UndoIcon),
                h('span', { className: 'dit-tool-label' }, t('undoLabel')),
              )
            : null,
        ),
      );
    }

    function Refinement(props) {
      const refinement = props.refinement;
      if (!refinement) return null;
      if (refinement.status === 'pending') {
        return h('div', { className: 'dit-refine is-pending' }, h(SpinnerIcon), h('span', null, t('refining')));
      }
      if (refinement.status === 'ready') {
        return h(
          'div',
          { className: 'dit-refine' },
          h('div', { className: 'dit-prompt-label' }, t('refined')),
          h('div', { className: 'dit-prompt-text' }, refinement.text || ''),
        );
      }
      return h('div', { className: 'dit-refine is-error' }, t('refineFailed'));
    }

    function CandidateCard(props) {
      const candidate = props.candidate;
      const expanded = props.expanded;
      const onKeyDown = (event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          props.onApply();
        }
      };
      return h(
        'div',
        {
          className: `dit-card${props.high ? ' is-single' : ''}`,
          role: 'button',
          tabIndex: 0,
          title: t('chooseHint'),
          'aria-label': `${candidate.label}：${candidate.explanation}`,
          onClick: props.onApply,
          onKeyDown,
        },
        h(
          'div',
          { className: 'dit-card-top' },
          h('span', { className: 'dit-badge' }, props.high ? t('firstChoice') : t('directionLabel', { n: props.index + 1 })),
          candidate.fallback_used ? h('span', { className: 'dit-badge is-warn' }, t('approx')) : null,
        ),
        h('div', { className: 'dit-card-label' }, candidate.label),
        h('div', { className: 'dit-card-exp' }, candidate.explanation),
        h(
          'div',
          { className: 'dit-card-links' },
          h(
            'button',
            {
              type: 'button',
              className: 'dit-link',
              onMouseDown: keepFocus,
              onClick: (event) => {
                event.stopPropagation();
                props.onToggle();
              },
            },
            expanded ? `${t('hidePrompt')} ▴` : `${t('showPrompt')} ▾`,
          ),
        ),
        expanded
          ? h(
              'div',
              {
                className: 'dit-prompt',
                onClick: (event) => event.stopPropagation(),
                onKeyDown: (event) => event.stopPropagation(),
              },
              h('div', { className: 'dit-prompt-label' }, t('promptLabel')),
              h('div', { className: 'dit-prompt-text' }, candidate.prompt),
              h(
                'div',
                { className: 'dit-prompt-actions' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dit-btn',
                    onMouseDown: keepFocus,
                    onClick: (event) => {
                      event.stopPropagation();
                      props.onCopy();
                    },
                  },
                  props.copied ? t('copied') : t('copy'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dit-btn',
                    onMouseDown: keepFocus,
                    onClick: (event) => {
                      event.stopPropagation();
                      props.onInsert();
                    },
                  },
                  t('insert'),
                ),
              ),
            )
          : null,
        h(Refinement, { refinement: candidate.refinement }),
        h('div', { className: 'dit-card-cta' }, `${t('chooseThis')} →`),
      );
    }

    function SegmentSection(props) {
      const segment = props.segment;
      const applied = props.applied;
      return h(
        'section',
        { className: 'dit-segment', 'data-segment-id': segment.id },
        h(
          'div',
          { className: 'dit-seg-head' },
          h('span', { className: 'dit-badge' }, props.total > 1 ? t('segmentLabel', { n: props.index + 1 }) : t('ambiguousLabel')),
          h('span', { className: 'dit-seg-span' }, '「', h('span', { className: 'dit-blue' }, segment.span), '」'),
          applied ? h('span', { className: 'dit-applied-tag' }, t('appliedTag')) : null,
        ),
        applied
          ? h(
              'div',
              { className: 'dit-applied-row' },
              h('span', { className: 'dit-check', 'aria-hidden': true }, '✓'),
              h('span', null, t('appliedChoice', { label: applied.label })),
            )
          : props.candidates.length === 0
            ? h('div', { className: 'dit-muted' }, t('noCandidatesForSegment'))
            : h(
                'div',
                { className: `dit-cards${props.high ? ' is-single' : ''}` },
                props.candidates.map((candidate, index) => {
                  const cardKey = `${segment.id}:${candidate.id}`;
                  return h(CandidateCard, {
                    key: cardKey,
                    candidate,
                    index,
                    high: props.high,
                    expanded: props.expanded.indexOf(cardKey) >= 0,
                    copied: props.copiedId === cardKey,
                    onToggle: () => props.onToggle(cardKey),
                    onApply: () => props.onApply(candidate),
                    onInsert: () => props.onInsert(candidate),
                    onCopy: () => props.onCopy(candidate, cardKey),
                  });
                }),
              ),
      );
    }

    function IntentCardDock(props) {
      const sessionKey = props.sessionId === undefined || props.sessionId === null ? 'default' : String(props.sessionId);
      const store = useMemo(() => storeFor(sessionKey), [sessionKey]);
      const state = useStore(store);
      const draft = useDraft(props);
      const draftRef = useRef(draft);
      draftRef.current = draft;
      const [copiedId, setCopiedId] = useState(null);
      const copiedTimer = useRef(null);
      useEffect(
        () => () => {
          if (copiedTimer.current) clearTimeout(copiedTimer.current);
        },
        [],
      );

      const segments = state.result ? resultSegments(state.result) : [];
      const noChange = Boolean(state.result && (state.result.noChange || segments.length === 0));
      const appliedMap = state.applied || {};
      const appliedCount = segments.filter((segment) => appliedMap[segment.id]).length;
      const anyApplied = appliedCount > 0;
      const allApplied = segments.length > 0 && appliedCount === segments.length;
      const remainingSpans = state.phase === 'ready' ? segments.filter((segment) => !appliedMap[segment.id]).map((segment) => segment.span) : [];

      useEffect(() => {
        if (state.phase === 'ready' && state.result && draft === state.expectedDraft) {
          highlightComposerSpans(remainingSpans);
        } else {
          clearComposerHighlight();
        }
        return clearComposerHighlight;
      }, [state.phase, state.result, state.applied, state.expectedDraft, draft]);

      if (state.phase === 'idle') return null;

      if (state.phase === 'loading') {
        return h(
          'div',
          { className: 'dit-shell', 'data-dsh-intent-translator': 'loading' },
          h(
            'div',
            { className: 'dit-bar is-loading' },
            h(SpinnerIcon),
            h('span', { className: 'dit-bar-text' }, state.retrying ? t('retrying') : t('loading')),
            h('span', { className: 'dit-muted' }, state.retrying ? t('retryHint') : t('loadingHint')),
            h(
              'button',
              {
                type: 'button',
                className: 'dit-link',
                onMouseDown: keepFocus,
                onClick: () => cancelFork(store),
              },
              t('cancel'),
            ),
          ),
        );
      }

      if (state.phase === 'error') {
        return h(
          'div',
          { className: 'dit-shell', 'data-dsh-intent-translator': 'error' },
          h(
            'div',
            { className: 'dit-bar is-error' },
            h('span', { className: 'dit-error-mark', 'aria-hidden': true }, '!'),
            h(
              'span',
              { className: 'dit-error-body' },
              h('strong', null, t('errorTitle')),
              h('span', null, errorText(state.error)),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dit-btn',
                onMouseDown: keepFocus,
                onClick: () => startFork(store, props.sessionId, draft, draftRef, props.inputActions),
              },
              t('retry'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dit-icon-btn',
                title: t('close'),
                'aria-label': t('close'),
                onClick: () => closeResult(store),
              },
              '×',
            ),
          ),
        );
      }

      if (state.phase !== 'ready' || !state.result) return null;

      const onCopy = async (candidate, cardKey) => {
        const ok = await copyText(candidate.prompt);
        if (!ok) {
          setStore(store, { notice: t('copyFailed'), noticeError: true });
          return;
        }
        setCopiedId(cardKey);
        if (copiedTimer.current) clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopiedId(null), 1600);
      };
      const headerTitle = noChange
        ? t('forkHeader')
        : segments.length > 1
          ? t('forkHeaderMulti', { n: segments.length })
          : engine.isHighConfidence(segments[0])
            ? t('firstChoice')
            : t('forkHeader');

      return h(
        'div',
        { className: 'dit-shell', 'data-dsh-intent-translator': 'ready' },
        state.notice ? h('div', { className: `dit-notice${state.noticeError ? ' is-error' : ''}` }, state.notice) : null,
        h(
          'div',
          { className: 'dit-head' },
          h(
            'div',
            { className: 'dit-head-main' },
            h('div', { className: 'dit-kicker' }, headerTitle),
            noChange
              ? null
              : h(
                  'div',
                  { className: 'dit-preview' },
                  h('span', { className: 'dit-preview-label' }, t('markedOriginal')),
                  h('div', { className: 'dit-preview-text' }, markedSegments(state.original, segments)),
                ),
          ),
          h(
            'div',
            { className: 'dit-head-actions' },
            !noChange && !anyApplied
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'dit-link dit-retry',
                    title: t('retryGroupTitle'),
                    onMouseDown: keepFocus,
                    onClick: () => retryFork(store, props.sessionId, draftRef, props.inputActions),
                  },
                  h(RetryIcon),
                  t('retryGroup'),
                )
              : null,
            h(
              'button',
              {
                type: 'button',
                className: 'dit-icon-btn',
                title: t('close'),
                'aria-label': t('close'),
                onClick: () => closeResult(store),
              },
              '×',
            ),
          ),
        ),
        noChange
          ? h(
              'div',
              { className: 'dit-empty' },
              h('div', { className: 'dit-empty-title' }, t('noAmbiguity')),
              h('div', { className: 'dit-muted' }, t('noAmbiguityHint')),
            )
          : h(
              'div',
              { className: 'dit-sections' },
              segments.map((segment, index) => {
                const high = engine.isHighConfidence(segment);
                const candidates = high ? segment.candidates.slice(0, 1) : segment.candidates.slice(0, 3);
                return h(SegmentSection, {
                  key: segment.id,
                  segment,
                  index,
                  total: segments.length,
                  high,
                  candidates,
                  applied: appliedMap[segment.id],
                  expanded: state.expanded || [],
                  copiedId,
                  onToggle: (cardKey) => toggleExpanded(store, cardKey),
                  onApply: (candidate) => applySelection(store, segment, candidate, draftRef, props.inputActions, false),
                  onInsert: (candidate) => applySelection(store, segment, candidate, draftRef, props.inputActions, true),
                  onCopy,
                });
              }),
            ),
        noChange
          ? null
          : h(
              'div',
              { className: 'dit-foot' },
              h(
                'span',
                null,
                allApplied
                  ? t('allApplied')
                  : anyApplied
                    ? t('applyProgress', { done: appliedCount, total: segments.length })
                    : t('chooseHint'),
              ),
              h(
                'span',
                { className: 'dit-foot-actions' },
                state.undo
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dit-link',
                        onMouseDown: keepFocus,
                        onClick: () => undoSelection(store, draftRef, props.inputActions),
                      },
                      t('undoAll'),
                    )
                  : null,
              ),
            ),
      );
    }

    const STYLE = `
.dit-toolbar{display:inline-flex;align-items:center;gap:4px;min-width:0;vertical-align:middle}
.dit-tool{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 7px;border:0;border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-secondary,#7f8287);font:inherit;font-size:12px;line-height:1;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s}
.dit-tool:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,#1a1a1a)}
.dit-tool:disabled{opacity:.4;cursor:default}
.dit-tool:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d93f8);outline-offset:1px}
.dit-tool.is-busy{color:var(--dsw-alias-brand-primary,#4d93f8)}
.dit-tool.is-error{color:var(--dsw-alias-state-error-primary,#e5484d)}
.dit-tool svg{flex:none}
.dit-tool-label{white-space:nowrap}
.dit-undo{color:var(--dsw-alias-state-success-primary,#22c55e)}
.dit-spin{animation:dit-spin 1s linear infinite}
@keyframes dit-spin{to{transform:rotate(360deg)}}
.dit-shell{margin:0 0 6px;color:var(--dsw-alias-label-primary,#1a1a1a);font-size:13px;line-height:1.5}
.dit-bar{display:flex;align-items:center;gap:8px;padding:7px 10px;border:0.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.25));border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1,rgba(127,127,127,.05));min-width:0}
.dit-bar-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dit-bar.is-loading{color:var(--dsw-alias-label-secondary,#7f8287)}
.dit-bar.is-error{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e5484d) 35%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e5484d) 7%,transparent)}
.dit-check{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#22c55e) 16%,transparent);color:var(--dsw-alias-state-success-primary,#22c55e);font-size:11px;font-weight:700;flex:none}
.dit-error-mark{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e5484d) 16%,transparent);color:var(--dsw-alias-state-error-primary,#e5484d);font-size:12px;font-weight:700;flex:none}
.dit-error-body{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}
.dit-error-body strong{font-size:12px;font-weight:600}
.dit-error-body span{font-size:12px;color:var(--dsw-alias-label-secondary,#7f8287)}
.dit-notice{display:flex;align-items:center;gap:6px;margin:0 2px 6px;padding:5px 8px;border-radius:var(--dsw-radius-sm,8px);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d98e00) 9%,transparent);color:var(--dsw-alias-label-secondary,#7f8287);font-size:11.5px}
.dit-notice.is-error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e5484d) 9%,transparent);color:var(--dsw-alias-state-error-primary,#e5484d)}
.dit-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px;padding:0 2px}
.dit-head-main{min-width:0;flex:1}
.dit-head-actions{display:flex;align-items:center;gap:2px;flex:none}
.dit-kicker{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#7f8287);letter-spacing:.02em}
.dit-preview{margin-top:3px;display:flex;flex-direction:column;gap:1px;min-width:0}
.dit-preview-label{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#979da6);letter-spacing:.02em}
.dit-preview-text{font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary,#7f8287);overflow-wrap:anywhere;max-height:66px;overflow-y:auto;padding-right:2px}
.dit-blue{color:#66ccff}
::highlight(dsh-intent-translator-ambiguous){color:#66ccff}
.dit-span{margin-top:2px;font-size:12px;color:var(--dsw-alias-label-tertiary,#979da6);overflow-wrap:anywhere}
.dit-span code{font-family:var(--ds-font-family-code,monospace);font-size:11.5px;color:var(--dsw-alias-label-secondary,#7f8287);background:var(--dsw-alias-bg-base,rgba(127,127,127,.08));padding:1px 5px;border-radius:var(--dsw-radius-xs,4px)}
.dit-sections{display:flex;flex-direction:column;gap:10px;max-height:min(58vh,560px);overflow-y:auto;padding:2px 2px 4px;scrollbar-width:thin}
.dit-segment{display:flex;flex-direction:column;gap:5px}
.dit-seg-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:0 2px}
.dit-seg-span{font-size:12px;color:var(--dsw-alias-label-secondary,#7f8287);overflow-wrap:anywhere}
.dit-applied-tag{font-size:10.5px;color:var(--dsw-alias-state-success-primary,#22c55e);background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#22c55e) 12%,transparent);padding:2px 6px;border-radius:999px}
.dit-applied-row{display:flex;align-items:center;gap:7px;padding:7px 9px;border:0.5px solid color-mix(in srgb,var(--dsw-alias-state-success-primary,#22c55e) 30%,transparent);border-radius:var(--dsw-radius-md,12px);background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#22c55e) 6%,transparent);font-size:12px;color:var(--dsw-alias-label-secondary,#7f8287)}
.dit-retry{display:inline-flex;align-items:center;gap:4px;padding:3px 4px}
.dit-retry svg{flex:none}
.dit-foot-actions{display:inline-flex;align-items:center;gap:8px;margin-left:auto}
.dit-cards{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 4px;scrollbar-width:thin}
.dit-cards.is-single{overflow-x:visible}
.dit-card{box-sizing:border-box;flex:1 1 220px;min-width:220px;max-width:320px;display:flex;flex-direction:column;gap:6px;padding:11px 12px 10px;border:0.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.25));border-radius:var(--dsw-radius-lg,16px);background:var(--dsw-alias-bg-layer-1,transparent);cursor:pointer;transition:border-color .15s,background .15s;text-align:left}
.dit-card:hover{border-color:var(--dsw-alias-brand-primary,#4d93f8);background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.06))}
.dit-card:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d93f8);outline-offset:2px}
.dit-card.is-single{flex:1 1 360px;max-width:480px}
.dit-card-top{display:flex;align-items:center;justify-content:space-between;gap:6px}
.dit-badge{font-size:10.5px;letter-spacing:.04em;color:var(--dsw-alias-brand-primary,#4d93f8);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d93f8) 12%,transparent);padding:2px 6px;border-radius:999px;white-space:nowrap}
.dit-badge.is-warn{color:var(--dsw-alias-state-warn-primary,#d98e00);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d98e00) 12%,transparent)}
.dit-card-label{font-size:15px;font-weight:600;line-height:1.35;color:var(--dsw-alias-label-primary,#1a1a1a)}
.dit-card-exp{font-size:12.5px;line-height:1.55;color:var(--dsw-alias-label-secondary,#7f8287);min-height:38px}
.dit-card-links{display:flex;align-items:center;gap:6px}
.dit-link{border:0;background:transparent;color:var(--dsw-alias-brand-primary,#4d93f8);font:inherit;font-size:12px;padding:2px 0;cursor:pointer;text-align:left}
.dit-link:hover{text-decoration:underline}
.dit-prompt{display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-base,rgba(127,127,127,.08));cursor:default}
.dit-prompt-label{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#979da6);letter-spacing:.04em}
.dit-prompt-text{font-family:var(--ds-font-family-code,monospace);font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-primary,#1a1a1a);word-break:break-word;user-select:text}
.dit-prompt-actions{display:flex;gap:6px}
.dit-btn{border:0.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.25));background:var(--dsw-alias-bg-layer-1,transparent);color:var(--dsw-alias-label-primary,#1a1a1a);font:inherit;font-size:11.5px;padding:3px 8px;border-radius:999px;cursor:pointer}
.dit-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}
.dit-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d93f8);outline-offset:1px}
.dit-card-cta{margin-top:auto;padding-top:2px;font-size:11.5px;font-weight:500;color:var(--dsw-alias-brand-primary,#4d93f8)}
.dit-foot{display:flex;flex-wrap:wrap;gap:6px;padding:4px 2px 0;font-size:11.5px;color:var(--dsw-alias-label-tertiary,#979da6)}
.dit-empty{padding:12px;border:0.5px dashed var(--dsw-alias-border-l2,rgba(127,127,127,.25));border-radius:var(--dsw-radius-md,12px);font-size:12.5px;color:var(--dsw-alias-label-secondary,#7f8287)}
.dit-empty-title{font-size:13px;color:var(--dsw-alias-label-primary,#1a1a1a);margin-bottom:2px}
.dit-muted{color:var(--dsw-alias-label-tertiary,#979da6);font-size:11.5px}
.dit-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:0;border-radius:var(--dsw-radius-xs,4px);background:transparent;color:var(--dsw-alias-label-tertiary,#979da6);font:inherit;font-size:15px;line-height:1;cursor:pointer;flex:none}
.dit-icon-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,#1a1a1a)}
.dit-refine{display:flex;flex-direction:column;gap:4px;padding:7px 8px;border-radius:var(--dsw-radius-sm,8px);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d93f8) 6%,transparent);font-size:11.5px;color:var(--dsw-alias-label-secondary,#7f8287)}
.dit-refine.is-pending{flex-direction:row;align-items:center;gap:6px}
.dit-refine.is-error{color:var(--dsw-alias-state-error-primary,#e5484d);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e5484d) 7%,transparent)}
`;

    function apply(ctx) {
      setupLocale(ctx);
      const slots = ctx.slots;
      if (!slots) return;
      slots.inject('conversation.input.left', () =>
        slots.register(
          {
            name: 'conversation.input.left',
            id: 'dsh-intent-translator',
            order: 60,
            label: () => t('pluginTitle'),
          },
          ToolbarButton,
        ),
      );
      slots.inject('conversation.input.dock', () =>
        slots.register(
          {
            name: 'conversation.input.dock',
            id: 'dsh-intent-translator',
            order: 15,
            label: () => t('pluginTitle'),
          },
          IntentCardDock,
        ),
      );
    }

    exports.name = 'dsh-intent-translator';
    exports.inject = ['slots'];
    exports.apply = apply;
    return module.exports;
  },
});
