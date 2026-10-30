'use strict';
// #882: a restore must not race this tab's own saves, a damaged stored run must not read as a
// cross-tab conflict, and a paint stroke must stop when play is paused or frozen. Each case runs
// the real function text sliced out of src/app.js (or the real Store) rather than a copy.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
const storageSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage.js'), 'utf8');

function fn(name) {
  const m = new RegExp(`\\n  (async )?function ${name}\\(`).exec(app);
  assert.ok(m, `${name} exists in src/app.js`);
  const end = app.indexOf('\n  }\n', m.index);
  return app.slice(m.index, end + 4);
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const C = {
  clone: (v) => JSON.parse(JSON.stringify(v)),
  equal: (a, b) => JSON.stringify(a) === JSON.stringify(b),
};

test('restore flushes this tab and refuses its own input before the snapshot', async () => {
  const log = [];
  const context = {
    C,
    setTimeout,
    clearTimeout,
    toast() {},
    closeDialog() {},
    dialog() {},
    esc: String,
    $: () => null,
    channel: null,
    location: { reload() {} },
    inWorker: async (message) => message.value,
    log,
    store: {
      mode: 'indexeddb',
      async export() {
        log.push('export');
        return { runs: [], packs: [], settings: {}, preferences: {}, damaged: {} };
      },
      async restore() {
        log.push('restore');
        // Mid-restore this tab's board input must refuse, as it does while updating.
        log.push(context.api.blocked() ? 'input-refused' : 'input-allowed');
        return {};
      },
    },
  };
  vm.runInNewContext(
    `
    let restoreBusy = false, paused = false, updateRequested = false, storageFatal = '', saveError = '',
      current = { completedAt: null }, pendingBackup = { runs: [], packs: [] },
      queue = Promise.resolve(),
      noteTimer = setTimeout(() => log.push('note-timer'), 15);
    function locked() { return !current?.rehearsal && (storageFatal || saveError); }
    function enqueueSave() { log.push('flush'); return queue; }
    ${fn('blocked')}
    ${fn('restoreBackup')}
    globalThis.api = { blocked, restore: restoreBackup, busy: () => restoreBusy };
  `,
    context,
  );
  await context.api.restore(false);
  await wait(40);
  assert.deepEqual(log, ['flush', 'export', 'restore', 'input-refused']);
  assert.equal(context.api.busy(), false, 'the guard is released afterwards');
});

test('a damaged stored run is reported as damage, not as another tab, and is left alone', async () => {
  const context = { console, structuredClone, setTimeout, clearTimeout, dispatchEvent() {} };
  context.Event = class Event {};
  context.AlibiCore = { clone: C.clone };
  vm.runInNewContext(storageSource, context);
  const store = new context.AlibiStorage.Store();
  const damaged = { schemaVersion: 1, key: 'a@1', rev: 'seven', note: 'keep me' };
  store.memory.runs['a@1'] = damaged;
  const kept = JSON.stringify(damaged);
  await assert.rejects(store.saveRun({ key: 'a@1' }, 0), (e) => {
    assert.equal(e.name, 'DamagedRecordError');
    assert.match(e.message, /damaged.*not been deleted.*Export browser data/);
    assert.doesNotMatch(e.message, /another tab/);
    return true;
  });
  assert.equal(JSON.stringify(store.memory.runs['a@1']), kept, 'the damaged row is untouched');

  // The player-facing text is the storage message, so the cross-tab wording cannot appear.
  const view = {
    C,
    store,
    $: () => null,
    toast() {},
    render() {},
    setSaveLabel() {},
    channel: null,
  };
  vm.runInNewContext(
    `
    let current = { key: 'a@1', puzzle: {}, rehearsal: false }, saveError = '', storageFatal = '',
      queue = Promise.resolve(), pendingSaves = 0, sessionSeconds = 0,
      records = new Map(), revs = new Map(), acked = new Map();
    ${fn('enqueueSave')}
    globalThis.api = { run: async () => { enqueueSave(); await queue; return saveError; } };
  `,
    view,
  );
  const shown = await view.api.run();
  assert.match(shown, /damaged/);
  assert.doesNotMatch(shown, /another tab/);
});

function paintFixture() {
  const saves = [];
  const context = {
    C,
    AlibiClub: { assistance: () => 'off' },
    E: {
      nonogram: {
        reduce: (p, s, a) => ({ cells: s.cells.map((c, i) => (i === a.cell ? a.value : c)) }),
      },
    },
    render() {},
    feedbackSound() {},
    completion() {},
    saves,
  };
  vm.runInNewContext(
    `
    let paused = false, updateRequested = false, restoreBusy = false, storageFatal = '', saveError = '',
      selectedCell = -1, checking = false, feedback = '', reviewing = false, lastPointerAt = 0, drag = null,
      current = { key: 'k', puzzle: { type: 'nonogram' }, state: { cells: [0, 0, 0] }, undo: [], redo: [], moves: 0 };
    function locked() { return !current?.rehearsal && (storageFatal || saveError); }
    function enqueueSave() { saves.push(JSON.stringify(current.state.cells)); }
    ${fn('paintTo')}
    ${fn('endPaint')}
    globalThis.api = {
      start() { drag = { key: 'k', before: C.clone(current.state), value: 1, visited: new Set() }; },
      paintTo,
      endPaint,
      freeze(name) { if (name === 'paused') paused = true; else if (name === 'update') updateRequested = true; else restoreBusy = true; },
      cells: () => JSON.stringify(current.state.cells),
    };
  `,
    context,
  );
  context.api.start();
  context.api.paintTo(0);
  return { api: context.api, saves };
}

test('a paint stroke stops at a pause and saves only what was painted before it', () => {
  const { api, saves } = paintFixture();
  api.freeze('paused');
  api.paintTo(1);
  assert.equal(api.cells(), '[1,0,0]', 'no cell is painted after the pause');
  api.endPaint();
  assert.deepEqual(saves, ['[1,0,0]']);
});

for (const [name, why] of [
  ['update', 'an update is pending'],
  ['restore', 'a restore is running'],
]) {
  test(`a paint stroke is rolled back and never saved while ${why}`, () => {
    const { api, saves } = paintFixture();
    api.freeze(name);
    api.paintTo(1);
    assert.equal(api.cells(), '[1,0,0]', 'no cell is painted after the freeze');
    api.endPaint();
    assert.equal(api.cells(), '[0,0,0]');
    assert.deepEqual(saves, []);
  });
}
