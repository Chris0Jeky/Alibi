import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePuzzle,
  check,
  solve,
  hint,
  applyMark,
  component,
} from '../src/eclipse-lab/model.mjs';
const base = {
  id: 'test',
  revision: 1,
  mode: 'constellation',
  size: 4,
  title: 'Test',
  lesson: 'Test',
  level: 1,
  givens: Array(16).fill(-1),
  links: [],
  windows: [],
  rowTargets: [2, 2, 2, 2],
  colTargets: [2, 2, 2, 2],
};
test('bounded solver distinguishes multiple, none and exhausted', () => {
  assert.equal(solve(base).solutions.length, 2);
  assert.equal(solve({ ...base, givens: [1, 1, 1, ...Array(13).fill(-1)] }).solutions.length, 0);
  assert.equal(solve(base, base.givens, { maxNodes: 1 }).exhausted, true);
});
test('component and linked marking are atomic', () => {
  const p = {
    ...base,
    links: [
      { a: 0, b: 1, relation: 'opposite' },
      { a: 1, b: 2, relation: 'same' },
    ],
  };
  assert.deepEqual(component(p, 0), [
    { cell: 0, parity: 0 },
    { cell: 1, parity: 1 },
    { cell: 2, parity: 1 },
  ]);
  assert.deepEqual(
    applyMark(p, p.givens, { cell: 0, value: 1, linked: true }).cells.slice(0, 3),
    [1, 0, 0],
  );
  const q = { ...p, givens: [-1, 1, ...Array(14).fill(-1)] };
  assert.equal(applyMark(q, q.givens, { cell: 0, value: 1, linked: true }).ok, false);
});
test('hints never inspect stored answer', () => {
  const p = { ...base, givens: [1, 1, -1, ...Array(13).fill(-1)] };
  Object.defineProperty(p, 'solution', {
    get() {
      throw Error('answer read');
    },
  });
  assert.deepEqual(hint(p, p.givens), {
    cell: 2,
    value: 0,
    reason: 'This line cannot contain three consecutive matching symbols.',
  });
  assert.equal(check(p, p.givens).complete, false);
  assert.equal(solve(p).solutions.length, 2);
});
test('rejects malformed definitions and states', () => {
  for (const p of [
    null,
    {},
    { ...base, size: 100 },
    { ...base, links: [{ a: 0, b: 15, relation: 'same' }] },
    { ...base, windows: [{ cells: [0, 1, 2, 3], suns: 5 }] },
  ])
    assert.throws(() => validatePuzzle(p));
  assert.throws(() => check(base, {}));
  assert.throws(() => check(base, Array(16).fill(2)));
});
test('untrusted definitions are bounded plain data and optional solution is validated', () => {
  for (const p of [
    { ...base, id: '../bad' },
    { ...base, id: 'x'.repeat(81) },
    { ...base, title: 'x'.repeat(101) },
    { ...base, lesson: 'x'.repeat(601) },
    { ...base, solution: Array(16).fill(2) },
    Object.assign(new Date(), base),
    Object.assign(
      Object.create({ id: 'test' }),
      Object.fromEntries(Object.entries(base).filter(([k]) => k !== 'id')),
    ),
  ])
    assert.throws(() => validatePuzzle(p));
});
test('corrupt fixed cells cannot be propagated or silently retained by a mark', () => {
  const p = { ...base, givens: [1, ...Array(15).fill(-1)] },
    broken = Array(16).fill(-1);
  assert.equal(applyMark(p, broken, { cell: 2, value: 1, linked: false }).ok, false);
});
test('inconsistent link cycle rejects its entire component atomically', () => {
  const p = {
    ...base,
    links: [
      { a: 0, b: 1, relation: 'same' },
      { a: 1, b: 5, relation: 'same' },
      { a: 5, b: 4, relation: 'same' },
      { a: 4, b: 0, relation: 'opposite' },
    ],
  };
  assert.throws(() => component(p, 0));
  const result = applyMark(p, p.givens, { cell: 0, value: 1, linked: true });
  assert.equal(result.ok, false);
  assert.deepEqual(result.cells, p.givens);
});
test('rejects surplus untrusted data and accessor fields', () => {
  const accessor = { ...base };
  Object.defineProperty(accessor, 'title', {
    get() {
      throw Error('should not call');
    },
  });
  assert.throws(() => validatePuzzle(accessor), /Invalid/);
  assert.throws(() => validatePuzzle({ ...base, unexpected: 'x'.repeat(10000) }));
  assert.throws(() =>
    validatePuzzle({ ...base, links: [{ a: 0, b: 1, relation: 'same', unexpected: [] }] }),
  );
});
test('sparse boards and target arrays are rejected', () => {
  assert.throws(() => validatePuzzle({ ...base, givens: Array(16) }));
  assert.throws(() => validatePuzzle({ ...base, rowTargets: Array(4) }));
  assert.throws(() => check(base, Array(16)));
});
