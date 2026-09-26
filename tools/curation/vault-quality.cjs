'use strict';
// Additional authoring evidence only. No browser or import-worker dependency.
const assert = require('node:assert/strict');
const Base = require('./study-quality.cjs');
const C = globalThis.AlibiCore;
require('../../src/insights.js');
const range = (n) => Array.from({ length: n }, (_, i) => i);
const bits = (mask) => range(9).filter((i) => mask & (1 << i)).map((i) => i + 1);

function sudoku(givens, limit = 2, budget = 250000, random = null) {
  assert.ok(Array.isArray(givens) && givens.length === 81);
  assert.ok(givens.every((v) => Number.isInteger(v) && v >= 0 && v <= 9));
  assert.ok(Number.isInteger(limit) && limit >= 1 && limit <= 2);
  assert.ok(Number.isInteger(budget) && budget > 0);
  const cells = givens.slice(), rows = Array(9).fill(0), cols = rows.slice(), boxes = rows.slice();
  const box = (i) => Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3);
  for (let i = 0; i < 81; i++) if (cells[i]) {
    const bit = 1 << (cells[i] - 1), r = Math.floor(i / 9), c = i % 9, b = box(i);
    if ((rows[r] | cols[c] | boxes[b]) & bit) return { count: 0, first: null, nodes: 0, exhausted: false };
    rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
  }
  let count = 0, first = null, nodes = 0, exhausted = false;
  function search() {
    if (count >= limit || exhausted) return;
    if (nodes >= budget) { exhausted = true; return; }
    nodes++;
    let best = -1, choices = null;
    for (let i = 0; i < 81; i++) if (!cells[i]) {
      const options = bits(511 & ~(rows[Math.floor(i / 9)] | cols[i % 9] | boxes[box(i)]));
      if (!options.length) return;
      if (!choices || options.length < choices.length) { best = i; choices = options; if (options.length === 1) break; }
    }
    if (best < 0) { count++; first ||= cells.slice(); return; }
    if (random) for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    const r = Math.floor(best / 9), c = best % 9, b = box(best);
    for (const value of choices) {
      const bit = 1 << (value - 1);
      cells[best] = value; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      search();
      rows[r] ^= bit; cols[c] ^= bit; boxes[b] ^= bit; cells[best] = 0;
      if (count >= limit || exhausted) break;
    }
  }
  search();
  return { count, first, nodes, exhausted };
}
function identity(puzzle) {
  if (puzzle.type !== 'sudoku') return Base.structuralKey(puzzle);
  const variants = Base.transforms(puzzle.solution, 9).map((values) => {
    const labels = new Map();
    return values.map((v) => { if (!labels.has(v)) labels.set(v, labels.size); return labels.get(v); }).join(',');
  });
  return 'sudoku:9:' + variants.sort()[0];
}
function numericProfile(p) {
  const n = p.size, groups = [
    ...range(n).map((r) => range(n).map((c) => r * n + c)),
    ...range(n).map((c) => range(n).map((r) => r * n + c)),
  ];
  if (p.type === 'sudoku') for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
    groups.push(range(9).map((i) => (r * 3 + Math.floor(i / 3)) * 9 + c * 3 + i % 3));
  const domains = p.givens.map((v) => v ? [v] : range(n).map((i) => i + 1));
  let changed = true, rounds = 0;
  while (changed) {
    changed = false; rounds++;
    const retain = (i, values) => {
      assert.ok(values.length, 'Contradictory profile domains');
      if (values.length < domains[i].length) { domains[i] = values; changed = true; }
    };
    for (const group of groups) {
      const fixed = group.filter((i) => domains[i].length === 1).map((i) => domains[i][0]);
      assert.equal(new Set(fixed).size, fixed.length, 'Duplicate forced value');
      for (const i of group) if (domains[i].length > 1) retain(i, domains[i].filter((v) => !fixed.includes(v)));
      for (let v = 1; v <= n; v++) {
        const locations = group.filter((i) => domains[i].includes(v));
        assert.ok(locations.length, 'A unit lost a value');
        if (locations.length === 1) retain(locations[0], [v]);
      }
    }
    if (p.type === 'futoshiki') for (const q of p.inequalities) {
      const low = q.op === '<' ? q.a : q.b, high = q.op === '<' ? q.b : q.a;
      retain(low, domains[low].filter((v) => v < Math.max(...domains[high])));
      retain(high, domains[high].filter((v) => v > Math.min(...domains[low])));
    }
  }
  const resolved = domains.filter((d) => d.length === 1).length;
  return { method: p.type === 'sudoku' ? 'naked-and-hidden-singles' : 'singles-and-inequality-range-propagation', rounds, resolved, unresolved: n ** 2 - resolved, candidates: domains.reduce((sum, d) => sum + d.length, 0) };
}
function profile(p) {
  if (p.type === 'sudoku' || p.type === 'futoshiki') return numericProfile(p);
  if (p.type !== 'binary' && p.type !== 'lightup') return { method: 'unsupported', steps: 0, unresolved: null, complete: null, rules: {}, reason: `No answer-free profile for ${p.type}` };
  const safe = new Proxy(p, { get(target, key) { if (key === 'solution') throw Error('Profile read the answer'); return target[key]; } });
  const engine = C.registry[p.type];
  let state = engine.initial(safe), steps = 0;
  const rules = {};
  while (steps < p.size ** 2 && !engine.complete(safe, state)) {
    const hint = C.insights.deduction(safe, state);
    if (!hint || hint.cells.length !== 1 || ![0, 1].includes(hint.value)) break;
    const cell = hint.cells[0];
    if (state.cells[cell] !== -1) break;
    state = engine.reduce(safe, state, { type: 'set', cell, value: hint.value });
    rules[hint.rule] = (rules[hint.rule] || 0) + 1; steps++;
  }
  return { method: p.type === 'binary' ? 'pair-and-line-balance-hints' : 'local-wall-and-light-coverage-hints', steps, unresolved: state.cells.filter((v, i) => v === -1 && (p.type !== 'lightup' || p.walls[i] === -2)).length, complete: engine.complete(safe, state), rules };
}
function certify(p) {
  let proof;
  if (p.type === 'sudoku') {
    C.validateDefinition(p);
    const independent = sudoku(p.givens), native = C.solve(p, null, 2, 250000);
    assert.equal(independent.exhausted, false);
    assert.equal(independent.count, 1);
    assert.deepEqual(independent.first, p.solution);
    assert.ok(native.nodes < 250000);
    assert.deepEqual(native.solutions, [p.solution]);
    proof = { id: p.id, revision: p.revision, definitionSha256: Base.definitionHash(p), structuralKey: identity(p), nativeNodes: native.nodes, independentNodes: independent.nodes, semanticSolutions: 1, replayActions: Base.replay(p), metrics: { size: 9, givens: p.givens.filter(Boolean).length } };
  } else proof = Base.certify(p);
  proof.profile = profile(p);
  return proof;
}
module.exports = { sudoku, identity, profile, certify, definitionHash: Base.definitionHash };
