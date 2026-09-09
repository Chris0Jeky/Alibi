'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const zlib = require('node:zlib');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json')));
assert.ok(info.javascriptGzipBytes < 125 * 1024, 'Initial JavaScript stays under 125 KiB gzip');
assert.ok(
  info.coreOfflineBytes - info.officialContentBytes < 1.3 * 1024 * 1024,
  'Code and shell excluding official content stay under 1.3 MiB',
);
assert.ok(
  info.officialContentBytes < 1024 * 1024,
  '324 definitions and editorial data stay under 1 MiB',
);
assert.ok(
  info.coreOfflineBytes < 2.3 * 1024 * 1024,
  'Total core offline release stays under 2.3 MiB',
);
assert.ok(
  info.initialCodeAndContentGzipBytes < 200 * 1024,
  'Initial code plus official data stays under 200 KiB gzip',
);
for (const [prefix, limit] of [
  ['club-engines.', 8 * 1024],
  ['alibi.', 32 * 1024],
]) {
  const files = fs
    .readdirSync(path.join(root, 'dist/assets'))
    .filter((n) => n.startsWith(prefix) && (prefix !== 'alibi.' || n.endsWith('.css')));
  assert.equal(files.length, 1);
  assert.ok(
    zlib.gzipSync(fs.readFileSync(path.join(root, 'dist/assets', files[0]))).length < limit,
    prefix + ' fits its download budget',
  );
}

// Optional models and animated companions are downloaded after entering the wing. Core stays unchanged.
assert.ok(info.quietWingBytes < 2250 * 1024, 'Optional Quiet Wing pack stays below 2250 KiB');
