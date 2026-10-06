'use strict';
/* Saved grid-note keys must be canonical cell numbers, matching scene candidates. */
const { test } = require('node:test');
const assert = require('node:assert/strict'),
  path = require('node:path'),
  C = require(path.join(__dirname, '..', 'src', 'core.js'));
const p = { type: 'sudoku', size: 4 },
  cells = Array(16).fill(0);
test('saved grid notes accept canonical cell-number keys', () => {
  assert.doesNotThrow(() => C.validateState(p, { notes: { 1: [2] }, cells }));
});

test('saved grid notes reject zero-padded cell-number aliases', () => {
  assert.throws(() => C.validateState(p, { notes: { '01': [2] }, cells }), /Invalid number notes/);
});
