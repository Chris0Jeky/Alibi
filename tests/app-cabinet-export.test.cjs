'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
function sliceFn(startMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} exists`);
  const nextAsync = source.indexOf('\n  async function ', start + 1);
  const nextFn = source.indexOf('\n  function ', start + 1);
  const nextLet = source.indexOf('\n  let ', start + 1);
  const ends = [nextAsync, nextFn, nextLet].filter((i) => i !== -1);
  const end = ends.length ? Math.min(...ends) : source.length;
  return source.slice(start, end);
}
const cabinetSrc = sliceFn('  async function cabinetBackup() {');
const enqueueSrc = sliceFn('  function enqueueSave() {');
const offerSrc = sliceFn('  function offerCabinetCopies(');

test('save status describes read-only Cabinet saves before an edit and preserves other states', () => {
  const label = (mode, saveError = '', pendingSaves = 0) =>
    vm.runInNewContext(
      `${sliceFn('  function progressStorageLabel() {')}\n${sliceFn('  function saveLabel() {')}\nsaveLabel()`,
      {
        store: { mode },
        saveError,
        pendingSaves,
        icon: () => '',
        esc: (value) => value,
      },
    );
  assert.match(label('indexeddb'), /Saved on this device/);
  assert.match(label('session'), /Session only/);
  assert.match(label('indexeddb', '', 1), /Saving/);
  assert.match(label('local', 'Save refused'), /Not saved/);
  assert.match(label('local'), /Puzzle progress is read-only here; settings still save/);
  assert.doesNotMatch(label('local'), /Saved on this device/);
});

const clone = (v) => JSON.parse(JSON.stringify(v));
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function runKey() {
  return 'p1@1';
}
function baseRun(over = {}) {
  return {
    schemaVersion: 1,
    key: runKey(),
    rev: 1,
    puzzle: { id: 'p1', revision: 1 },
    state: { cells: [0] },
    undo: [],
    redo: [],
    moves: 1,
    hints: 0,
    elapsed: 10,
    completedAt: null,
    firstCompletedAt: null,
    updatedAt: '2026-10-10T00:00:00.000Z',
    note: '',
    ...over,
  };
}
async function cabinetFixture({
  persisted,
  locals,
  ackedEntries,
  currentKey = null,
  sessionSeconds = 10,
}) {
  const context = {
    C: { clone, equal },
    Map,
    JSON,
    store: {
      export: async () => ({
        format: 'alibi-backup',
        schemaVersion: 1,
        exportedAt: '2026-10-11T00:00:00.000Z',
        runs: clone(persisted),
        packs: [],
        settings: {},
        preferences: {},
        damaged: { runs: [], packs: [], meta: [] },
      }),
    },
    packs: [{ id: 'starter', puzzles: [] }],
    settings: { theme: 'light' },
    prefs: { seen: [], favorites: [] },
    cfg: { version: '0.15.1' },
    sessionSeconds,
    enqueueCalls: 0,
    enqueueSave: async function () {
      context.enqueueCalls++;
    },
    queue: Promise.resolve(),
    draftSave: undefined,
    persistedInit: clone(persisted),
    localsInit: clone(locals),
    ackedInit: clone(ackedEntries),
    currentKey,
  };
  const script = `(async () => {
    let records = new Map(localsInit.map((r) => [r.key, r]));
    let revs = new Map(localsInit.map((r) => [r.key, r.rev]));
    let acked = new Map(ackedInit.map((r) => [r.key, JSON.stringify(r)]));
    let current = currentKey ? records.get(currentKey) : null;
    ${cabinetSrc}
    const out = await cabinetBackup();
    return { out, enqueueCalls };
  })()`;
  return clone(await vm.runInNewContext(script, context, { filename: 'cabinetBackup' }));
}

test('clean cached rev1 never replaces committed rev2 bytes', async () => {
  const persisted = [baseRun({ rev: 2, moves: 9, elapsed: 99 })];
  const local = [baseRun({ rev: 1, moves: 1, elapsed: 10 })];
  const { out } = await cabinetFixture({ persisted, locals: local, ackedEntries: clone(local) });
  assert.equal(out.session, null);
  assert.deepEqual(out.data.runs, persisted);
  assert.equal(out.data.format, 'alibi-backup');
});

test('clean active rev2 remains exact', async () => {
  const persisted = [baseRun({ rev: 2, elapsed: 20 })];
  const local = [baseRun({ rev: 2, elapsed: 20 })];
  const { out } = await cabinetFixture({
    persisted,
    locals: local,
    ackedEntries: clone(local),
    currentKey: runKey(),
    sessionSeconds: 20,
  });
  assert.equal(out.session, null);
  assert.deepEqual(out.data.runs, persisted);
});

test('ordinary dirty edit at same acknowledged revision is preserved', async () => {
  const persisted = [baseRun({ rev: 2, moves: 2 })];
  const acked = [baseRun({ rev: 2, moves: 2 })];
  const local = [baseRun({ rev: 2, moves: 7 })];
  const { out } = await cabinetFixture({ persisted, locals: local, ackedEntries: acked });
  assert.equal(out.session, null);
  assert.equal(out.data.runs.length, 1);
  assert.equal(out.data.runs[0].moves, 7);
});

test('local-only record is retained in the device backup', async () => {
  const only = baseRun({ key: 'new@1', rev: 0 });
  const { out } = await cabinetFixture({ persisted: [], locals: [only], ackedEntries: [] });
  assert.equal(out.session, null);
  assert.equal(out.data.runs.length, 1);
  assert.equal(out.data.runs[0].key, 'new@1');
});

test('a restore with the same revision cannot be replaced by dirty local progress', async () => {
  const baseline = baseRun({ rev: 2, moves: 2 });
  const restored = baseRun({ rev: 2, moves: 9, note: 'restored' });
  const local = baseRun({ rev: 2, moves: 7 });
  const { out } = await cabinetFixture({
    persisted: [restored],
    locals: [local],
    ackedEntries: [baseline],
  });
  assert.deepEqual(out.data.runs, [restored]);
  assert.deepEqual(out.session.runs, [local]);
});

test('dirty inactive failed-CAS with newer committed row yields two standard snapshots', async () => {
  const persisted = [baseRun({ rev: 2, moves: 9, elapsed: 99 })];
  const acked = [baseRun({ rev: 1, moves: 1 })];
  const local = [baseRun({ rev: 1, moves: 5, elapsed: 10 })];
  const { out } = await cabinetFixture({ persisted, locals: local, ackedEntries: acked });
  assert.ok(out.session);
  assert.deepEqual(out.data.runs, persisted);
  assert.equal(out.session.runs.length, 1);
  assert.equal(out.session.runs[0].moves, 5);
  assert.equal(out.session.format, 'alibi-backup');
  assert.equal(out.data.format, 'alibi-backup');
  const keys = (runs) => runs.map((r) => r.key).sort();
  assert.deepEqual(keys(out.data.runs), keys(out.session.runs));
});

test('dirty active failed-CAS keeps elapsed only in the session variant', async () => {
  const persisted = [baseRun({ rev: 2, moves: 9, elapsed: 99 })];
  const acked = [baseRun({ rev: 1, moves: 1, elapsed: 10 })];
  const local = [baseRun({ rev: 1, moves: 5, elapsed: 10 })];
  const { out } = await cabinetFixture({
    persisted,
    locals: local,
    ackedEntries: acked,
    currentKey: runKey(),
    sessionSeconds: 55,
  });
  assert.ok(out.session);
  assert.equal(out.data.runs[0].elapsed, 99);
  assert.equal(out.session.runs[0].elapsed, 55);
  assert.equal(out.session.runs[0].moves, 5);
});

test('dirty new local row cannot replace a persisted unknown row', async () => {
  const persisted = [baseRun({ key: 'myst@9', rev: 5, moves: 9 })];
  const local = [baseRun({ key: 'myst@9', rev: 0, moves: 1 })];
  const { out } = await cabinetFixture({ persisted, locals: local, ackedEntries: [] });
  assert.ok(out.session);
  assert.deepEqual(out.data.runs, persisted);
  assert.equal(out.session.runs[0].moves, 1);
});

test('successful enqueueSave acknowledges the saved snapshot when the local mutates mid-save', async () => {
  let resolveSave;
  const gate = new Promise((yes) => {
    resolveSave = yes;
  });
  const before = baseRun({ rev: 0, note: 'before', elapsed: 0 });
  const context = {
    C: { clone },
    Map,
    JSON,
    Promise,
    current: clone(before),
    storageFatal: '',
    saveError: '',
    sessionSeconds: 5,
    pendingSaves: 0,
    queue: Promise.resolve(),
    revs: new Map([[before.key, 0]]),
    records: new Map([[before.key, clone(before)]]),
    acked: new Map(),
    store: {
      saveRun: (snapshot) =>
        gate.then(() => ({ ...clone(snapshot), rev: 1, updatedAt: '2026-10-11T01:00:00.000Z' })),
    },
    channel: null,
    render: () => {},
    toast: () => {},
    setSaveLabel: () => {},
    $: () => null,
  };
  context.records.set(before.key, context.current);
  const script = `(async () => {
    ${enqueueSrc}
    const p = enqueueSave();
    await Promise.resolve();
    current.note = 'mutated-during-save';
    records.get(current.key).note = 'mutated-during-save';
    globalThis.__resolve();
    await p; await queue;
    const acknowledged = JSON.parse(acked.get(current.key));
    return { ackedNote: acknowledged.note, ackedRev: acknowledged.rev, localNote: records.get(current.key).note, localRev: records.get(current.key).rev };
  })()`;
  context.__resolve = () => resolveSave();
  const res = await vm.runInNewContext(script, context, { filename: 'enqueueSave' });
  assert.equal(res.ackedNote, 'before');
  assert.equal(res.ackedRev, 1);
  assert.equal(res.localNote, 'mutated-during-save');
  assert.equal(res.localRev, 1);
});

test('serialized acknowledgements preserve exact saved bytes and all history contents', async () => {
  const storageSrc = fs.readFileSync(path.join(__dirname, '../src/storage.js'), 'utf8');
  const date = '2026-10-16T00:00:00.000Z';
  for (const count of [0, 10, 100]) {
    const run = baseRun({
      rev: 0,
      note: 'Clue: "north"\n\u00e9\ud83d\udd0e'.repeat(count === 100 ? 100 : 1),
      state: { cells: [0, 1, -1], notes: { 0: [1, 2] } },
      undo: Array.from({ length: count }, (_, i) => ({ cells: [i], notes: { 0: [1] } })),
      redo: Array.from({ length: count }, (_, i) => ({ cells: [i + 1], notes: {} })),
    });
    const save = async (previous) => {
      const ctx = {
        C: { clone },
        AlibiCore: { clone },
        Date: class extends Date {
          constructor() {
            super(date);
          }
        },
        current: clone(run),
        storageFatal: false,
        saveError: null,
        sessionSeconds: 10,
        pendingSaves: 0,
        queue: Promise.resolve(),
        revs: new Map(),
        records: new Map(),
        acked: new Map(),
        channel: null,
        $: () => null,
        setSaveLabel() {},
        render() {},
        toast: (message) => assert.fail(message),
      };
      vm.createContext(ctx);
      vm.runInContext(storageSrc, ctx);
      ctx.store = new ctx.AlibiStorage.Store();
      ctx.records.set(run.key, ctx.current);
      vm.runInContext(
        previous ? enqueueSrc.replace('JSON.stringify(saved)', 'C.clone(saved)') : enqueueSrc,
        ctx,
      );
      await ctx.enqueueSave();
      assert.equal(ctx.saveError, null);
      return ctx;
    };
    const before = await save(true);
    const after = await save(false);
    const bytes = JSON.stringify(before.store.memory.runs[run.key]);
    assert.equal(JSON.stringify(after.store.memory.runs[run.key]), bytes);
    assert.equal(after.acked.get(run.key), bytes);
    after.current.state.notes[0].push(3);
    after.store.memory.runs[run.key].note = 'later mutation of a session-memory row';
    if (count) after.current.undo[0].cells[0] = 999;
    assert.equal(after.acked.get(run.key), bytes, 'the full baseline stays immutable');
  }
});

test('copy actions download the staged immutable snapshots, and do nothing without a choice', () => {
  const start = source.indexOf("case 'download-device-copy':");
  const end = source.indexOf("case 'import-all':", start);
  const actions = source.slice(start, end);
  const downloads = [];
  const ctx = {
    C: { clone },
    download: (name, data) => downloads.push({ name, data }),
    dialog: (title, body, actions) => {
      ctx.dialog = { title, body, actions };
    },
  };
  vm.runInNewContext(
    `let stagedCabinet = null; ${offerSrc}
    function click(action) { switch (action) { ${actions} } }
    globalThis.click = click; globalThis.offer = offerCabinetCopies;`,
    ctx,
  );
  ctx.click('download-device-copy');
  ctx.click('download-session-copy');
  assert.equal(downloads.length, 0);
  const device = { format: 'alibi-backup', runs: [{ key: 'a', moves: 9 }] };
  const session = { format: 'alibi-backup', runs: [{ key: 'a', moves: 1 }] };
  ctx.offer(device, session, 'device.json');
  device.runs[0].moves = 100;
  session.runs[0].moves = 100;
  ctx.click('download-device-copy');
  ctx.click('download-session-copy');
  assert.deepEqual(clone(downloads), [
    { name: 'device.json', data: { format: 'alibi-backup', runs: [{ key: 'a', moves: 9 }] } },
    {
      name: 'alibi-cabinet-session.json',
      data: { format: 'alibi-backup', runs: [{ key: 'a', moves: 1 }] },
    },
  ]);
  assert.deepEqual(clone(ctx.dialog.actions.map((a) => a.action)), [
    'download-device-copy',
    'download-session-copy',
    'close-dialog',
  ]);
});

test('regular and combined callers download standard envelopes and offer divergent session copies', async () => {
  for (const divergent of [false, true]) {
    for (const combined of [false, true]) {
      const downloads = [],
        offers = [];
      const data = { format: 'alibi-backup', schemaVersion: 1, runs: [{ key: 'a', moves: 9 }] };
      const session = divergent ? { ...data, runs: [{ key: 'a', moves: 1 }] } : null;
      const ctx = {
        C: { clone },
        cfg: { version: '0.15.1' },
        saveError: '',
        cabinetBackup: async () => ({ data: clone(data), session: clone(session) }),
        download: (name, payload) => downloads.push({ name, payload }),

        toast: () => {},
        dialog: (...args) => offers.push(args),
        AlibiClub: {
          flush: async () => {},
          diagnostics: () => ({ state: { player: 'kept' }, saveError: '' }),
        },
        AlibiActivities: {
          load: async () => {
            throw Error('unavailable');
          },
          loadCastle: async () => {
            throw Error('unavailable');
          },
        },
      };
      const caller = combined ? 'exportAll' : 'exportBackup';
      await vm.runInNewContext(
        `let stagedCabinet = null; ${offerSrc} ${sliceFn('  async function ' + caller + '() {')} ${caller}()`,
        ctx,
      );
      assert.equal(downloads.length, divergent ? 0 : 1);
      assert.equal(offers.length, divergent ? 1 : 0);
      if (divergent) {
        const start = source.indexOf("case 'download-device-copy':");
        const end = source.indexOf("case 'import-all':", start);
        vm.runInNewContext(`switch ('download-device-copy') { ${source.slice(start, end)} }`, ctx);
        vm.runInNewContext(`switch ('download-session-copy') { ${source.slice(start, end)} }`, ctx);
      }
      const payload = clone(downloads[0].payload);
      assert.equal(payload.format, combined ? 'alibi-all-saves' : 'alibi-backup');
      assert.deepEqual(combined ? payload.sections.cabinet : payload, data);
      if (combined) assert.deepEqual(payload.sections.club, { player: 'kept' });
      if (divergent) assert.deepEqual(clone(downloads[1].payload), session);
    }
  }
});

// Exercise the real dialog, action and route hooks together. The DOM stand-in queues
// native close events, as a browser does, so a previous close can arrive after reopen.
function cabinetDialogFixture(onDownload) {
  const listeners = new Map(),
    pendingClose = [],
    downloads = [];
  const focus = () => {};
  const modal = {
    open: false,
    innerHTML: '',
    contains: () => false,
    querySelectorAll: () => [],
    addEventListener: (name, listener) => listeners.set(name, listener),
    showModal() {
      this.open = true;
    },
    close() {
      this.open = false;
      pendingClose.push(() => listeners.get('close')());
    },
  };
  const ctx = {
    C: { clone },
    $: (selector) => (selector === '#dialog' ? modal : { focus }),
    document: {
      activeElement: null,
      documentElement: { dataset: {} },
      getElementById: () => null,
    },
    icon: () => '',
    esc: (value) => value,
    B: (label, action) => `<button data-action="${action}">${label}</button>`,
    download: (name, payload) => {
      if (onDownload) onDownload(name, payload);
      else downloads.push({ name, payload: clone(payload) });
    },
    updateRequested: false,
    restoreBusy: false,
    draftEpoch: 0,
    routeSerial: 0,
    location: { hash: '#/settings' },
    endPaint() {},
    clearTimeout() {},
    noteTimer: null,
    enqueueSave: () => new Promise(() => {}),
  };
  // Anchor at a line start: nested handlers register their own close listeners.
  const closeStart = source.indexOf("\n  $('#dialog').addEventListener('close',") + 1;
  const closeEnd = source.indexOf('  async function loadRoute(', closeStart);
  const routeEnd = source.indexOf("  window.addEventListener('hashchange',", closeEnd);
  assert.ok(closeStart > 0 && routeEnd > closeEnd, 'native dialog and route hooks exist');
  vm.runInNewContext(
    `let stagedCabinet = null, lesson = null, dialogOpener = null, bridgeAnchor = null;
    ${sliceFn('  function closeDialog() {')}
    ${sliceFn('  function dialog(')}
    ${offerSrc}
    ${sliceFn('  async function handleAction(')}
    ${source.slice(closeEnd, routeEnd)}
    ${source.slice(closeStart, closeEnd)}
    globalThis.api = {
      offer: offerCabinetCopies, dialog, close: closeDialog, route: loadRoute,
      click: (action) => handleAction({ dataset: { action } }, {}),
      get staged() { return stagedCabinet; }
    };`,
    ctx,
  );
  return {
    offer: ctx.api.offer,
    api: ctx.api,
    modal,
    downloads,
    flushClose: () => pendingClose.splice(0).forEach((emit) => emit()),
    cancel() {
      let prevented = false;
      listeners.get('cancel')({ preventDefault: () => (prevented = true) });
      if (!prevented) modal.close();
    },
  };
}

function recoveryCopies() {
  const device = { format: 'alibi-backup', runs: [{ key: 'a', moves: 9 }] };
  return { device, session: { ...clone(device), runs: [{ key: 'a', moves: 1 }] } };
}

for (const dismiss of ['close button', 'native Escape', 'native close', 'route invalidation']) {
  test(`Cabinet recovery releases both snapshots on ${dismiss}`, async () => {
    const f = cabinetDialogFixture(),
      { device, session } = recoveryCopies();
    f.offer(device, session, 'device.json');
    assert.ok(f.api.staged);
    assert.match(f.modal.innerHTML, /data-action="download-device-copy"/);
    assert.match(f.modal.innerHTML, /data-action="download-session-copy"/);
    if (dismiss === 'close button') await f.api.click('close-dialog');
    else if (dismiss === 'native Escape') f.cancel();
    else if (dismiss === 'native close') f.modal.close();
    else void f.api.route(); // Its old-save await remains pending after invalidation.
    if (dismiss === 'close button' || dismiss === 'route invalidation')
      assert.equal(f.api.staged, null, 'programmatic dismissal releases before close dispatch');
    f.flushClose();
    assert.equal(f.api.staged, null);
    await f.api.click('download-device-copy');
    await f.api.click('download-session-copy');
    assert.equal(
      f.downloads.length,
      0,
      'dismissed snapshots cannot be downloaded by stale actions',
    );
  });
}

test('both active recovery downloads remain immutable and reusable until another dialog replaces them', async () => {
  const f = cabinetDialogFixture(),
    { device, session } = recoveryCopies();
  f.offer(device, session, 'device.json');
  const staged = f.api.staged;
  device.runs[0].moves = 100;
  session.runs[0].moves = 100;
  for (let n = 0; n < 2; n++) {
    await f.api.click('download-device-copy');
    await f.api.click('download-session-copy');
    assert.equal(f.api.staged, staged, 'a download must not consume either recovery choice');
    assert.equal(f.modal.open, true);
  }
  assert.deepEqual(
    f.downloads.map((d) => [d.name, d.payload.runs[0].moves]),
    [
      ['device.json', 9],
      ['alibi-cabinet-session.json', 1],
      ['device.json', 9],
      ['alibi-cabinet-session.json', 1],
    ],
  );
  f.api.dialog('Another dialog', '<p>Other controls</p>');
  assert.equal(f.api.staged, null);
  await f.api.click('download-device-copy');
  assert.equal(f.downloads.length, 4);
});

test('a delayed native close from the previous dialog preserves newly staged recovery choices', async () => {
  const f = cabinetDialogFixture(),
    { device, session } = recoveryCopies();
  f.offer(device, session, 'old.json');
  f.api.close();
  f.offer(device, session, 'new.json');
  const staged = f.api.staged;
  f.flushClose();
  assert.equal(f.api.staged, staged);
  await f.api.click('download-device-copy');
  await f.api.click('download-session-copy');
  assert.deepEqual(
    f.downloads.map((d) => d.name),
    ['new.json', 'alibi-cabinet-session.json'],
  );
});

test('ordinary exports release a previous recovery and never retain repeated export payloads', async () => {
  const f = cabinetDialogFixture(),
    { device, session } = recoveryCopies();
  f.offer(device, session, 'old.json');
  for (let n = 0; n < 3; n++) {
    const payload = { ...clone(device), sequence: n };
    f.offer(payload, null, `ordinary-${n}.json`);
    assert.equal(f.api.staged, null, 'ordinary download must release a prior recovery clone');
    assert.deepEqual(f.downloads[n], { name: `ordinary-${n}.json`, payload });
  }
  await f.api.click('download-device-copy');
  await f.api.click('download-session-copy');
  assert.equal(f.downloads.length, 3);
});

test('large valid histories serialize both choices and release the staged reference', async (t) => {
  require('../src/core.js');
  require('../src/engines.js');
  const C = require('../src/bridges.js');
  require('../src/backup-validation.js');
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/catalog.json')));
  const device = {
    format: 'alibi-backup',
    schemaVersion: 1,
    settings: {},
    preferences: {},
    packs: [],
    runs: catalog.puzzles.map((puzzle) => {
      const state = C.registry[puzzle.type].initial(puzzle);
      return {
        schemaVersion: 1,
        key: `${puzzle.id}@${puzzle.revision}`,
        rev: 1,
        puzzle: clone(puzzle),
        state: clone(state),
        moves: 200,
        hints: 0,
        elapsed: 600,
        note: 'x'.repeat(5000),
        undo: Array.from({ length: 100 }, () => clone(state)),
        redo: Array.from({ length: 100 }, () => clone(state)),
        updatedAt: '2026-10-19T00:00:00.000Z',
      };
    }),
  };
  const session = clone(device);
  session.runs[0].note = 'session edit';
  const validator = globalThis.AlibiBackupValidation(C, catalog);
  assert.equal(validator.validateBackup(device).runs.length, catalog.puzzles.length);
  assert.equal(validator.validateBackup(session).runs.length, catalog.puzzles.length);

  // Run the actual download serializer without retaining payloads or object URLs.
  // Heap samples are diagnostic, not a machine-dependent performance assertion.
  const samples = [],
    output = [],
    millis = [];
  const sample = () => samples.push(process.memoryUsage().heapUsed);
  const downloadContext = {
    Blob: class extends Blob {
      constructor(parts, options) {
        super(parts, options);
        sample();
      }
    },
    URL: {
      createObjectURL(blob) {
        output.push(blob.size);
        return 'blob:synthetic-export';
      },
      revokeObjectURL() {},
    },
    document: {
      body: { appendChild() {} },
      createElement: () => ({ click() {}, remove() {} }),
    },
    setTimeout: (callback) => callback(),
  };
  vm.runInNewContext(sliceFn('  function download('), downloadContext);
  const f = cabinetDialogFixture((name, payload) => {
    const start = performance.now();
    downloadContext.download(name, payload);
    millis.push(performance.now() - start);
    sample();
  });
  globalThis.gc?.();
  const baseline = process.memoryUsage().heapUsed;
  f.offer(device, session, 'large-device.json');
  sample();
  globalThis.gc?.();
  const staged = process.memoryUsage().heapUsed;
  await f.api.click('download-device-copy');
  await f.api.click('download-session-copy');
  assert.deepEqual(
    output,
    [device, session].map((data) => new Blob([JSON.stringify(data, null, 2)]).size),
  );
  f.api.close();
  f.flushClose();
  assert.equal(f.api.staged, null);
  globalThis.gc?.();
  t.diagnostic(
    JSON.stringify({
      runs: device.runs.length,
      historyStatesPerCopy: device.runs.length * 200,
      serializedBytes: output,
      serializationMs: millis.map((ms) => Math.round(ms)),
      forcedGC: !!globalThis.gc,
      stagedHeapDelta: staged - baseline,
      observedPeakHeapDelta: Math.max(...samples) - baseline,
      closedHeapDelta: process.memoryUsage().heapUsed - baseline,
    }),
  );
});
