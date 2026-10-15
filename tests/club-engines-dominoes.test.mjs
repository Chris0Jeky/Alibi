import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('../src/club-engines.js');
const dominoes = E.dominoes;

function stateWith(chain) {
  return { chain };
}

test('dominoes.place rejects a tile that shares no pip with the open end', () => {
  assert.equal(dominoes.tile(27).a, 6);
  assert.equal(dominoes.tile(27).b, 6);
  const state = stateWith([{ tile: 0, left: 0, right: 0 }]);
  assert.throws(() => dominoes.place(state, 27, 'right'), /That tile cannot play on that end\./);
  assert.throws(() => dominoes.place(state, 27, 'left'), /That tile cannot play on that end\./);
});

test('dominoes.place still builds correct links for legal placements', () => {
  assert.deepEqual(dominoes.place(stateWith([]), 27, 'right'), [{ tile: 27, left: 6, right: 6 }]);
  const single = stateWith([{ tile: 0, left: 0, right: 0 }]);
  assert.deepEqual(dominoes.place(single, 6, 'right'), [
    { tile: 0, left: 0, right: 0 },
    { tile: 6, left: 0, right: 6 },
  ]);
  assert.deepEqual(dominoes.place(single, 6, 'left'), [
    { tile: 6, left: 6, right: 0 },
    { tile: 0, left: 0, right: 0 },
  ]);
  assert.deepEqual(dominoes.place(single, 0, 'right'), [
    { tile: 0, left: 0, right: 0 },
    { tile: 0, left: 0, right: 0 },
  ]);
  const openTwo = stateWith([{ tile: 2, left: 0, right: 2 }]);
  assert.deepEqual(dominoes.place(openTwo, 8, 'right'), [
    { tile: 2, left: 0, right: 2 },
    { tile: 8, left: 2, right: 1 },
  ]);
  const openLeftTwo = stateWith([{ tile: 8, left: 2, right: 1 }]);
  assert.deepEqual(dominoes.place(openLeftTwo, 2, 'left'), [
    { tile: 2, left: 0, right: 2 },
    { tile: 8, left: 2, right: 1 },
  ]);
});
