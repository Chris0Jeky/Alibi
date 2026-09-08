'use strict';
const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
test('animated companion candidates match their receipts and contain no external resources', () => {
  const dir = path.join(__dirname, '../assets-source/quiet-wing/companions');
  const receipts = JSON.parse(fs.readFileSync(path.join(dir, 'download-receipt.json')));
  for (const r of receipts.models) {
    const bytes = fs.readFileSync(path.join(dir, r.id + '.glb'));
    assert.equal(bytes.length, r.bytes);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), r.sha256);
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(4), 2);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
    const scene = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
    assert.ok(scene.skins.length > 0);
    assert.deepEqual(
      scene.animations.map((a) => a.name),
      r.animations,
    );
    assert.ok(scene.buffers.every((b) => !b.uri));
    assert.ok((scene.images || []).every((i) => !i.uri || i.uri.startsWith('data:')));
    for (const animation of scene.animations)
      for (const sampler of animation.samplers) {
        assert.ok(scene.accessors[sampler.input].count > 0);
        assert.ok(scene.accessors[sampler.output].count > 0);
      }
  }
  assert.match(fs.readFileSync(path.join(dir, 'OWL-METADATA.json'), 'utf8'), /CC0 1.0/);
  assert.match(
    fs.readFileSync(path.join(dir, 'FOX-LICENSE-AND-SOURCE.md'), 'utf8'),
    /Creative Commons Attribution 4.0/,
  );
});
