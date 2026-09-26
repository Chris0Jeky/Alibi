'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const C = require('../src/core.js');
require('../src/engines.js');
require('../src/bridges.js');
const assist = require('../src/assist.js');

test('shared coordinates retain every supported board label and legacy facade', () => {
  assert.equal(typeof C.at, 'function');
  for (const n of [3, 4, 5, 6, 7, 8, 9, 10, 12, 15]) {
    const p = { size: n, islands: Array.from({ length: n * n }, (_, cell) => ({ cell })) };
    for (let row = 0; row < n; row++)
      for (let col = 0; col < n; col++) {
        const i = row * n + col,
          expected = 'ABCDEFGHIJKLMNO'[col] + (row + 1);
        assert.equal(C.at(i, n), expected);
        assert.equal(assist.at(i, n), expected);
        assert.equal(C.bridges.coordinate(p, i), expected);
      }
  }
});
