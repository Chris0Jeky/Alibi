'use strict';
// Guards voices-sheet state() against non-object stored values: a stored string,
// array or null must fall back to a clean default instead of spreading junk keys.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');
const queueSource = read(root, 'src/voices-queue.js');
const sheetSource = read(root, 'src/voices-sheet.js');

function harness(seed) {
  const store = new Map();
  if (seed !== undefined) store.set('alibi:voices:state:v1', seed);
  const listeners = {};
  const context = {
    innerWidth: 500,
    location: { origin: 'https://example.test', hash: '#/home' },
    navigator: { onLine: true },
    ALIBI_CONFIG: { standalone: false, version: '0.15.0' },
    ALIBI_VOICES: { origin: 'https://example.test', collector: 'https://example.test' },
    ALIBI_CATALOG: { puzzles: [] },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
    fetch: async () => ({ status: 202, headers: { get: () => null } }),
    setTimeout,
    clearTimeout,
    document: {
      head: { append() {} },
      body: {},
      activeElement: null,
      createElement: () => ({}),
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: (type, fn) => (listeners[type] ||= []).push(fn),
    },
    addEventListener() {},
  };
  const voices = (...args) => voices.calls.push(args);
  voices.calls = [];
  voices.run = null;
  voices.records = new Map();
  context.AlibiVoices = voices;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(queueSource, context, { filename: 'voices-queue.js' });
  vm.runInContext(sheetSource, context, { filename: 'voices-sheet.js' });
  const fire = (voAct) =>
    (listeners.click || []).forEach((fn) =>
      fn({ target: { closest: () => ({ dataset: { voAct } }) } }),
    );
  return { store, fire };
}

test('string, array and null stored values yield clean default state', () => {
  for (const seed of ['"oops"', '["a"]', 'null']) {
    const h = harness(seed);
    h.fire('never');
    assert.deepEqual(JSON.parse(h.store.get('alibi:voices:state:v1')), {
      rated: {},
      never: 1,
    });
  }
});

test('non-object rated values yield empty ratings', () => {
  for (const seed of ['{"rated":"oops"}', '{"rated":["x"]}', '{"rated":null}']) {
    const h = harness(seed);
    h.fire('never');
    assert.deepEqual(JSON.parse(h.store.get('alibi:voices:state:v1')), {
      rated: {},
      never: 1,
    });
  }
});
