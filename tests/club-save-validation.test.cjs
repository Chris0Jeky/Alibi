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

function validSave(overrides = {}) {
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

function storedClubDatabase(data) {
  const state = { rev: 5, data: structuredClone(data) };
  let closed = false,
    writes = 0;
  const db = {
    close() {
      closed = true;
    },
    transaction() {
      const txListeners = new Map();
      const tx = {
        addEventListener(type, listener) {
          const handlers = txListeners.get(type) || [];
          handlers.push(listener);
          txListeners.set(type, handlers);
        },
        objectStore() {
          return {
            get(key) {
              const request = { result: undefined, onsuccess: null };
              setTimeout(() => {
                request.result = key === 'state' ? structuredClone(state) : undefined;
                request.onsuccess?.();
                setTimeout(() => {
                  for (const listener of txListeners.get('complete') || []) listener();
                  tx.oncomplete?.();
                }, 0);
              }, 0);
              return request;
            },
            put() {
              writes++;
            },
            clear() {
              writes++;
            },
          };
        },
      };
      return tx;
    },
  };
  return {
    api: {
      open() {
        const request = { result: db, onsuccess: null };
        setTimeout(() => request.onsuccess?.(), 0);
        return request;
      },
    },
    get closed() {
      return closed;
    },
    get writes() {
      return writes;
    },
    read() {
      return structuredClone(state);
    },
  };
}

function findUpUpNoOpLevel() {
  for (let level = 0; level < E.warehouse.maps.length; level += 1) {
    const first = E.warehouse.initial(level);
    const afterFirst = E.warehouse.move(first, 'up');
    if (afterFirst === first) continue;
    const afterSecond = E.warehouse.move(afterFirst, 'up');
    if (afterSecond === afterFirst) return level;
  }
  return -1;
}

test('minimal club save validates', () => {
  assert.doesNotThrow(() => validateSave(validSave()));
});

test('Club save rejects the empty runs array that loses subsequent Archive progress', () => {
  const save = JSON.parse(
    '{"schema":1,"settings":{"assist":"off","zen":false,"pinned":null},"visit":0,"lastHero":-1,"runs":[],"records":[],"stamps":[]}',
  );
  assert.throws(() => validateSave(save), /not a supported Club save/);
});

test('a stored empty runs array shows its otherwise valid journal in a protected session', async () => {
  const record = {
      id: 'borough:retained-town',
      type: 'borough',
      label: 'A retained town',
      score: 12,
      date: '2026-10-26T00:00:00.000Z',
    },
    bests = [{ label: 'A retained town', score: 13, date: 'legacy-date' }],
    raw = JSON.stringify({
      rev: 5,
      data: validSave({ runs: [], records: [record], boroughBests: bests }),
    }),
    tab = await session(null, raw, { context: { AlibiAssets: { badge: () => '' } } });

  assert.equal(tab.club.diagnostics().storageMode, 'session');
  assert.match(tab.club.diagnostics().saveError, /read.only/i);
  await tab.club.flush();
  assert.equal(tab.storage.get('alibi-afterhours-v1'), raw);
  assert.deepEqual(tab.state().records, [record]);
  assert.deepEqual(tab.state().boroughBests, bests);
  assert.doesNotThrow(
    () => validateSave(tab.state()),
    'the recovered state can be exported validly',
  );
  await tab.club.onRoute({ page: 'club' });
  assert.match(tab.club.profile(), /A retained town/);
});

test('an IDB empty runs array salvages valid records in a protected session without writing', async () => {
  const record = {
      id: 'borough:retained-town',
      type: 'borough',
      label: 'A retained town',
      score: 12,
      date: '2026-10-26T00:00:00.000Z',
    },
    bests = [{ label: 'A retained town', score: 13, date: 'legacy-date' }],
    data = validSave({ runs: [], records: [record], boroughBests: bests }),
    idb = storedClubDatabase(data),
    tab = await session(data, null, {
      context: { indexedDB: idb.api, AlibiAssets: { badge: () => '' } },
    });

  assert.equal(tab.club.diagnostics().storageMode, 'session');
  assert.match(tab.club.diagnostics().saveError, /read.only/i);
  assert.deepEqual(tab.state().records, [record]);
  assert.deepEqual(tab.state().boroughBests, bests);
  assert.doesNotThrow(
    () => validateSave(tab.state()),
    'the recovered state can be exported validly',
  );
  assert.deepEqual(idb.read().data, data);
  assert.equal(idb.closed, true);
  assert.equal(idb.writes, 0);
});

test('a valid IDB save with only a Duel journal record loads its required engine before validation', async () => {
  const record = {
      id: 'duel:retained-result',
      type: 'duel',
      label: 'Lantern Duel',
      score: 1,
      date: '2026-10-26T00:00:00.000Z',
      difficulty: 'keeper',
    },
    data = validSave({ records: [record] }),
    idb = storedClubDatabase(data);
  let engineLoads = 0;
  const tab = await session(data, null, {
    context: { indexedDB: idb.api },
    beforeInit(context) {
      vm.runInContext('delete globalThis.AlibiClubEngines', context);
      assert.equal(vm.runInContext('typeof globalThis.AlibiClubEngines', context), 'undefined');
      context.ALIBI_CLUB_CONFIG = {
        engineSource: fs.readFileSync(require.resolve('../src/club-engines.js'), 'utf8'),
      };
      context.document.createElement = () => ({ remove() {} });
      context.document.head = {
        append(script) {
          engineLoads++;
          vm.runInContext(script.textContent, context);
        },
      };
    },
  });
  assert.equal(engineLoads, 1);
  assert.equal(tab.club.diagnostics().storageMode, 'indexeddb');
  assert.equal(tab.club.diagnostics().saveError, '');
  assert.deepEqual(tab.state().records, [record]);
  assert.equal(idb.closed, false);
  assert.equal(idb.writes, 1, 'the healthy session can request its normal startup save');
});

test('a named-property empty runs array is not salvaged or changed', async () => {
  const runs = [];
  runs.metadata = 'must be retained';
  const data = validSave({
    runs,
    records: [
      {
        id: 'borough:retained-town',
        type: 'borough',
        label: 'A retained town',
        score: 12,
        date: '2026-10-26T00:00:00.000Z',
      },
    ],
  });
  const idb = storedClubDatabase(data),
    tab = await session(data, null, {
      context: { indexedDB: idb.api, AlibiAssets: { badge: () => '' } },
    });

  assert.equal(tab.club.diagnostics().storageMode, 'session');
  assert.deepEqual(tab.state().records, []);
  assert.equal(idb.read().data.runs.metadata, 'must be retained');
  assert.equal(idb.writes, 0);
});

test('an empty runs array with any other malformed save field is not salvaged', async () => {
  const data = validSave({
      runs: [],
      settings: { assist: 'unknown', zen: false, pinned: null },
      records: [
        {
          id: 'borough:retained-town',
          type: 'borough',
          label: 'A retained town',
          score: 12,
          date: '2026-10-26T00:00:00.000Z',
        },
      ],
    }),
    idb = storedClubDatabase(data),
    tab = await session(data, null, {
      context: { indexedDB: idb.api, AlibiAssets: { badge: () => '' } },
    });

  assert.equal(tab.club.diagnostics().storageMode, 'session');
  assert.deepEqual(tab.state().records, []);
  assert.deepEqual(idb.read().data, data);
  assert.equal(idb.writes, 0);
});

test('Club save rejects structured-clone objects as runs', () => {
  for (const runs of [new Date(0), new Map(), new Set(), /x/]) {
    assert.throws(
      () => validateSave(validSave({ runs })),
      /not a supported Club save/,
      `runs=${Object.prototype.toString.call(runs)} must be rejected`,
    );
  }
  assert.doesNotThrow(() => validateSave(validSave({ runs: Object.create(null) })));
});

test('Club save rejects scalar or missing runs before replacement', () => {
  for (const runs of [true, 1, false, 0, '', 'archive', null, undefined]) {
    assert.throws(
      () => validateSave(validSave({ runs })),
      /not a supported Club save/,
      `runs=${JSON.stringify(runs)} must be rejected`,
    );
  }
});

test('object runs retain a subsequent Archive move across JSON persistence and validation', () => {
  const save = validateSave(validSave());
  save.runs.archive = { level: 0, log: [], redo: [] };
  const before = E.warehouse.initial(0);
  assert.notStrictEqual(E.warehouse.move(before, 'left'), before, 'Archive move succeeds');
  save.runs.archive.log.push('left');
  const reloaded = validateSave(JSON.parse(JSON.stringify(save)));
  assert.deepEqual(reloaded.runs.archive, { level: 0, log: ['left'], redo: [] });
});

test('archive no-op replay is rejected', () => {
  const level = findUpUpNoOpLevel();
  assert.notEqual(level, -1, 'expected a room where a second up stalls');
  const first = E.warehouse.initial(level);
  const afterFirst = E.warehouse.move(first, 'up');
  assert.notStrictEqual(afterFirst, first, 'first up moves');
  assert.strictEqual(
    E.warehouse.move(afterFirst, 'up'),
    afterFirst,
    'second up returns same state',
  );
  assert.throws(
    () => validateSave(validSave({ runs: { archive: { level, log: ['up', 'up'], redo: [] } } })),
    /Invalid archive history/,
  );
});

test('oversized archive log is rejected', () => {
  const log = Array.from({ length: 3001 }, (_, i) => (i % 2 === 0 ? 'left' : 'right'));
  let state = E.warehouse.initial(0);
  for (const direction of log) {
    const next = E.warehouse.move(state, direction);
    assert.notStrictEqual(next, state, 'oversized fixture replays cleanly without stalls');
    state = next;
  }
  assert.throws(
    () => validateSave(validSave({ runs: { archive: { level: 0, log, redo: [] } } })),
    /Invalid game history/,
  );
});

test('oversized records are rejected', () => {
  const records = Array.from({ length: 121 }, (_, i) => ({
    id: `archive:0:${i}`,
    type: 'archive',
    label: 'The receiving room',
    score: 0,
    date: '2026-09-01T00:00:00.000Z',
  }));
  const save = validSave({ records });
  assert.ok(JSON.stringify(save).length <= 400000, 'fixture trips the record-count guard');
  assert.throws(() => validateSave(save), /not a supported Club save/);
});
