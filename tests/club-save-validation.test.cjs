'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
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
