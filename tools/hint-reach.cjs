#!/usr/bin/env node
'use strict';
// How far the reasoning Hint carries each official puzzle from a fresh board.
// "Silent" boards get only the generic family tip when a stuck player presses Hint.
// Applicable hints (one cell plus a value) are walked; completion uses the engine's own rule.
// Hints never read `solution`; it is used here only to score the walk.
const path = require('node:path');
require('../src/core.js');
const C = require('../src/engines.js');
require('../src/bridges.js');
require('../src/network-hints.js');
require('../src/assist.js'); // scene hints reuse the Candidates exclusions
const I = require('../src/insights.js');
const { load } = require('./official-catalogue.cjs');

function walk(p) {
  const R = C.registry[p.type],
    s = R.initial(p),
    first = I.deduction(p, s),
    // Only single-cell value hints can be applied; other families explain without a move.
    applicable = (h) => Array.isArray(s.cells) && h?.value !== undefined && h.cells?.length === 1;
  let steps = 0;
  for (let h = first; applicable(h) && steps <= s.cells.length; steps++) {
    s.cells[h.cells[0]] = h.value;
    h = I.deduction(p, s);
  }
  return {
    id: p.id,
    type: p.type,
    difficulty: p.difficulty,
    silent: !first || /^Revisit/.test(first.rule),
    steps: applicable(first) ? steps : null,
    // The engine's own completion rule, so walls, trees and optional crosses do not count.
    solved: R.complete(p, s),
  };
}

function measure(puzzles) {
  const families = {};
  for (const p of puzzles) {
    if (!C.registry[p.type]) continue;
    const r = walk(p),
      f = (families[p.type] ??= { boards: 0, silent: 0, solvedByHints: 0, steps: [] });
    f.boards++;
    if (r.silent) f.silent++;
    if (r.solved) f.solvedByHints++;
    if (r.steps !== null) f.steps.push(r.steps);
  }
  for (const f of Object.values(families)) {
    const sorted = f.steps.sort((a, b) => a - b);
    f.medianSteps = sorted.length ? sorted[sorted.length >> 1] : null;
    delete f.steps;
  }
  return families;
}

if (require.main === module) {
  const puzzles = load(path.resolve(__dirname, '..'), false).puzzles,
    families = measure(puzzles);
  if (process.argv.includes('--json')) console.log(JSON.stringify(families, null, 2));
  else {
    console.log('family      boards  silent  solved-by-hints  median-hint-steps');
    for (const [type, f] of Object.entries(families))
      console.log(
        type.padEnd(10),
        String(f.boards).padStart(7),
        String(f.silent).padStart(7),
        String(f.solvedByHints).padStart(16),
        String(f.medianSteps ?? '-').padStart(18),
      );
    if (process.argv.includes('--silent'))
      for (const p of puzzles)
        if (C.registry[p.type] && walk(p).silent)
          console.log(`${p.type}\t${p.id}\t${p.difficulty}`);
  }
}
module.exports = { measure, walk };
