'use strict';
// Fail-closed guards for missing curation shapes: a venue-cover without a
// derivative and any asset without a source must throw Invalid errors,
// never an unactionable TypeError from nested field access.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const buildCuration = require('../tools/build-curation.cjs');

const OBJECT_PAGE = 'https://example.invalid/cover-x';

function fixtureRoot(asset) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-curation-validation-'));
  const dist = path.join(root, 'dist');
  const payload = Buffer.from('cover-bytes-for-hash-check');
  const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
  fs.mkdirSync(path.join(root, 'assets-source/curation'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src/curation-assets'), { recursive: true });
  fs.mkdirSync(dist, { recursive: true });
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src/curation-assets/x.webp'), payload);
  fs.writeFileSync(
    path.join(root, 'assets-source/curation/registry.json'),
    JSON.stringify({ assets: [asset(sha256)] }),
  );
  fs.writeFileSync(
    path.join(root, 'assets-source/curation/runtime.json'),
    JSON.stringify({ assets: [] }),
  );
  return { root, dist };
}

function validDerivative(sha256) {
  return { file: 'src/curation-assets/x.webp', sha256, format: 'image/webp' };
}

function baseAsset(sha256) {
  return {
    id: 'cover-x',
    kind: 'venue-cover',
    venue: 'copper',
    title: 'Cover X',
    alt: 'Alt text.',
    source: { objectPage: OBJECT_PAGE },
    derivative: validDerivative(sha256),
  };
}

test('a venue-cover without a derivative throws Invalid curation derivative, not TypeError', () => {
  const { root, dist } = fixtureRoot((sha256) => {
    const asset = baseAsset(sha256);
    delete asset.derivative;
    return asset;
  });
  try {
    buildCuration(root, dist);
    assert.fail('expected buildCuration to throw');
  } catch (error) {
    assert.match(error.message, /Invalid curation derivative for cover-x/);
    assert.ok(!(error instanceof TypeError), 'must not throw TypeError');
  }
});

test('an asset without a source throws Invalid curation source, not TypeError', () => {
  const { root, dist } = fixtureRoot((sha256) => {
    const asset = baseAsset(sha256);
    delete asset.source;
    return asset;
  });
  try {
    buildCuration(root, dist);
    assert.fail('expected buildCuration to throw');
  } catch (error) {
    assert.match(error.message, /Invalid curation source for cover-x/);
    assert.ok(!(error instanceof TypeError), 'must not throw TypeError');
  }
});

test('a valid venue-cover still builds its data URL and source', () => {
  const { root, dist } = fixtureRoot((sha256) => baseAsset(sha256));
  const result = buildCuration(root, dist);
  assert.ok(result.inlineMedia['cover-x'].startsWith('data:image/webp;base64,'));
  assert.equal(result.assets[0].source, OBJECT_PAGE);
});
