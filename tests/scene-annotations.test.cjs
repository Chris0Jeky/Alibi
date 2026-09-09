const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');
const p = require('../content/catalog.json').puzzles.find((p) => p.type === 'scene');
const engine = C.registry.scene;
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
