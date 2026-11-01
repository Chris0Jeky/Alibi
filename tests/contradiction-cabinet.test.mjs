import assert from 'node:assert/strict';
import test from 'node:test';
import {
  admissible,
  REPORTS,
  RETAINED,
  WORLDS,
  judgeConflict,
  smallestConflicts,
  judgeCounterexample,
  initialState,
  reduce,
} from '../prototypes/contradiction-cabinet/model.mjs';

test('either three-report contradiction is accepted', () => {
  assert.equal(judgeConflict(['r1', 'r2', 'r3']).status, 'smallest');
  assert.equal(judgeConflict(['r1', 'r4', 'r5']).status, 'smallest');
});

test('selecting every report is inconsistent but not globally smallest', () => {
  assert.equal(judgeConflict(['r1', 'r2', 'r3', 'r4', 'r5']).status, 'too-large');
});

// Independent truth table: explicit nested choices and arithmetic, no authored predicates.
const oracle = [];
for (const east of [false, true])
  for (const west of [false, true])
    for (const stair of [false, true]) {
      oracle.push({
        world: { east, west, stair },
        truths: [east, west, +east + +west < 2, stair, +east + +stair < 2],
      });
    }
function subsets(items) {
  if (!items.length) return [[]];
  const rest = subsets(items.slice(1));
  return [...rest, ...rest.map((part) => [items[0], ...part])];
}

test('separate exhaustive oracle agrees for every source subset and all eight worlds', () => {
  const groups = subsets([0, 1, 2, 3, 4]);
  const possible = (group) =>
    oracle.filter((row) => group.every((i) => row.truths[i])).map((r) => r.world);
  const size = Math.min(...groups.filter((g) => !possible(g).length).map((g) => g.length));
  const sortWorlds = (rows) => rows.map(JSON.stringify).sort();
  for (const group of groups) {
    const expected = possible(group);
    const reports = group.map((i) => REPORTS[i]);
    assert.deepEqual(sortWorlds(admissible(reports)), sortWorlds(expected));
    assert.equal(
      judgeConflict(reports.map((r) => r.id)).status,
      !group.length
        ? 'empty'
        : expected.length
          ? 'consistent'
          : group.length === size
            ? 'smallest'
            : 'too-large',
    );
  }
  assert.deepEqual(smallestConflicts(), [
    ['r1', 'r2', 'r3'],
    ['r1', 'r4', 'r5'],
  ]);
});

test('an inclusion-minimal triple loses to a globally smallest pair', () => {
  const mixed = [
    { id: 'a', allows: (w) => w.east },
    { id: 'not-a', allows: (w) => !w.east },
    { id: 'b', allows: (w) => w.west },
    { id: 'c', allows: (w) => w.stair },
    { id: 'not-both', allows: (w) => !(w.west && w.stair) },
  ];
  const triple = mixed.slice(2);
  assert.equal(admissible(triple).length, 0);
  for (const r of triple) assert.ok(admissible(triple.filter((p) => p !== r)).length);
  assert.deepEqual(smallestConflicts(mixed), [['a', 'not-a']]);
  assert.equal(
    judgeConflict(
      triple.map((r) => r.id),
      mixed,
    ).status,
    'too-large',
  );
  assert.equal(judgeConflict(['a', 'not-a'], mixed).status, 'smallest');
});

test('counterexamples satisfy every fixed premise and contradict the claim', () => {
  assert.deepEqual(admissible(RETAINED), [
    { east: false, west: true, stair: false },
    { east: false, west: true, stair: true },
  ]);
  for (const { world, truths } of oracle) {
    const expected = ![1, 2, 4].every((i) => truths[i])
      ? 'violates-premises'
      : world.stair
        ? 'supports-claim'
        : 'counterexample';
    assert.equal(judgeCounterexample(world).status, expected);
  }
  assert.equal(judgeCounterexample({ east: false, west: true, stair: null }).status, 'incomplete');
  assert.equal(judgeCounterexample(null).status, 'incomplete');
});

test('empty and contradictory premise sets never fabricate a proof', () => {
  assert.equal(admissible([]).length, 8);
  assert.deepEqual(smallestConflicts([]), []);
  assert.deepEqual(smallestConflicts(RETAINED), []);
  for (const world of WORLDS) assert.equal(judgeCounterexample(world, REPORTS).status, 'no-worlds');
  assert.equal(judgeConflict(['missing']).status, 'invalid');
  assert.equal(judgeConflict(['r1', 'r1']).status, 'invalid');
  assert.throws(() => smallestConflicts(Array(7).fill(REPORTS[0])), /at most six/);
});

test('reducer preserves work across story and hints, separates reveal and resets rehearsal', () => {
  const fresh = initialState();
  let s = fresh;
  for (const id of ['r1', 'r4', 'r5']) s = reduce(s, { type: 'select', id });
  for (const [id, value] of Object.entries({ east: false, west: true, stair: false })) {
    s = reduce(s, { type: 'lamp', id, value });
  }
  s = reduce(reduce(s, { type: 'check-conflict' }), { type: 'check-counterexample' });
  assert.equal(s.conflict.status, 'smallest');
  assert.equal(s.counterexample.status, 'counterexample');
  const before = structuredClone(s);
  s = reduce(reduce(s, { type: 'story' }), { type: 'hint', for: 'conflict' });
  assert.deepEqual(s.selected, before.selected);
  assert.deepEqual(s.world, before.world);
  assert.deepEqual(s.conflict, before.conflict);
  assert.equal(s.reveal, false);
  assert.equal(reduce(s, { type: 'reveal' }).reveal, true);
  assert.equal(reduce(s, { type: 'select', id: 'r5' }).conflict, null);
  assert.equal(reduce(s, { type: 'lamp', id: 'stair', value: true }).counterexample, null);
  assert.deepEqual(reduce(s, { type: 'restart' }), fresh);
  assert.deepEqual(fresh.selected, []);
  assert.deepEqual(fresh.world, { east: null, west: null, stair: null });
});
