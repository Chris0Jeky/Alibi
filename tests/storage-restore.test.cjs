/* Store.restore expected-state conflict and pre-restore recovery in a Node VM.
   Same fake-IDB fixture shape as tests/storage.test.cjs, extended to seed packs
   and meta. Not a real browser IndexedDB atomicity or rollback test. */
'use strict';
const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict'),
  path = require('node:path'),
  test = require('node:test');

function setup() {
  const items = new Map(),
    ls = {
      setItem(k, v) {
        items.set(k, String(v));
      },
      removeItem(k) {
        items.delete(k);
      },
      getItem: (k) => items.get(k) ?? null,
      key: (i) => [...items.keys()][i] ?? null,
      get length() {
        return items.size;
      },
    };
  const ctx = {
    structuredClone,
    Date,
    console,
    localStorage: ls,
    setTimeout,
    clearTimeout,
    Event: class Event {},
    dispatchEvent() {},
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/core.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/storage.js'), 'utf8'), ctx);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '../src/backup-validation.js'), 'utf8'),
    ctx,
  );
  return {
    Store: ctx.AlibiStorage.Store,
    validateBackup: ctx.AlibiBackupValidation(ctx.AlibiCore, { puzzles: [] }).validateBackup,
    C: ctx.AlibiCore,
    validateRun: ctx.AlibiBackupValidation(ctx.AlibiCore, { puzzles: [] }).validateRun,
  };
}

function restoreFixture(seed) {
  const disk = {
    runs: new Map(Object.entries(seed.runs || {})),
    packs: new Map(Object.entries(seed.packs || {})),
    meta: new Map(Object.entries(seed.meta || {})),
  };
  // One transaction object per transaction() call, unlike the shared one in
  // tests/storage.test.cjs: export() runs several transactions first, and their
  // late completion timers must not complete the restore transaction.
  const transaction = () => {
    let aborted = false;
    const request = (result) => {
      const pending = { result, onsuccess: null, onerror: null };
      setTimeout(() => {
        if (!aborted && pending.onsuccess) pending.onsuccess();
      }, 0);
      return pending;
    };
    const tx = {
      oncomplete: null,
      onerror: null,
      onabort: null,
      listeners: { complete: [], error: [], abort: [] },
      addEventListener(ev, fn) {
        this.listeners[ev].push(fn);
      },
      abort() {
        aborted = true;
        setTimeout(() => {
          for (const f of this.listeners.abort)
            try {
              f();
            } catch {}
          if (this.onabort) this.onabort();
        }, 0);
      },
      objectStore(name) {
        const table = disk[name];
        return {
          get(key) {
            return request(
              table.has(key) ? { key, value: structuredClone(table.get(key)) } : undefined,
            );
          },
          getAll() {
            return request(
              [...table.entries()].map(([key, value]) => ({
                key,
                value: structuredClone(value),
              })),
            );
          },
          put(entry) {
            table.set(entry.key, structuredClone(entry.value));
          },
          clear() {
            table.clear();
          },
        };
      },
    };
    setTimeout(() => {
      if (aborted) return;
      for (const f of tx.listeners.complete)
        try {
          f();
        } catch {}
      if (tx.oncomplete) tx.oncomplete();
    }, 20);
    return tx;
  };
  return { disk, db: { transaction } };
}

function seedData() {
  return {
    runs: { 'scene-01@1': { key: 'scene-01@1', rev: 1 } },
    packs: { p1: { id: 'p1' } },
    meta: { settings: { sound: true }, preferences: { seen: ['scene'] } },
  };
}

function validBackup() {
  return {
    format: 'alibi-backup',
    schemaVersion: 1,
    runs: [{ key: 'scene-02@1', rev: 3 }],
    packs: [{ id: 'p2' }],
    settings: { sound: false },
    preferences: { seen: [] },
  };
}

async function seededStore(seed) {
  const { Store } = setup(),
    store = await new Store().init(),
    fixture = restoreFixture(seed);
  store.db = fixture.db;
  return { store, disk: fixture.disk };
}

function snap(disk) {
  return JSON.stringify({
    runs: [...disk.runs.entries()],
    packs: [...disk.packs.entries()],
    meta: [...disk.meta.entries()],
  });
}

// Values cross the vm boundary, so compare JSON-roundtripped copies: prototypes differ.
const plain = (value) => JSON.parse(JSON.stringify(value));

test('stale expected rejects with ConflictError and changes nothing', async () => {
  const { store, disk } = await seededStore(seedData()),
    expected = await store.export();
  disk.runs.set('other@1', { key: 'other@1', rev: 1 });
  const before = snap(disk);
  await assert.rejects(store.restore(validBackup(), expected), (e) => e.name === 'ConflictError');
  assert.equal(snap(disk), before);
  assert.equal(disk.meta.has('pre-restore-backup'), false);
  assert.deepEqual(plain(disk.runs.get('other@1')), { key: 'other@1', rev: 1 });
});

test('fresh expected replaces data and keeps pre-restore recovery', async () => {
  const { store, disk } = await seededStore(seedData()),
    expected = await store.export();
  await store.restore(validBackup(), expected);
  assert.deepEqual([...disk.runs.keys()], ['scene-02@1']);
  assert.deepEqual(plain(disk.runs.get('scene-02@1')), { key: 'scene-02@1', rev: 4 });
  assert.deepEqual([...disk.packs.keys()], ['p2']);
  assert.deepEqual(plain(disk.packs.get('p2')), { id: 'p2' });
  assert.deepEqual(plain(disk.meta.get('settings')), { sound: false });
  assert.deepEqual(plain(disk.meta.get('preferences')), { seen: [] });
  const recovery = plain(disk.meta.get('pre-restore-backup'));
  assert.equal(recovery.format, 'alibi-backup');
  assert.equal(recovery.schemaVersion, 1);
  assert.deepEqual(recovery.runs, [{ key: 'scene-01@1', rev: 1 }]);
  assert.deepEqual(recovery.packs, [{ id: 'p1' }]);
  assert.deepEqual(recovery.settings, { sound: true });
  assert.deepEqual(recovery.preferences, { seen: ['scene'] });
});

test('restore without expected still writes pre-restore recovery', async () => {
  const { store, disk } = await seededStore(seedData());
  await store.restore(validBackup());
  assert.deepEqual(plain(disk.meta.get('pre-restore-backup')).runs, [
    { key: 'scene-01@1', rev: 1 },
  ]);
});

const withoutRev = (runs) => runs.map(({ rev, ...run }) => run);

function unfinishedDraft() {
  const puzzle = structuredClone(
    require('../content/catalog.json').puzzles.find((p) => p.type === 'scene'),
  );
  puzzle.title = '';
  puzzle.clues = [];
  puzzle.objects = [];
  puzzle.rooms.fill(0);
  return { puzzle };
}

test('export and validated import into a fresh store preserve an unfinished workshop draft', async () => {
  const draft = unfinishedDraft();
  const source = await seededStore({ meta: { 'workshop-draft': draft } });
  const target = await seededStore({});
  const exported = JSON.parse(JSON.stringify(await source.store.export()));
  const backup = setup().validateBackup(exported);
  await target.store.restore(backup);
  assert.deepEqual(plain((await target.store.get('meta', 'workshop-draft')) ?? null), draft);
  assert.deepEqual(exported.workshopDraft, draft);
  assert.equal(exported.schemaVersion, 1);
});

test('an old backup without a draft imports and preserves any existing local draft', async () => {
  for (const draft of [undefined, unfinishedDraft()]) {
    const { store, disk } = await seededStore({
      meta: draft ? { 'workshop-draft': draft } : {},
    });
    const backup = setup().validateBackup({ ...validBackup(), runs: [], packs: [] });
    await store.restore(backup);
    assert.deepEqual(disk.meta.get('workshop-draft'), draft);
    const recovery = disk.meta.get('pre-restore-backup');
    assert.deepEqual(recovery.workshopDraft, draft);
  }
});

test('a different incoming draft keeps the local draft and restores other data with a recovery note', async () => {
  const draft = unfinishedDraft();
  const { store, disk } = await seededStore({
    ...seedData(),
    meta: { ...seedData().meta, 'workshop-draft': draft },
  });
  const expected = await store.export();
  const incoming = unfinishedDraft();
  incoming.puzzle.title = 'Different unfinished work';
  const result = await store.restore({ ...validBackup(), workshopDraft: incoming }, expected);
  assert.deepEqual(disk.meta.get('workshop-draft'), draft);
  // Restore advances each run's save revision (#741); progress is exact.
  assert.deepEqual(withoutRev([...disk.runs.values()]), withoutRev(validBackup().runs));
  assert.deepEqual([...disk.packs.values()], validBackup().packs);
  assert.deepEqual(disk.meta.get('settings'), validBackup().settings);
  assert.deepEqual(disk.meta.get('preferences'), validBackup().preferences);
  const recovery = disk.meta.get('pre-restore-backup');
  assert.deepEqual(recovery.workshopDraft, draft);
  assert.deepEqual(recovery.unappliedWorkshopDraft, incoming);
  assert.deepEqual(recovery.runs, Object.values(seedData().runs));
  assert.deepEqual(recovery.packs, Object.values(seedData().packs));
  assert.deepEqual(recovery.settings, seedData().meta.settings);
  assert.deepEqual(recovery.preferences, seedData().meta.preferences);
  assert.match(result.note, /workshop draft.*not applied.*recovery copy/i);
});

test('replace also restores other data when workshop drafts differ', async () => {
  const local = unfinishedDraft();
  const incoming = unfinishedDraft();
  incoming.puzzle.title = 'Backup draft';
  const { store, disk } = await seededStore({ meta: { 'workshop-draft': local } });
  const result = await store.restore({ ...validBackup(), workshopDraft: incoming });
  assert.deepEqual(disk.meta.get('workshop-draft'), local);
  // Restore advances each run's save revision (#741); progress is exact.
  assert.deepEqual(withoutRev([...disk.runs.values()]), withoutRev(validBackup().runs));
  assert.deepEqual(disk.meta.get('pre-restore-backup').unappliedWorkshopDraft, incoming);
  assert.match(result.note, /recovery copy/i);
});

test('export omits invalid stored drafts, records damage and remains importable', async () => {
  for (const damaged of [null, {}, [], { puzzle: { type: 'scene' } }]) {
    const { store, disk } = await seededStore({ meta: { 'workshop-draft': damaged } });
    const exported = plain(await store.export());
    assert.equal(Object.hasOwn(exported, 'workshopDraft'), false);
    assert.deepEqual(exported.damaged.meta, ['workshop-draft']);
    assert.deepEqual(plain(store.damaged.meta), ['workshop-draft']);
    const validated = setup().validateBackup(exported);
    assert.equal(Object.hasOwn(validated, 'workshopDraft'), false);
    const target = await seededStore({});
    await target.store.restore(validated);
    assert.equal(target.disk.meta.has('workshop-draft'), false);
    assert.deepEqual(disk.meta.get('workshop-draft'), damaged, 'export preserves damaged bytes');
  }
});

test('a damaged local draft yields to a valid backup draft and stays importable in recovery', async () => {
  const damaged = { puzzle: { type: 'scene' } };
  const incoming = unfinishedDraft();
  const { store, disk } = await seededStore({ meta: { 'workshop-draft': damaged } });
  const expected = await store.export();
  const result = await store.restore(
    { ...validBackup(), runs: [], packs: [], workshopDraft: incoming },
    { ...expected, workshopDraft: damaged },
  );
  assert.deepEqual(disk.meta.get('workshop-draft'), incoming);
  const recovery = plain(disk.meta.get('pre-restore-backup'));
  assert.equal(Object.hasOwn(recovery, 'workshopDraft'), false);
  assert.deepEqual(recovery.damagedWorkshopDraft, damaged);
  assert.deepEqual(recovery.damaged.meta, ['workshop-draft']);
  assert.equal(Object.hasOwn(setup().validateBackup(recovery), 'workshopDraft'), false);
  assert.match(result.note, /damaged.*workshop draft.*recovery copy/i);
});

test('a damaged local draft with no backup draft is untouched and recovery stays importable', async () => {
  const damaged = { puzzle: { type: 'scene' } };
  const { store, disk } = await seededStore({ meta: { 'workshop-draft': damaged } });
  const result = await store.restore({ ...validBackup(), runs: [], packs: [] });
  assert.deepEqual(disk.meta.get('workshop-draft'), damaged);
  const recovery = plain(disk.meta.get('pre-restore-backup'));
  assert.deepEqual(recovery.damagedWorkshopDraft, damaged);
  assert.deepEqual(recovery.damaged.meta, ['workshop-draft']);
  setup().validateBackup(recovery);
  assert.equal(result.note, '');
});

test('an identical local draft is retained and included in pre-restore recovery', async () => {
  const draft = unfinishedDraft();
  const { store, disk } = await seededStore({ meta: { 'workshop-draft': draft } });
  await store.restore({ ...validBackup(), workshopDraft: structuredClone(draft) });
  assert.deepEqual(disk.meta.get('workshop-draft'), draft);
  assert.deepEqual(disk.meta.get('pre-restore-backup').workshopDraft, draft);
});

test('a draft changed after the merge snapshot refuses restore even for an old backup', async () => {
  const { store, disk } = await seededStore({});
  const expected = await store.export();
  disk.meta.set('workshop-draft', unfinishedDraft());
  const before = snap(disk);
  await assert.rejects(store.restore(validBackup(), expected), (e) => e.name === 'ConflictError');
  assert.equal(snap(disk), before);
});
function writerFixture(rev = 7) {
  const { Store, C, validateRun } = setup();
  const puzzle = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../content/catalog.json'), 'utf8'),
  ).puzzles.find((p) => p.id === 'sudoku-01');
  const original = {
    schemaVersion: 1,
    key: 'sudoku-01@1',
    rev,
    puzzle,
    state: C.registry.sudoku.initial(puzzle),
    moves: 0,
    hints: 0,
    elapsed: 0,
    note: 'original content',
    undo: [],
    redo: [],
    updatedAt: '2026-10-22T00:00:00.000Z',
  };
  validateRun(original);
  const { disk, db } = restoreFixture({ runs: { [original.key]: original } });
  const tabA = new Store(),
    tabB = new Store();
  for (const tab of [tabA, tabB]) {
    tab.db = db;
    tab.mode = 'indexeddb';
    tab.validateRun = validateRun;
  }
  // Separate Store instances share only the disk; no BroadcastChannel is available.
  return { tabA, tabB, disk, original };
}

for (const importedRev of [7, 2, 12]) {
  test(`restore revision ${importedRev} invalidates a tab holding sudoku-01@1 revision 7`, async () => {
    const { tabA, tabB, disk, original } = writerFixture();
    const stale = await tabB.get('runs', original.key);
    const imported = { ...structuredClone(original), rev: importedRev, note: 'restored content' };
    const backup = { ...validBackup(), runs: [imported] };
    const input = structuredClone(backup);
    await tabA.restore(backup, await tabA.export());
    assert.equal((await tabA.get('runs', original.key)).note, 'restored content');
    stale.note = 'stale tab writes';
    await assert.rejects(tabB.saveRun(stale, 7), { name: 'ConflictError' });
    const restored = await tabA.get('runs', original.key);
    assert.deepEqual(plain(restored), {
      ...imported,
      rev: Math.max(7, importedRev) + 1,
    });
    assert.deepEqual(backup, input, 'restore does not mutate the imported backup');
    assert.deepEqual(plain(disk.meta.get('pre-restore-backup')).runs, [plain(original)]);
    const saved = await tabB.saveRun({ ...restored, note: 'fresh tab writes' }, restored.rev);
    assert.equal(saved.rev, restored.rev + 1);
    assert.equal((await tabA.get('runs', original.key)).note, 'fresh tab writes');
  });
}

test('restoring a new revision-zero run invalidates an unsaved tab', async () => {
  const { tabA, tabB, disk, original } = writerFixture(0);
  disk.runs.delete(original.key);
  const stale = structuredClone(original);
  const backup = { ...validBackup(), runs: [{ ...original, note: 'restored content' }] };
  await tabA.restore(backup);
  await assert.rejects(tabB.saveRun({ ...stale, note: 'stale tab writes' }, 0), {
    name: 'ConflictError',
  });
  assert.equal((await tabA.get('runs', original.key)).note, 'restored content');
  assert.equal((await tabA.get('runs', original.key)).rev, 1);
  assert.deepEqual(plain(disk.meta.get('pre-restore-backup')).runs, []);
});

test('repeated restores cannot revive an earlier writer revision', async () => {
  const { tabA, tabB, disk, original } = writerFixture();
  const backup = { ...validBackup(), runs: [{ ...original, note: 'restored content' }] };
  await tabA.restore(backup);
  const stale = await tabB.get('runs', original.key);
  await tabA.restore(backup);
  await assert.rejects(tabB.saveRun({ ...stale, note: 'stale tab writes' }, stale.rev), {
    name: 'ConflictError',
  });
  assert.equal((await tabA.get('runs', original.key)).rev, 9);
  assert.deepEqual(plain(disk.meta.get('pre-restore-backup')).runs, [plain(stale)]);
});

for (const damaged of ['x', null, -1, 1.5]) {
  test(`replace restore repairs a damaged current revision (${damaged})`, async () => {
    const { tabA, disk, original } = writerFixture();
    disk.runs.set(original.key, { ...disk.runs.get(original.key), rev: damaged });
    const backup = {
      ...validBackup(),
      runs: [{ ...original, rev: 7, note: 'restored content' }],
    };
    await tabA.restore(backup);
    const restored = await tabA.get('runs', original.key);
    assert.equal(restored.note, 'restored content');
    assert.equal(restored.rev, 8);
  });
}

for (const [currentRev, importedRev] of [
  [Number.MAX_SAFE_INTEGER, 7],
  [7, Number.MAX_SAFE_INTEGER],
]) {
  test(`restore refuses revision overflow (${currentRev}, ${importedRev}) before changing data`, async () => {
    const { tabA, disk, original } = writerFixture(currentRev);
    const backup = {
      ...validBackup(),
      runs: [{ ...original, rev: importedRev, note: 'restored content' }],
    };
    const before = snap(disk);
    await assert.rejects(tabA.restore(backup), /Revision limit/);
    assert.equal(snap(disk), before, 'runs, packs, settings and recovery remain untouched');
  });
}
