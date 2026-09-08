'use strict';
const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  E = require('../src/quiet-wing/engine.js');
test('six plants mature by bounded elapsed time without repeated harvesting or backward-clock rewards', () => {
  const state = E.newState(10000000);
  Object.keys(E.CROPS).forEach((id, i) => {
    assert.ok(E.plant(state, i, id, 10000000));
    assert.equal(E.growth(state.garden.pots[i], 9999999), 0);
    assert.equal(E.harvest(state, i, 10000000), false);
    assert.equal(E.growth(state.garden.pots[i], 10000000 + 1e15), 1);
    assert.ok(E.harvest(state, i, 10000000 + E.CROPS[id].seconds * 1000));
    assert.equal(E.harvest(state, i, 10000000 + 1e15), false);
    assert.equal(state.garden.collection[id], 1);
  });
  assert.equal(state.garden.pressed, 6);
  assert.equal(state.stats.harvests, 6);
  assert.equal(E.plant(state, 0, 'clover', NaN), false);
  assert.equal(E.harvest(state, 0, NaN), false);
});
test('bouquets use discovered flowers without spending or manufacturing saved keepsakes', () => {
  const state = E.newState(0);
  assert.equal(E.arrangeBloom(state, 0, 'poppy'), false);
  E.plant(state, 0, 'poppy', 0);
  E.harvest(state, 0, E.CROPS.poppy.seconds * 1000);
  assert.ok(E.arrangeBloom(state, 0, 'poppy'));
  assert.ok(E.arrangeBloom(state, 1, 'poppy'));
  assert.equal(state.garden.collection.poppy, 1);
  assert.equal(state.garden.pressed, 1);
  assert.equal(E.arrangeBloom(state, 3, 'poppy'), false);
  assert.ok(E.arrangeBloom(state, 1, null));
  assert.deepEqual(E.validateState(state).garden, state.garden);
});
test('older garden totals and planted timestamps survive while undisclosed species stay undiscovered', () => {
  const old = E.newState(0);
  old.garden = {
    pots: [{ seed: 'clover', plantedAt: 0 }, null, null, null, null, null],
    pressed: 42,
    visits: 0,
  };
  const restored = E.validateState(old);
  assert.equal(restored.garden.pressed, 42);
  assert.deepEqual(restored.garden.pots, old.garden.pots);
  assert.ok(Object.values(restored.garden.collection).every((v) => v === 0));
  assert.deepEqual(restored.garden.bouquet, [null, null, null]);
  restored.garden.bouquet = ['poppy', null, null];
  assert.throws(() => E.validateState(restored), /arrangement/);
});
