const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');
require('../src/engines.js');

const puzzles = require('../content/catalog.json').puzzles;
const scenePuzzle = puzzles.find((p) => p.type === 'scene');
const dossierPuzzle = puzzles.find((p) => p.type === 'dossier');
const scene = C.registry.scene;
const dossier = C.registry.dossier;

const freeCell = Array.from({ length: scenePuzzle.size ** 2 }, (_, i) => i).find(
  (i) => !scenePuzzle.objects.some((o) => o.cell === i),
);
const validId = scenePuzzle.people[0].id;

test('scene invalid actions return the original state', () => {
  const invalid = [
    { type: 'exclude', who: 'nobody', cell: freeCell },
    { type: 'exclude', who: validId, cell: -3 },
    { type: 'exclude', who: '__proto__', cell: freeCell },
    { type: 'exclude', who: validId, cell: scenePuzzle.objects[0].cell },
    { type: 'exclude', who: validId, cell: scenePuzzle.size ** 2 },
    { type: 'clue', index: 999 },
    { type: 'clue', index: '0' },
    { type: 'accuse', who: {} },
    { type: 'accuse', who: 'nobody' },
  ];
  for (const a of invalid) {
    const s = scene.initial(scenePuzzle);
    let result;
    assert.doesNotThrow(() => {
      result = scene.reduce(scenePuzzle, s, a);
    });
    assert.strictEqual(result, s);
  }
});

test('dossier invalid clue actions return the original state', () => {
  for (const a of [
    { type: 'clue', index: 'x' },
    { type: 'clue', index: 999 },
  ]) {
    const s = dossier.initial(dossierPuzzle);
    let result;
    assert.doesNotThrow(() => {
      result = dossier.reduce(dossierPuzzle, s, a);
    });
    assert.strictEqual(result, s);
  }
});

test('valid scene and dossier actions still work and stay valid', () => {
  let s = scene.initial(scenePuzzle);
  const added = scene.reduce(scenePuzzle, s, { type: 'exclude', who: validId, cell: freeCell });
  assert.deepEqual(added.notes[validId], [freeCell]);
  assert.deepEqual(C.validateState(scenePuzzle, JSON.parse(JSON.stringify(added))), added);
  const removed = scene.reduce(scenePuzzle, added, {
    type: 'exclude',
    who: validId,
    cell: freeCell,
  });
  assert.deepEqual(removed.notes[validId], []);
  assert.deepEqual(C.validateState(scenePuzzle, JSON.parse(JSON.stringify(removed))), removed);

  const marked = scene.reduce(scenePuzzle, scene.initial(scenePuzzle), { type: 'clue', index: 0 });
  assert.deepEqual(marked.clueMarks, [0]);
  assert.deepEqual(C.validateState(scenePuzzle, JSON.parse(JSON.stringify(marked))), marked);
  const unmarked = scene.reduce(scenePuzzle, marked, { type: 'clue', index: 0 });
  assert.deepEqual(unmarked.clueMarks, []);
  assert.deepEqual(C.validateState(scenePuzzle, JSON.parse(JSON.stringify(unmarked))), unmarked);

  const accused = scene.reduce(scenePuzzle, scene.initial(scenePuzzle), {
    type: 'accuse',
    who: validId,
  });
  assert.equal(accused.accused, validId);
  assert.deepEqual(C.validateState(scenePuzzle, JSON.parse(JSON.stringify(accused))), accused);
  const cleared = scene.reduce(scenePuzzle, accused, { type: 'accuse', who: null });
  assert.equal(cleared.accused, null);
  assert.deepEqual(C.validateState(scenePuzzle, JSON.parse(JSON.stringify(cleared))), cleared);

  const d = dossier.initial(dossierPuzzle);
  const dMarked = dossier.reduce(dossierPuzzle, d, { type: 'clue', index: 0 });
  assert.deepEqual(dMarked.clueMarks, [0]);
  assert.deepEqual(C.validateState(dossierPuzzle, JSON.parse(JSON.stringify(dMarked))), dMarked);
});
