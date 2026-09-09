'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const buildCastle = require('../tools/build-castle.cjs');

const root = path.resolve(__dirname, '..');
const roomIds = [
  'cartography',
  'conservatory',
  'estate-1911',
  'estate-today',
  'gatehouse',
  'library',
  'museum',
  'observatory',
  'orangery',
  'study',
  'west-stair',
  'workshop',
];

function bytesAt(dist, url) {
  return fs.readFileSync(path.join(dist, url)).length;
}

function assertContentHash(dist, url) {
  const actual = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(dist, url)))
    .digest('hex')
    .slice(0, 12);
  assert.equal(path.basename(url).split('.')[1], actual, `content hash for ${url}`);
}

test('Castle build emits a bounded scene manifest and on-demand prologue', async () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-castle-'));
  try {
    const result = buildCastle(root, dist);
    const { config } = result;
    assert.match(config.script, /^\.\/assets\/quiet-castle\.[a-f0-9]{12}\.js$/);
    assert.equal(config.files.length, 13);
    assert.equal(new Set(config.files).size, config.files.length);
    assert.deepEqual(Object.keys(config.media).sort(), roomIds);
    assert.ok(
      config.files
        .slice(1)
        .every((url) => /^\.\/assets\/quiet-castle\.[a-f0-9]{12}\.[a-z0-9-]+\.svg$/.test(url)),
    );
    assert.ok(Object.values(config.media).every((url) => config.files.includes(url)));
    assert.ok(config.files.every((url) => url.startsWith('./assets/quiet-castle.')));
    assert.ok(!Object.values(config.film).some((url) => config.files.includes(url)));
    [...config.files, ...Object.values(config.film)].forEach((url) => assertContentHash(dist, url));
    assert.ok(bytesAt(dist, config.script) <= 96 * 1024);
    assert.ok(result.sceneBytes <= 180 * 1024);
    assert.ok(result.originalSceneBytes <= 180 * 1024);
    assert.ok(bytesAt(dist, config.film.src) <= 1024 * 1024);
    assert.equal(
      result.bytes,
      [...config.files, ...Object.values(config.film)].reduce(
        (sum, url) => sum + bytesAt(dist, url),
        0,
      ),
    );

    const delivered1911 = fs.readFileSync(path.join(dist, config.media['estate-1911']), 'utf8');
    assert.doesNotMatch(delivered1911, /M367 483l8-38 90-31 22 31/);
    const source1911 = fs.readFileSync(
      path.join(root, 'assets-source/castle/rooms/estate-1911.svg'),
      'utf8',
    );
    assert.match(source1911, /M367 483l8-38 90-31 22 31/);

    assert.deepEqual(Object.keys(result.standalone.media).sort(), roomIds);
    assert.ok(
      Object.values(result.standalone.media).every((value) =>
        value.startsWith('data:image/svg+xml;base64,'),
      ),
    );
    assert.equal(result.standalone.film, null);

    globalThis.ALIBI_QUIET_CONFIG = { castle: { media: result.standalone.media } };
    const art = await import('../src/castle/art.mjs?castle-assets-test');
    assert.match(art.estate('today', false), /data:image\/svg\+xml/);
    assert.doesNotMatch(art.estate('today', false), /service (?:route|stair)/i);
    assert.doesNotMatch(art.estate('1911', false), /service (?:route|stair)/i);
    assert.match(art.estate('1911', true), /service route located/i);
    assert.match(art.interior({ id: 'library', name: 'Long Library' }, 'today'), /data:image/);
  } finally {
    fs.rmSync(dist, { recursive: true, force: true });
    delete globalThis.ALIBI_QUIET_CONFIG;
  }
});
