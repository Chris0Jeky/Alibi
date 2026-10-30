'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict');
const { pickNext } = require('../src/core.js');

// A mixed-tier fixture in catalogue order: a collection tier ladder, then a late Tricky.
const fixture = [
  ['a1', 'logic', 'Gentle'],
  ['a2', 'logic', 'Steady'],
  ['a3', 'logic', 'Tricky'],
  ['b1', 'grid', 'Gentle'],
  ['a4', 'logic', 'Gentle'],
  ['a5', 'logic', 'Tricky'],
  ['a6', 'logic', 'Expert'],
  ['a7', 'logic', 'Tricky'],
].map(([id, type, difficulty]) => ({ id, type, difficulty }));

// done and started are sets of ids; the result is an id, or undefined.
const pick = (from, feel = null, { done = [], started = [] } = {}, list = fixture) =>
  pickNext(
    list,
    from,
    (p) => done.includes(p.id),
    (p) => started.includes(p.id),
    feel,
  )?.id;

test('stays in the same family and tier, after the current puzzle', () => {
  assert.equal(pick('a3'), 'a5');
  assert.equal(pick('a5'), 'a7');
  assert.equal(pick('a1'), 'a4', 'skips the Steady and Tricky entries between');
});

test('wraps to an earlier puzzle of the same tier', () => {
  assert.equal(pick('a7'), 'a3');
  assert.equal(pick('a7', null, { done: ['a3'] }), 'a5');
});

test('Too easy steps up a tier, Too hard steps down', () => {
  assert.equal(pick('a3', 'easy'), 'a6');
  assert.equal(pick('a2', 'easy'), 'a3');
  assert.equal(pick('a3', 'hard'), 'a2');
  assert.equal(pick('a2', 'hard'), 'a4');
});

test('an exhausted tier falls back to the nearest tier', () => {
  const done = ['a3', 'a5', 'a7'];
  assert.equal(pick('a5', null, { done }), 'a6', 'ties go up when no choice was made');
  assert.equal(pick('a5', 'hard', { done }), 'a2', 'and down after Too hard');
  assert.equal(pick('a6', 'easy', { done: ['a6'] }), 'a7', 'nothing above Expert, so down');
  assert.equal(
    pick('a3', 'easy', { done: ['a6'] }),
    'a5',
    'an empty tier above falls back to this one',
  );
});

test('skips unfinished runs while an unstarted puzzle remains', () => {
  assert.equal(pick('a3', null, { started: ['a5'] }), 'a7');
  assert.equal(
    pick('a3', null, { started: ['a5', 'a7'] }),
    'a6',
    'then the nearest tier, up on a tie',
  );
  assert.equal(pick('a3', null, { started: ['a1', 'a2', 'a4', 'a5', 'a6', 'a7'] }), 'a5');
});

test('when everything else is solved, an unfinished run is resumed before repeating', () => {
  const started = ['a5'];
  assert.equal(pick('a3', null, { done: ['a1', 'a2', 'a4', 'a6', 'a7'], started }), 'a5');
});

test('all solved falls back to the next puzzle in catalogue order', () => {
  const done = fixture.map((p) => p.id);
  assert.equal(pick('a3', null, { done }), 'a4');
  assert.equal(pick('a7', 'easy', { done }), 'a1');
});

test('a family of one, an unknown id and an unknown tier do not throw', () => {
  assert.equal(pick('b1'), undefined, 'no other puzzle: the caller opens the library');
  assert.equal(pick('missing'), undefined);
  const odd = [
    { id: 'x', type: 'logic', difficulty: 'Gentle' },
    { id: 'y', type: 'logic', difficulty: 'Legendary' },
  ];
  assert.equal(pick('x', 'easy', {}, odd), 'y');
});
