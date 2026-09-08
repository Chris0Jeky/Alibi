'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/quiet-wing/engine.js');
const C = require('../src/quiet-wing/city.js');

test('seeded landscapes are reproducible, distinct and valid at every supported scale', () => {
  for (const size of E.SIZES)
    for (const layout of Object.keys(C.LAYOUTS)) {
      const first = C.generate({ size, layout, seed: 'Fern & Miso' });
      assert.deepEqual(first, C.generate({ size, layout, seed: 'Fern & Miso' }));
      assert.notDeepEqual(
        first.tiles,
        C.generate({ size, layout, seed: 'A different town' }).tiles,
      );
      assert.deepEqual(E.validateScene(first), first);
      assert.equal(first.tiles.length, size * size);
      assert.ok(first.tiles.some((t) => t.ground === 'water'));
      assert.ok(C.describe(first).roadPlots > size, 'a usable street network exists');
      if (layout === 'hillfort')
        assert.equal(
          first.tiles.flatMap((t) => t.items).filter((i) => i.type === 'keep').length,
          1,
        );
    }
  for (const options of [
    { size: 10000 },
    { seed: '' },
    { seed: 'a'.repeat(65) },
    { layout: '__proto__' },
    { density: NaN },
  ])
    assert.throws(() => C.generate(options));
});

test('larger worlds round-trip through the existing save validator without changing older realms', () => {
  const state = E.newState(100);
  const old = E.clone(state.scene);
  assert.deepEqual(E.validateState(state).scene, old);
  for (const size of [20, 28]) {
    state.scene = C.generate({ size });
    assert.deepEqual(E.validateState(state).scene, state.scene);
  }
  assert.equal(E.emptyScene().size, 14);
  assert.throws(() => E.emptyScene(15));
});

test('area edits are atomic and never flood an existing house partially', () => {
  const s = E.emptyScene();
  s.tiles[30].items.push({ type: 'cottage', palette: 'sage', rot: 0 });
  const before = E.clone(s);
  assert.ok(C.area(s, 30, 3, { kind: 'paint', ground: 'water' }).error);
  assert.deepEqual(s, before);
  const patch = C.area(s, 30, 3, { kind: 'raise' });
  assert.equal(patch.after.tiles.filter((t) => t.height === 1).length, 9);
  assert.deepEqual(patch.before, before);
  assert.deepEqual(s, before);
  assert.equal(
    C.area(s, 0, 5, { kind: 'raise' }).after.tiles.filter((t) => t.height === 1).length,
    9,
  );
});

test('moving and copying respect stacks, water, plot boundaries and source preservation', () => {
  const s = E.emptyScene();
  s.tiles[20].items.push({ type: 'townhouse', palette: 'rose', rot: 2 });
  s.tiles[21].ground = 'water';
  assert.ok(C.transfer(s, 20, 21).error);
  assert.equal(s.tiles[20].items.length, 1);
  const move = C.transfer(s, 20, 22);
  assert.equal(move.after.tiles[20].items.length, 0);
  assert.deepEqual(move.after.tiles[22].items, s.tiles[20].items);
  const copy = C.transfer(s, 20, 22, true);
  assert.deepEqual(copy.after.tiles[20].items, copy.after.tiles[22].items);
  assert.ok(C.transfer(s, -1, 22).error);
  assert.ok(C.transfer(s, 20, 20).error);
});

test('roads route around buildings, bridge water and keep every step connected', () => {
  const s = E.emptyScene();
  s.tiles[2].items = [{ type: 'keep', palette: 'rose', rot: 0 }];
  for (let y = 0; y < s.size; y++) s.tiles[y * s.size + 4].ground = 'water';
  const p = C.road(s, 0, 8);
  assert.ok(!p.error, p.error);
  assert.deepEqual(p.after.tiles[2], s.tiles[2]);
  assert.ok(p.after.tiles.some((t) => t.ground === 'water' && t.items[0]?.type === 'bridge'));
  const visited = new Set([0]),
    queue = [0];
  for (let n = 0; n < queue.length; n++) {
    const i = queue[n],
      x = i % 14,
      y = Math.floor(i / 14);
    for (const [a, b] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      if (a < 0 || b < 0 || a >= 14 || b >= 14) continue;
      const j = b * 14 + a,
        t = p.after.tiles[j];
      if (!visited.has(j) && (t.ground === 'path' || t.items[0]?.type === 'bridge')) {
        visited.add(j);
        queue.push(j);
      }
    }
  }
  assert.ok(visited.has(8));
  assert.equal(C.describe(p.after).districts, 1);
  assert.ok(C.road(s, 2, 8).error);
  s.tiles[0].height = 4;
  assert.ok(C.road(s, 0, 8).error);
});

test('neighbourhoods rotate as one reversible edit and refuse occupied, wet or uneven sites', () => {
  const s = E.emptyScene(20);
  for (const id of Object.keys(C.BLUEPRINTS))
    for (let rot = 0; rot < 4; rot++) {
      const p = C.stamp(s, 42, id, 'sage', rot);
      assert.ok(!p.error, p.error);
      assert.deepEqual(p.before, s);
      assert.deepEqual(E.validateScene(p.after), p.after);
      assert.ok(C.stamp(p.after, 42, id).error);
    }
  assert.ok(C.stamp(s, 399, 'courtyard').error);
  s.tiles[42].ground = 'water';
  assert.ok(C.stamp(s, 42, 'hamlet').error);
  s.tiles[42].ground = 'meadow';
  s.tiles[43].height = 1;
  assert.ok(C.stamp(s, 42, 'hamlet').error);
});

test('town feedback counts capacity and accessibility without awarding imaginary progress', () => {
  const s = E.emptyScene();
  s.tiles[1].ground = 'path';
  s.tiles[2].ground = 'path';
  s.tiles[15].items = [{ type: 'cottage', palette: 'sage', rot: 0 }];
  s.tiles[100].items = [{ type: 'townhouse', palette: 'rose', rot: 0 }];
  assert.deepEqual(C.describe(s), {
    homes: 2,
    residents: 12,
    connected: 1,
    nature: 0,
    buildings: 2,
    roadPlots: 2,
    districts: 1,
  });
  assert.deepEqual(C.connections(s, -1), []);
});
