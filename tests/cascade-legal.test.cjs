'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('legal returns false for unknown shape id 99 without throwing', async () => {
  const { legal } = await import('../src/block-cabinet/cascade.mjs');
  const s = { done: false, charges: 3, tray: [99, 0, 1], board: Array(64).fill(0) };
  assert.doesNotThrow(() => legal(s, 0, 0, 0));
  assert.equal(legal(s, 0, 0, 0), false);
});

test('legal returns false for null tray without throwing', async () => {
  const { legal } = await import('../src/block-cabinet/cascade.mjs');
  assert.doesNotThrow(() => legal({ done: false, charges: 3, tray: null, board: Array(64).fill(0) }, 0, 0, 0));
  assert.equal(legal({ done: false, charges: 3, tray: null, board: Array(64).fill(0) }, 0, 0, 0), false);
  assert.equal(legal({ done: false, charges: 3, tray: [null, 0, 1], board: Array(64).fill(0) }, 0, 0, 0), false);
});

test('legal returns boolean for valid initial tray placement without throwing', async () => {
  const { initial, legal } = await import('../src/block-cabinet/cascade.mjs');
  const s = initial();
  let result;
  assert.doesNotThrow(() => {
    result = legal(s, 0, 0, 0);
  });
  assert.equal(typeof result, 'boolean');
});

test('placements returns [] for unknown shape id without throwing', async () => {
  const { placements } = await import('../src/block-cabinet/cascade.mjs');
  const s = { done: false, charges: 3, tray: [99, 0, 1], board: Array(64).fill(0) };
  let result;
  assert.doesNotThrow(() => {
    result = placements(s, 0, 0);
  });
  assert.deepEqual(result, []);
});
