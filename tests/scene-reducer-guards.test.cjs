'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('../src/core.js');
require('../src/engines.js');
const C = require('../src/bridges.js');

const scene = {
  id: 'scene-guard',
  revision: 1,
  type: 'scene',
  title: 'Guard fixture',
  subtitle: 'Reducer guards',
  story: 'A small room used only to exercise reducer guards.',
  difficulty: 'Gentle',
  size: 4,
  roomNames: ['Lounge', 'Kitchen'],
  rooms: Array(16).fill(0),
  people: [
    { id: 'a', name: 'A', role: 'Guest', color: 0 },
    { id: 'b', name: 'B', role: 'Guest', color: 1 },
    { id: 'c', name: 'C', role: 'Guest', color: 2 },
    { id: 'victim', name: 'V', role: 'Victim', color: 3 },
  ],
  objects: [{ cell: 15, kind: 'plant', name: 'plant' }],
  victim: 'victim',
  clues: [{ kind: 'edge', who: 'a' }],
  solution: { a: 0, b: 5, c: 10, victim: 1 },
};

const dossier = {
  id: 'dossier-guard',
  revision: 1,
  type: 'dossier',
  title: 'Guard fixture',
  subtitle: 'Reducer guards',
  story: 'A small file used only to exercise reducer guards.',
  difficulty: 'Gentle',
  size: 3,
  people: ['A', 'B', 'C'],
  categories: [
    { name: 'Room', values: ['r0', 'r1', 'r2'] },
    { name: 'Object', values: ['o0', 'o1', 'o2'] },
  ],
  solution: [0, 1, 2, 0, 1, 2],
  targetItem: 0,
  clues: [{ kind: 'eq', cat: 0, who: 0, value: 1 }],
};

function unchanged(puzzle, state, action) {
  const snapshot = C.clone(state);
  assert.strictEqual(C.registry[puzzle.type].reduce(puzzle, state, action), state);
  assert.deepEqual(state, snapshot, 'rejected action must not mutate the input');
  C.validateState(puzzle, state);
}

test('scene invalid tail actions leave state unchanged', () => {
  const s = C.registry.scene.initial(scene);
  const invalid = [
    { type: 'exclude', who: 'victim', cell: 'x' },
    { type: 'exclude', who: 'victim', cell: 99999 },
    { type: 'exclude', who: 'victim', cell: -1 },
    { type: 'exclude', who: 'victim', cell: 15 },
    { type: 'exclude', who: 'nobody', cell: 0 },
    { type: 'clue', index: 99999 },
    { type: 'clue', index: -1 },
    { type: 'accuse', who: 'nobody' },
  ];
  for (const action of invalid) unchanged(scene, s, action);
});

test('scene valid tail actions still apply', () => {
  const E = C.registry.scene;
  for (const [action, field, expected] of [
    [{ type: 'exclude', who: 'victim', cell: 0 }, 'notes', { victim: [0] }],
    [{ type: 'clue', index: 0 }, 'clueMarks', [0]],
    [{ type: 'accuse', who: 'a' }, 'accused', 'a'],
  ]) {
    const s = E.initial(scene);
    const snapshot = C.clone(s);
    const next = E.reduce(scene, s, action);
    assert.notStrictEqual(next, s);
    assert.deepEqual(next[field], expected);
    assert.deepEqual(s, snapshot, 'valid action must not mutate the input');
    C.validateState(scene, next);
  }
});

for (const puzzle of [scene, dossier]) {
  test(`${puzzle.type} unknown actions preserve state identity and value`, () => {
    const s = C.registry[puzzle.type].initial(puzzle);
    s.accused = puzzle.type === 'scene' ? 'a' : 0;
    s.clueMarks = [0];
    for (const action of [{ type: 'unknown' }, { type: 'constructor' }, {}]) unchanged(puzzle, s, action);
  });
}

for (const [label, field, values] of [
  ['mark cell', 'cell', [-1, 18, 99999, 0.5, '0', null, undefined, NaN, Infinity]],
  ['mark value', 'value', [-2, 2, 0.5, '1', true, null, undefined, NaN, Infinity]],
  ['clue index', 'index', [-1, 1, 99999, 0.5, '0', null, undefined, NaN, Infinity]],
  ['accusation', 'who', [-1, 3, 99999, 0.5, '0', null, undefined, NaN, Infinity]],
]) {
  test(`dossier rejects invalid ${label} without cloning or mutation`, () => {
    const s = C.registry.dossier.initial(dossier);
    s.accused = 1;
    s.clueMarks = [0];
    s.marks[0] = 1;
    for (const value of values) {
      const action =
        field === 'index'
          ? { type: 'clue', index: value }
          : field === 'who'
            ? { type: 'accuse', who: value }
            : { type: 'mark', cell: 0, value: 1, [field]: value };
      unchanged(dossier, s, action);
    }
  });
}

test('dossier mark rejects malformed mark arrays before accessing their bounds', () => {
  const E = C.registry.dossier;
  for (const marks of [undefined, null, {}, [], Array(17).fill(-1), Array(19).fill(-1)]) {
    const s = { ...E.initial(dossier), marks };
    const snapshot = structuredClone(s);
    assert.strictEqual(E.reduce(dossier, s, { type: 'mark', cell: 0, value: 1 }), s);
    assert.deepEqual(s, snapshot);
  }
});

test('dossier accepts every mark value at both array boundaries without mutating input', () => {
  const E = C.registry.dossier;
  for (const cell of [0, 17]) {
    for (const value of [-1, 0, 1]) {
      const s = E.initial(dossier);
      s.accused = 1;
      const snapshot = C.clone(s);
      const next = E.reduce(dossier, s, { type: 'mark', cell, value, auto: false });
      const marks = [...s.marks];
      marks[cell] = value;
      assert.notStrictEqual(next, s);
      assert.deepEqual(next.marks, marks, 'auto:false must change only the selected mark');
      assert.equal(next.accused, null);
      assert.deepEqual(s, snapshot);
      C.validateState(dossier, next);
    }
  }
});

test('dossier automatic exclusions stay in the selected category, row and column', () => {
  const E = C.registry.dossier;
  const s = E.initial(dossier);
  const snapshot = C.clone(s);
  const next = E.reduce(dossier, s, { type: 'mark', cell: 17, value: 1 });
  const expected = Array(18).fill(-1);
  expected[17] = 1;
  for (const cell of [11, 14, 15, 16]) expected[cell] = 0;
  assert.deepEqual(next.marks, expected);
  assert.deepEqual(s, snapshot);
  C.validateState(dossier, next);
});

test('dossier valid clue toggles and accusations still apply', () => {
  const E = C.registry.dossier;
  const s = E.initial(dossier);
  const snapshot = C.clone(s);
  const marked = E.reduce(dossier, s, { type: 'clue', index: 0 });
  assert.notStrictEqual(marked, s);
  assert.deepEqual(marked.clueMarks, [0]);
  const cleared = E.reduce(dossier, marked, { type: 'clue', index: 0 });
  assert.deepEqual(cleared.clueMarks, []);
  assert.deepEqual(marked.clueMarks, [0]);
  for (const who of [0, 2]) {
    const next = E.reduce(dossier, s, { type: 'accuse', who });
    assert.notStrictEqual(next, s);
    assert.equal(next.accused, who);
    C.validateState(dossier, next);
  }
  assert.deepEqual(s, snapshot);
  C.validateState(dossier, marked);
  C.validateState(dossier, cleared);
});
