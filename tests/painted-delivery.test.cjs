const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os');
const buildDelivery = require('../tools/build-delivery.cjs');
const root = path.resolve(__dirname, '..');
const ids = ['club-welcome', 'lantern-duel', 'pocket-borough'];
test('three paintings use verified optional delivery with meaningful SVG fallbacks', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-painted-'));
  try {
    for (const p of [
      'content',
      'assets-source/curation',
      'assets-source/library/painted-club',
      'assets-source/library/painted-club/fallbacks',
      'dist/assets',
    ])
      fs.mkdirSync(path.join(fixture, p), { recursive: true });
    fs.writeFileSync(
      path.join(fixture, 'content/asset-delivery.json'),
      '{"schemaVersion":1,"mirrors":{}}',
    );
    fs.writeFileSync(path.join(fixture, 'assets-source/curation/registry.json'), '{"assets":[]}');
    const shelf = 'assets-source/library/painted-club/';
    fs.copyFileSync(
      path.join(root, shelf, 'manifest.json'),
      path.join(fixture, shelf, 'manifest.json'),
    );
    for (const id of ids) {
      fs.copyFileSync(
        path.join(root, shelf, id + '-320.webp'),
        path.join(fixture, shelf, id + '-320.webp'),
      );
      fs.copyFileSync(
        path.join(root, shelf, 'fallbacks', id + '.svg'),
        path.join(fixture, shelf, 'fallbacks', id + '.svg'),
      );
    }
    const built = buildDelivery(fixture, path.join(fixture, 'dist'), {});
    assert.deepEqual(Object.keys(built.entries), ['art-desk', 'art-duel', 'art-borough']);
    assert.deepEqual(built.origins, []);
    for (const entry of Object.values(built.entries)) {
      assert.equal(entry.urls.length, 1);
      assert.ok(entry.urls[0].startsWith('./assets/enhanced-painted-'));
      const svg = decodeURIComponent(entry.fallback.split(',')[1]);
      assert.match(svg, /<svg/);
      assert.match(svg, /<path/);
      assert.doesNotMatch(svg, /<image|<script|https:/);
      assert.ok(entry.bytes < 1024 * 1024);
    }
    assert.ok(built.bytes < 90000);
    fs.appendFileSync(path.join(fixture, shelf, 'lantern-duel-320.webp'), 'corruption');
    assert.throws(
      () => buildDelivery(fixture, path.join(fixture, 'dist'), {}),
      /Painted fingerprint mismatch/,
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
