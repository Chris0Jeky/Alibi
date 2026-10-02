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
  const rows = [...map.matchAll(/^\| ([^|]+) \| (\d+) \| [^|]+ \|$/gm)];
  const documented = Object.fromEntries(rows.map((row) => [row[1], Number(row[2])]));
  assert.deepEqual(Object.keys(documented).sort(), Object.keys(FAMILY_TYPES).sort());
  for (const [family, type] of Object.entries(FAMILY_TYPES)) {
    assert.equal(documented[family], byType[type], `${family} count`);
  }
  assert.equal(
    Object.values(documented).reduce((sum, count) => sum + count, 0),
    total,
    'family table must sum to the registry total',
  );
});

test('bundled build-info.json totals agree with the trusted registry', () => {
  const { total, deferredPuzzles } = registryTotals();
  const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json'), 'utf8'));
  assert.equal(info.puzzles, total, 'bundled puzzles must equal the registry total');
  assert.equal(info.deferredPuzzles, deferredPuzzles, 'bundled deferred count must match');
});
