'use strict';

// #220: the radius scale tokens hold the exact published values and every
// standalone 8/12/16/999px border-radius in the main bundle consumes them.
// Near values (4/5/7/9/10/...) stay literal until a later slice collapses them
// deliberately; multi-value shorthands are named one-offs, not scale steps.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const BUNDLE = [
  'app.css',
  'cabinet.css',
  'expedition.css',
  'club.css',
  'atmosphere.css',
  'curation.css',
  'after-hours.css',
  'theatre.css',
];
const sources = BUNDLE.map((f) => [
  f,
  fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'),
]);

test('radius scale tokens hold their exact values', () => {
  const root = sources.find(([f]) => f === 'app.css')[1];
  for (const [name, value] of [
    ['--radius-sm', '8px'],
    ['--radius-md', '12px'],
    ['--radius-lg', '16px'],
    ['--radius-pill', '999px'],
  ]) {
    assert.match(root, new RegExp(`${name}:\\s*${value};`), `${name} must stay ${value}`);
  }
});

test('no standalone scale literal remains in the main bundle', () => {
  for (const [file, css] of sources) {
    const strays = [...css.matchAll(/border-radius:\s*(\d+)px(\s*!important)?\s*;/g)]
      .map((m) => m[1])
      .filter((v) => ['8', '12', '16', '999'].includes(v));
    assert.deepEqual(strays, [], `${file} still maps ${strays.join(',')}px literally`);
  }
});

test('legacy --radius cascade is untouched by this slice', () => {
  const byFile = Object.fromEntries(sources);
  assert.match(byFile['app.css'], /--radius:\s*18px;/);
  assert.match(byFile['cabinet.css'], /--radius:\s*16px;/);
});
