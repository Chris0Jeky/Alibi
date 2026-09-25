'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
function tools() {
  assert.ok(fs.existsSync('tools/curation/vault-quality.cjs'), 'vault evidence tools exist');
  return require('../tools/curation/vault-quality.cjs');
}
test('independent Sudoku enumeration distinguishes unique, ambiguous, invalid and exhausted', () => {
  const { sudoku } = tools();
  const p = require('../content/extra/sudoku-expert.json').puzzles[0];
  const result = sudoku(p.givens);
  assert.equal(result.count, 1);
  assert.equal(result.exhausted, false);
  assert.deepEqual(result.first, p.solution);
  assert.equal(sudoku(Array(81).fill(0)).count, 2);
  const invalid = p.givens.slice(); invalid[0] = invalid[1] = 1;
  assert.equal(sudoku(invalid).count, 0);
  assert.equal(sudoku(Array(81).fill(0), 2, 1).exhausted, true);
});
test('profiles never inspect the stored answer and do not overstate their method', () => {
  const { profile } = tools();
  const p = require('../content/extra/sudoku-expert.json').puzzles[0];
  const safe = new Proxy(p, { get(target, key) {
    if (key === 'solution') throw Error('answer accessed');
    return target[key];
  } });
  const result = profile(safe);
  assert.equal(result.method, 'naked-and-hidden-singles');
  assert.ok(result.unresolved > 0);
  assert.equal(Object.hasOwn(result, 'humanDifficulty'), false);
});
test('Sudoku identities reject digit relabeling and certificates reject edited answers', () => {
  const { identity, certify } = tools();
  const p = structuredClone(require('../content/extra/sudoku-expert.json').puzzles[0]);
  const relabeled = { ...p, solution: p.solution.map((n) => (n % 9) + 1) };
  assert.equal(identity(p), identity(relabeled));
  p.solution[0] = p.solution[1];
  assert.throws(() => certify(p));
});
