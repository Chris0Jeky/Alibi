'use strict';
// Registry shape guards for curation builds: a registry without an assets
// array, a runtime without an assets array (when a museum-image needs it),
// and a processed asset without a string source.objectPage must throw
// Invalid curation errors naming the asset, never a bare TypeError.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const buildCuration = require('../tools/build-curation.cjs');

const OBJECT_PAGE = 'https://example.invalid/object-x';

function writeRoot({ registry, runtime, artwork }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-curation-shape-'));
  const dist = path.join(root, 'dist');
  fs.mkdirSync(path.join(root, 'assets-source/curation'), { recursive: true });
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  if (artwork) {
    fs.mkdirSync(path.join(root, 'src/curation-assets'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'src/curation-assets/x.webp'),
      artwork.payload,
    );
  }
  fs.writeFileSync(
    path.join(root, 'assets-source/curation/registry.json'),
    JSON.stringify(registry),
  );
  fs.writeFileSync(
    path.join(root, 'assets-source/curation/runtime.json'),
    JSON.stringify(runtime),
  );
  return { root, dist };
}

function museumImage(source) {
  const asset = {
    id: 'object-x',
    kind: 'museum-image',
    venue: 'copper',
    title: 'Object X',
    alt: 'Alt text.',
    derivative: {
      file: 'src/curation-assets/x.webp',
      sha256: 'derivative-only-sha',
      format: 'image/webp',
    },
  };
  if (source !== undefined) asset.source = source;
  return asset;
}

function expectInvalidCuration(fn, pattern, id) {
  try {
    fn();
  } catch (error) {
    assert.match(error.message, pattern);
    if (id !== undefined)
      assert.ok(error.message.includes(id), 'error names ' + id);
    assert.ok(!(error instanceof TypeError), 'must not throw TypeError');
    return;
  }
  assert.fail('expected buildCuration to throw');
}

test('registry without an assets array throws Invalid curation, not TypeError', () => {
  const { root, dist } = writeRoot({ registry: {}, runtime: { assets: [] } });
  expectInvalidCuration(() => buildCuration(root, dist), /Invalid curation/);
});

test('museum-image with derivative only and no source throws Invalid curation source', () => {
  const { root, dist } = writeRoot({
    registry: { assets: [museumImage()] },
    runtime: { assets: [] },
  });
  expectInvalidCuration(
    () => buildCuration(root, dist),
    /Invalid curation source for object-x/,
    'object-x',
  );
});

test('processed asset without a string source.objectPage throws Invalid curation source', () => {
  const { root, dist } = writeRoot({
    registry: { assets: [museumImage({})] },
    runtime: { assets: [] },
  });
  expectInvalidCuration(
    () => buildCuration(root, dist),
    /Invalid curation source for object-x/,
    'object-x',
  );
});

test('runtime without an assets array throws Invalid curation when used', () => {
  const { root, dist } = writeRoot({
    registry: { assets: [museumImage({ objectPage: OBJECT_PAGE })] },
    runtime: {},
  });
  expectInvalidCuration(
    () => buildCuration(root, dist),
    /Invalid curation/,
    'object-x',
  );
});

test('an unused malformed runtime does not block a venue-cover build', () => {
  const payload = Buffer.from('cover-bytes-for-hash-check');
  const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
  const { root, dist } = writeRoot({
    registry: {
      assets: [
        {
          id: 'cover-x',
          kind: 'venue-cover',
          venue: 'copper',
          title: 'Cover X',
          alt: 'Alt text.',
          source: { objectPage: OBJECT_PAGE },
          derivative: {
            file: 'src/curation-assets/x.webp',
            sha256,
            format: 'image/webp',
          },
        },
      ],
    },
    runtime: {},
    artwork: { payload },
  });
  const result = buildCuration(root, dist);
  assert.equal(result.assets[0].source, OBJECT_PAGE);
});
