'use strict';
// Gate test for src/voices.js eligible: ineligible origins (standalone file,
// mismatched origin) must never flush or load the chunk via kick/decorate.
// Eligible-origin control proves the same triggers do flush when allowed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const glue = fs.readFileSync(path.join(root, 'src/voices.js'), 'utf8');
const PRIMARY = 'https://alibi-after-hours-preview.commit-atlas.workers.dev';
const SITES = 'https://alibi.example-sites.app';
const COLLECTOR = 'https://pulseboard-observatory.commit-atlas.workers.dev';

// Minimal DOM harness mirroring tests/voices.test.cjs page().
function page({ origin = PRIMARY, standalone = false, queued = false } = {}) {
  const listeners = { window: {}, document: {} };
  const store = new Map(queued ? [['alibi:voices:queue:v1', '[{"payload":{}}]']] : []);
  const appended = [];
  const document = {
    visibilityState: 'visible',
    head: { append: (el) => appended.push(el) },
    createElement: (tag) => ({ tag, remove() {} }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (type, fn) => (listeners.document[type] ||= []).push(fn),
  };
  const idle = [];
  const context = {
    document,
    location: { origin, hash: '#/home' },
    ALIBI_CONFIG: { standalone, version: '0.15.0' },
    ALIBI_VOICES: { origin: PRIMARY, collector: COLLECTOR, chunk: './assets/voices.x.js' },
    ALIBI_CATALOG: { puzzles: [{ id: 'scene-01', type: 'scene', difficulty: 'Gentle' }] },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    },
    addEventListener: (type, fn) => (listeners.window[type] ||= []).push(fn),
    requestIdleCallback: (fn) => idle.push(fn),
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(glue, context, { filename: 'voices.js' });
  const fire = (target, type) => (listeners[target][type] || []).forEach((fn) => fn({ type }));
  const settle = () => new Promise((r) => setImmediate(r));
  return { context, appended, idle, fire, settle };
}

async function triggers(h) {
  // decorate() schedules kick on idle; online/visibilitychange call kick directly.
  h.context.AlibiVoices(null, new Map());
  for (const fn of h.idle) fn();
  h.fire('window', 'online');
  h.fire('document', 'visibilitychange');
  await h.settle();
}

test('standalone file never flushes nor loads the chunk', async () => {
  const h = page({ standalone: true, queued: true });
  assert.equal(h.context.AlibiVoices.eligible, false);
  let flushes = 0;
  h.context.AlibiVoicesSheet = { flush: () => flushes++ };
  await triggers(h);
  assert.equal(flushes, 0, 'kick/decorate must not flush when standalone');
  assert.equal(h.appended.length, 0, 'kick/decorate must not load the chunk when standalone');
});

test('mismatched origin never flushes nor loads the chunk', async () => {
  const h = page({ origin: SITES, queued: true });
  assert.equal(h.context.AlibiVoices.eligible, false);
  let flushes = 0;
  h.context.AlibiVoicesSheet = { flush: () => flushes++ };
  await triggers(h);
  assert.equal(flushes, 0, 'kick/decorate must not flush on a mismatched origin');
  assert.equal(h.appended.length, 0, 'kick/decorate must not load the chunk on a mismatched origin');
});

test('mismatched origin with no sheet loaded attempts no send', async () => {
  const h = page({ origin: SITES, queued: true });
  await triggers(h);
  assert.equal(h.appended.length, 0, 'no chunk load means no send is attempted');
});

test('eligible origin control flushes via kick/decorate', async () => {
  const h = page({ queued: true });
  assert.equal(h.context.AlibiVoices.eligible, true);
  let flushes = 0;
  h.context.AlibiVoicesSheet = { flush: () => flushes++ };
  await triggers(h);
  assert.ok(flushes > 0, 'eligible origin still flushes');
});
