'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
require('../src/core.js');
const C = require('../src/engines.js'),
  NetworkHints = require('../src/network-hints.js'),
  Insights = require('../src/insights.js'),
  published = require('../content/catalog.json').puzzles,
  curatedPath = path.join(__dirname, '../content/curation/packs/network.json'),
  curated = JSON.parse(fs.readFileSync(curatedPath, 'utf8')).puzzles;

function rotate(mask, turns) {
  for (let i = 0; i < turns; i++) mask = ((mask << 1) & 15) | (mask >>> 3);
  return mask;
}

test('network guidance is answer-independent and forces verified orientations', () => {
  const puzzles = [...published.filter((p) => p.type === 'network'), ...curated];
  assert.equal(puzzles.length, 24);
  for (const p of puzzles) {
    const start = C.registry.network.initial(p),
      before = structuredClone(start),
      guarded = new Proxy(p, {
        get(target, key, receiver) {
          if (key === 'solution') throw new Error('network guidance read stored solution');
          return Reflect.get(target, key, receiver);
        },
      }),
      hint = NetworkHints.hint(guarded, start);
    assert.equal(start.rotations.join(','), before.rotations.join(','), `${p.id} is immutable`);
    assert.equal(hint?.rule, 'An orientation is forced', `${p.id} has a useful opening hint`);
    const cell = hint.cells[0];
    assert.equal(hint.requiredMask, rotate(p.tiles[cell], p.solution[cell]), `${p.id} forced mask`);
    assert.equal(
      Insights.deduction(guarded, start).requiredMask,
      hint.requiredMask,
      `${p.id} insight integration`,
    );
    const solved = { rotations: p.solution.slice() };
    assert.equal(NetworkHints.hint(p, solved), null, `${p.id} solved board has no forced change`);
  }
});
