'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { session, fresh } = require('./helpers/club-session.cjs');
require('../src/core.js');
const C = require('../src/engines.js');
require('../src/bridges.js');
const E = require('../src/club-engines.js');
require('../src/backup-validation.js');
const validator = globalThis.AlibiBackupValidation(C, null, () => E, 4);
const make = (key, run) => ({ ...fresh(), runs: { [key]: run } });

for (const [key, count] of [
  ['archive', E.warehouse.maps.length],
  ['regiongardens', E.regionGardens.layouts.length],
]) {
  test(`${key} requires an explicit integer level instead of silently using level zero`, () => {
    const missing = make(key, { log: [], redo: [] });
    const snapshot = structuredClone(missing);
    assert.throws(() => validator.validateSave(missing), /Invalid game history/);
    assert.deepEqual(missing, snapshot);
    const inherited = make(key, Object.assign(Object.create({ level: 0 }), { log: [], redo: [] }));
    assert.throws(() => validator.validateSave(inherited), /Invalid game history/);
  });

  test(`${key} rejects malformed or out-of-range levels without changing the input`, () => {
    for (const level of [undefined, null, false, '0', 0.5, -1, count, NaN, Infinity]) {
      const value = make(key, { level, log: [], redo: [] });
      const snapshot = structuredClone(value);
      assert.throws(() => validator.validateSave(value));
      assert.deepEqual(value, snapshot);
    }
  });

  test(`${key} retains every published level and keeps clones independent`, () => {
    for (let level = 0; level < count; level++) {
      const value = make(key, { level, log: [], redo: [] });
      const accepted = validator.validateSave(value);
      assert.deepEqual(accepted, value);
      accepted.runs[key].log.push('not a real move');
      assert.deepEqual(value.runs[key].log, []);
    }
  });

  test(`${key} malformed saved data is protected at boot rather than overwritten as level zero`, async () => {
    const raw = JSON.stringify({ rev: 1, data: make(key, { log: [], redo: [] }) });
    const tab = await session(fresh(), raw);
    assert.ok(tab.club.diagnostics().saveError);
    assert.equal(tab.storage.get('alibi-afterhours-v1'), raw);
    await assert.rejects(tab.club.validateBackup(make(key, { log: [], redo: [] })));
    assert.equal(tab.storage.get('alibi-afterhours-v1'), raw);
  });
}

test('games without numbered levels remain valid without a level property', () => {
  const value = make('tictactoe', { mode: 'local', log: [], redo: [] });
  assert.deepEqual(validator.validateSave(value), value);
});
