#!/usr/bin/env node
'use strict';
// How far the reasoning Hint carries each official puzzle from a fresh board.
// "Silent" boards get only the generic family tip when a stuck player presses Hint.
// Applicable hints (one cell plus a value) are walked to show how much of the board they reach.
// Hints never read `solution`; it is used here only to score the walk.
const path = require('node:path');
require('../src/core.js');
const C = require('../src/engines.js');
require('../src/bridges.js');
require('../src/network-hints.js');
const I = require('../src/insights.js');
const { load } = require('./official-catalogue.cjs');

function walk(p) {
  const s = C.registry[p.type].initial(p),
    first = I.deduction(p, s),
    cellular = Array.isArray(s.cells) && Array.isArray(p.solution),
    before = cellular ? s.cells.filter((v, i) => v === p.solution[i]).length : 0;
  let steps = 0;
  for (let h = first; cellular && h?.value !== undefined && h.cells?.length === 1; steps++) {
    s.cells[h.cells[0]] = h.value;
    if (steps > p.solution.length) break;
    h = I.deduction(p, s);
  }
  const after = cellular ? s.cells.filter((v, i) => v === p.solution[i]).length : 0,
    open = cellular ? p.solution.length - before : 0;
  return {
    id: p.id,
    type: p.type,
    difficulty: p.difficulty,
    silent: !first || /^Revisit/.test(first.rule),
    steps,
    reach: open ? (after - before) / open : null,
  };
}

function measure(puzzles) {
  const families = {};
  for (const p of puzzles) {
    if (!C.registry[p.type]) continue;
    const r = walk(p),
      f = (families[p.type] ??= { boards: 0, silent: 0, solvedByHints: 0, reach: [] });
    f.boards++;
    if (r.silent) f.silent++;
    if (r.reach !== null) {
      f.reach.push(r.reach);
      if (r.reach === 1) f.solvedByHints++;
    }
  }
  for (const f of Object.values(families)) {
    const sorted = f.reach.sort((a, b) => a - b);
    f.medianReach = sorted.length ? sorted[sorted.length >> 1] : null;
    delete f.reach;
  }
  return families;
}

if (require.main === module) {
  const puzzles = load(path.resolve(__dirname, '..'), false).puzzles,
    families = measure(puzzles);
  if (process.argv.includes('--json')) console.log(JSON.stringify(families, null, 2));
  else {
    console.log('family      boards  silent  solved-by-hints  median-reach');
    for (const [type, f] of Object.entries(families))
      console.log(
        type.padEnd(10),
        String(f.boards).padStart(7),
        String(f.silent).padStart(7),
        String(f.solvedByHints).padStart(16),
        (f.medianReach === null ? '-' : Math.round(f.medianReach * 100) + '%').padStart(13),
      );
    if (process.argv.includes('--silent'))
      for (const p of puzzles)
        if (C.registry[p.type] && walk(p).silent)
          console.log(`${p.type}\t${p.id}\t${p.difficulty}`);
  }
}
module.exports = { measure, walk };
