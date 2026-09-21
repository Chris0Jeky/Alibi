'use strict';
/* Saved grid-note keys must be canonical cell numbers, matching scene candidates. */
const assert = require('node:assert/strict'),
  path = require('node:path'),
  C = require(path.join(__dirname, '..', 'src', 'core.js'));
const p = { type: 'sudoku', size: 4 },
  cells = Array(16).fill(0);
assert.doesNotThrow(() => C.validateState(p, { notes: { 1: [2] }, cells }));
assert.throws(() => C.validateState(p, { notes: { '01': [2] }, cells }), /Invalid number notes/);
console.log('PASS 2 state note-key assertions');
