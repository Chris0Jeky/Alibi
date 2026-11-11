import test from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLES } from '../src/timeline-lab/puzzles.mjs';
import { validatePuzzle, clueText, schedules } from '../src/timeline-lab/model.mjs';
import { SPECS } from '../tools/curation/timeline-specs.mjs';
import { build, propagate } from '../tools/curation/timeline-candidates.mjs';

const types = (p) => new Set(p.clues.map((c) => c.t));
test('twelve pinned levels have stable ids, revisions and order', () => {
  assert.equal(PUZZLES.length, 12);
  PUZZLES.forEach((p, i) => {
    const n = String(i + 1).padStart(2, '0');
    assert.equal(p.id, `timeline-${n}`);
    assert.equal(p.revision, 1);
    assert.equal(p.level, i + 1);
    validatePuzzle(p);
  });
  assert.equal(new Set(PUZZLES.map((p) => p.title)).size, 12);
  const sizes = PUZZLES.slice(3).map((p) => p.events.length);
  assert.deepEqual(
    sizes,
    [...sizes].sort((x, y) => x - y),
    'events never decrease after the lessons',
  );
});
test('levels stay inside the stated bounds and every shared-hour case is feasible', () => {
  for (const p of PUZZLES) {
    assert.ok(p.events.length >= 4 && p.events.length <= 6, p.id);
    assert.ok(p.slots >= 5 && p.slots <= 8, p.id);
    assert.ok(p.slots ** p.events.length <= 8 ** 6, p.id);
    if (p.distinct) assert.ok(p.events.length <= p.slots, p.id);
  }
  assert.ok(PUZZLES.some((p) => p.distinct) && PUZZLES.some((p) => !p.distinct));
});
test('every level has exactly one schedule that the stored one matches', () => {
  for (const p of PUZZLES) {
    const all = schedules(p);
    assert.equal(all.length, 1, p.id);
    assert.deepEqual(all[0], p.solution, p.id);
  }
});
test('the first three levels introduce one clue kind each, later levels mix them', () => {
  const [a, b, c] = PUZZLES.map(types);
  assert.deepEqual([...a].sort(), ['after', 'before']);
  assert.ok(b.has('apart') && [...b].every((t) => ['before', 'after', 'apart'].includes(t)));
  assert.ok(c.has('witness') && !c.has('within') && !c.has('not'));
  assert.ok(types(PUZZLES[3]).has('within') && types(PUZZLES[3]).has('not'));
  assert.ok(PUZZLES.slice(5).every((p) => types(p).size >= 3));
  assert.deepEqual([...new Set(PUZZLES.flatMap((p) => [...types(p)]))].sort(), [
    'after',
    'apart',
    'before',
    'not',
    'within',
    'witness',
  ]);
});
test('text is one plain line per clue and payoff, with no duplicates inside a level', () => {
  for (const p of PUZZLES) {
    const lines = p.clues.map((c) => clueText(p, c));
    assert.equal(new Set(lines).size, lines.length, p.id);
    for (const t of [p.story, p.lesson, p.payoff, ...p.events, ...lines])
      assert.ok(!/[\n\r<>]/.test(t), t);
    assert.match(p.payoff, /^So .*\.$/);
    assert.ok(p.payoff.length <= 140, p.id);
  }
});
test('the committed levels are exactly what the authoring script derives from the specs', () => {
  assert.equal(SPECS.length, PUZZLES.length);
  SPECS.forEach((spec, i) => assert.deepEqual(build(spec).puzzle, PUZZLES[i], spec.id));
});
test('early levels yield to direct elimination; later levels need a what-if', () => {
  PUZZLES.forEach((p, i) => assert.equal(propagate(p).solved, i < 6, p.id));
});
