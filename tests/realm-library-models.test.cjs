'use strict';

const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  child = require('node:child_process'),
  fs = require('node:fs'),
  path = require('node:path');
const root = path.resolve(__dirname, '..');
const library = require('../src/quiet-wing/assets/library-models.json');
const mappings = {
  cottage: 'cottage-small',
  barn: 'farm-barn',
  farm: 'crop-rows',
  orchard: 'orchard',
  tree: 'tree-oak',
  boat: 'boat',
  bench: 'bench',
  well: 'well-fountain',
};

test('the checked-in Realm library geometry is reproducible, finite and bounded for one plot', () => {
  const imported = child.spawnSync(
    process.execPath,
    ['tools/assets/import-library-models.cjs', '--check'],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );
  assert.equal(imported.status, 0, imported.stderr);
  assert.deepEqual(Object.keys(library), Object.values(mappings));
  for (const [id, model] of Object.entries(library)) {
    assert.ok(model.v.length > 0 && model.v.length < 700, `${id} has a compact vertex count`);
    assert.ok(model.f.length > 0 && model.f.length < 250, `${id} has a compact face count`);
    for (const vertex of model.v) {
      assert.equal(vertex.length, 3);
      assert.ok(vertex.every(Number.isFinite));
      assert.ok(vertex[0] > -0.2 && vertex[0] < 1.2, `${id} stays near its plot width`);
      assert.ok(vertex[1] > -0.2 && vertex[1] < 1.2, `${id} stays near its plot depth`);
      assert.ok(vertex[2] >= 0 && vertex[2] < 1.2, `${id} is Z-up above its plot`);
    }
    for (const [colour, ...indices] of model.f) {
      assert.match(model.c[colour], /^#[\da-f]{6}$/);
      assert.equal(indices.length, 3);
      assert.ok(
        indices.every((index) => Number.isInteger(index) && index >= 0 && index < model.v.length),
      );
    }
  }
});

test('detail masters record existing saved types, real output files and their per-model face budgets', () => {
  const catalogue = require('../assets-source/library/realm/details/catalogue.json');
  assert.deepEqual(
    catalogue.assets.map((asset) => asset.type),
    ['boat', 'bench', 'well'],
  );
  for (const asset of catalogue.assets) {
    assert.ok(asset.metadata.triangleCount > 0 && asset.metadata.triangleCount < 250);
    for (const derivative of asset.derivatives)
      assert.ok(fs.existsSync(path.join(root, derivative)), `${asset.id} includes ${derivative}`);
  }
});

test('live Realm placeables use the library geometry while saved type, palette and rotation stay stable', () => {
  const E = require('../src/quiet-wing/engine.js');
  global.QWCityModels = require('../src/quiet-wing/assets/city-models.json');
  global.QWLibraryModels = library;
  require('../src/quiet-wing/realm.js');
  const R = global.QWRealm;
  let scene = E.emptyScene();
  for (const [index, type] of Object.keys(mappings).entries()) {
    const palette = index % 2 ? 'lavender' : 'rose',
      rot = (index + 1) % 4,
      edit = E.editScene(scene, { kind: 'build', index, type, palette, rot });
    assert.ok(!edit.error, edit.error);
    scene = E.applyEdit(scene, edit);
    assert.deepEqual(scene.tiles[index].items[0], { type, palette, rot });
    const faces = R.model(type, palette, rot);
    assert.equal(
      faces.length,
      library[mappings[type]].f.length,
      `${type} uses its compact library model`,
    );
    assert.ok(faces.flatMap((face) => face.v).every((vertex) => vertex.every(Number.isFinite)));
  }
  assert.ok(
    R.model('barn', 'rose', 0).some((face) => face.c === '#a94f51'),
    'barn roof keeps its saved palette',
  );
  assert.ok(
    R.model('boat', 'rose', 0).some((face) => face.c === '#596d68'),
    'detail accents keep their saved palette',
  );
  const unturned = R.model('barn', 'rose', 0)[0].v,
    turned = R.model('barn', 'rose', 1)[0].v;
  assert.deepEqual(
    turned,
    unturned.map(([x, y, z]) => [1 - y, x, z]),
    'one saved quarter-turn rotates the imported footprint without changing height',
  );
  for (const tile of R.worldMeshes(scene))
    for (const face of tile.faces) assert.ok(face.v.flat().every(Number.isFinite));
});
