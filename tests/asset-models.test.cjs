'use strict';
const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const root = path.resolve(__dirname, '..'),
  realm = path.join(root, 'assets-source/library/realm'),
  companions = path.join(root, 'assets-source/library/companions');
const preview = path.join(root, 'assets-source/library/model-preview.js');
function glb(p) {
  const b = fs.readFileSync(p);
  assert.equal(b.toString('ascii', 0, 4), 'glTF');
  assert.equal(b.readUInt32LE(4), 2);
  assert.equal(b.readUInt32LE(8), b.length);
  const j = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
  assert.ok(j.meshes?.length);
  assert.ok(j.materials?.length);
  assert.ok(j.buffers.every((x) => !x.uri));
  assert.ok((j.images || []).every((x) => !x.uri || x.uri.startsWith('data:')));
  return j;
}
test('realm kit exposes 40 measured, self-contained GLBs and three composed scenes', () => {
  const c = JSON.parse(fs.readFileSync(path.join(realm, 'catalogue.json')));
  assert.equal(c.assets.length, 40);
  assert.ok(fs.statSync(path.join(realm, 'realm-kit.blend')).size > 100000);
  assert.equal(c.master.derivatives[0], 'assets-source/library/realm/realm-kit.blend');
  assert.ok(c.master.derivatives[1].endsWith('/harbour.glb'));
  for (const x of c.assets) {
    assert.ok(x.metadata.size.every(Number.isFinite));
    if (x.status === 'current') {
      assert.equal(x.metadata.rights.author, 'Kenney');
      assert.equal(x.metadata.rights.licenceVersion, 'CC0 1.0');
      assert.ok(x.metadata.rights.sourcePage.startsWith('https://kenney.nl/'));
    }
    assert.ok(fs.existsSync(path.join(root, x.derivatives[0])));
    assert.ok(fs.statSync(path.join(root, x.derivatives[1])).size > 500);
    glb(path.join(root, x.derivatives[0]));
  }
  for (const scene of c.scenes) {
    const s = scene.id;
    const j = glb(path.join(realm, 'scenes', s + '.glb'));
    assert.ok(j.nodes.length >= 8);
    for (const view of ['', '-alt'])
      assert.ok(
        fs.statSync(path.join(realm, 'thumbnails', 'scene-' + s + view + '.png')).size > 500,
      );
  }
});
test('four companions retain eight named practical state rigs with static thumbnails', () => {
  const c = JSON.parse(fs.readFileSync(path.join(companions, 'catalogue.json')));
  assert.equal(c.assets.length, 4);
  for (const x of c.assets) {
    assert.equal(x.design, 'reused');
    assert.deepEqual(x.metadata.states, [
      'idle',
      'look',
      'attention',
      'happy',
      'sleepy',
      'pet',
      'feed',
      'celebrate',
    ]);
    assert.deepEqual(x.metadata.stateStatus.current, ['idle']);
    assert.equal(x.metadata.timing.transitionMs, 280);
    for (const f of x.derivatives) {
      const p = path.join(root, f);
      assert.ok(fs.existsSync(p));
      assert.ok(fs.statSync(p).size > 100);
    }
  }
});
test('portable preview bundle contains Three locally without runtime ESM imports', () => {
  const source = fs.readFileSync(preview, 'utf8');
  assert.match(source, /Three\.js r185 \(MIT License\)/);
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.ok(fs.statSync(preview).size > 500000);
  const html = fs.readFileSync(path.join(root, 'assets-source/library/model-preview.html'), 'utf8');
  assert.match(html, /id="download"/);
});
