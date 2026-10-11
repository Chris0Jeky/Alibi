'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

const Core = require('../src/core.js');
require('../src/engines.js');

function scenePuzzle() {
  return {
    size: 4,
    people: [{ id: 'ada' }, { id: 'bob' }, { id: 'cyd' }, { id: 'dan' }],
    objects: [{ cell: 15, kind: 'plant', name: 'Fern' }],
    clues: [
      { kind: 'edge', who: 'ada' },
      { kind: 'notEdge', who: 'bob' },
    ],
  };
}

function sceneState(overrides = {}) {
  return {
    placements: {},
    notes: {},
    clueMarks: [],
    accused: null,
    ...overrides,
  };
}

function reduce(p, s, a) {
  return Core.registry.scene.reduce(p, s, a);
}

test('invalid exclude returns the unchanged state', () => {
  const p = scenePuzzle();
  const s = sceneState();
  const snapshot = JSON.parse(JSON.stringify(s));
  const out = reduce(p, s, { type: 'exclude', who: 'nobody', cell: 999999 });
  assert.strictEqual(out, s);
  assert.deepEqual(s, snapshot);
  assert.deepEqual(s.notes, {});
});

test('out-of-range clue index returns the unchanged state', () => {
  const p = scenePuzzle();
  const s = sceneState();
  const snapshot = JSON.parse(JSON.stringify(s));
  const out = reduce(p, s, { type: 'clue', index: 999 });
  assert.strictEqual(out, s);
  assert.deepEqual(s, snapshot);
  assert.deepEqual(s.clueMarks, []);
});

test('accuse of a non-person returns the unchanged state', () => {
  const p = scenePuzzle();
  const s = sceneState();
  const snapshot = JSON.parse(JSON.stringify(s));
  const out = reduce(p, s, { type: 'accuse', who: 42 });
  assert.strictEqual(out, s);
  assert.deepEqual(s, snapshot);
  assert.strictEqual(s.accused, null);
});

test('out-of-range clear returns the unchanged state', () => {
  const p = scenePuzzle();
  const s = sceneState({ placements: { ada: 5 } });
  const snapshot = JSON.parse(JSON.stringify(s));
  const out = reduce(p, s, { type: 'clear', cell: 999999 });
  assert.strictEqual(out, s);
  assert.deepEqual(s, snapshot);
});

test('exclude with __proto__ does not throw and returns the unchanged state', () => {
  const p = scenePuzzle();
  const s = sceneState();
  const snapshot = JSON.parse(JSON.stringify(s));
  let out;
  assert.doesNotThrow(() => {
    out = reduce(p, s, { type: 'exclude', who: '__proto__', cell: 0 });
  });
  assert.strictEqual(out, s);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), snapshot);
  assert.ok(!Object.prototype.hasOwnProperty.call(s.notes, '__proto__'));
});

test('valid tail actions still apply', () => {
  const p = scenePuzzle();
  const excluded = reduce(p, sceneState(), { type: 'exclude', who: 'ada', cell: 1 });
  assert.deepEqual(excluded.notes, { ada: [1] });
  const marked = reduce(p, sceneState(), { type: 'clue', index: 0 });
  assert.deepEqual(marked.clueMarks, [0]);
  const accused = reduce(p, sceneState(), { type: 'accuse', who: 'ada' });
  assert.strictEqual(accused.accused, 'ada');
  const cleared = reduce(p, sceneState({ placements: { ada: 5 } }), {
    type: 'clear',
    cell: 5,
  });
  assert.deepEqual(cleared.placements, {});
});

test('dossier out-of-range clue index leaves clueMarks unchanged', () => {
  const p = { size: 4, clues: [{ kind: 'eq', cat: 0, who: 0, value: 0 }] };
  const s = { marks: [], notes: {}, clueMarks: [], accused: null };
  const out = Core.registry.dossier.reduce(p, s, { type: 'clue', index: 999 });
  assert.deepEqual(out.clueMarks, []);
});
