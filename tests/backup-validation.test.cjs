'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

require('../src/core.js');
require('../src/engines.js');
const C = require('../src/bridges.js');
const E = require('../src/club-engines.js');
require('../src/backup-validation.js');

const catalog = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../content/catalog.json'), 'utf8'),
);
const validator = globalThis.AlibiBackupValidation(C, catalog, () => ({}), 4);

const FIXED_DATE = '2026-01-01T00:00:00.000Z';
const DUPLICATE_MESSAGE = 'Duplicate records in this backup.';
const COLLISION_MESSAGE = 'A custom pack collides with the starter catalogue.';
const COUNTERS_MESSAGE = 'Invalid save counters or history.';
const FORMAT_MESSAGE = 'Unsupported backup format. Nothing was changed.';
const REVISION_MESSAGE = 'The save does not match its puzzle revision.';

function basePuzzle(id) {
  return C.clone(catalog.puzzles.find((p) => p.id === id));
}

function initialState(puzzle) {
  return C.clone(C.registry[puzzle.type].initial(puzzle));
}

function makeRun(puzzleId, overrides = {}) {
  const puzzle = basePuzzle(puzzleId);
  return {
    schemaVersion: 1,
    key: `${puzzle.id}@${puzzle.revision}`,
    rev: 0,
    puzzle,
    state: initialState(puzzle),
    moves: 0,
    hints: 0,
    elapsed: 0,
    note: '',
    undo: [],
    redo: [],
    updatedAt: FIXED_DATE,
    ...overrides,
  };
}

function customPack(packId, puzzleId) {
  const puzzle = C.clone(basePuzzle('sudoku-01'));
  puzzle.id = puzzleId;
  return {
    schemaVersion: 1,
    id: packId,
    version: 1,
    title: `QA ${packId}`,
    puzzles: [puzzle],
  };
}

function backupWith({ runs = [], packs = [] } = {}) {
  return {
    format: 'alibi-backup',
    schemaVersion: 1,
    runs,
    packs,
    settings: {},
    preferences: { seen: [], favorites: [] },
  };
}

function assertRejectedUnchanged(backup, expectedMessage) {
  const snapshot = structuredClone(backup);
  try {
    validator.validateBackup(backup);
  } catch (error) {
    assert.equal(error.name, 'Error');
    assert.equal(error.message, expectedMessage);
    assert.deepEqual(backup, snapshot);
    return;
  }
  assert.fail(`expected rejection with ${expectedMessage}`);
}

test('duplicate run keys are rejected and the source backup is unchanged', () => {
  const valid = backupWith({ runs: [makeRun('sudoku-01'), makeRun('sudoku-02')] });
  const accepted = validator.validateBackup(valid);
  assert.deepEqual(
    accepted.runs.map((r) => r.key),
    ['sudoku-01@1', 'sudoku-02@1'],
  );

  const duplicated = backupWith({ runs: [makeRun('sudoku-01'), makeRun('sudoku-01')] });
  assertRejectedUnchanged(duplicated, DUPLICATE_MESSAGE);
});

test('duplicate custom pack IDs are rejected and the source backup is unchanged', () => {
  const valid = backupWith({
    packs: [
      customPack('qa-pack-a', 'qa-custom-alpha-01'),
      customPack('qa-pack-b', 'qa-custom-beta-01'),
    ],
  });
  const accepted = validator.validateBackup(valid);
  assert.deepEqual(
    accepted.packs.map((p) => p.id),
    ['qa-pack-a', 'qa-pack-b'],
  );

  const duplicated = backupWith({
    packs: [
      customPack('qa-dup-pack', 'qa-custom-alpha-01'),
      customPack('qa-dup-pack', 'qa-custom-beta-01'),
    ],
  });
  assertRejectedUnchanged(duplicated, DUPLICATE_MESSAGE);
});

test('a custom pack puzzle colliding with the starter catalogue is rejected', () => {
  const valid = backupWith({ packs: [customPack('qa-clean-pack', 'qa-custom-gamma-01')] });
  const accepted = validator.validateBackup(valid);
  assert.equal(accepted.packs[0].puzzles[0].id, 'qa-custom-gamma-01');

  const colliding = backupWith({ packs: [customPack('qa-collide-pack', 'sudoku-01')] });
  assertRejectedUnchanged(colliding, COLLISION_MESSAGE);
});

test('a run with negative moves is rejected while zero moves is accepted', () => {
  const valid = backupWith({ runs: [makeRun('sudoku-01', { moves: 0 })] });
  assert.equal(validator.validateBackup(valid).runs[0].moves, 0);

  const invalid = backupWith({ runs: [makeRun('sudoku-01', { moves: -1 })] });
  assertRejectedUnchanged(invalid, COUNTERS_MESSAGE);
});

test('a run note longer than 5000 characters is rejected while 5000 is accepted', () => {
  const valid = backupWith({ runs: [makeRun('sudoku-01', { note: 'x'.repeat(5000) })] });
  assert.equal(validator.validateBackup(valid).runs[0].note.length, 5000);

  const invalid = backupWith({ runs: [makeRun('sudoku-01', { note: 'x'.repeat(5001) })] });
  assertRejectedUnchanged(invalid, COUNTERS_MESSAGE);
});

test('a run with more than 100 undo entries is rejected while 100 is accepted', () => {
  const state = initialState(basePuzzle('sudoku-01'));
  const validUndo = Array.from({ length: 100 }, () => C.clone(state));
  const valid = backupWith({ runs: [makeRun('sudoku-01', { undo: validUndo })] });
  assert.equal(validator.validateBackup(valid).runs[0].undo.length, 100);

  const tooManyUndo = Array.from({ length: 101 }, () => C.clone(state));
  const invalid = backupWith({ runs: [makeRun('sudoku-01', { undo: tooManyUndo })] });
  assertRejectedUnchanged(invalid, COUNTERS_MESSAGE);
});

test('Club save archive replay accepts a legal walk and rejects a wall push without mutating the source', () => {
  const clubValidator = globalThis.AlibiBackupValidation(C, null, () => E, 4);
  const baseSave = {
    schema: 1,
    settings: { assist: 'off', zen: false, pinned: null },
    visit: 1,
    lastHero: -1,
    runs: { archive: { level: 0, log: ['up'], redo: [] } },
    records: [],
    stamps: [],
  };
  assert.doesNotThrow(() => clubValidator.validateSave(baseSave));

  const withRedo = {
    ...baseSave,
    runs: { archive: { level: 0, log: ['up'], redo: ['up'] } },
  };
  assert.doesNotThrow(() => clubValidator.validateSave(withRedo));

  const invalid = {
    ...baseSave,
    runs: { archive: { level: 0, log: ['up', 'up'], redo: ['up'] } },
  };
  const snapshot = structuredClone(invalid);
  assert.throws(() => clubValidator.validateSave(invalid));
  assert.deepEqual(invalid, snapshot);
});

function baseClubSave() {
  return {
    schema: 1,
    settings: { assist: 'off', zen: false, pinned: null },
    runs: {},
    records: [],
    stamps: [],
    visit: 0,
    lastHero: -1,
  };
}

test('invalid Club seeds are rejected before replay and inputs are unchanged', () => {
  assert.deepEqual(validator.validateSave(baseClubSave()), baseClubSave());

  const cases = [
    ['blockcabinet', 'Invalid Block Cabinet seed.'],
    ['dominoes', 'Invalid domino seed.'],
    ['mahjong', 'Invalid Mahjong seed.'],
  ];
  for (const [key, message] of cases) {
    const save = baseClubSave();
    save.runs = {
      [key]: {
        rulesVersion: 1,
        log: [{ sentinel: true }],
        redo: [{ sentinel: true }],
        seed: 'bad seed',
      },
    };
    const snapshot = structuredClone(save);
    try {
      validator.validateSave(save);
    } catch (error) {
      assert.equal(error.name, 'Error');
      assert.equal(error.message, message);
      assert.deepEqual(save, snapshot);
      continue;
    }
    assert.fail(`expected rejection with ${message}`);
  }
});

test('malformed backup envelopes are rejected and the source backup is unchanged', () => {
  const accepted = validator.validateBackup(backupWith());
  assert.deepEqual(accepted.runs, []);
  assert.deepEqual(accepted.packs, []);

  const wrongFormat = backupWith();
  wrongFormat.format = 'alibi-save';
  assertRejectedUnchanged(wrongFormat, FORMAT_MESSAGE);

  const wrongSchemaVersion = backupWith();
  wrongSchemaVersion.schemaVersion = 2;
  assertRejectedUnchanged(wrongSchemaVersion, FORMAT_MESSAGE);

  const nonArrayRuns = backupWith();
  nonArrayRuns.runs = {};
  assertRejectedUnchanged(nonArrayRuns, FORMAT_MESSAGE);

  const nonArrayPacks = backupWith();
  nonArrayPacks.packs = {};
  assertRejectedUnchanged(nonArrayPacks, FORMAT_MESSAGE);
});

test('a run whose key does not match its puzzle revision is rejected', () => {
  const valid = backupWith({ runs: [makeRun('sudoku-01')] });
  assert.equal(validator.validateBackup(valid).runs[0].key, 'sudoku-01@1');

  const mismatched = backupWith({ runs: [makeRun('sudoku-01', { key: 'sudoku-01@999' })] });
  assertRejectedUnchanged(mismatched, REVISION_MESSAGE);
});
