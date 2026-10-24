'use strict';

// #220: the radius scale tokens hold the exact published values and every
// standalone scale value, retired scalar and larger panel radius use them.
// Six board/decorative shapes and fine details stay excluded. Named multi-value
// shapes retain their geometry; clear controls and the legacy alias use the scale.

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
      if (!retired.has(value) && !(value >= 18 && value <= 30)) continue;
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

test('legacy --radius has one definition aliasing the panel token', () => {
  const definitions = sources.flatMap(([file, css]) =>
    Array.from(css.matchAll(/--radius\s*:\s*([^;]+);/g), (m) => [file, m[1].trim()]),
  );
  assert.deepEqual(definitions, [['app.css', 'var(--radius-lg)']]);
});

test('migrated controls and pills keep their intended scale step', () => {
  const byFile = Object.fromEntries(sources);
  for (const [file, selector, token] of [
    ['theatre.css', '.theatre-stage-copy button', 'sm'],
    ['theatre.css', '.theatre-screenings button', 'sm'],
    ['app.css', '.chip', 'pill'],
    ['app.css', ".setting-row input[type='checkbox']", 'pill'],
    ['club.css', '.zen-exit', 'pill'],
    ['theatre.css', '.theatre-controls button,\n.theatre-stage-copy button', 'pill'],
  ]) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(
      byFile[file],
      new RegExp(`(?:^|})\\s*${escaped}\\s*\\{[^}]*border-radius:\\s*var\\(--radius-${token}\\);`),
      `${file}: ${selector} must use radius-${token}`,
    );
  }
});

test('named asymmetric radius exceptions retain their component shapes', () => {
  const byFile = Object.fromEntries(sources);
  assert.match(byFile['expedition.css'], /--radius-case-file:\s*5px 14px 14px 5px;/);
  for (const [file, selector, radius] of [
    ['app.css', '.quick-sheet', '22px 22px 0 0'],
    ['expedition.css', '.book-card', 'var\\(--radius-case-file\\)'],
    ['after-hours.css', '.club-letter', '8px 15px 11px 7px'],
  ]) {
    assert.match(
      byFile[file],
      new RegExp(`${selector.replace('.', '\\.')}\\s*\\{[^}]*border-radius:\\s*${radius};`),
      `${file} must retain the named ${selector} exception`,
    );
  }
});
