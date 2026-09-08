'use strict';
const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const E = require('../src/quiet-wing/engine.js');
const context = { window: { QWEngine: E } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../src/quiet-wing/realm.js'), 'utf8'), context);
const R = context.window.QWRealm;
test('road presentation follows adjacent paths, gates and bridges without connecting cliffs or wrapping rows', () => {
  const s = E.emptyScene();
  s.tiles.forEach((t) => {
    t.ground = 'meadow';
    t.height = 0;
    t.items = [];
  });
  const i = 15;
  s.tiles[i].ground = 'path';
  s.tiles[i - 14].ground = 'path';
  s.tiles[i + 1].items = [{ type: 'gate', palette: 'sage', rot: 0 }];
  s.tiles[i + 14].items = [{ type: 'bridge', palette: 'sage', rot: 0 }];
  s.tiles[i + 14].height = 1;
  s.tiles[i - 1].ground = 'path';
  s.tiles[i - 1].height = 2;
  assert.deepEqual(Array.from(R.roadLinks(s, i)), [0, 0, 1, null]);
  s.tiles[14].ground = 'path';
  s.tiles[13].ground = 'path';
  assert.equal(R.roadLinks(s, 14)[3], null);
  const before = JSON.stringify(s),
    faces = R.worldMeshes(s)[i].faces;
  const pavers = faces.filter((f) => ['#c9b795', '#dbcaab'].includes(f.c));
  assert.ok(pavers.length > 4);
  assert.ok(pavers.some((f) => f.v.some((v) => v[2] > 0.2)));
  assert.ok(
    pavers.every((f) => f.v.every((v) => v[2] >= 0.007)),
    'Ramps stay above the ground instead of disappearing below it',
  );
  assert.equal(JSON.stringify(s), before);
});
