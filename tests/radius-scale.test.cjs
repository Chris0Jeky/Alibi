'use strict';

// #220: the radius scale tokens hold the exact published values and every
// standalone scale value and the eight scalar values retired by #355 use them.
// Six board/decorative shapes, smaller details and larger panels stay excluded. Named
// multi-value shorthands and the legacy alias are not scalar scale steps.

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
  fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
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

test('no standalone scale or retired scalar radius returns outside named exceptions', () => {
  const exceptions = {
    '.paperclip': 9,
    '.tic-grid.tictactoe-grid': 9,
    '.duel-grid': 7,
    '.borough-grid': 9,
    '.block-grid': 9,
    '.archive-grid': 7,
  };
  const retired = new Set([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 999]);
  const retained = [];
  for (const [file, css] of sources) {
    const strays = [];
    for (const match of css.matchAll(/border-radius:\s*(\d+(?:\.\d+)?)px(?:\s*!important)?\s*;/g)) {
      const value = Number(match[1]);
      if (!retired.has(value)) continue;
      const open = css.lastIndexOf('{', match.index);
      const start = Math.max(css.lastIndexOf('}', open - 1), css.lastIndexOf('{', open - 1));
      const selector = css.slice(start + 1, open).trim();
      if (file === 'club.css' && exceptions[selector] === value) retained.push([selector, value]);
      else strays.push(`${selector}: ${value}px`);
    }
    assert.deepEqual(strays, [], `${file} reintroduces a migrated scalar radius`);
  }
  assert.deepEqual(
    retained.sort(),
    Object.entries(exceptions).sort(),
    'preserve each excluded shape exactly once',
  );
});

test('legacy --radius cascade is untouched by this slice', () => {
  const byFile = Object.fromEntries(sources);
  assert.match(byFile['app.css'], /--radius:\s*18px;/);
  assert.match(byFile['cabinet.css'], /--radius:\s*16px;/);
});

test('named asymmetric radius exceptions retain their component shapes', () => {
  const byFile = Object.fromEntries(sources);
  for (const [file, selector, radius] of [
    ['app.css', '.quick-sheet', '22px 22px 0 0'],
    ['expedition.css', '.book-card', '5px 14px 14px 5px'],
    ['after-hours.css', '.club-letter', '8px 15px 11px 7px'],
  ]) {
    assert.match(
      byFile[file],
      new RegExp(`${selector.replace('.', '\\.')}\\s*\\{[^}]*border-radius:\\s*${radius};`),
      `${file} must retain the named ${selector} exception`,
    );
  }
});
