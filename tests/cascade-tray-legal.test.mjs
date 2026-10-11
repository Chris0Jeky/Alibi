import test from 'node:test';
import assert from 'node:assert/strict';
import { legal, placements, shape, SHAPES } from '../src/block-cabinet/cascade.mjs';

const emptyBoard = () => Array(64).fill(0);

test('legal() is false for an undefined tray id instead of throwing', () => {
  const s = { done: false, tray: [undefined, 0, 0], board: emptyBoard(), charges: 3 };
  assert.equal(legal(s, 0, 0), false);
});

test('legal() is false for an out-of-range tray id instead of throwing', () => {
  const s = { done: false, tray: [SHAPES.length, 0, 0], board: emptyBoard(), charges: 3 };
  assert.equal(legal(s, 0, 0), false);
});

test('legal() is false for a bad rotation instead of throwing', () => {
  const s = { done: false, tray: [0, 0, 0], board: emptyBoard(), charges: 3 };
  assert.equal(legal(s, 0, 0, 4), false);
});

test('placements() excludes a corrupt tray slot but keeps valid siblings', () => {
  const s = { done: false, tray: [undefined, 0, 0], board: emptyBoard(), charges: 3 };
  assert.deepEqual(placements(s, 0), []);
  assert.ok(placements(s, 1).length > 0);
});

test('placements() still lists a valid tray slot as control', () => {
  const s = { done: false, tray: [0, 0, 0], board: emptyBoard(), charges: 3 };
  assert.ok(placements(s, 0).length > 0);
});

test('shape() still rejects unknown ids', () => {
  assert.throws(() => shape(SHAPES.length, 0), /Unknown shape or rotation/);
});
