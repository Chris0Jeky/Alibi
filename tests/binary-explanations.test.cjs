'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('../tools/official-catalogue.cjs');
const C = globalThis.AlibiCore;
const I = require('../src/insights.js');

test('two-square explanations cover quota and distinct-line rejections without repetition', () => {
  for (const transpose of [false, true]) {
    const p = {
      type: 'binary',
      size: 6,
      givens: Array(36).fill(-1),
      get solution() {
        throw Error('Explanation consulted the answer');
      },
    };
    const state = C.registry.binary.initial(p);
    state.cells.splice(0, 6, 0, 1, 0, 1, 0, 1);
    state.cells.splice(18, 6, 0, 1, -1, -1, 0, 1);
    if (transpose)
      state.cells = state.cells.map((_, i, cells) => cells[(i % 6) * 6 + Math.floor(i / 6)]);
    const before = structuredClone(state),
      hint = I.deduction(p, state);
    assert.equal(hint.cells[0], transpose ? 15 : 20);
    assert.equal(hint.value, 1);
    assert.match(hint.message, /equal numbers of suns and moons/);
    assert.match(hint.message, /Completed rows and columns must be different/);
    assert.equal(hint.message.match(/equal numbers of suns and moons/g).length, 1);
    assert.equal(hint.message.match(/Completed rows and columns must be different/g).length, 1);
    assert.ok(hint.message.length < 240, 'at most the three binary constraint messages');
    assert.deepEqual(state, before);
  }
});
