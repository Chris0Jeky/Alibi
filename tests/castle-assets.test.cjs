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
    // Castle completion/navigation fixes: measured 98,062 -> 100,837 bytes; ceiling +2,816.
    assert.ok(bytesAt(dist, config.script) <= 96 * 1024 + 2816);
    assert.ok(result.sceneBytes <= 180 * 1024);
    assert.ok(result.originalSceneBytes <= 180 * 1024);
    assert.ok(bytesAt(dist, config.film.src) <= 1024 * 1024);
    assert.match(config.caseStudy, /^\.\/assets\/cases\/player\.[a-f0-9]{12}\.js$/);
    assertContentHash(dist, config.caseStudy);
    assert.match(result.receipt.download, /^receipt\.[a-f0-9]{12}\.js$/);
    const receiptURL = `./assets/cases/${result.receipt.download}`;
    assertContentHash(dist, receiptURL);
    const receiptBytes = fs.readFileSync(path.join(dist, receiptURL));
    assert.equal(result.receipt.bytes, receiptBytes.length);
    assert.equal(
      result.receipt.sha256,
      crypto.createHash('sha256').update(receiptBytes).digest('hex'),
    );
    assert.ok(
      !config.files.includes(receiptURL),
      'the receipt module is never precached in the core shell',
    );
    const caseFiles = fs.readdirSync(path.join(dist, 'assets/cases'));
    const sourceName = caseFiles.find((name) => name.endsWith('.json'));
    assert.equal(caseFiles.length, 3);
    const source = fs.readFileSync(path.join(root, 'content/cases/reading-room-blackout.json'));
    const sourceHash = crypto.createHash('sha256').update(source).digest('hex');
    assert.equal(sourceName, `reading-room-blackout.${sourceHash}.json`);
    assert.deepEqual(fs.readFileSync(path.join(dist, 'assets/cases', sourceName)), source);
    assert.ok(!config.files.includes(config.caseStudy), 'no automatic case installation');
    const player = fs.readFileSync(path.join(dist, config.caseStudy), 'utf8');
    // #893: the last-hint guard and the receipt focus return took the player from 16,374 to 16,397
    // bytes. Excess 14; ceiling +64 (to 16,448) leaves 51 bytes; no feature room.
    assert.ok(Buffer.byteLength(player) < 16 * 1024 + 64);
    assert.ok(!player.includes('CASE_DELIVERY'), 'the optional player owns its resolved metadata');
    assert.ok(player.includes(sourceHash));
    assert.ok(player.includes(result.receipt.sha256));
    assert.equal(
      result.bytes,
      [...config.files, ...Object.values(config.film)].reduce(
        (sum, url) => sum + bytesAt(dist, url),
        0,
      ) +
        bytesAt(dist, config.caseStudy) +
        receiptBytes.length +
        source.length,
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
