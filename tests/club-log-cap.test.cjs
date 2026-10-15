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
const E = require('../src/club-engines.js');

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

function gardenSave(moves, redo = []) {
  return {
    schema: 1,
    settings: { assist: 'off', zen: false, pinned: null },
    runs: {
      regiongardens: { rulesVersion: 1, level: 0, log: Array(moves).fill(0), redo },
    },
    records: [],
    stamps: [],
    visit: 0,
    lastHero: -1,
  };
}

function gardenRun(c) {
  return c.AlibiClub.diagnostics().state.runs.regiongardens;
}

function gardenLog(c) {
  return gardenRun(c).log.length;
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

function archiveWalk(moves) {
  // Archive replays history with legality only and no length cap, so a
  // 3000-log plus one redo entry loads; the redo guard must still refuse it.
  let s = E.warehouse.initial(0);
  const log = [];
  while (log.length < moves) {
    let grew = false;
    for (const d of ['up', 'right', 'down', 'left']) {
      const q = E.warehouse.move(s, d);
      if (q !== s) {
        s = q;
        log.push(d);
        grew = true;
        break;
      }
    }
    if (!grew) throw new Error('archive walk stuck before the bound');
  }
  let redo = null;
  for (const d of ['up', 'right', 'down', 'left']) {
    if (E.warehouse.move(s, d) !== s) {
      redo = d;
      break;
    }
  }
  if (redo === null) throw new Error('no legal redo move at the walk end');
  return { log, redo: [redo] };
}

function archiveSave(log, redo) {
  return {
    schema: 1,
    settings: { assist: 'off', zen: false, pinned: null },
    runs: { archive: { rulesVersion: 1, level: 0, log, redo } },
    records: [],
    stamps: [],
    visit: 0,
    lastHero: -1,
  };
}

test('redo at the bound is refused without growing the log', async () => {
  const s = store(),
    toasts = [];
  const { log, redo } = archiveWalk(3000);
  s.setItem('alibi-afterhours-v1', JSON.stringify({ rev: 1, data: archiveSave(log, redo) }));
  const c = await tab(s, toasts);
  const run = () => c.AlibiClub.diagnostics().state.runs.archive;
  assert.equal(run().log.length, 3000);
  await c.AlibiClub.action({ dataset: { action: 'club-redo', id: 'archive' } });
  assert.equal(run().log.length, 3000);
  assert.deepEqual(run().redo, redo);
});

test('undo then redo round-trips below the bound', async () => {
  const s = store(),
    toasts = [];
  s.setItem('alibi-afterhours-v1', JSON.stringify({ rev: 1, data: gardenSave(3000) }));
  const c = await tab(s, toasts);
  await c.AlibiClub.action({ dataset: { action: 'club-undo', id: 'regiongardens' } });
  assert.equal(gardenLog(c), 2999);
  assert.deepEqual(gardenRun(c).redo, [0]);
  await c.AlibiClub.action({ dataset: { action: 'club-redo', id: 'regiongardens' } });
  assert.equal(gardenLog(c), 3000);
  assert.deepEqual(gardenRun(c).redo, []);
  assert.deepEqual(toasts, []);
});
