'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const zlib = require('node:zlib');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json')));
assert.ok(info.javascriptGzipBytes < 125 * 1024, 'Initial JavaScript stays under 125 KiB gzip');
assert.ok(info.coreOfflineBytes < 1.3 * 1024 * 1024, 'Core offline shell stays under 1.3 MiB');
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

// The optional wing includes a local 3D renderer and 24 curated model sources. Core stays unchanged.
assert.ok(info.quietWingBytes < 1500 * 1024, 'Optional 3D Quiet Wing pack stays below 1500 KiB');
