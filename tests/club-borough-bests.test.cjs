'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { session } = require('./helpers/club-session.cjs');
require('../src/core.js');
const C = require('../src/engines.js');
require('../src/backup-validation.js');
const E = require('../src/club-engines.js');
const validateSave = AlibiBackupValidation(C, null, () => E, 4).validateSave;
const text = fs.readFileSync(require.resolve('../src/club.js'), 'utf8');
const between = (from, to) => text.slice(text.indexOf(from), text.indexOf(to));
const bestSource = text.includes('function boroughBestTable(')
  ? between('function boroughBestTable(', 'function archivePage(')
  : '';

function fixture(initial = {}) {
  let now = Date.parse('2026-10-25T12:00:00.000Z');
  class ClockDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
      if (!args.length) now += 1000;
    }
  }
  const state = {
    schema: 1,
    settings: { assist: 'off', zen: false, pinned: null },
    visit: 0,
    lastHero: -1,
    runs: {},
    records: [],
    stamps: [],
    ...initial,
  };
  const context = vm.createContext({ E: () => E, state, Date: ClockDate, saves: 0 });
  vm.runInContext(
    bestSource +
      between('function record(', 'function profile(') +
      '\nfunction save() { saves++; }\nthis.record = record; this.boroughBestTable = boroughBestTable;',
    context,
  );
  return context;
}

function finishTown(seed, strategy) {
  let s = E.borough.initial(seed);
  while (!s.done) {
    const move = strategy(s);
    s = E.borough.move(s, move.slot, move.cell);
  }
  return s;
}

function completeTown(f, town) {
  f.state.runs.borough = { seed: town.seed, log: town.log, redo: [] };
  f.record('borough', town);
}

function saveFixture(overrides = {}) {
  return {
    schema: 1,
    settings: { assist: 'off', zen: false, pinned: null },
    visit: 0,
    lastHero: -1,
    runs: {},
    records: [],
    stamps: [],
    ...overrides,
  };
}

function memoryIndexedDB(data) {
  const values = new Map([['state', { rev: 1, data: structuredClone(data) }]]);
  let opened = false;
  const db = {
    createObjectStore() {},
    transaction() {
      const listeners = new Map(),
        pending = [];
      let aborted = false,
        completed = false;
      const tx = {
        error: null,
        oncomplete: null,
        onabort: null,
        addEventListener(type, listener) {
          const list = listeners.get(type) || [];
          list.push(listener);
          listeners.set(type, list);
        },
        abort() {
          aborted = true;
          setTimeout(() => {
            tx.onabort?.();
            for (const fn of listeners.get('abort') || []) fn();
          }, 0);
        },
        objectStore() {
          return {
            get(key) {
              const request = { result: undefined, onsuccess: null, onerror: null };
              setTimeout(() => {
                request.result = values.get(key);
                request.onsuccess?.();
                setTimeout(() => {
                  if (aborted || completed) return;
                  completed = true;
                  for (const [writeKey, value] of pending) values.set(writeKey, value);
                  tx.oncomplete?.();
                  for (const fn of listeners.get('complete') || []) fn();
                }, 0);
              }, 0);
              return request;
            },
            put(value, key) {
              pending.push([key, structuredClone(value)]);
            },
          };
        },
      };
      return tx;
    },
    close() {},
  };
  const api = {
    open() {
      const request = { result: db, onupgradeneeded: null, onsuccess: null, onerror: null };
      setTimeout(() => {
        if (!opened) {
          opened = true;
          request.onupgradeneeded?.();
        }
        request.onsuccess?.();
      }, 0);
      return request;
    },
  };
  return { api, values };
}

test('Pocket Borough keeps the highest completed score for each exact seed label', () => {
  const f = fixture();
  const first = finishTown('best-1', (s) => ({ slot: 2, cell: s.board.findLastIndex((x) => !x) }));
  const better = finishTown('BEST-1', (s) => ({ slot: 0, cell: s.board.findIndex((x) => !x) }));
  const worse = finishTown('Best-1', (s) => ({
    slot: s.turn % 3,
    cell: s.board
      .map((x, i) => (x ? null : i))
      .filter((x) => x !== null)
      .sort((x, y) => Math.abs(x - 12) - Math.abs(y - 12))[0],
  }));
  const firstScore = E.borough.score(first),
    betterScore = E.borough.score(better),
    worseScore = E.borough.score(worse);
  assert.ok(firstScore < betterScore, 'the fixture contains a genuine improvement');
  assert.ok(worseScore < betterScore, 'the later result is worse');

  completeTown(f, first);
  completeTown(f, better);
  const betterDate = f.state.records.find((r) => r.score === betterScore).date;
  completeTown(f, worse);

  assert.deepEqual(JSON.parse(JSON.stringify(f.state.boroughBests)), [
    { label: 'BEST-1', score: betterScore, date: betterDate },
  ]);
  for (let i = 0; i < 100; i++) {
    f.state.runs.tictactoe = { mode: 'local', log: [i, i + 100], redo: [] };
    f.record('tictactoe', { done: true, winner: 1 });
  }
  assert.equal(f.state.records.length, 100);
  assert.ok(!f.state.records.some((r) => r.type === 'borough'), 'the journal prunes town rows');
  assert.deepEqual(JSON.parse(JSON.stringify(f.state.boroughBests)), [
    { label: 'BEST-1', score: betterScore, date: betterDate },
  ]);
  assert.deepEqual(
    JSON.parse(JSON.stringify(validateSave({ ...f.state, runs: {} }))).boroughBests,
    [{ label: 'BEST-1', score: betterScore, date: betterDate }],
  );
});

test('legacy retained Borough rows seed bests before journal pruning', () => {
  const legacy = saveFixture({
    records: [
      {
        id: 'borough:old-town:a',
        type: 'borough',
        label: 'Old-Town',
        score: 61,
        date: '2026-10-01',
      },
    ],
  });
  const tab = fixture(legacy);
  const later = finishTown('LATER', (s) => ({ slot: 0, cell: s.board.findIndex((x) => !x) }));
  tab.state.runs.borough = { seed: later.seed, log: later.log, redo: [] };
  tab.record('borough', later);

  assert.deepEqual(
    JSON.parse(JSON.stringify(tab.state.boroughBests)),
    [
      { label: 'Old-Town', score: 61, date: '2026-10-01' },
      {
        label: 'LATER',
        score: E.borough.score(later),
        date: tab.state.records[0].date,
      },
    ].sort((a, b) => b.score - a.score || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0)),
  );
});

test('migration preserves every legacy-accepted Borough label, score and bounded raw date', () => {
  const records = [
    {
      id: 'legacy-a',
      type: 'borough',
      label: '<Town & River>',
      score: 601.25,
      date: 'old-format-z',
    },
    {
      id: 'legacy-b',
      type: 'borough',
      label: '<Town & River>',
      score: 601.25,
      date: 'old-format-a',
    },
    {
      id: 'legacy-c',
      type: 'borough',
      label: '<Town & River>',
      score: -4.5,
      date: 'another unparsed date',
    },
    { id: 'legacy-d', type: 'borough', label: '<town & river>', score: -1.25, date: '?' },
    { id: 'legacy-e', type: 'borough', label: '', score: -8, date: '' },
  ];
  assert.doesNotThrow(() => validateSave(saveFixture({ records })));

  const table = fixture().boroughBestTable(records, []);
  assert.deepEqual(JSON.parse(JSON.stringify(table)), [
    { label: '<Town & River>', score: 601.25, date: 'old-format-a' },
    { label: '<town & river>', score: -1.25, date: '?' },
    { label: '', score: -8, date: '' },
  ]);
});

test('the table keeps only the 100 highest distinct seeds with stable score ties', () => {
  const values = Array.from({ length: 100 }, (_, i) => ({
    label: `OLD-${String(i).padStart(3, '0')}`,
    score: i + 1,
    date: '2026-10-01',
  }));
  assert.equal(validateSave(saveFixture({ boroughBests: values })).boroughBests.length, 100);
  const f = fixture({ boroughBests: values });
  const candidate = finishTown('NEW-SEED', (s) => ({
    slot: 0,
    cell: s.board.findIndex((x) => !x),
  }));
  const candidateScore = E.borough.score(candidate);
  assert.ok(candidateScore > 1 && candidateScore < 100);
  completeTown(f, candidate);
  assert.equal(f.state.boroughBests.length, 100);
  assert.ok(!f.state.boroughBests.some((r) => r.label === 'OLD-000'));
  assert.equal(f.state.boroughBests[0].score, 100);

  const tied = Array.from({ length: 101 }, (_, i) => ({
    label: `TIE-${String(100 - i).padStart(3, '0')}`,
    score: 75,
    date: '2026-10-01',
  }));
  const sorted = fixture().boroughBestTable([], tied);
  assert.equal(sorted.length, 100);
  assert.deepEqual(JSON.parse(JSON.stringify(sorted.slice(0, 3).map((r) => r.label))), [
    'TIE-000',
    'TIE-001',
    'TIE-002',
  ]);
  assert.ok(!sorted.some((r) => r.label === 'TIE-100'));
});

test('legacy save startup migrates retained rows and reload preserves the table after journal loss', async () => {
  const legacy = saveFixture({
    records: [
      {
        id: 'borough:legacy:a',
        type: 'borough',
        label: 'legacy-01',
        score: 47,
        date: '2026-10-02T00:00:00.000Z',
      },
    ],
  });
  const first = await session(legacy);
  assert.deepEqual(first.state().boroughBests, [
    { label: 'legacy-01', score: 47, date: '2026-10-02T00:00:00.000Z' },
  ]);
  const saved = JSON.parse(first.storage.get('alibi-afterhours-v1'));
  saved.data.records = [];
  const reloaded = await session(saveFixture(), JSON.stringify(saved));
  assert.deepEqual(reloaded.state().boroughBests, first.state().boroughBests);
  assert.equal(reloaded.state().records.length, 0);
});

test('legacy imported rows are prepared as bests before restore confirmation', async () => {
  const legacy = saveFixture({
    records: [
      {
        id: 'borough:imported:a',
        type: 'borough',
        label: 'import-1',
        score: 52,
        date: '2026-10-03T00:00:00.000Z',
      },
    ],
  });
  const tab = await session(saveFixture(), null, {
    context: { AlibiValidateImport: async ({ value }) => validateSave(value) },
  });
  await tab.club.reviewBackup(legacy);
  assert.deepEqual(JSON.parse(JSON.stringify(tab.context.__alibiPendingClub.boroughBests)), [
    { label: 'import-1', score: 52, date: '2026-10-03T00:00:00.000Z' },
  ]);
  assert.deepEqual(
    legacy,
    saveFixture({
      records: [
        {
          id: 'borough:imported:a',
          type: 'borough',
          label: 'import-1',
          score: 52,
          date: '2026-10-03T00:00:00.000Z',
        },
      ],
    }),
    'review does not mutate the imported legacy payload',
  );
});

test('confirmed legacy Borough import persists and reloads its derived best table', async () => {
  const imported = saveFixture({
    records: [
      {
        id: 'borough:imported:a',
        type: 'borough',
        label: 'import-1',
        score: 52,
        date: '2026-10-03T00:00:00.000Z',
      },
    ],
  });
  const indexedDB = memoryIndexedDB(saveFixture());
  const context = {
    indexedDB: indexedDB.api,
    AlibiValidateImport: async ({ value }) => validateSave(value),
  };
  const tab = await session(saveFixture(), null, { context });
  await tab.club.reviewBackup(imported);
  await tab.club.action({ dataset: { action: 'club-restore-confirm' } });
  await tab.club.flush();
  assert.deepEqual(indexedDB.values.get('state').data.boroughBests, [
    { label: 'import-1', score: 52, date: '2026-10-03T00:00:00.000Z' },
  ]);

  const reloaded = await session(saveFixture(), null, { context });
  assert.deepEqual(reloaded.state().boroughBests, [
    { label: 'import-1', score: 52, date: '2026-10-03T00:00:00.000Z' },
  ]);
});

test('profile explains the bounded local table and reads bests outside the journal', async () => {
  const tab = await session(
    saveFixture({
      boroughBests: [{ label: 'PROFILE-1', score: 88, date: '2026-10-05T00:00:00.000Z' }],
      records: [],
    }),
    null,
    { context: { AlibiAssets: { badge: () => '' } } },
  );
  const html = tab.club.profile();
  assert.match(html, /town records in journal/);
  assert.match(html, /Keep up to 100 personal bests, one per seed label/);
  assert.match(html, /Town planner[\s\S]*?COLLECTED/);
  assert.match(html, /<strong>PROFILE-1<\/strong><span>88 points<\/span>/);
});

test('Club saves bound best entries while preserving legacy values and unknown fields', () => {
  const best = { label: 'Town one', score: 89, date: 'not an ISO date' };
  const legacy = saveFixture({ futureClubField: { value: 3 } });
  assert.deepEqual(validateSave(legacy), legacy);
  assert.equal(
    validateSave(saveFixture({ boroughBests: [{ ...best, score: Number.MAX_VALUE }] }))
      .boroughBests[0].score,
    Number.MAX_VALUE,
  );
  assert.equal(
    validateSave(
      saveFixture({ boroughBests: [best, { label: 'town one', score: -1.25, date: 'x' }] }),
    ).boroughBests.length,
    2,
  );
  const saved = saveFixture({ boroughBests: [best], futureClubField: { value: 3 } });
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(saved))), saved);

  const invalid = [
    'not-an-array',
    Array.from({ length: 101 }, (_, i) => ({ ...best, label: `TOWN-${i}` })),
    [best, best],
    [{ ...best, label: 'x'.repeat(101) }],
    [{ ...best, label: 42 }],
    [{ ...best, score: NaN }],
    [{ ...best, score: Infinity }],
    [{ ...best, date: 'x'.repeat(41) }],
    [{ ...best, extra: 'unexpected field' }],
  ];
  for (const boroughBests of invalid) {
    const value = saveFixture({ boroughBests });
    const snapshot = structuredClone(value);
    assert.throws(() => validateSave(value), /Invalid Borough personal bests/);
    assert.deepEqual(value, snapshot, 'invalid imports leave their input unchanged');
  }
});
