import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const code = fs.readFileSync(path.join(root, 'client.js'), 'utf8');

function loadClient() {
  let registration = null;
  const window = {
    __ModuleLoader__: {
      load(value) {
        registration = value;
      },
    },
  };
  const context = {
    window,
    navigator: { language: 'zh-CN', languages: ['zh-CN'] },
    console,
    setTimeout,
    clearTimeout,
    document: {},
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  assert.ok(registration, 'client.js must register a module');
  assert.equal(registration.id, 'dsh-intent-translator');

  const React = {
    createElement: () => null,
    useEffect: () => {},
    useMemo: (factory) => factory(),
    useRef: (value) => ({ current: value }),
    useState: (value) => [value, () => {}],
  };
  return registration.factory((name) => {
    if (name === 'react') return React;
    throw new Error(`unexpected module: ${name}`);
  });
}

test('client bundle registers the expected module and slot entries', () => {
  const exports = loadClient();
  assert.equal(exports.name, 'dsh-intent-translator');
  assert.equal(exports.inject.length, 1);
  assert.equal(exports.inject[0], 'slots');
  assert.equal(typeof exports.apply, 'function');

  const calls = [];
  const ctx = {
    get: () => null,
    slots: {
      inject(name, callback) {
        calls.push(name);
        callback();
      },
      register(options) {
        calls.push(options.name);
        assert.ok(options.id);
        return () => {};
      },
    },
  };
  exports.apply(ctx);
  assert.deepEqual(calls, [
    'conversation.input.left',
    'conversation.input.left',
    'conversation.input.dock',
    'conversation.input.dock',
  ]);
});

test('client bundle has no unresolved build marker and no ESM export', () => {
  assert.equal(code.includes('@@ENGINE@@'), false);
  assert.equal(/^export\s/m.test(code), false);
});

test('client bundle carries the blue highlight, multi-segment and retry UI', () => {
  assert.ok(code.includes('#66ccff'));
  assert.ok(code.includes('::highlight(dsh-intent-translator-ambiguous)'));
  assert.ok(code.includes('换一组'));
  assert.ok(code.includes('segments'));
});

test('client bundle constrains the card area and supports host dark theme + wheel easing', () => {
  assert.ok(code.includes('max-height:min(82vh,820px)'));
  assert.ok(code.includes('width:clamp(520px,60vw,1100px)'));
  assert.ok(code.includes('position:fixed'));
  assert.ok(code.includes('body[data-ds-dark-theme]'));
  assert.ok(code.includes('overscroll-behavior:contain'));
  assert.ok(code.includes("addEventListener('wheel'"));
  assert.ok(code.includes('requestAnimationFrame'));
});
