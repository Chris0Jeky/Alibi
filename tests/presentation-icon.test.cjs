'use strict';

// An unknown icon name used to be able to render an empty glyph. icon() falls
// back to the sudoku path. This locks that fallback. It does not paint a pixel.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadUi() {
  const ui = {};
  vm.createContext(ui);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/presentation.js'), 'utf8'), ui);
  return ui.AlibiUI;
}

test('an unknown icon name draws the sudoku glyph', () => {
  const { icon } = loadUi();
  const sudoku = icon('sudoku');
  assert.equal(icon('not-a-real-icon'), sudoku);
  assert.equal(icon(''), sudoku);
  assert.equal(icon(), sudoku);
  assert.match(sudoku, /M9 3v18m6-18v18M3 9h18M3 15h18/);
  const pause = icon('pause');
  assert.notEqual(pause, sudoku);
  assert.match(pause, /M8 5v14M16 5v14/);
  assert.match(icon('pause', 'btn-icon'), /class="icon btn-icon"/);
});
