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
import { PUZZLES } from '../src/eclipse-lab/puzzles.mjs';
import { PUZZLES as MIRROR } from '../prototypes/mirror-ledger/puzzles.mjs';

// Independent exhaustive oracle, separate from the Lab's line-pattern solver.
const mirrorBoards = [];
for (let mask = 0; mask < 65536; mask++) {
  const b = Array.from({ length: 16 }, (_, i) => (mask >> i) & 1);
  const rows = Array.from({ length: 4 }, (_, r) => b.slice(r * 4, r * 4 + 4));
  const cols = Array.from({ length: 4 }, (_, c) => [b[c], b[c + 4], b[c + 8], b[c + 12]]);
  if (
    [...rows, ...cols].some(
      (l) =>
        l.reduce((a, v) => a + v, 0) !== 2 ||
        (l[0] === l[1] && l[1] === l[2]) ||
        (l[1] === l[2] && l[2] === l[3]),
    )
  )
    continue;
  if (
    new Set(rows.map((l) => l.join(''))).size !== 4 ||
    new Set(cols.map((l) => l.join(''))).size !== 4
  )
    continue;
  mirrorBoards.push(b);
}

test('Mirror fixtures preserve the prototype, uniquely need both boards and every link', () => {
  const fixtures = PUZZLES.filter((p) => p.mode === 'mirror');
  assert.equal(fixtures.length, 8);
  for (const [i, p] of fixtures.entries()) {
    const original = MIRROR[i];
    assert.equal(p.id, original.id);
    assert.equal(p.revision, 1);
    assert.deepEqual(p.givens, original.givens.flat());
    assert.deepEqual(
      p.links,
      original.links.map((l) => ({ ...l, b: l.b + 16 })),
    );
    const candidates = [0, 16].map((offset) =>
      mirrorBoards.filter((b) =>
        b.every((v, j) => p.givens[offset + j] === -1 || p.givens[offset + j] === v),
      ),
    );
    assert.ok(
      candidates.every((a) => a.length > 1),
      p.id,
    );
    const pairs = (links) =>
      candidates[0].flatMap((a) =>
        candidates[1]
          .map((b) => [...a, ...b])
          .filter((cells) =>
            links.every((l) => (cells[l.a] === cells[l.b]) === (l.relation === 'same')),
          ),
      );
    const expected = pairs(p.links);
    assert.equal(expected.length, 1, p.id);
    assert.deepEqual(solve(p).solutions, expected, p.id);
    assert.equal(solve(p).exhausted, false, p.id);
    assert.equal(check(p, expected[0]).complete, true, p.id);
    assert.equal(solve({ ...p, links: [] }).solutions.length, 2, p.id);
    for (let j = 0; j < p.links.length; j++) {
      const links = p.links.filter((_, k) => k !== j);
      assert.ok(pairs(links).length > 1, `${p.id} link ${j + 1}`);
      assert.equal(solve({ ...p, links }).solutions.length, 2, `${p.id} link ${j + 1}`);
    }
  }
});

test('Mirror validates board boundaries and shares safe marks, checks and answer-free hints', () => {
  const p = PUZZLES.find((p) => p.mode === 'mirror');
  assert.ok(p, 'Mirror is loaded');
  const answer = solve(p).solutions[0];
  const poisoned = { ...p };
  Object.defineProperty(poisoned, 'solution', {
    get() {
      throw Error('answer read');
    },
  });
  const h = hint(poisoned, p.givens);
  assert.ok(h);
  assert.equal(h.value, answer[h.cell]);
  assert.equal(hint(poisoned, answer), null);
  assert.equal(check(poisoned, answer).complete, true);
  assert.deepEqual(solve(poisoned).solutions, [answer]);
  const bad = [...p.givens];
  bad.fill(1, 16);
  assert.equal(hint(poisoned, bad), null);
  assert.equal(check(p, bad).complete, false);
  const linked = applyMark(p, p.givens, { cell: 6, value: answer[6], linked: true });
  assert.equal(linked.ok, true);
  assert.equal(linked.cells[27], answer[27]);
  assert.deepEqual(
    component(p, 6).map((x) => x.cell),
    [6, 15, 27],
  );
  const fixed = p.givens.findIndex((v) => v !== -1);
  assert.equal(
    applyMark(p, p.givens, { cell: fixed, value: 1 - p.givens[fixed], linked: false }).ok,
    false,
  );
  assert.equal(solve(p, p.givens, { maxNodes: 1 }).exhausted, true);
  for (const q of [
    { ...p, size: 6 },
    { ...p, givens: p.givens.slice(0, 16) },
    { ...p, givens: Array(32) },
    { ...p, solution: Array(16).fill(0) },
    { ...p, links: [{ a: 0, b: 1, relation: 'same' }] },
    { ...p, links: [{ a: 16, b: 17, relation: 'same' }] },
    { ...p, links: [{ a: 0, b: 32, relation: 'same' }] },
    { ...p, links: [p.links[0], p.links[0]] },
    { ...p, windows: [{ cells: [0, 1, 4, 5], suns: 2 }] },
  ])
    assert.throws(() => validatePuzzle(q));
  assert.throws(() => check(p, Array(32)));
  const sameBoard = mirrorBoards[0];
  assert.equal(
    check({ ...p, givens: Array(32).fill(-1), links: [] }, [...sameBoard, ...sameBoard]).complete,
    true,
    'distinct lines are required within each board, not across boards',
  );
});
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

test('Mirror hints alone, including solver fallbacks, solve every level without reading the answer', () => {
  for (const p of PUZZLES.filter((p) => p.mode === 'mirror')) {
    const answer = solve(p).solutions[0];
    const poisoned = { ...p };
    Object.defineProperty(poisoned, 'solution', {
      get() {
        throw Error('answer read');
      },
    });
    let cells = [...p.givens];
    for (let step = 0; step < cells.length && !check(p, cells).complete; step++) {
      const h = hint(poisoned, cells);
      assert.ok(h, `${p.id} offers a hint at step ${step}`);
      assert.equal(h.value, answer[h.cell], `${p.id} hint ${step} is correct`);
      cells = [...cells];
      cells[h.cell] = h.value;
    }
    assert.equal(check(p, cells).complete, true, `${p.id} completes by hints`);
  }
});
