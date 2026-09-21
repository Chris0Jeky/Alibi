'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('Search metadata uses a truthful stable lower bound, not a stale exact count', () => {
  const html = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
  const description = html.match(/name="description"\s+content="([^"]+)"/)[1];
  assert.match(description, /300\+ mystery, logic and visual puzzles/);
  assert.ok(require('../tools/official-catalogue.cjs').load(root).puzzles.length >= 300);
});
