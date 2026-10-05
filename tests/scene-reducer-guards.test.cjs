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

test('scene invalid tail actions leave state unchanged', () => {
  const E = C.registry.scene;
  const s = E.initial(scene);
  const snapshot = C.clone(s);
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
  for (const a of invalid) {
    const next = E.reduce(scene, s, a);
    assert.equal(next, s, `invalid scene action returns same state: ${JSON.stringify(a)}`);
    assert.deepEqual(s, snapshot, 'state value unchanged');
    C.validateState(scene, next);
  }
});

test('scene valid tail actions still apply', () => {
  const E = C.registry.scene;
  let s = E.initial(scene);
  let next = E.reduce(scene, s, { type: 'exclude', who: 'victim', cell: 0 });
  assert.notEqual(next, s, 'valid exclude applies');
  assert.deepEqual(next.notes.victim, [0], 'exclude records the note');
  C.validateState(scene, next);
  s = E.initial(scene);
  next = E.reduce(scene, s, { type: 'clue', index: 0 });
  assert.notEqual(next, s, 'valid clue mark applies');
  assert.deepEqual(next.clueMarks, [0], 'clue mark recorded');
  C.validateState(scene, next);
  s = E.initial(scene);
  next = E.reduce(scene, s, { type: 'accuse', who: 'a' });
  assert.notEqual(next, s, 'valid accusation applies');
  assert.equal(next.accused, 'a', 'accused recorded');
  C.validateState(scene, next);
});

test('dossier invalid clue leaves state unchanged and valid clue still applies', () => {
  const E = C.registry.dossier;
  const s = E.initial(dossier);
  const snapshot = C.clone(s);
  const next = E.reduce(dossier, s, { type: 'clue', index: 99999 });
  assert.equal(next, s, 'invalid dossier clue returns same state');
  assert.deepEqual(s, snapshot, 'state value unchanged');
  C.validateState(dossier, next);
  const applied = E.reduce(dossier, s, { type: 'clue', index: 0 });
  assert.notEqual(applied, s, 'valid dossier clue applies');
  assert.deepEqual(applied.clueMarks, [0], 'clue mark recorded');
  C.validateState(dossier, applied);
});
