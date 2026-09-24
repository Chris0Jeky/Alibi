'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { warehouse: W } = require('../src/club-engines.js');

test('Archive maps require exactly one archivist, including goal occupants', () => {
  for (const map of [
    ['#####', '#@@$#', '# . #', '#####'],
    ['#####', '#@+$#', '#   #', '#####'],
    ['#####', '# $ #', '# . #', '#####'],
  ]) {
    assert.throws(() => W.fromMap(map), /Invalid archive map pieces/);
  }
});

test('Archive maps reject missing rows instead of compressing their coordinates', () => {
  const map = ['#####', '#@$.#', , '#####'];
  assert.throws(() => W.fromMap(map), /Invalid archive map dimensions/);
  assert.equal(2 in map, false, "validation does not fill the caller's hole");
});

test('an already arranged Archive map is complete without a ceremonial move', () => {
  const map = ['#####', '#@* #', '#####'];
  const state = W.fromMap(map);
  assert.equal(state.done, true);
  assert.deepEqual(W.solve(state), { path: '', nodes: 1 });
  for (const direction of ['up', 'right', 'down', 'left']) {
    assert.strictEqual(W.move(state, direction), state);
  }
  assert.deepEqual(map, ['#####', '#@* #', '#####']);
});

test('Archive directions must be own supported names, even after completion', () => {
  for (const state of [W.initial(), W.fromMap(['#####', '#@* #', '#####'])]) {
    const before = structuredClone(state);
    for (const direction of ['diagonal', '__proto__', 'constructor', 'toString']) {
      assert.throws(() => W.move(state, direction), /Unknown direction/);
    }
    assert.deepEqual(state, before);
  }
});

test('Archive corner warnings treat the board boundary as a wall', () => {
  const layouts = [
    ['$ .', ' @ ', '   '],
    ['. $', ' @ ', '   '],
    ['   ', ' @ ', '$ .'],
    ['   ', ' @ ', '. $'],
    ['#$ ', ' @.', '   '],
  ];
  for (const map of layouts) {
    const state = W.fromMap(map);
    const before = structuredClone(state);
    assert.deepEqual(W.corners(state), state.crates, map.join('\n'));
    assert.deepEqual(state, before);
  }
});

test('Archive corner warnings exclude goals and movable edge crates', () => {
  for (const map of [
    ['*  ', ' @ ', '   '],
    [' $ ', '.@ ', '   '],
    ['.  ', ' @$', '   '],
  ]) {
    assert.deepEqual(W.corners(W.fromMap(map)), [], map.join('\n'));
  }
});

test('walking or pushing off an open Archive edge never wraps or records a move', () => {
  for (const [map, direction] of [
    [['@  ', '$. ', '   '], 'left'],
    [['  @', ' $.', '   '], 'right'],
    [['@$ ', ' . ', '   '], 'up'],
    [['   ', ' . ', ' $@'], 'down'],
    [['$@ ', '.  ', '   '], 'left'],
    [[' @$', '.  ', '   '], 'right'],
    [[' $ ', ' @.', '   '], 'up'],
    [['   ', ' @.', ' $ '], 'down'],
  ]) {
    const state = W.fromMap(map);
    assert.strictEqual(W.move(state, direction), state);
    assert.equal(state.moves, 0);
    assert.equal(state.pushes, 0);
  }
});

test('all nine published Archive starts remain unfinished and replayable', () => {
  assert.equal(W.maps.length, 9);
  for (let level = 0; level < W.maps.length; level++) {
    const state = W.initial(level);
    assert.equal(state.level, level);
    assert.equal(state.done, false);
    assert.equal(state.moves, 0);
    assert.equal(state.pushes, 0);
    assert.deepEqual(W.corners(state), []);
  }
});
