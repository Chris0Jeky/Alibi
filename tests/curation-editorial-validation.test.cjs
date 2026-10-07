'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { load } = require('../tools/curation-editorial.cjs');

const probeCatalogue = { puzzles: [{ id: 'probe-01', type: 'aquarium', revision: 1 }] };

function probeNote() {
  return {
    id: 'probe-01',
    family: 'aquarium',
    venue: 'salt',
    goal: 'goal',
    rules: [],
    controls: 'controls',
    hints: [{ applies: 'general tactic, not a claim of a forced move', text: 'tactic' }],
    answer: [],
    difficultyStatus: ['provisional'],
    provenance: { humanPlaytested: false },
  };
}

function editorialFixture(t, note) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-editorial-validation-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = path.join(root, 'content/curation/editorial');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'puzzle-notes.json'),
    JSON.stringify({ schema: 'alibi-editorial/v1', puzzles: [note] }),
  );
  fs.writeFileSync(
    path.join(dir, 'collections.json'),
    JSON.stringify({
      schema: 'alibi-collections/v1',
      collections: [{ id: 'salt', title: 'Salt', line: '', number: '01', puzzleIds: ['probe-01'] }],
    }),
  );
  return root;
}

function editorialFixtureWithoutCollections(t, note) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-editorial-validation-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = path.join(root, 'content/curation/editorial');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'puzzle-notes.json'),
    JSON.stringify({ schema: 'alibi-editorial/v1', puzzles: [note] }),
  );
  fs.writeFileSync(
    path.join(dir, 'collections.json'),
    JSON.stringify({ schema: 'alibi-collections/v1', collections: [] }),
  );
  return root;
}

function assertNamedError(root) {
  assert.throws(
    () => load(root, probeCatalogue),
    (err) =>
      err instanceof Error &&
      !(err instanceof TypeError) &&
      /Invalid editorial|Unverified calibration/.test(err.message) === true,
  );
}

test('editorial validation rejects a note missing provenance without a TypeError', (t) => {
  const note = probeNote();
  delete note.provenance;
  assertNamedError(editorialFixtureWithoutCollections(t, note));
});

test('editorial validation rejects a note missing difficultyStatus without a TypeError', (t) => {
  const note = probeNote();
  delete note.difficultyStatus;
  assertNamedError(editorialFixtureWithoutCollections(t, note));
});

test('editorial validation rejects a note missing hints without a TypeError', (t) => {
  const note = probeNote();
  delete note.hints;
  assertNamedError(editorialFixtureWithoutCollections(t, note));
});

test('editorial validation still loads a valid fixture', (t) => {
  const data = load(editorialFixture(t, probeNote()), probeCatalogue);
  assert.equal(data.entries.length, 1);
  assert.equal(data.entries[0].id, 'probe-01');
});
