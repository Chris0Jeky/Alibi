'use strict';
const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'),
  source = path.join(root, 'assets-source/quiet-wing/city');
const receipt = require('../assets-source/quiet-wing/city/receipt.json');
const hash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
test('curated model sources and emitted geometry match their retained provenance receipts', () => {
  assert.equal(
    hash(path.join(root, 'src/quiet-wing/assets/city-models.json')),
    receipt.assetSHA256,
  );
  assert.equal(receipt.models.length, 24);
  for (const m of receipt.models) {
    const dir = path.join(source, m.pack);
    assert.equal(hash(path.join(dir, m.model + '.obj')), m.objSHA256);
    assert.equal(hash(path.join(dir, m.model + '.mtl')), m.materialSHA256);
    assert.equal(hash(path.join(dir, 'Textures/colormap.png')), m.atlasSHA256);
    assert.match(
      fs.readFileSync(path.join(dir, 'License.txt'), 'utf8'),
      /Creative Commons Zero, CC0/,
    );
  }
});
test('all imported pieces have bounded finite geometry and all faces refer to existing vertices', () => {
  const models = require('../src/quiet-wing/assets/city-models.json');
  for (const model of Object.values(models)) {
    assert.ok(model.v.length > 0 && model.v.length < 10000);
    for (const v of model.v)
      assert.ok(v.length === 3 && v.every((n) => Number.isFinite(n) && Math.abs(n) < 10));
    for (const [c, ...indices] of model.f) {
      assert.match(model.c[c], /^#[\da-f]{6}$/);
      assert.ok(
        indices.length >= 3 &&
          indices.every((i) => Number.isInteger(i) && i >= 0 && i < model.v.length),
      );
    }
  }
});
test('castle floors stack, preserve palette and rotation, and refuse additions after battlements', () => {
  const E = require('../src/quiet-wing/engine.js');
  let s = E.emptyScene();
  for (const type of ['castlebase', 'castlefloor', 'castletop']) {
    const p = E.editScene(s, { kind: 'build', index: 15, type, palette: 'lavender', rot: 1 });
    assert.ok(!p.error, p.error);
    s = E.applyEdit(s, p);
  }
  assert.deepEqual(E.validateScene(s), s);
  assert.ok(
    E.editScene(s, { kind: 'build', index: 15, type: 'castlefloor', palette: 'sage', rot: 0 })
      .error,
  );
});
