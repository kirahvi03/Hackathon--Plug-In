import test from 'node:test';
import assert from 'node:assert/strict';
import { forkText, isLoopbackRequest, readConfig, refineCandidate } from '../lib/host.js';

const TEXT = '我想要设计一个网页界面，背景有图片，前景是毛玻璃效果，高级感';

const VALID = JSON.stringify({
  confidence: 0.62,
  ambiguous_span: '毛玻璃效果，高级感',
  candidates: [
    {
      id: 'glass',
      label: '毛玻璃透叠感',
      explanation: '半透明前景压在图片上，边缘有隐约反光，层次更轻更透。',
      prompt: '12px 高斯模糊叠加 15% 透明白',
      replace_span: '毛玻璃效果，高级感',
    },
    {
      id: 'minimal',
      label: '极简留白感',
      explanation: '减少装饰，让画面留出更多呼吸空间，整体更安静。',
      prompt: '低对比度遮罩、大留白和细字重',
      replace_span: '毛玻璃效果，高级感',
    },
    {
      id: 'dark',
      label: '暗色高级感',
      explanation: '整体压暗提高对比，让图片成为暗背景上的发光主体。',
      prompt: '深色遮罩加低饱和冷色和细边框',
      replace_span: '毛玻璃效果，高级感',
    },
  ],
});

const MULTI = JSON.stringify({
  segments: [
    {
      id: 's1',
      span: '毛玻璃效果，高级感',
      confidence: 0.62,
      candidates: [
        {
          id: 'glass',
          label: '毛玻璃透叠感',
          explanation: '半透明前景压在图片上，边缘有隐约反光。',
          prompt: '12px 高斯模糊叠加 15% 透明白',
          replace_span: '毛玻璃效果，高级感',
        },
        {
          id: 'minimal',
          label: '极简留白感',
          explanation: '减少装饰，让画面留出更多呼吸空间。',
          prompt: '低对比度遮罩、大留白和细字重',
          replace_span: '毛玻璃效果，高级感',
        },
      ],
    },
    {
      id: 's2',
      span: '背景有图片',
      confidence: 0.7,
      candidates: [
        {
          id: 'photo',
          label: '摄影实景感',
          explanation: '用真实照片做背景，保留自然光影和景深。',
          prompt: '全屏摄影图背景，轻微暗角',
          replace_span: '背景有图片',
        },
        {
          id: 'illustration',
          label: '插画叙事感',
          explanation: '用插画背景讲一个轻量的场景故事。',
          prompt: '定制插画背景，低饱和配色',
          replace_span: '背景有图片',
        },
      ],
    },
  ],
});

function makeCtx(chunks, options = {}) {
  let streamCalls = 0;
  const streamOptions = [];
  return {
    streamOptions,
    llm: {
      listProviders: () => (options.providers === false ? [] : [{ id: 'p1' }]),
      listModels: async () => (options.models === false ? [] : [{ id: 'm1' }]),
      stream: (streamOption) => {
        streamCalls += 1;
        streamOptions.push(streamOption);
        const current = typeof chunks === 'function' ? chunks(streamCalls) : chunks;
        return (async function* () {
          for (const chunk of current) yield chunk;
        })();
      },
    },
    get(name) {
      if (name === 'agentDefaultModel' && options.selection !== false) {
        return { currentSelection: () => ({ provider: 'p1', model: 'm1' }) };
      }
      if (name === 'promptOptimizer' && options.optimizer) return options.optimizer;
      return null;
    },
    logger: { warn() {}, info() {} },
  };
}

function stopAfter(text, usage = { inputTokens: 10, outputTokens: 20 }) {
  return [
    { type: 'text-delta', text },
    { type: 'usage', usage },
    { type: 'finish', reason: { kind: 'stop' } },
  ];
}

test('forkText returns validated directions and metadata', async () => {
  const ctx = makeCtx(stopAfter(VALID));
  const outcome = await forkText(ctx, readConfig({}), TEXT, 'sid', undefined);
  assert.equal(outcome.result.confidence, 0.62);
  assert.equal(outcome.result.candidates.length, 3);
  assert.equal(outcome.result.candidates[0].replace_span, '毛玻璃效果，高级感');
  assert.equal(outcome.meta.provider, 'p1');
  assert.equal(outcome.meta.model, 'm1');
  assert.equal(outcome.meta.usage.outputTokens, 20);
  assert.equal(typeof outcome.meta.refinement.available, 'boolean');
});

test('forkText returns independent segments and per-segment confidence', async () => {
  const ctx = makeCtx(stopAfter(MULTI));
  const outcome = await forkText(ctx, readConfig({}), TEXT, 'sid', undefined);
  assert.equal(outcome.result.segments.length, 2);
  assert.deepEqual(outcome.result.segments.map((segment) => segment.span), ['背景有图片', '毛玻璃效果，高级感']);
  assert.equal(outcome.result.segments[0].candidates[0].replace_span, '背景有图片');
  assert.equal(outcome.result.segments[1].confidence, 0.62);
  assert.equal(outcome.result.segments[1].candidates[0].replace_span, '毛玻璃效果，高级感');
});

test('forkText passes retry avoid list to the prompt and filters repeats', async () => {
  const repeatedThenNew = JSON.stringify({
    segments: [
      {
        span: '毛玻璃效果，高级感',
        confidence: 0.4,
        candidates: [
          {
            id: 'repeat',
            label: '极简留白感',
            explanation: '减少装饰，让画面留出更多呼吸空间。',
            prompt: '低对比度遮罩',
            replace_span: '毛玻璃效果，高级感',
          },
          {
            id: 'noir',
            label: '黑白胶片感',
            explanation: '用高对比黑白和颗粒质感制造复古摄影氛围。',
            prompt: '黑白高对比加胶片颗粒',
            replace_span: '毛玻璃效果，高级感',
          },
        ],
      },
    ],
  });
  const ctx = makeCtx(stopAfter(repeatedThenNew));
  const outcome = await forkText(ctx, readConfig({ temperature: 0.4 }), TEXT, 'sid', undefined, {
    retry: true,
    attempt: 1,
    avoid: [{ label: '极简留白感', explanation: '减少装饰，让画面留出更多呼吸空间。' }],
  });
  assert.equal(outcome.result.segments[0].candidates.length, 1);
  assert.equal(outcome.result.segments[0].candidates[0].label, '黑白胶片感');
  assert.equal(outcome.meta.retry, true);
  assert.equal(outcome.meta.attempt, 1);
  assert.ok(ctx.streamOptions[0].temperature > 0.4);
  const prompt = ctx.streamOptions[0].messages[0].content[0].text;
  assert.match(prompt, /第 1 次拆解/);
  assert.match(prompt, /极简留白感/);
});

test('forkText rejects a retry that only repeats old directions', async () => {
  const ctx = makeCtx(stopAfter(VALID));
  await assert.rejects(
    forkText(ctx, readConfig({}), TEXT, 'sid', undefined, {
      retry: true,
      attempt: 1,
      avoid: [
        { label: '毛玻璃透叠感', explanation: '半透明前景压在图片上。' },
        { label: '极简留白感', explanation: '减少装饰，让画面留出更多呼吸空间。' },
        { label: '暗色高级感', explanation: '整体压暗提高对比。' },
      ],
    }),
    (error) => error.code === 'NO_NEW_DIRECTIONS',
  );
});

test('forkText maps a terminal model error to a readable code', async () => {
  const ctx = makeCtx([
    { type: 'finish', reason: { kind: 'error', failure: { code: 'AUTH', message: 'bad key' } } },
  ]);
  await assert.rejects(
    forkText(ctx, readConfig({}), TEXT, 'sid', undefined),
    (error) => error.code === 'AUTH' && /认证失败/.test(error.message),
  );
});

test('forkText rejects max-token truncation', async () => {
  const ctx = makeCtx([
    { type: 'text-delta', text: '{"confidence":0.6' },
    { type: 'finish', reason: { kind: 'max-tokens' } },
  ]);
  await assert.rejects(
    forkText(ctx, readConfig({}), TEXT, 'sid', undefined),
    (error) => error.code === 'MODEL_ERROR' && /截断/.test(error.message),
  );
});

test('forkText rejects non-JSON output without touching any state', async () => {
  const ctx = makeCtx(stopAfter('当然可以，我来帮你改。'));
  await assert.rejects(
    forkText(ctx, readConfig({}), TEXT, 'sid', undefined),
    (error) => error.code === 'INVALID_JSON',
  );
});

test('forkText reports NO_MODEL when no route and no catalog exist', async () => {
  const ctx = makeCtx(stopAfter(VALID), { selection: false, providers: false });
  await assert.rejects(
    forkText(ctx, readConfig({}), TEXT, 'sid', undefined),
    (error) => error.code === 'NO_MODEL',
  );
});

test('forkText distinguishes an already-timed-out signal', async () => {
  const controller = new AbortController();
  const reason = new Error('timeout');
  reason.name = 'TimeoutError';
  controller.abort(reason);
  const ctx = makeCtx(stopAfter(VALID));
  await assert.rejects(
    forkText(ctx, readConfig({}), TEXT, 'sid', controller.signal),
    (error) => error.code === 'TIMEOUT',
  );
});

test('forkText retries once when the model rejects reasoningEffort off', async () => {
  const ctx = makeCtx((call) => {
    if (call === 1) {
      return [{ type: 'finish', reason: { kind: 'error', failure: { code: 'UNSUPPORTED_REASONING_EFFORT', message: 'nope' } } }];
    }
    return stopAfter(VALID);
  });
  const outcome = await forkText(ctx, readConfig({}), TEXT, 'sid', undefined);
  assert.equal(outcome.result.candidates.length, 3);
});

test('readConfig clamps unsafe values', () => {
  const cfg = readConfig({ timeoutMs: 999999, maxInputChars: 1, maxTokens: 1, temperature: 9, reasoningEffort: 'high' });
  assert.equal(cfg.timeoutMs, 60000);
  assert.equal(cfg.maxInputChars, 200);
  assert.equal(cfg.maxTokens, 256);
  assert.equal(cfg.temperature, 1.5);
  assert.equal(cfg.reasoningEffort, 'off');
});

test('isLoopbackRequest fences remote and cross-site callers', () => {
  const base = { socket: { remoteAddress: '127.0.0.1' }, headers: { host: '127.0.0.1:1234' } };
  assert.equal(isLoopbackRequest(base), true);
  assert.equal(isLoopbackRequest({ ...base, headers: { ...base.headers, origin: 'http://127.0.0.1:1234' } }), true);
  assert.equal(isLoopbackRequest({ ...base, headers: { ...base.headers, origin: 'http://evil.test' } }), false);
  assert.equal(isLoopbackRequest({ ...base, headers: { ...base.headers, 'sec-fetch-site': 'cross-site' } }), false);
  assert.equal(isLoopbackRequest({ ...base, socket: { remoteAddress: '10.0.0.2' } }), false);
  assert.equal(isLoopbackRequest({ ...base, headers: { host: 'localhost:1234' } }), true);
});

test('refineCandidate is a V2 reservation, not a V1 call', async () => {
  const ctx = makeCtx(stopAfter(VALID));
  await assert.rejects(
    refineCandidate(ctx, { prompt: 'x', label: '方向' }),
    (error) => error.code === 'OPTIMIZER_UNAVAILABLE',
  );

  let received = null;
  const optimizer = {
    refine: async (input) => {
      received = input;
      return { text: 'refined' };
    },
  };
  const outcome = await refineCandidate(makeCtx(stopAfter(VALID), { optimizer }), { prompt: 'x', label: '方向' }, { sessionId: 'sid' });
  assert.deepEqual(outcome, { text: 'refined' });
  assert.equal(received.text, 'x');
  assert.equal(received.sessionId, 'sid');
});
