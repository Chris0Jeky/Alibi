'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/house/model.js');

test('answering maps without the letter does not solve the study', () => {
  const denied = M.reduce(M.study(), { type: 'answer', id: 'maps' });
  assert.equal(denied.solved, false);
  assert.equal(denied.answer, '');
});

test('answering maps with the letter but without three room visits does not solve', () => {
  let state = M.reduce(M.study(), { type: 'letter' });
  state = M.reduce(state, { type: 'inspect', id: 'study' });
  const denied = M.reduce(state, { type: 'answer', id: 'maps' });
  assert.equal(denied.solved, false);
  assert.equal(denied.answer, '');
});

test('letter plus three room inspects plus answering maps solves the study', () => {
  let state = M.study();
  state = M.reduce(state, { type: 'letter' });
  for (const id of ['study', 'library', 'maps']) {
    state = M.reduce(state, { type: 'inspect', id });
  }
  assert.deepEqual([...state.visited].sort(), ['library', 'maps', 'study']);
  state = M.reduce(state, { type: 'answer', id: 'maps' });
  assert.equal(state.answer, 'maps');
  assert.equal(state.solved, true);
});

test('a wrong room answer after full gating records the answer without solving', () => {
  let state = M.reduce(M.study(), { type: 'letter' });
  for (const id of ['study', 'library', 'maps']) {
    state = M.reduce(state, { type: 'inspect', id });
  }
  state = M.reduce(state, { type: 'answer', id: 'study' });
  assert.equal(state.answer, 'study');
  assert.equal(state.solved, false);
});

test('nextStep gates on letter, visits, and solution', () => {
  assert.equal(M.nextStep(M.study()), 'Read the envelope on your desk.');
  let state = M.reduce(M.study(), { type: 'letter' });
  assert.equal(
    M.nextStep(state),
    'Inspect the three rooms. Their windows and clocks matter.',
  );
  for (const id of ['study', 'library', 'maps']) {
    state = M.reduce(state, { type: 'inspect', id });
  }
  assert.equal(M.nextStep(state), 'Compare the observations in your notebook.');
  state = M.reduce(state, { type: 'answer', id: 'maps' });
  assert.match(M.nextStep(state), /desk study is complete/);
});

test('catalogue filters by family, progress, and query', () => {
  const puzzles = [
    { id: 'a', revision: 1, type: 'scene', difficulty: 'Gentle', title: 'East Window', subtitle: '', collection: 'C1' },
    { id: 'b', revision: 1, type: 'bridges', difficulty: 'Gentle', title: 'West Shelf', subtitle: '', collection: 'C1' },
  ];
  const records = [{ key: 'a@1', moves: 3, updatedAt: '2026-01-02', completedAt: '2026-01-03' }];
  const base = { q: '', family: '', progress: '', level: '' };
  assert.deepEqual(
    M.catalogue(puzzles, records, { ...base, family: 'bridges' }).map((p) => p.id),
    ['b'],
  );
  assert.deepEqual(
    M.catalogue(puzzles, records, { ...base, progress: 'solved' }).map((p) => p.id),
    ['a'],
  );
  assert.deepEqual(
    M.catalogue(puzzles, records, { ...base, q: 'west' }).map((p) => p.id),
    ['b'],
  );
});

test('recent skips untouched and solved records; nextActivity prefers the newest touch', () => {
  const records = [
    { key: 'a@1', moves: 0, updatedAt: '2026-01-03' },
    { key: 'b@1', moves: 2, updatedAt: '2026-01-02' },
    { key: 'c@1', moves: 1, updatedAt: '2026-01-04', completedAt: '2026-01-05' },
    { key: 'd@1', moves: 1, updatedAt: '2026-01-01' },
  ];
  assert.deepEqual(
    M.recent(records).map((r) => r.key),
    ['b@1', 'd@1'],
  );
  const puzzleFirst = M.nextActivity(records, [{ id: 'g', title: 'G', updatedAt: '2026-01-01' }]);
  assert.equal(puzzleFirst.kind, 'puzzle');
  assert.equal(puzzleFirst.record.key, 'b@1');
  const gameFirst = M.nextActivity(records, [{ id: 'g', title: 'G', updatedAt: '2026-01-03' }]);
  assert.equal(gameFirst.kind, 'game');
  assert.equal(gameFirst.id, 'g');
  assert.equal(M.nextActivity([], []), null);
});
