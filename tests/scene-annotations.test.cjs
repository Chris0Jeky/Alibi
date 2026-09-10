const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');
const p = require('../content/catalog.json').puzzles.find((p) => p.type === 'scene');
const engine = C.registry.scene;

test('Repeated scene taps preserve other annotations through seven taps and save round trips', () => {
  const [cell, elsewhere] = Array.from({ length: p.size ** 2 }, (_, i) => i).filter(
    (i) => !p.objects.some((o) => o.cell === i),
  );
  const [who, other] = p.people.map((w) => w.id);
  let state = engine.initial(p);
  state = engine.reduce(p, state, { type: 'candidate', who: other, cell });
  state = engine.reduce(p, state, { type: 'exclude', who: other, cell });
  state = engine.reduce(p, state, { type: 'candidate', who, cell: elsewhere });
  const initial = C.clone(state);
  for (let tap = 1; tap <= 7; tap++) {
    const before = C.clone(state);
    state = engine.reduce(p, state, { type: 'cycle-mark', who, cell });
    assert.deepEqual(
      state.candidates[cell]?.filter((id) => id === other),
      [other],
    );
    assert.deepEqual(state.notes[other], [cell]);
    assert.deepEqual(state.candidates[elsewhere], [who]);
    const stage = (tap - 1) % 4;
    assert.equal(state.placements[who] === cell, stage === 0);
    if (stage !== 0) {
      assert.equal(!!state.candidates[cell]?.includes(who), stage === 1);
      assert.equal(!!state.notes[who]?.includes(cell), stage === 2);
    }
    assert.equal(!!state.crosses?.includes(cell), stage === 3);
    assert.deepEqual(C.validateState(p, JSON.parse(JSON.stringify(state))), state);
    assert.notStrictEqual(state, before);
  }
  assert.deepEqual(initial.placements, {});
  state = engine.reduce(p, state, { type: 'clear-marks', who, cell });
  assert.deepEqual(state.candidates[cell], [other]);
  assert.deepEqual(state.notes[other], [cell]);
  state = engine.reduce(p, state, { type: 'clear-marks', who, cell, all: true });
  assert.equal(state.candidates[cell], undefined);
  assert.deepEqual(state.notes[other], []);
  assert.deepEqual(state.candidates[elsewhere], [who]);
});

test('Scene cycling refuses occupied, furniture, invalid cells and unknown people', () => {
  const cell = p.solution[p.people[0].id];
  const state = engine.reduce(p, engine.initial(p), { type: 'place', who: p.people[0].id, cell });
  for (const type of ['cycle-mark', 'clear-marks']) {
    for (const bad of [-1, p.size ** 2, 0.5, p.objects[0].cell])
      assert.strictEqual(engine.reduce(p, state, { type, who: p.people[0].id, cell: bad }), state);
    assert.strictEqual(engine.reduce(p, state, { type, who: 'unknown', cell }), state);
  }
  assert.strictEqual(
    engine.reduce(p, state, { type: 'cycle-mark', who: p.people[1].id, cell }),
    state,
  );
});
test('Scene annotations retain legacy saves and never place people', () => {
  const legacy = engine.initial(p);
  assert.deepEqual(C.validateState(p, legacy), legacy);
  const cell = Array.from({ length: p.size ** 2 }, (_, i) => i).find(
    (i) => !p.objects.some((o) => o.cell === i),
  );
  const who = p.people[0].id;
  let state = engine.reduce(p, legacy, { type: 'candidate', who, cell });
  state = engine.reduce(p, state, { type: 'board-cross', cell });
  assert.deepEqual(state.candidates[cell], [who]);
  assert.deepEqual(state.crosses, [cell]);
  assert.deepEqual(state.placements, {});
  assert.equal(engine.complete(p, state), false);
  assert.deepEqual(C.validateState(p, JSON.parse(JSON.stringify(state))), state);
  state = engine.reduce(p, state, { type: 'candidate', who, cell });
  state = engine.reduce(p, state, { type: 'board-cross', cell });
  assert.deepEqual(state.candidates, {});
  assert.deepEqual(state.crosses, []);
  assert.deepEqual(legacy, engine.initial(p));
});
test('Scene annotation saves reject malformed or unbounded entries', () => {
  const initial = engine.initial(p);
  for (const candidates of [
    null,
    [],
    { '-1': [p.people[0].id] },
    { 999: [] },
    { 0: ['unknown'] },
    { 0: [p.people[0].id, p.people[0].id] },
  ])
    assert.throws(() => C.validateState(p, { ...initial, candidates }));
  for (const crosses of [null, {}, [-1], [999], [0, 0]])
    assert.throws(() => C.validateState(p, { ...initial, crosses }));
  assert.deepEqual(
    engine.reduce(p, initial, { type: 'candidate', who: 'unknown', cell: 0 }),
    initial,
  );
  assert.deepEqual(engine.reduce(p, initial, { type: 'board-cross', cell: -1 }), initial);
});
