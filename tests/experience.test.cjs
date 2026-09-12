'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
test('Optional field-notes exports stay outside the core shell and retain a bounded independent pack', () => {
  const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json')));
  assert.equal(
    info.uncompressedBytes,
    info.coreOfflineBytes +
      info.quietWingBytes +
      info.castleBytes +
      info.experienceBytes +
      info.ambienceBytes +
      info.enhancementBytes +
      info.observatoryBytes +
      info.blockMotionBytes +
      info.houseBytes,
  );
  assert.ok(info.experienceBytes < 30 * 1024 * 1024);
  assert.ok(info.experienceOfflineBytes < 9 * 1024 * 1024);
  const sw = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
  assert.ok(!sw.includes('folio-'), 'No folio downloads at service-worker installation');
  const files = fs.readdirSync(path.join(dist, 'assets'));
  assert.equal(files.filter((f) => /^folio-.*\.glb$/.test(f)).length, 46);
  assert.equal(files.filter((f) => /^folio-.*\.mp4$/.test(f)).length, 8);
  assert.equal(files.filter((f) => /^folio-.*\.ogg$/.test(f)).length, 24);
  assert.ok(
    files.every((f) => !/\.(blend|wav|py)$/.test(f)),
    'No production masters in the distribution',
  );
  const js = fs.readFileSync(
    path.join(
      dist,
      'assets',
      files.find((f) => /^alibi\..*\.js$/.test(f)),
    ),
    'utf8',
  );
  const assignment = js.match(/globalThis\.ALIBI_QUIET_CONFIG=(.*);\n/);
  assert.ok(assignment, 'A static Quiet Wing configuration is emitted');
  const quiet = JSON.parse(assignment[1]);
  assert.equal(
    quiet.files.filter((f) => /folio-.*-room\./.test(f)).length,
    4,
    'Room headings accompany the regular offline wing',
  );
  assert.ok(
    quiet.files.every((f) => !/\.(mp4|ogg|glb)$/.test(f) || /quiet-pet-/.test(f)),
    'Larger field notes remain a deliberate download',
  );
});
