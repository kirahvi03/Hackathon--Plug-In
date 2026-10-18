/**
 * Host half of dsh-intent-translator.
 *
 * One job: take the current composer draft, ask the configured model for a
 * direction fork, validate the answer against the exact source text, and hand
 * the browser a small JSON result. No session writes, no draft writes.
 */
import { randomUUID } from 'node:crypto';
import engine from './engine.js';

export const name = 'dsh-intent-translator';
export const inject = ['webServer', 'llm'];

const ROUTE_PATH = '/api/dsh-intent-translator/fork';
const DEFAULT_TIMEOUT_MS = 15000;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 60000;
const DEFAULT_MAX_INPUT_CHARS = 8000;
const MAX_MAX_INPUT_CHARS = 20000;
const MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_MAX_TOKENS = 1400;
const MIN_MAX_TOKENS = 256;
const MAX_MAX_TOKENS = 4096;

function readConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    provider: typeof source.provider === 'string' ? source.provider.trim() : '',
    model: typeof source.model === 'string' ? source.model.trim() : '',
    timeoutMs: clampInt(source.timeoutMs, DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS),
    maxInputChars: clampInt(source.maxInputChars, DEFAULT_MAX_INPUT_CHARS, 200, MAX_MAX_INPUT_CHARS),
    maxTokens: clampInt(source.maxTokens, DEFAULT_MAX_TOKENS, MIN_MAX_TOKENS, MAX_MAX_TOKENS),
    temperature: clampNumber(source.temperature, 0.4, 0, 1.5),
    reasoningEffort: source.reasoningEffort === 'inherit' ? 'inherit' : 'off',
  };
}

function clampNumber(value, fallback, min, max) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function clampInt(value, fallback, min, max) {
  return Math.floor(clampNumber(value, fallback, min, max));
}

function abortError(message, name = 'AbortError') {
  const error = new Error(message);
  error.name = name;
  return error;
}

function abortReason(signal, fallback = '已取消') {
  const reason = signal && signal.reason;
  return reason instanceof Error ? reason : abortError(fallback);
}

function isTimeoutSignal(signal) {
  return Boolean(signal && signal.reason && signal.reason.name === 'TimeoutError');
}

/** A clearable deadline that also follows the request's own abort signal. */
function createDeadline(parentSignal, timeoutMs) {
  const controller = new AbortController();
  const onParentAbort = () => {
    if (!controller.signal.aborted) controller.abort(abortReason(parentSignal));
  };
  if (parentSignal) {
    if (parentSignal.aborted) onParentAbort();
    else parentSignal.addEventListener('abort', onParentAbort, { once: true });
  }
  const timer = setTimeout(() => {
    controller.abort(abortError('拆解超时', 'TimeoutError'));
  }, timeoutMs);
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer);
      if (parentSignal) parentSignal.removeEventListener('abort', onParentAbort);
    },
  };
}

/** Bound a promise to the deadline even if an older adapter ignores `signal`. */
function withAbort(promise, signal) {
  if (!signal) return Promise.resolve(promise);
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortReason(signal));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

function isLoopbackRequest(request) {
  const address = request && request.socket && request.socket.remoteAddress;
  if (address !== '127.0.0.1' && address !== '::1' && address !== '::ffff:127.0.0.1') return false;
  const headers = request.headers || {};
  const host = headers.host;
  if (typeof host !== 'string') return false;
  let hostUrl;
  try {
    hostUrl = new URL(`http://${host}`);
  } catch {
    return false;
  }
  const hostname = hostUrl.hostname;
  if (hostname !== '127.0.0.1' && hostname !== 'localhost' && hostname !== '[::1]' && hostname !== '::1') return false;
  if (headers['sec-fetch-site'] === 'cross-site') return false;
  const origin = headers.origin;
  if (origin === undefined) return true;
  try {
    return new URL(origin).host === hostUrl.host;
  } catch {
    return false;
  }
}

function writeJson(response, status, payload, extraHeaders) {
  if (!response || response.writableEnded || response.destroyed) return false;
  try {
    const headers = {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      ...(extraHeaders || null),
    };
    response.writeHead(status, headers);
    response.end(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function readBody(request, limit, signal) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;

    const cleanup = () => {
      request.off?.('data', onData);
      request.off?.('end', onEnd);
      request.off?.('error', onError);
      request.off?.('aborted', onAborted);
      signal?.removeEventListener('abort', onSignalAbort);
    };
    const settle = (error, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > limit) {
        request.resume?.();
        settle(new engine.EngineError('INPUT_TOO_LARGE', '请求体过大。'));
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => {
      if (settled) return;
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        settle(null, text ? JSON.parse(text) : {});
      } catch {
        settle(new engine.EngineError('INVALID_JSON', '请求体不是合法 JSON。'));
      }
    };
    const onError = (error) => settle(error);
    const onAborted = () => settle(abortError('客户端已断开'));
    const onSignalAbort = () => settle(abortReason(signal));

    request.on?.('data', onData);
    request.on?.('end', onEnd);
    request.on?.('error', onError);
    request.on?.('aborted', onAborted);
    if (signal) {
      if (signal.aborted) onSignalAbort();
      else signal.addEventListener('abort', onSignalAbort, { once: true });
    }
  });
}

function sanitizeUsage(usage) {
  if (!usage || typeof usage !== 'object') return undefined;
  const fields = ['inputTokens', 'outputTokens', 'totalTokens', 'cacheReadTokens', 'cacheWriteTokens', 'reasoningTokens'];
  const out = {};
  for (const field of fields) {
    if (typeof usage[field] === 'number' && Number.isFinite(usage[field])) out[field] = usage[field];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function failureError(failure) {
  const code = failure && typeof failure.code === 'string' ? failure.code : 'MODEL_ERROR';
  const messages = {
    NO_ADAPTER: '当前没有可用的模型提供方，请先在设置里配置模型。',
    MISSING_CREDENTIAL: '模型凭据缺失，请先在 DSH 设置里登录或配置 API Key。',
    INVALID_CREDENTIAL: '模型凭据无效，请检查 DSH 的模型设置。',
    AUTH: '模型认证失败，请检查 DSH 的模型设置。',
    RATE_LIMIT: '模型限流了，请稍后再试。',
    QUOTA: '模型额度不足，请检查账户额度。',
    CONTEXT_WINDOW_EXCEEDED: '输入太长，超出模型上下文窗口。',
    EMPTY_RESPONSE: '模型没有返回内容，请重试。',
    ABORTED: '拆解已取消。',
  };
  const detail = failure && typeof failure.message === 'string' ? failure.message : '';
  return new engine.EngineError(code, messages[code] || `模型调用失败${detail ? `：${detail}` : '，请重试。'}`);
}

function isUnsupportedEffort(error) {
  if (!error) return false;
  if (error.code === 'UNSUPPORTED_REASONING_EFFORT') return true;
  const message = typeof error.message === 'string' ? error.message : String(error);
  return /reasoning effort/i.test(message) || /不支持.{0,12}(推理)?强度/.test(message);
}

async function streamOnce(llm, options) {
  let text = '';
  let finish = null;
  let usage = null;
  for await (const chunk of llm.stream(options)) {
    if (!chunk) continue;
    if (chunk.type === 'text-delta' && typeof chunk.text === 'string') text += chunk.text;
    else if (chunk.type === 'usage') usage = chunk.usage;
    else if (chunk.type === 'finish') finish = chunk.reason || null;
  }
  return { text, finish, usage };
}

async function resolveRoute(ctx, cfg) {
  if (cfg.provider && cfg.model) return { provider: cfg.provider, model: cfg.model };
  if (cfg.provider || cfg.model) {
    throw new engine.EngineError('CONFIG_ERROR', 'provider 与 model 必须同时配置，或都留空以跟随 DSH 默认模型。');
  }
  try {
    const selection = ctx.get?.('agentDefaultModel')?.currentSelection?.();
    if (selection && selection.provider && selection.model) {
      return { provider: selection.provider, model: selection.model };
    }
  } catch {
    /* Fall through to the catalog. */
  }
  const llm = ctx.llm || ctx.get?.('llm');
  const providers = typeof llm?.listProviders === 'function' ? llm.listProviders() : [];
  for (const provider of providers) {
    const id = provider && (provider.id || provider.provider);
    if (!id) continue;
    try {
      const models = await llm.listModels(id);
      const model = (models || []).find((entry) => entry && (entry.id || entry.model));
      if (model) return { provider: id, model: model.id || model.model };
    } catch {
      /* Try the next provider. */
    }
  }
  throw new engine.EngineError('NO_MODEL', '没有可用的模型路由，请先在 DSH 设置里选择默认模型。');
}

/**
 * Run one fork request. Exported for tests; the HTTP layer is the only caller
 * in production.
 */
const timeoutMessage = (cfg) => `拆解超时（${Math.max(1, Math.ceil(cfg.timeoutMs / 1000))} 秒），请重试。`;

export async function forkText(ctx, cfg, text, sessionId, signal, options = {}) {
  if (signal?.aborted) throw isTimeoutSignal(signal) ? new engine.EngineError('TIMEOUT', timeoutMessage(cfg)) : new engine.EngineError('CANCELED', '拆解已取消。');
  const llm = ctx.llm || ctx.get?.('llm');
  if (!llm || typeof llm.stream !== 'function') {
    throw new engine.EngineError('NO_MODEL', '模型服务不可用，请先确认 DSH 的模型配置。');
  }
  const route = await resolveRoute(ctx, cfg);
  const startedAt = Date.now();
  const avoid = Array.isArray(options.avoid)
    ? options.avoid.slice(0, 20).map((item) => {
        if (typeof item === 'string') return item.slice(0, 160);
        if (!item || typeof item !== 'object') return null;
        return {
          label: String(item.label ?? '').slice(0, 40),
          explanation: String(item.explanation ?? '').slice(0, 160),
        };
      }).filter(Boolean)
    : [];
  const attempt = Number.isFinite(Number(options.attempt)) ? Math.max(0, Math.min(20, Math.floor(Number(options.attempt)))) : 0;
  const retrying = Boolean(options.retry) || attempt > 0 || avoid.length > 0;
  const messages = [
    {
      id: randomUUID(),
      role: 'user',
      content: [{ type: 'text', text: engine.buildUserMessage(text, { avoid, attempt }) }],
      source: { kind: 'plugin:dsh-intent-translator' },
    },
  ];
  const baseOptions = {
    provider: route.provider,
    model: route.model,
    system: engine.SYSTEM_PROMPT,
    messages,
    // A retry needs more exploration than the first pass; keep it inside a
    // safe range instead of exposing another config knob.
    temperature: attempt > 0 ? Math.min(1.2, cfg.temperature + 0.25) : cfg.temperature,
    maxTokens: cfg.maxTokens,
    signal,
  };

  let effortOverridden = cfg.reasoningEffort !== 'inherit';
  const withEffort = () => {
    const options = { ...baseOptions };
    if (effortOverridden) options.reasoningEffort = cfg.reasoningEffort;
    return options;
  };

  let outcome;
  try {
    outcome = await streamOnce(llm, withEffort());
    if (outcome.finish?.kind === 'error' && effortOverridden && isUnsupportedEffort(outcome.finish.failure)) {
      effortOverridden = false;
      outcome = await streamOnce(llm, withEffort());
    }
  } catch (error) {
    if (effortOverridden && isUnsupportedEffort(error)) {
      effortOverridden = false;
      outcome = await streamOnce(llm, withEffort());
    } else {
      throw error;
    }
  }

  if (signal?.aborted) {
    throw isTimeoutSignal(signal) ? new engine.EngineError('TIMEOUT', timeoutMessage(cfg)) : new engine.EngineError('CANCELED', '拆解已取消。');
  }
  const finish = outcome.finish;
  if (!finish) throw new engine.EngineError('MODEL_ERROR', '模型没有正常结束，请重试。');
  if (finish.kind === 'aborted') {
    throw isTimeoutSignal(signal) ? new engine.EngineError('TIMEOUT', timeoutMessage(cfg)) : new engine.EngineError('CANCELED', '拆解已取消。');
  }
  if (finish.kind === 'error') throw failureError(finish.failure);
  if (finish.kind === 'max-tokens') throw new engine.EngineError('MODEL_ERROR', '模型输出被截断，请重试。');
  // Other terminal kinds (for example a provider-specific stop label) still
  // carry usable text; only error/aborted/max-tokens need special handling.
  if (!outcome.text || !outcome.text.trim()) throw new engine.EngineError('MODEL_ERROR', '模型没有返回内容，请重试。');

  const result = engine.parseAndValidate(outcome.text, text, { avoid, retry: retrying });
  return {
    result,
    meta: {
      ms: Date.now() - startedAt,
      provider: route.provider,
      model: route.model,
      attempt,
      retry: retrying,
      usage: sanitizeUsage(outcome.usage),
      refinement: {
        supported: false,
        available: Boolean(resolveOptimizer(ctx)),
        note: 'V2 预留：点选方向后可调用 dsh-prompt-optimizer 精修；V1 不自动调用。',
      },
    },
  };
}

/**
 * V2 integration point. The optimizer is discovered through the Cordis
 * context; its code is never copied into this plugin.
 *
 * A future dsh-prompt-optimizer that exposes a service named
 * `promptOptimizer` (or `dshPromptOptimizer`) with `refine({ text, sessionId,
 * signal })` can be used as-is. If it only exposes its HTTP route, add a thin
 * adapter here that calls that route.
 */
export function resolveOptimizer(ctx) {
  for (const key of ['promptOptimizer', 'dshPromptOptimizer']) {
    const service = ctx.get?.(key);
    if (service && typeof service.refine === 'function') return service;
  }
  return null;
}

export async function refineCandidate(ctx, candidate, options = {}) {
  const optimizer = resolveOptimizer(ctx);
  if (!optimizer) {
    throw new engine.EngineError('OPTIMIZER_UNAVAILABLE', '未检测到 dsh-prompt-optimizer 的精修能力，V1 不会自动精修。');
  }
  return optimizer.refine({
    text: candidate && candidate.prompt ? candidate.prompt : '',
    sessionId: options.sessionId,
    signal: options.signal,
    direction: candidate && candidate.label ? candidate.label : '',
  });
}

async function handleFork(ctx, cfg, request, response) {
  if (!isLoopbackRequest(request)) {
    return writeJson(response, 403, { ok: false, error: { code: 'FORBIDDEN', message: '仅允许本机同源请求。' } });
  }
  if (request.method !== 'POST') {
    return writeJson(response, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '只支持 POST。' } }, { allow: 'POST' });
  }

  const controller = new AbortController();
  const onClose = () => {
    if (!response.writableEnded) controller.abort(abortError('客户端已断开'));
  };
  response.on?.('close', onClose);
  response.on?.('error', onClose);

  const deadline = createDeadline(controller.signal, cfg.timeoutMs);
  try {
    const body = await readBody(request, MAX_BODY_BYTES, deadline.signal);
    const text = typeof body.text === 'string' ? body.text : '';
    if (!text.trim()) {
      return writeJson(response, 400, { ok: false, error: { code: 'EMPTY_INPUT', message: '输入框是空的，先写点内容再拆解。' } });
    }
    if (text.length > cfg.maxInputChars) {
      return writeJson(response, 413, {
        ok: false,
        error: { code: 'INPUT_TOO_LARGE', message: `输入太长了（${text.length} > ${cfg.maxInputChars} 字），请截取后再试。` },
      });
    }
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    const avoid = Array.isArray(body.avoid)
      ? body.avoid.slice(0, 20).map((item) => {
          if (typeof item === 'string') return item.slice(0, 160);
          if (!item || typeof item !== 'object') return null;
          return {
            label: String(item.label ?? '').slice(0, 40),
            explanation: String(item.explanation ?? '').slice(0, 160),
          };
        }).filter(Boolean)
      : [];
    const attempt = Number.isFinite(Number(body.attempt)) ? Math.max(0, Math.min(20, Math.floor(Number(body.attempt)))) : 0;
    const outcome = await withAbort(
      forkText(ctx, cfg, text, sessionId, deadline.signal, { avoid, attempt, retry: body.retry === true }),
      deadline.signal,
    );
    return writeJson(response, 200, { ok: true, ...outcome });
  } catch (error) {
    if (controller.signal.aborted && !isTimeoutSignal(deadline.signal)) {
      // The browser went away; there is no one to answer.
      return false;
    }
    if (isTimeoutSignal(deadline.signal) || error?.code === 'TIMEOUT') {
      return writeJson(response, 200, {
        ok: false,
        error: { code: 'TIMEOUT', message: `拆解超时（${Math.max(1, Math.ceil(cfg.timeoutMs / 1000))} 秒），请重试。` },
      });
    }
    if (error && error.name === 'AbortError') {
      return writeJson(response, 200, { ok: false, error: { code: 'CANCELED', message: '拆解已取消。' } });
    }
    const publicError =
      error instanceof engine.EngineError
        ? { code: error.code, message: error.message }
        : { code: 'FORK_FAILED', message: `拆解失败，请重试。${error && error.message ? `（${String(error.message).slice(0, 160)}）` : ''}` };
    ctx.logger?.warn?.('dsh-intent-translator: fork failed', error);
    return writeJson(response, 200, { ok: false, error: publicError });
  } finally {
    deadline.dispose();
    response.off?.('close', onClose);
    response.off?.('error', onClose);
  }
}

export function apply(ctx, pluginConfig) {
  const cfg = readConfig(pluginConfig);
  const register = () =>
    ctx.webServer.register({
      kind: 'exact',
      path: ROUTE_PATH,
      handler: (request, response) => handleFork(ctx, cfg, request, response),
    });
  if (typeof ctx.effect === 'function') ctx.effect(register, 'dsh-intent-translator: fork route');
  else register();
  ctx.logger?.info?.('dsh-intent-translator: host ready (route %s, timeout %dms)', ROUTE_PATH, cfg.timeoutMs);
}

export { ROUTE_PATH, readConfig, isLoopbackRequest };
