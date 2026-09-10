'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const E = require('../src/club-engines.js');
const G = E.regionGardens;
const { puzzles } = require('../content/region-gardens.json');
const { solutions } = require('../tools/generate-region-gardens.cjs');
require('../src/core.js');
const C = require('../src/bridges.js');
require('../src/backup-validation.js');

test('Every published garden has connected regions, one solution and answer-free runtime data', () => {
  assert.equal(puzzles.length, 6);
  puzzles.forEach((p, level) => {
    const { solution, ...publicBoard } = p;
    assert.deepEqual(G.layouts[level], publicBoard);
    assert.deepEqual(solutions(p.size, p.regions), [solution]);
    for (let region = 0; region < p.size; region++) {
      const cells = p.regions.flatMap((r, i) => (r === region ? [i] : []));
      const seen = new Set([cells[0]]),
        queue = [cells[0]];
      while (queue.length) {
        const i = queue.shift();
        for (const j of cells)
          if (
            !seen.has(j) &&
            Math.abs((i % p.size) - (j % p.size)) +
              Math.abs(Math.floor(i / p.size) - Math.floor(j / p.size)) ===
              1
          ) {
            seen.add(j);
            queue.push(j);
          }
      }
      assert.equal(seen.size, cells.length);
    }
    const finished = G.replay(level, solution);
    assert.equal(finished.done, true);
    assert.throws(() => G.move(finished, 0));
    assert.equal(G.replay(level, solution.slice(0, -1)).done, false);
  });
});

test('Garden marks cycle without mutation and conflicts do not erase choices', () => {
  const empty = G.initial(),
    one = G.move(empty, 0),
    two = G.move(one, 0);
  assert.equal(empty.marks[0], 0);
  assert.equal(one.marks[0], 1);
  assert.equal(two.marks[0], 2);
  assert.deepEqual(G.move(two, 0), empty);
  const conflict = G.move(one, 1);
  assert.deepEqual(G.conflicts(conflict), [0, 1]);
  assert.equal(conflict.done, false);
  for (const bad of [-1, 36, 0.5, '0', null]) assert.throws(() => G.move(empty, bad));
  assert.throws(() => G.replay(6, []));
  assert.throws(() => G.replay(0, Array(3001).fill(0)));
});

test('Garden backups replay both current and redo histories', () => {
  const v = AlibiBackupValidation(C, null, () => E, 4);
  const save = {
    schema: 1,
    settings: { assist: 'off', zen: false, pinned: null },
    visit: 1,
    lastHero: -1,
    runs: { regiongardens: { level: 0, log: [0], redo: [0] } },
    records: [],
    stamps: [],
  };
  assert.doesNotThrow(() => v.validateSave(save));
  save.runs.regiongardens.redo = [99];
  assert.throws(() => v.validateSave(save));
  save.runs.regiongardens = { level: 0, log: puzzles[0].solution, redo: [0] };
  assert.throws(() => v.validateSave(save));
});
