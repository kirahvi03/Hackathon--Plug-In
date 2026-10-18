import test from 'node:test';
import assert from 'node:assert/strict';
import engine from '../lib/engine.js';

const TEXT = '我想要设计一个网页界面，背景有图片，前景是毛玻璃效果，高级感';

function candidate(overrides = {}) {
  return {
    id: 'glass',
    label: '毛玻璃透叠感',
    explanation: '半透明前景压在图片上，边缘有隐约反光，层次更轻更透。',
    prompt: '12px 高斯模糊叠加 15% 透明白，实现玻璃透叠效果',
    replace_span: '毛玻璃效果，高级感',
    ...overrides,
  };
}

function answer(overrides = {}) {
  return {
    confidence: 0.62,
    ambiguous_span: '毛玻璃效果，高级感',
    candidates: [
      candidate(),
      candidate({
        id: 'minimal',
        label: '极简留白感',
        explanation: '减少装饰，让图片和文字之间留出更多呼吸空间，画面更安静。',
        prompt: '前景只保留低对比度遮罩，去掉多余装饰，用大留白和细字重',
      }),
      candidate({
        id: 'dark',
        label: '暗色高级感',
        explanation: '整体压暗、提高对比，让图片成为暗背景上的发光主体。',
        prompt: '深色背景叠加 20% 黑色遮罩，前景用低饱和冷色和细边框',
      }),
    ],
    ...overrides,
  };
}

test('parses fenced JSON and keeps distinct directions', () => {
  const raw = `\`\`\`json\n${JSON.stringify(answer())}\n\`\`\``;
  const result = engine.parseAndValidate(raw, TEXT);
  assert.equal(result.ambiguous_span, '毛玻璃效果，高级感');
  assert.equal(result.candidates.length, 3);
  assert.equal(result.candidates[0].replace_span, '毛玻璃效果，高级感');
  assert.equal(result.warnings.includes('directions_collapsed'), false);
});

test('keeps "背景有图片" intact and replaces only the marked span', () => {
  const result = engine.parseAndValidate(JSON.stringify(answer()), TEXT);
  const applied = engine.applyCandidate(TEXT, result.candidates[0], result.ambiguous_span);
  assert.equal(applied.mode, 'span');
  assert.match(applied.text, /背景有图片/);
  assert.match(applied.text, /^我想要设计一个网页界面，背景有图片，前景是12px 高斯模糊/);
  assert.equal(applied.text.includes('毛玻璃效果，高级感'), false);
});

test('turns a technical English label into a human label', () => {
  const result = engine.parseAndValidate(
    JSON.stringify(answer({ candidates: [candidate({ label: 'glassmorphism', explanation: '半透明前景压在图片上，边缘有反光。' })] })),
    TEXT,
  );
  const label = result.candidates[0].label;
  assert.equal(/[A-Za-z0-9]/.test(label), false);
  assert.ok(engine.countCjk(label) >= 2);
  assert.ok(Array.from(label).length <= 12);
});

test('drops near-duplicate directions and warns', () => {
  const result = engine.parseAndValidate(
    JSON.stringify(
      answer({
        candidates: [
          candidate({ id: 'a', label: '毛玻璃透叠感', explanation: '半透明前景压在图片上，边缘有反光，层次轻透。' }),
          candidate({ id: 'b', label: '毛玻璃通透感', explanation: '半透明前景压在图片上，边缘有反光，整体轻透。' }),
        ],
      }),
    ),
    TEXT,
  );
  assert.equal(result.candidates.length, 1);
  assert.ok(result.warnings.includes('directions_collapsed'));
});

test('falls back to ambiguous_span when replace_span is not in the source', () => {
  const result = engine.parseAndValidate(
    JSON.stringify(answer({ candidates: [candidate({ replace_span: '不存在的片段' })] })),
    TEXT,
  );
  assert.equal(result.candidates[0].replace_span, '毛玻璃效果，高级感');
  assert.equal(result.candidates[0].fallback_used, true);
  assert.ok(result.warnings.includes('span_fallback'));
});

test('replaces the whole draft when neither span can be located', () => {
  const applied = engine.applyCandidate(TEXT, { prompt: '新的完整写法', replace_span: '不存在' }, '也不存在');
  assert.equal(applied.mode, 'whole');
  assert.equal(applied.text, '新的完整写法');
  assert.equal(applied.warning, 'span_not_found');
});

test('honours a whitespace difference and reports a loose match', () => {
  const applied = engine.applyCandidate('前景是毛玻璃 效果，高级感', { prompt: '新写法', replace_span: '毛玻璃效果' }, '');
  assert.equal(applied.mode, 'span');
  assert.equal(applied.warning, 'loose_span');
  assert.equal(applied.text, '前景是新写法，高级感');
});

test('reports a no-op when the model finds nothing ambiguous', () => {
  const result = engine.parseAndValidate(JSON.stringify({ confidence: 1, ambiguous_span: '', candidates: [] }), TEXT);
  assert.equal(result.noChange, true);
  assert.equal(result.candidates.length, 0);
});

test('rejects non-JSON output with a readable code', () => {
  assert.throws(
    () => engine.parseAndValidate('我觉得这样改更好，不加 JSON。', TEXT),
    (error) => error.code === 'INVALID_JSON',
  );
});

test('high-confidence threshold is exactly 0.85', () => {
  assert.equal(engine.isHighConfidence({ confidence: 0.85 }), true);
  assert.equal(engine.isHighConfidence({ confidence: 0.849 }), false);
  assert.equal(engine.normalizeConfidence('0.9'), 0.9);
  assert.equal(engine.normalizeConfidence(9), 1);
});

test('locates exact and whitespace-flexible spans', () => {
  assert.deepEqual(engine.locateSpan('abc def', 'def'), { start: 4, end: 7, mode: 'exact' });
  assert.deepEqual(engine.locateSpan('abc  def', 'abc def'), { start: 0, end: 8, mode: 'loose' });
  assert.equal(engine.locateSpan('abc', ''), null);
});

test('parses multiple independent vague segments', () => {
  const text = '做一个登录页，背景要毛玻璃效果，按钮要赛博朋克一点';
  const raw = {
    segments: [
      {
        id: 's1',
        span: '毛玻璃效果',
        confidence: 0.55,
        candidates: [
          candidate({
            id: 'glass',
            label: '毛玻璃透叠感',
            explanation: '半透明前景压在图片上，边缘有隐约反光。',
            prompt: '背景用半透明模糊层',
            replace_span: '毛玻璃效果',
          }),
          candidate({
            id: 'minimal',
            label: '极简留白感',
            explanation: '减少装饰，让画面安静下来。',
            prompt: '背景只留低对比度遮罩',
            replace_span: '毛玻璃效果',
          }),
        ],
      },
      {
        id: 's2',
        span: '赛博朋克一点',
        confidence: 0.6,
        candidates: [
          candidate({
            id: 'neon',
            label: '霓虹夜城感',
            explanation: '用高饱和霓虹色和暗背景制造未来夜城气氛。',
            prompt: '按钮加霓虹描边和暗色底',
            replace_span: '赛博朋克一点',
          }),
          candidate({
            id: 'mecha',
            label: '机甲结构感',
            explanation: '用硬边、切角和金属质感强调机械结构。',
            prompt: '按钮用切角金属边框',
            replace_span: '赛博朋克一点',
          }),
        ],
      },
    ],
  };
  const result = engine.parseAndValidate(JSON.stringify(raw), text);
  assert.equal(result.segments.length, 2);
  assert.deepEqual(result.segments.map((segment) => segment.span), ['毛玻璃效果', '赛博朋克一点']);
  for (const segment of result.segments) {
    assert.equal(segment.start < segment.end, true);
    for (const item of segment.candidates) assert.equal(item.replace_span, segment.span);
  }
  const applied = engine.applyCandidate(text, result.segments[0].candidates[0], result.segments[0].span);
  assert.match(applied.text, /背景要用半透明模糊层/);
  assert.match(applied.text, /按钮要赛博朋克一点/);
});

test('strips a duplicated word that already precedes the span', () => {
  const text = '做一个登录页，背景要有毛玻璃效果，按钮要赛博朋克一点';
  const raw = {
    segments: [
      {
        id: 's1',
        span: '毛玻璃效果',
        candidates: [candidate({ label: '磨砂透叠感', prompt: 'backdrop-filter 模糊层', replace_span: '毛玻璃效果' })],
      },
      {
        id: 's2',
        span: '赛博朋克一点',
        candidates: [
          candidate({
            id: 'neon',
            label: '霓虹发光感',
            explanation: '按钮边缘带青紫霓虹光晕，像夜色里的灯牌。',
            prompt: '按钮用青紫霓虹描边',
            replace_span: '赛博朋克一点',
          }),
          candidate({
            id: 'mecha',
            label: '硬核切角感',
            explanation: '按钮做成切角几何块，配等宽字体和细网格。',
            prompt: '按钮要切角金属块',
            replace_span: '赛博朋克一点',
          }),
        ],
      },
    ],
  };
  const result = engine.parseAndValidate(JSON.stringify(raw), text);
  const segment = result.segments.find((item) => item.span === '赛博朋克一点');
  assert.equal(segment.candidates[0].prompt, '用青紫霓虹描边');
  assert.equal(segment.candidates[1].prompt, '切角金属块');
  const applied = engine.applyCandidate(text, segment.candidates[0], segment.span);
  assert.match(applied.text, /按钮要用青紫霓虹描边/);
  assert.doesNotMatch(applied.text, /按钮要按钮/);
});

test('drops overlapping segments instead of replacing twice', () => {
  const raw = {
    segments: [
      {
        span: '毛玻璃效果，高级感',
        confidence: 0.5,
        candidates: [candidate()],
      },
      {
        span: '高级感',
        confidence: 0.9,
        candidates: [candidate({ id: 'dark', label: '暗色高级感', replace_span: '高级感' })],
      },
    ],
  };
  const result = engine.parseAndValidate(JSON.stringify(raw), TEXT);
  assert.equal(result.segments.length, 1);
  assert.ok(result.warnings.includes('overlapping_segments'));
});

test('forces a candidate to stay inside its own segment', () => {
  const raw = {
    segments: [
      {
        span: '毛玻璃效果，高级感',
        confidence: 0.6,
        candidates: [candidate({ replace_span: '背景有图片' })],
      },
    ],
  };
  const result = engine.parseAndValidate(JSON.stringify(raw), TEXT);
  assert.equal(result.segments[0].candidates[0].replace_span, '毛玻璃效果，高级感');
  assert.equal(result.segments[0].candidates[0].fallback_used, true);
  assert.ok(result.warnings.includes('span_fallback'));
});

test('retry prompt and validation avoid previous directions', () => {
  const message = engine.buildUserMessage(TEXT, {
    attempt: 2,
    avoid: [{ label: '极简留白感', explanation: '减少装饰，留出更多呼吸空间。' }],
  });
  assert.match(message, /第 2 次拆解/);
  assert.match(message, /极简留白感/);
  assert.match(message, /不要重复/);

  const repeated = {
    segments: [
      {
        span: '毛玻璃效果，高级感',
        confidence: 0.4,
        candidates: [
          candidate({
            label: '极简留白感',
            explanation: '减少装饰，留出更多呼吸空间。',
          }),
        ],
      },
    ],
  };
  assert.throws(
    () => engine.parseAndValidate(JSON.stringify(repeated), TEXT, { retry: true, avoid: [{ label: '极简留白感', explanation: '减少装饰，留出更多呼吸空间。' }] }),
    (error) => error.code === 'NO_NEW_DIRECTIONS',
  );
});

test('retry keeps genuinely new directions and reports filtering', () => {
  const raw = {
    segments: [
      {
        span: '毛玻璃效果，高级感',
        confidence: 0.4,
        candidates: [
          candidate({
            label: '极简留白感',
            explanation: '减少装饰，留出更多呼吸空间。',
          }),
          candidate({
            id: 'noir',
            label: '黑白胶片感',
            explanation: '用高对比黑白和颗粒质感制造复古摄影氛围。',
            prompt: '背景图转黑白并叠加胶片颗粒',
          }),
        ],
      },
    ],
  };
  const result = engine.parseAndValidate(JSON.stringify(raw), TEXT, {
    retry: true,
    avoid: [{ label: '极简留白感', explanation: '减少装饰，留出更多呼吸空间。' }],
  });
  assert.equal(result.segments[0].candidates.length, 1);
  assert.equal(result.segments[0].candidates[0].label, '黑白胶片感');
  assert.ok(result.warnings.includes('retry_filtered'));
});
