'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { load } = require('../tools/curation-editorial.cjs');

const catalogue = { puzzles: [{ id: 'known', type: 'matching', revision: 3 }] };

function writeFixture({ difficultyStatus, humanPlaytested }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'editorial-'));
  const dir = path.join(root, 'content/curation/editorial');
  fs.mkdirSync(dir, { recursive: true });
  const note = {
    id: 'known',
    family: 'matching',
    provenance: { humanPlaytested },
    difficultyStatus,
    hints: [],
    venue: 'gallery',
    goal: 'goal',
    rules: 'rules',
    controls: 'controls',
    answer: 'answer',
  };
  fs.writeFileSync(
    path.join(dir, 'puzzle-notes.json'),
    JSON.stringify({ schema: 'alibi-editorial/v1', puzzles: [note] }),
  );
  fs.writeFileSync(
    path.join(dir, 'collections.json'),
    JSON.stringify({
      schema: 'alibi-collections/v1',
      collections: [{ id: 'gallery', puzzleIds: ['known'] }],
    }),
  );
  return root;
}

test('exact provisional with humanPlaytested false passes gate', () => {
  const root = writeFixture({ difficultyStatus: 'provisional', humanPlaytested: false });
  const result = load(root, catalogue);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].difficultyStatus, 'provisional');
});

test('non-provisional human-calibrated throws', () => {
  const root = writeFixture({ difficultyStatus: 'human-calibrated', humanPlaytested: false });
  assert.throws(() => load(root, catalogue), /Unverified calibration claim/);
});

test('PROVISIONAL and provisional-padded variants throw', () => {
  for (const difficultyStatus of [
    'PROVISIONAL',
    ' provisional',
    'provisional ',
    'provisional-final',
    'non-provisional',
  ]) {
    const root = writeFixture({ difficultyStatus, humanPlaytested: false });
    assert.throws(() => load(root, catalogue), /Unverified calibration claim/, difficultyStatus);
  }
});

test('humanPlaytested true throws even with exact provisional', () => {
  const root = writeFixture({ difficultyStatus: 'provisional', humanPlaytested: true });
  assert.throws(() => load(root, catalogue), /Unverified calibration claim/);
});
