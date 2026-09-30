'use strict';
// Club game logs stop at the 3000-entry validation bound: a full run refuses
// the next move instead of building a log that replay and re-import refuse.
// VM fixture in the shape of tests/club-storage.test.cjs; not a real browser.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function store() {
  const data = new Map();
  return {
    data,
    getItem: (k) => data.get(k) || null,
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

async function tab(storage, toasts) {
  const c = {
    console,
    URL,
    URLSearchParams,
    Math,
    Date,
    JSON,
    Number,
    Promise,
    setTimeout,
    clearTimeout,
    localStorage: storage,
    location: { hash: '' },
    document: {
      addEventListener() {},
      createElement() {
        return {};
      },
      getElementById() {
        return null;
      },
      body: { append() {} },
    },
  };
  c.globalThis = c;
  vm.createContext(c);
  for (const f of ['core', 'backup-validation', 'club-engines', 'club'])
    vm.runInContext(fs.readFileSync(path.join(root, 'src/' + f + '.js'), 'utf8'), c);
  await c.AlibiClub.init({
    toast: (text) => toasts.push(String(text)),
    render() {},
    settings: () => ({}),
  });
  return c;
}

function gardenSave(moves) {
  return {
    schema: 1,
    settings: { assist: 'off', zen: false, pinned: null },
    runs: {
      regiongardens: { rulesVersion: 1, level: 0, log: Array(moves).fill(0), redo: [] },
    },
    records: [],
    stamps: [],
    visit: 0,
    lastHero: -1,
  };
}

function gardenLog(c) {
  return c.AlibiClub.diagnostics().state.runs.regiongardens.log.length;
}

test('a move below the bound still commits', async () => {
  const s = store(),
    toasts = [];
  s.setItem('alibi-afterhours-v1', JSON.stringify({ rev: 1, data: gardenSave(10) }));
  const c = await tab(s, toasts);
  assert.equal(gardenLog(c), 10);
  await c.AlibiClub.action({ dataset: { action: 'club-garden-cell', cell: '1' } });
  assert.equal(gardenLog(c), 11);
});

test('a 3000-move garden refuses the next tap instead of poisoning the run', async () => {
  const s = store(),
    toasts = [];
  s.setItem('alibi-afterhours-v1', JSON.stringify({ rev: 1, data: gardenSave(3000) }));
  const c = await tab(s, toasts);
  assert.equal(gardenLog(c), 3000);
  await c.AlibiClub.action({ dataset: { action: 'club-garden-cell', cell: '1' } });
  assert.equal(gardenLog(c), 3000);
  assert.ok(
    toasts.some((t) => t.includes('full')),
    'the refusal names the full game',
  );
});
