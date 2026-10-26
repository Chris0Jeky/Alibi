import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROBLEM,
  classify,
  enumerate,
  evaluate,
  initialState,
  reduce,
} from '../prototypes/interval-desk/model.mjs';

const ids = PROBLEM.events.map((event) => event.id);
const relations = PROBLEM.clues.map(({ before, after }) => [before, after]);

// Deliberately simple oracle: visit the complete 9^5 integer grid, then check every fixed clue.
// It does not use the reducer's depth-first pruning or its schedule output.
const completeGrid = [];
for (let lantern = 0; lantern <= 8; lantern++)
  for (let bell = 0; bell <= 8; bell++)
    for (let gate = 0; gate <= 8; gate++)
      for (let ledger = 0; ledger <= 8; ledger++)
        for (let parcel = 0; parcel <= 8; parcel++)
          completeGrid.push({ lantern, bell, gate, ledger, case: parcel });

function independentEnumeration(windows) {
  return completeGrid.filter((schedule) => {
    const insideEveryWindow = ids.every(
      (id) => schedule[id] >= windows[id][0] && schedule[id] <= windows[id][1],
    );
    const obeysEveryClue = relations.every(([before, after]) => schedule[before] < schedule[after]);
    return insideEveryWindow && obeysEveryClue;
  });
}

function withWindow(id, low, high) {
  let state = initialState();
  state = reduce(state, { type: 'set-bound', id, edge: 'earliest', value: low });
  state = reduce(state, { type: 'set-bound', id, edge: 'latest', value: high });
  return state;
}

test('Reducer and independent full-grid oracle agree at every allowed interval boundary', () => {
  let boundariesChecked = 0;
  for (const event of PROBLEM.events) {
    const [first, last] = event.evidence;
    for (let low = first; low <= last; low++)
      for (let high = low; high <= last; high++) {
        const state = withWindow(event.id, low, high);
        assert.deepEqual(state.windows[event.id], [low, high]);
        assert.deepEqual(
          enumerate(state.windows),
          independentEnumeration(state.windows),
          `${event.id} with [${low}, ${high}]`,
        );
        boundariesChecked++;
      }
  }
  assert.equal(boundariesChecked, 70);
});

test('Reducer and oracle agree when every event is set to every endpoint configuration', () => {
  let combinationsChecked = 0;
  function visit(index, state) {
    if (index === PROBLEM.events.length) {
      assert.deepEqual(enumerate(state.windows), independentEnumeration(state.windows));
      combinationsChecked++;
      return;
    }
    const { id, evidence } = PROBLEM.events[index];
    const [first, last] = evidence;
    for (const [low, high] of [
      [first, first],
      [first, last],
      [last, last],
    ]) {
      let next = reduce(state, { type: 'set-bound', id, edge: 'earliest', value: low });
      next = reduce(next, { type: 'set-bound', id, edge: 'latest', value: high });
      visit(index + 1, next);
    }
  }
  visit(0, initialState());
  assert.equal(combinationsChecked, 3 ** PROBLEM.events.length);
});

test('Fixed evidence admits multiple complete schedules and each verdict keeps its witnesses', () => {
  const state = initialState();
  const result = evaluate(state);
  assert.equal(result.schedules.length, 447);
  assert.equal(result.ambiguity, 'ambiguous');
  assert.deepEqual(result.schedules, independentEnumeration(state.windows));

  const necessary = classify(result.schedules, 'lantern-before-case');
  assert.equal(necessary.verdict, 'necessary');
  assert.ok(necessary.supporting);
  assert.equal(necessary.supporting.lantern < necessary.supporting.case, true);
  assert.equal(necessary.counterexample, null);

  const impossible = classify(result.schedules, 'case-before-bell');
  assert.equal(impossible.verdict, 'impossible');
  assert.equal(impossible.supporting, null);
  assert.ok(impossible.counterexample);
  assert.equal(impossible.counterexample.case < impossible.counterexample.bell, false);

  const possible = classify(result.schedules, 'gate-before-bell');
  assert.equal(possible.verdict, 'possible');
  assert.ok(possible.supporting);
  assert.ok(possible.counterexample);
  assert.equal(possible.supporting.gate < possible.supporting.bell, true);
  assert.equal(possible.counterexample.gate < possible.counterexample.bell, false);
});

test('Zero schedules are explicit and cannot classify a claim vacuously', () => {
  let state = withWindow('lantern', 5, 5);
  state = reduce(state, { type: 'set-bound', id: 'bell', edge: 'latest', value: 4 });
  const result = evaluate(state);
  assert.deepEqual(result.schedules, []);
  assert.equal(result.ambiguity, 'none');
  assert.deepEqual(result.claim, {
    verdict: 'no-schedules',
    supporting: null,
    counterexample: null,
  });
});

test('Earlier, later, range edits, undo and restart preserve bounded windows', () => {
  let state = initialState();
  state = reduce(state, { type: 'nudge', id: 'lantern', direction: 'earlier' });
  assert.deepEqual(state.windows.lantern, [1, 4]);
  state = reduce(state, { type: 'nudge', id: 'lantern', direction: 'later' });
  assert.deepEqual(state.windows.lantern, [2, 4]);
  state = reduce(state, { type: 'set-bound', id: 'lantern', edge: 'earliest', value: 0 });
  assert.deepEqual(state.windows.lantern, [1, 4]);
  state = reduce(state, { type: 'undo' });
  assert.deepEqual(state.windows.lantern, [2, 4]);
  state = reduce(state, { type: 'undo' });
  assert.deepEqual(state.windows.lantern, [1, 4]);
  state = reduce(state, { type: 'restart' });
  assert.deepEqual(state, initialState());

  const unchanged = reduce(state, { type: 'set-bound', id: 'missing', edge: 'latest', value: 8 });
  assert.equal(unchanged, state);
  assert.equal(reduce(state, { type: 'nudge', id: 'lantern', direction: 'sideways' }), state);
});

test('Story and timeline presentation toggles leave identities, clues and schedules untouched', () => {
  const state = initialState();
  const before = evaluate(state);
  const storyOff = reduce(state, { type: 'story', on: false });
  assert.equal(storyOff.storyOn, false);
  assert.deepEqual(
    PROBLEM.events.map((event) => event.id),
    ids,
  );
  assert.deepEqual(
    PROBLEM.clues.map(({ before, after }) => [before, after]),
    relations,
  );
  assert.deepEqual(evaluate(storyOff), before);
  const timelineOn = reduce(storyOff, { type: 'timeline', on: true });
  assert.equal(timelineOn.timelineOn, true);
  assert.deepEqual(evaluate(timelineOn), before);
});
