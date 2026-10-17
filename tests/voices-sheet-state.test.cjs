'use strict';
// Voices sheet state hygiene (src/voices-sheet.js): corrupt stored values must fall
// back to the default state instead of spreading primitives into polluted keys.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const queueSource = fs.readFileSync(path.join(root, 'src/voices-queue.js'), 'utf8');
const sheetSource = fs.readFileSync(path.join(root, 'src/voices-sheet.js'), 'utf8');
const STATE = 'alibi:voices:state:v1';
const PRIMARY = 'https://alibi-after-hours-preview.commit-atlas.workers.dev';
const COLLECTOR = 'https://pulseboard-observatory.commit-atlas.workers.dev';

function sheetPage(seed) {
  const listeners = { document: {} };
  const store = new Map();
  if (seed !== undefined) store.set(STATE, seed);
  const context = {
    innerWidth: 500,
    location: { origin: PRIMARY, hash: '#/home' },
    navigator: {
      locks: { request: (_name, fn) => Promise.resolve().then(fn) },
      onLine: true,
    },
    ALIBI_CONFIG: { standalone: false, version: '0.15.0' },
    ALIBI_VOICES: { origin: PRIMARY, collector: COLLECTOR, chunk: './assets/voices.x.js' },
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
      body: { append() {} },
      activeElement: null,
      createElement: () => ({}),
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: (type, fn) => (listeners.document[type] ||= []).push(fn),
    },
    addEventListener() {},
  };
  const voices = (...args) => voices.calls.push(args);
  voices.calls = [];
  voices.eligible = true;
  voices.run = { puzzle: { id: 'scene-01' } };
  voices.records = new Map();
  voices.official = () => ({ subject: 'scene-01', family: 'scene', tier: 'gentle' });
  context.AlibiVoices = voices;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(queueSource, context, { filename: 'voices-queue.js' });
  vm.runInContext(sheetSource, context, { filename: 'voices-sheet.js' });
  const fire = (type, event) =>
    Promise.all((listeners.document[type] || []).map((fn) => fn(event)));
  const click = (voAct) => fire('click', { target: { closest: () => ({ dataset: { voAct } }) } });
  const saved = () => JSON.parse(store.get(STATE));
  return { click, saved };
}

const NUMERIC = (keys) => keys.filter((k) => /^\d+$/.test(k));

test('corrupt stored values return the default state', async () => {
  for (const seed of ['123', '"x"', '[]', 'null']) {
    const h = sheetPage(seed);
    await h.click('snooze');
    const s = h.saved();
    assert.deepEqual(s.rated, {}, `rated defaults for seed ${seed}`);
    assert.equal(s.snoozes, 1, `snooze applies cleanly for seed ${seed}`);
    assert.deepEqual(
      Object.keys(s).sort(),
      ['rated', 'snoozes', 'until'].sort(),
      `no polluted keys survive seed ${seed}`,
    );
  }
});

test('a valid stored object is preserved', async () => {
  const seed = JSON.stringify({ rated: { 'scene-01': { difficulty: 'just-right' } }, hide: true });
  const h = sheetPage(seed);
  await h.click('snooze');
  const s = h.saved();
  assert.deepEqual(s.rated, { 'scene-01': { difficulty: 'just-right' } });
  assert.equal(s.hide, true);
});

test('a non-object rated value resets to an empty object', async () => {
  for (const rated of ['"x"', '[]', 'null', '123']) {
    const h = sheetPage(JSON.stringify({ rated: JSON.parse(rated) }));
    await h.click('snooze');
    assert.deepEqual(h.saved().rated, {}, `rated ${rated} resets`);
  }
});

test('a save round-trip writes no numeric keys', async () => {
  const h = sheetPage('"x"');
  await h.click('snooze');
  const s = h.saved();
  assert.deepEqual(NUMERIC(Object.keys(s)), []);
  assert.deepEqual(NUMERIC(Object.keys(s.rated)), []);
  assert.match(JSON.stringify(s), /"rated":\{\}/);
});
