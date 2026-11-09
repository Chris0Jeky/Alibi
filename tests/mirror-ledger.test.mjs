import test from 'node:test';
import assert from 'node:assert/strict';
import { solve, hint, check } from '../prototypes/mirror-ledger/model.mjs';
import { PUZZLES } from '../prototypes/mirror-ledger/puzzles.mjs';

// Independent exhaustive oracle enumerates all 65,536 boards, then checks pair links.
function boards(givens) {
  const out = [];
  for (let mask = 0; mask < 65536; mask++) {
    const b = Array.from({ length: 16 }, (_, i) => (mask >> i) & 1);
    if (b.some((v, i) => givens[i] !== -1 && givens[i] !== v)) continue;
    const lines = Array.from({ length: 4 }, (_, i) => [
      b.slice(i * 4, i * 4 + 4),
      [b[i], b[i + 4], b[i + 8], b[i + 12]],
    ]).flat();
    if (
      lines.some(
        (l) =>
          l.reduce((a, v) => a + v, 0) !== 2 ||
          (l[0] === l[1] && l[1] === l[2]) ||
          (l[1] === l[2] && l[2] === l[3]),
      )
    )
      continue;
    if (
      new Set(lines.filter((_, i) => i % 2 === 0).map((l) => l.join(''))).size !== 4 ||
      new Set(lines.filter((_, i) => i % 2 === 1).map((l) => l.join(''))).size !== 4
    )
      continue;
    out.push(b);
  }
  return out;
}
function oracle(p, links = p.links) {
  const a = boards(p.givens[0]),
    b = boards(p.givens[1]);
  return {
    a,
    b,
    pairs: a.flatMap((x) =>
      b
        .filter((y) => links.every((l) => (x[l.a] === y[l.b]) === (l.relation === 'same')))
        .map((y) => [x, y]),
    ),
  };
}
test('authored pairs are unique, each board ambiguous, and cross-board clues matter', () => {
  assert.ok(PUZZLES.length >= 6);
  const seen = new Set();
  for (const p of PUZZLES) {
    const o = oracle(p);
    assert.ok(o.a.length > 1 && o.b.length > 1, p.id);
    assert.equal(o.pairs.length, 1, p.id);
    assert.notDeepEqual(o.pairs[0][0], o.pairs[0][1], `${p.id} identical boards`);
    assert.ok(
      o.pairs[0][0].some((v, i) => v === o.pairs[0][1][i]),
      `${p.id} complementary boards`,
    );
    assert.ok(oracle(p, []).pairs.length > 1, p.id);
    for (let i = 0; i < p.links.length; i++)
      assert.ok(
        oracle(
          p,
          p.links.filter((_, j) => j !== i),
        ).pairs.length > 1,
        `${p.id} link ${i + 1}`,
      );
    assert.deepEqual(solve(p).solutions, o.pairs, p.id);
    assert.equal(check(p, o.pairs[0]).complete, true);
    assert.ok(!seen.has(JSON.stringify(o.pairs[0])), p.id);
    seen.add(JSON.stringify(o.pairs[0]));
  }
});
test('hints use current evidence and refuse contradictory or complete states', () => {
  const p = PUZZLES[0],
    h = hint(p, p.givens);
  assert.ok(h && h.board >= 0 && h.index >= 0);
  assert.equal(h.value, solve(p).solutions[0][h.board][h.index]);
  const bad = p.givens.map((x) => x.slice());
  bad[0].fill(1);
  assert.equal(hint(p, bad), null);
  assert.equal(hint(p, solve(p).solutions[0]), null);
  assert.deepEqual(hint({ ...p, solution: [[99], [99]] }, p.givens), h);
});

test('partial contradictions and changed givens are not completions', () => {
  const p = PUZZLES[0],
    bad = p.givens.map((x) => x.slice());
  bad[0].fill(1);
  assert.equal(check(p, bad).possible, false);
  const changed = p.givens.map((x) => x.slice()),
    i = changed[0].findIndex((v) => v !== -1);
  changed[0][i] = 1 - changed[0][i];
  assert.equal(check(p, changed).invalid, true);
});

test('invalid and sparse model inputs return an explicit invalid result', () => {
  const p = PUZZLES[0];
  assert.deepEqual(check(p), check(p, p.givens));
  assert.deepEqual(hint(p), hint(p, p.givens));
  const sparse = new Array(16);
  const cases = [
    undefined,
    null,
    {},
    { ...p, givens: new Array(2) },
    { ...p, givens: [sparse, p.givens[1]] },
    { ...p, links: [null] },
    { ...p, links: new Array(1) },
    { ...p, links: [{ a: 16, b: 0, relation: 'same' }] },
    { ...p, links: Array(17).fill(p.links[0]) },
  ];
  for (const value of cases) {
    assert.deepEqual(solve(value), { solutions: [], invalid: true });
    assert.deepEqual(check(value), { invalid: true, possible: false, complete: false });
    assert.equal(hint(value), null);
  }
  assert.equal(solve(p, new Array(2)).invalid, true);
  assert.equal(solve(p, [sparse, p.givens[1]]).invalid, true);
});
