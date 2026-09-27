'use strict';
// Archive Heist plays the 24 curated vaults as rooms 10-33 after the nine ordinary rooms.
const assert = require('node:assert/strict'),
  crypto = require('node:crypto');
const { test } = require('node:test');
require('../src/core.js');
const C = require('../src/engines.js');
require('../src/backup-validation.js');
const E = require('../src/club-engines.js'),
  W = E.warehouse,
  vaults = require('../content/challenges/archive-vaults.json').challenges;
const DIRECTIONS = { U: 'up', D: 'down', L: 'left', R: 'right' };
const steps = (path) => [...path].map((ch) => DIRECTIONS[ch.toUpperCase()]);
// Winning replays of the nine ordinary rooms, as played through the D-pad in browser_club.py.
const ROOM_PATHS = [
  'RRULL',
  'RUDLLU',
  'RUU',
  'UUDRDRUULUL',
  'RRRUUDLLDLUU',
  'UUDDLUDLUURRRDRU',
  'UULUURRDDDUULULDDD',
  'DDDLLLDLLDRRULULURRRRDRU',
  'RRRRRULLULDULURUULLDRRRRR',
];
const validator = AlibiBackupValidation(C, null, () => E, 4);
const save = (archive, records = []) => ({
  schema: 1,
  settings: { assist: 'off', zen: false, pinned: null },
  visit: 1,
  lastHero: -1,
  runs: { archive },
  records,
  stamps: [],
});
function replay(level, path) {
  let s = W.initial(level);
  for (const direction of steps(path)) {
    const before = JSON.stringify(s),
      next = W.move(s, direction);
    assert.notStrictEqual(next, s, `room ${level + 1} accepts every recorded step`);
    assert.equal(JSON.stringify(s), before, 'moves never mutate their input');
    s = next;
  }
  return s;
}

test('the nine ordinary rooms keep their exact maps, names and indices', () => {
  assert.equal(W.maps.length, 33);
  assert.equal(
    crypto
      .createHash('sha256')
      .update(JSON.stringify(W.maps.slice(0, 9)))
      .digest('hex'),
    '4b7b286e1a9a0c762c024d1ab31cceeb06d3794305956ca08c7e7e5963791218',
    'rooms 01-09 are byte-identical to the 0.14.1 release',
  );
  assert.equal(W.maps[0].name, 'The receiving room');
  assert.equal(W.maps[8].name, 'The sealed folio');
});

test('rooms 10-33 are the curated vault maps, in content order', () => {
  assert.equal(vaults.length, 24);
  assert.deepEqual(
    W.maps.slice(9).map((room) => room.map),
    vaults.map((vault) => vault.map),
    'content/challenges/archive-vaults.json stays the single source of the vault maps',
  );
  vaults.forEach((vault, i) => {
    const room = W.maps[9 + i],
      crates = vault.map.join('').replace(/[^$*]/g, '').length;
    assert.equal(room.name, vault.title);
    assert.equal(
      room.subtitle,
      `${vault.difficulty} vault · ${['three', 'four'][crates - 3]} crates. Plan before you push.`,
    );
    assert.equal(W.initial(9 + i).level, 9 + i);
  });
});

test('every vault solution replays to completion through the production reducer', () => {
  vaults.forEach((vault, i) => {
    const s = replay(9 + i, vault.solutionPath);
    assert.equal(s.done, true, vault.id);
    assert.equal(s.pushes, vault.verification.minimumPushes, vault.id);
    assert.equal(s.moves, vault.verification.referenceWalkingMoves, vault.id);
  });
});

test('old saves and journal records for rooms 01-09 still validate and replay', () => {
  ROOM_PATHS.forEach((path, level) => {
    assert.equal(replay(level, path).done, true, `room ${level + 1} replay still completes`);
    const log = steps(path),
      split = Math.floor(log.length / 2),
      record = {
        id: `archive:${level}:${E.hash(JSON.stringify(log))}`,
        type: 'archive',
        label: W.maps[level].name,
        score: replay(level, path).pushes,
        date: '2026-09-01T00:00:00.000Z',
      };
    validator.validateSave(save({ level, log, redo: [] }, [record]));
    validator.validateSave(
      save({ level, log: log.slice(0, split), redo: log.slice(split).reverse() }),
    );
  });
});

test('backups accept vault rooms 10-33 and reject rooms outside the set', () => {
  vaults.forEach((vault, i) => {
    const log = steps(vault.solutionPath);
    validator.validateSave(save({ level: 9 + i, log, redo: [] }));
    validator.validateSave(save({ level: 9 + i, log: [], redo: log.slice().reverse() }));
  });
  for (const level of [33, 34, -1, 1.5, '9', null])
    assert.throws(
      () => validator.validateSave(save({ level, log: [], redo: [] })),
      undefined,
      `room ${String(level)} is rejected`,
    );
  assert.throws(
    () => validator.validateSave(save({ level: 9, log: steps(vaults[1].solutionPath), redo: [] })),
    /Invalid archive history/,
    'a vault history is checked against its own room',
  );
});
