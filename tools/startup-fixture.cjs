'use strict';

// Deterministic synthetic runs for the real-origin startup series. No player data.
const assert = require('node:assert/strict');
const path = require('node:path');
const { load } = require('./official-catalogue.cjs');
require('../src/backup-validation.js');
const C = globalThis.AlibiCore;
const catalog = load(path.resolve(__dirname, '..'), false);
const validate = globalThis.AlibiBackupValidation(C, catalog, () => ({}), 4).validateRun;

function fixture(count, depth) {
  assert.ok([0, 50, 100].includes(count));
  assert.ok([0, 40, 200].includes(depth));
  const puzzles = catalog.puzzles.filter((p) => ['sudoku', 'futoshiki'].includes(p.type));
  assert.ok(puzzles.length >= count);
  const runs = puzzles.slice(0, count).map((puzzle) => {
    let state = C.registry[puzzle.type].initial(puzzle);
    const cells = puzzle.givens.flatMap((value, cell) => (value === 0 ? [cell] : []));
    assert.ok(cells.length > 0);
    const history = [C.clone(state)];
    for (let i = 0; i < depth; i++) {
      state = C.registry[puzzle.type].reduce(puzzle, state, {
        type: 'set',
        cell: cells[i % cells.length],
        value: (Math.floor(i / cells.length) % puzzle.size) + 1,
        pencil: true,
      });
      history.push(C.clone(state));
    }
    const half = depth / 2;
    const run = {
      schemaVersion: 1,
      key: `${puzzle.id}@${puzzle.revision}`,
      rev: 0,
      puzzle: C.clone(puzzle),
      state: C.clone(history[half]),
      undo: history.slice(0, half),
      redo: history.slice(half + 1).reverse(),
      moves: depth,
      hints: 0,
      elapsed: 3600,
      completedAt: null,
      firstCompletedAt: null,
      updatedAt: '2026-10-16T00:00:00.000Z',
      note: '',
    };
    validate(run);
    return run;
  });
  assert.equal(new Set(runs.map((r) => r.key)).size, count);
  return runs;
}

if (require.main === module) {
  const count = Number(process.argv[2]);
  const depth = Number(process.argv[3]);
  process.stdout.write(JSON.stringify(fixture(count, depth)));
}
module.exports = { fixture };
