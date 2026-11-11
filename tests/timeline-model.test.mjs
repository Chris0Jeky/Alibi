import test from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLES } from '../src/timeline-lab/puzzles.mjs';
import {
  applyMark,
  check,
  clueText,
  emptyMarks,
  hint,
  holds,
  hourName,
  placements,
  schedules,
  solve,
  validatePuzzle,
} from '../src/timeline-lab/model.mjs';

// Independent oracle: every one of the T^N assignments, tested against the clue's meaning as
// written in the player-facing rules rather than through the model's own predicate.
function meets(c, s) {
  const d = (x, y) => Math.max(x, y) - Math.min(x, y);
  if (c.t === 'before') return s[c.a] + 1 <= s[c.b];
  if (c.t === 'after') return s[c.b] + 1 <= s[c.a];
  if (c.t === 'apart')
    return c.mode === 'exactly' ? d(s[c.a], s[c.b]) === c.k : d(s[c.a], s[c.b]) >= c.k;
  if (c.t === 'within')
    return Array.from({ length: c.hi - c.lo + 1 }, (_, i) => c.lo + i).includes(s[c.a]);
  if (c.t === 'not') return s[c.a] !== c.s;
  if (c.t === 'witness') return [c.r - 1, c.r, c.r + 1].includes(s[c.a]);
  throw Error('unknown clue');
}
function oracle(p, clues = p.clues) {
  const n = p.events.length,
    T = p.slots,
    out = [],
    s = Array(n).fill(0);
  for (let count = 0; count < T ** n; count++) {
    let rest = count;
    for (let e = 0; e < n; e++) {
      s[e] = rest % T;
      rest = Math.floor(rest / T);
    }
    if (p.distinct && new Set(s).size !== n) continue;
    if (!clues.every((c) => meets(c, s))) continue;
    out.push(s.slice());
  }
  return out;
}
const key = (list) => list.map((x) => x.join(',')).sort();
const marksFor = (p, schedule) => {
  const marks = emptyMarks(p);
  schedule.forEach((s, e) => (marks[e * p.slots + s] = 2));
  return marks;
};
function rng(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

test('the enumerating solver agrees with an independent brute force on every level', () => {
  for (const p of PUZZLES) {
    const expected = oracle(p);
    assert.deepEqual(key(solve(p)), key(expected), p.id);
    assert.equal(expected.length, 1, `${p.id} has exactly one schedule`);
    assert.deepEqual(expected[0], p.solution, `${p.id} stored schedule is the unique one`);
  }
});
test('each clue predicate matches its stated meaning at every boundary', () => {
  const T = 6,
    hours = Array.from({ length: T }, (_, i) => i);
  const clues = [];
  for (const t of ['before', 'after']) clues.push({ t, a: 0, b: 1 });
  for (const mode of ['exactly', 'atleast'])
    for (let k = 1; k < T; k++) clues.push({ t: 'apart', a: 0, b: 1, k, mode });
  for (const lo of hours)
    for (const hi of hours) if (lo < hi) clues.push({ t: 'within', a: 0, lo, hi });
  for (const x of hours) clues.push({ t: 'not', a: 0, s: x }, { t: 'witness', a: 0, r: x });
  for (const c of clues)
    for (const x of hours)
      for (const y of hours)
        assert.equal(holds(c, [x, y]), meets(c, [x, y]), JSON.stringify([c, x, y]));
  assert.equal(
    holds({ t: 'witness', a: 0, r: 3 }, [5]),
    false,
    'two hours out is not within a witness error',
  );
  assert.equal(holds({ t: 'before', a: 0, b: 1 }, [2, 2]), false, 'before is strict');
});
test('every clue is necessary: dropping any one of them admits a second schedule', () => {
  for (const p of PUZZLES)
    p.clues.forEach((_, i) => {
      const rest = p.clues.filter((__, j) => j !== i);
      assert.ok(oracle(p, rest).length > 1, `${p.id} clue ${i + 1} is redundant`);
      assert.ok(
        schedules({ ...p, clues: rest }, null, 2).length > 1,
        `${p.id} solver, clue ${i + 1}`,
      );
    });
});
// Looser copies keep many schedules alive, so marks and hints are tested where "forced" is not
// simply "the unique answer".
const loosened = (p, keep) => ({ ...p, clues: p.clues.slice(0, keep) });
const withMarks = (list, p, marks) =>
  list.filter((s) =>
    s.every((h, e) => {
      const row = Array.from({ length: p.slots }, (_, x) => marks[e * p.slots + x]);
      return row.includes(2) ? row[h] === 2 : row[h] !== 1;
    }),
  );
function randomMarks(p, rand) {
  const T = p.slots,
    marks = emptyMarks(p);
  p.solution.forEach((s, e) => {
    if (rand() < 0.25) marks[e * T + s] = 2;
  });
  for (let k = 0; k < 5; k++) {
    const e = Math.floor(rand() * p.events.length),
      s = Math.floor(rand() * T);
    if (!marks[e * T + s] && p.solution[e] !== s) marks[e * T + s] = 1;
  }
  return marks;
}
test('marks narrow the enumeration exactly as the oracle does', () => {
  const rand = rng(7);
  for (const full of PUZZLES) {
    const p = loosened(full, 2),
      all = oracle(p);
    assert.ok(all.length > 1);
    for (let round = 0; round < 6; round++) {
      const marks = randomMarks(full, rand);
      assert.deepEqual(
        key(schedules(p, marks)),
        key(withMarks(all, p, marks)),
        `${p.id} #${round}`,
      );
    }
  }
});
test('a hint is forced by the clues and marks, agrees with enumeration and never reads the answer', () => {
  const rand = rng(11);
  for (const full of PUZZLES)
    for (const keep of [2, Math.ceil(full.clues.length / 2), full.clues.length]) {
      const p = loosened(full, keep),
        all = oracle(p),
        T = p.slots;
      // Poison the stored answer: any read would throw.
      const sealed = Object.defineProperty({ ...p }, 'solution', {
        get() {
          throw Error('hint read the solution');
        },
        enumerable: true,
      });
      for (let round = 0; round < 5; round++) {
        const marks = randomMarks(full, rand),
          left = withMarks(all, p, marks),
          h = hint(sealed, marks);
        assert.ok(left.length > 0, 'marks derived from the answer stay consistent');
        if (h.kind === 'solved') continue;
        if (h.kind === 'none') {
          for (let e = 0; e < p.events.length; e++)
            for (let s = 0; s < T; s++) {
              const here = left.filter((x) => x[e] === s).length;
              assert.ok(
                marks[e * T + s] !== 0 || (here > 0 && here < left.length),
                'none means nothing is forced',
              );
            }
          continue;
        }
        const [cell] = h.cells,
          e = Math.floor(cell / T),
          s = cell % T;
        if (h.kind === 'place')
          assert.ok(
            left.every((x) => x[e] === s),
            `${p.id}/${keep} place`,
          );
        else
          assert.ok(left.every((x) => x[e] !== s) && marks[cell] === 0, `${p.id}/${keep} rule-out`);
      }
    }
});
test('following hints alone completes every level, each step certain by enumeration', () => {
  for (const p of PUZZLES) {
    const all = oracle(p);
    let marks = emptyMarks(p);
    for (let step = 0; step < p.events.length * p.slots; step++) {
      const h = hint(p, marks);
      if (h.kind === 'solved') break;
      assert.ok(['place', 'rule-out'].includes(h.kind), `${p.id} step ${step}: ${h.kind}`);
      const [cell] = h.cells,
        T = p.slots,
        left = withMarks(all, p, marks);
      if (h.kind === 'place') assert.ok(left.every((x) => x[Math.floor(cell / T)] === cell % T));
      else assert.ok(left.every((x) => x[Math.floor(cell / T)] !== cell % T));
      marks = applyMark(p, marks, cell, h.kind === 'place' ? 2 : 1);
    }
    assert.ok(check(p, marks).complete, `${p.id} reaches the schedule`);
    assert.deepEqual(placements(p, marks), p.solution);
  }
});
test('hints prefer a cell one clue explains and say which clue', () => {
  const p = PUZZLES[3],
    h = hint(p, emptyMarks(p));
  assert.equal(h.kind, 'rule-out');
  assert.match(h.text, /^Clue \d+ \(/);
  assert.ok(h.text.includes(clueText(p, p.clues[Number(/^Clue (\d+)/.exec(h.text)[1]) - 1])));
});
test('marks that contradict every schedule are reported and the conflicting marks are pointed at', () => {
  for (const p of PUZZLES) {
    const T = p.slots,
      marks = emptyMarks(p),
      wrong = p.solution[0];
    marks[wrong] = 1; // rule out the one hour event 0 can take
    assert.equal(withMarks(oracle(p), p, marks).length, 0);
    assert.equal(schedules(p, marks).length, 0);
    const h = hint(p, marks);
    assert.equal(h.kind, 'contradiction', p.id);
    assert.deepEqual(h.cells, [wrong], 'the single offending mark is outlined');
    assert.match(h.text, /No schedule fits/);
    // Two placements that cannot both hold: no single mark is to blame.
    const both = emptyMarks(p);
    both[0 * T + ((p.solution[0] + 1) % T)] = 2;
    both[1 * T + p.solution[1]] = 2;
    if (withMarks(oracle(p), p, both).length === 0) {
      const g = hint(p, both);
      assert.equal(g.kind, 'contradiction');
      assert.ok(g.cells.length >= 1 && g.cells.every((c) => both[c] !== 0));
    }
  }
});
test('cells cycle open, ruled out, placed, and placing moves the event within its row only', () => {
  const p = PUZZLES[0],
    T = p.slots;
  let m = emptyMarks(p);
  m = applyMark(p, m, 2);
  assert.equal(m[2], 1);
  m = applyMark(p, m, 2);
  assert.equal(m[2], 2);
  m = applyMark(p, m, 2);
  assert.equal(m[2], 0);
  m = applyMark(p, m, 1, 1);
  m = applyMark(p, m, 0, 2);
  m = applyMark(p, m, 3, 2);
  assert.deepEqual(m.slice(0, T), [0, 1, 0, 2, 0], 'earlier placement cleared, ruled-out kept');
  m = applyMark(p, m, T + 3, 2);
  assert.equal(m[3], 2, 'a placement in another row is untouched');
  assert.equal(emptyMarks(p).length, p.events.length * T);
});
test('check names conflicts among placed events and completes only on the unique schedule', () => {
  const p = PUZZLES[0];
  assert.equal(check(p, emptyMarks(p)).complete, false);
  assert.deepEqual(check(p, emptyMarks(p)).issues, []);
  assert.equal(check(p, marksFor(p, p.solution)).complete, true);
  const wrong = p.solution.slice();
  [wrong[0], wrong[1]] = [wrong[1], wrong[0]];
  const result = check(p, marksFor(p, wrong));
  assert.equal(result.complete, false);
  assert.ok(result.issues.length > 0 && /^Check this clue:/.test(result.issues[0].text));
  const shared = p.solution.slice();
  shared[0] = shared[1];
  assert.ok(check(p, marksFor(p, shared)).issues.some((x) => /cannot share an hour/.test(x.text)));
});
test('the shared-hour rule is only enforced on levels that state it', () => {
  const open = PUZZLES.find((p) => !p.distinct);
  assert.ok(open);
  const same = open.solution.slice();
  assert.ok(new Set(same).size < same.length, 'the unique schedule itself shares an hour');
  assert.equal(check(open, marksFor(open, same)).complete, true);
});
test('clue text is plain language with real hour names and covers every clue type', () => {
  assert.deepEqual([0, 12, 13, 23, 24, 30].map(hourName), [
    '12am',
    '12pm',
    '1pm',
    '11pm',
    '12am',
    '6am',
  ]);
  const seen = new Set();
  for (const p of PUZZLES)
    for (const c of p.clues) {
      seen.add(c.t);
      const text = clueText(p, c);
      assert.match(text, /^[A-Z].*\.$/, text);
      assert.ok(!/undefined|NaN|\[object/.test(text), text);
    }
  assert.deepEqual([...seen].sort(), ['after', 'apart', 'before', 'not', 'within', 'witness']);
});
test('malformed or tampered puzzles are rejected before play or storage', () => {
  const good = () => structuredClone(PUZZLES[2]);
  assert.equal(validatePuzzle(good()).id, 'timeline-03');
  const mutations = [
    (p) => (p.extra = 1),
    (p) => (p.events = p.events.slice(0, 3)),
    (p) => (p.slots = 9),
    (p) => (p.solution = p.solution.map((s) => (s + 1) % p.slots)),
    (p) => (p.clues[0] = { t: 'teleport', a: 0 }),
    (p) => (p.clues[0] = { t: 'before', a: 0, b: 0 }),
    (p) => (p.clues[0] = { t: 'apart', a: 0, b: 1, k: 99, mode: 'exactly' }),
    (p) => (p.clues[0] = { t: 'within', a: 0, lo: 0, hi: p.slots - 1 }),
    (p) => (p.clues = []),
    (p) => (p.id = 'Bad Id'),
    (p) => (p.distinct = 'yes'),
    (p) => (p.title = ''),
  ];
  for (const mutate of mutations) {
    const p = good();
    mutate(p);
    assert.throws(() => validatePuzzle(p));
  }
});
