'use strict';
// The 382-vs-510 drift (#518): developer docs must state the measured
// trusted-registry total, and the bundled total must agree with the registry.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const FAMILY_TYPES = {
  'Tidal bridges': 'bridges',
  'Crime scenes': 'scene',
  'Alibi files': 'dossier',
  'Witness statements': 'witness',
  'Picture logic': 'nonogram',
  Lanterns: 'lightup',
  'Tents & trees': 'tents',
  Aquariums: 'aquarium',
  'Signal paths': 'network',
  'Number trails': 'trail',
  Sudoku: 'sudoku',
  'Sun & moon': 'binary',
  Futoshiki: 'futoshiki',
};

function registryTotals() {
  const registry = JSON.parse(
    fs.readFileSync(path.join(root, 'content/official-packs.json'), 'utf8'),
  );
  const byType = {};
  let total = 0;
  let deferredPuzzles = 0;
  for (const file of registry.packs) {
    const pack = JSON.parse(fs.readFileSync(path.join(root, 'content', file), 'utf8'));
    const deferred = registry.deferred.includes(file);
    for (const puzzle of pack.puzzles) {
      byType[puzzle.type] = (byType[puzzle.type] || 0) + 1;
      total += 1;
      if (deferred) deferredPuzzles += 1;
    }
  }
  return { packs: registry.packs.length, total, deferredPuzzles, byType };
}

function documentedFamilyCounts(markdown) {
  const rows = [
    ...markdown.matchAll(
      /^[ \t]*\|[ \t]*([^|\r\n]+?)[ \t]*\|[ \t]*(\d+)[ \t]*\|[^\r\n|]*\|[ \t]*$/gm,
    ),
  ];
  return Object.fromEntries(rows.map((row) => [row[1].trim(), Number(row[2])]));
}

function assertFamilyTable(markdown, expected, total) {
  const documented = documentedFamilyCounts(markdown);
  assert.deepEqual(Object.keys(documented).sort(), Object.keys(expected).sort());
  for (const [family, count] of Object.entries(expected)) {
    assert.equal(documented[family], count, `${family} count`);
  }
  assert.equal(
    Object.values(documented).reduce((sum, count) => sum + count, 0),
    total,
    'family table must sum to the registry total',
  );
}

test('AGENTS.md headline states the trusted-registry puzzle total', () => {
  const { total } = registryTotals();
  const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  assert.ok(agents.includes(`${total} puzzles`), `AGENTS.md must state ${total} puzzles`);
  assert.ok(agents.includes('build-info.json'), 'AGENTS.md must point at build-info.json');
});

test('PROJECT-MAP.md registry row and family table match measured state', () => {
  const { packs, total, byType } = registryTotals();
  const map = fs.readFileSync(path.join(root, 'docs/PROJECT-MAP.md'), 'utf8');
  assert.ok(map.includes(`${total} puzzles across ${packs}`), 'registry row must state totals');
  assert.ok(map.includes('build-info.json'), 'map must point at build-info.json');
  const expected = Object.fromEntries(
    Object.entries(FAMILY_TYPES).map(([family, type]) => [family, byType[type]]),
  );
  assertFamilyTable(map, expected, total);
});

test('family table assertions accept aligned cells and reject drift', () => {
  const expected = {
    'Tidal bridges': 32,
    'Crime scenes': 43,
    'Alibi files': 29,
    'Witness statements': 31,
    'Picture logic': 40,
    Lanterns: 52,
    'Tents & trees': 32,
    Aquariums: 32,
    'Signal paths': 32,
    'Number trails': 32,
    Sudoku: 49,
    'Sun & moon': 55,
    Futoshiki: 51,
  };
  const fixture = [
    '| Family | Count | Main interaction |',
    '| --- | ---: | --- |',
    ...Object.entries(expected).map(
      ([family, count]) => `|   ${family}   |   ${count}   | fixture |`,
    ),
  ].join('\n');

  assertFamilyTable(fixture, expected, 510);
  assert.throws(() =>
    assertFamilyTable(
      fixture.replace('|   Tidal bridges   |   32   |', '|   Tidal bridges   |   33   |'),
      expected,
      510,
    ),
  );
  assert.throws(() =>
    assertFamilyTable(
      fixture.replace(/\|   Futoshiki   \|   51   \| fixture \|\n?/, ''),
      expected,
      510,
    ),
  );
  assert.throws(() =>
    assertFamilyTable(fixture.replace('Futoshiki', 'Light loops'), expected, 510),
  );
});

test('bundled build-info.json totals agree with the trusted registry', () => {
  const { total, deferredPuzzles } = registryTotals();
  const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json'), 'utf8'));
  assert.equal(info.puzzles, total, 'bundled puzzles must equal the registry total');
  assert.equal(info.deferredPuzzles, deferredPuzzles, 'bundled deferred count must match');
});
