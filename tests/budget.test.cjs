'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const zlib = require('node:zlib');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json')));
const assetNames = fs.readdirSync(path.join(root, 'dist/assets'));
const initialScriptName = assetNames.find((name) => /^alibi\.[a-f0-9]{12}\.js$/.test(name));
assert.ok(initialScriptName, 'Initial JavaScript is emitted');
const initialScript = fs.readFileSync(path.join(root, 'dist/assets', initialScriptName), 'utf8');
for (const globalName of [
  'ALIBI_HOUSE_CONFIG',
  'ALIBI_DELIVERY',
  'ALIBI_CURATION_MEDIA',
  'ALIBI_CONFIG',
  'ALIBI_QUIET_CONFIG',
  'ALIBI_MEDIA',
  'ALIBI_WORKER_URL',
  'ALIBI_CLUB_CONFIG',
  'ALIBI_OBSERVATORY_URL',
])
  assert.ok(
    initialScript.includes(`globalThis.${globalName}=`),
    `${globalName} remains in the initial configuration preamble`,
  );
assert.ok(
  !initialScript.includes('ALIBI_DISCOVERY_STORAGE_URL'),
  'Unwired discovery storage stays out of the initial JavaScript',
);
const serviceWorker = fs.readFileSync(path.join(root, 'dist/sw.js'), 'utf8');
const deferredAssets = [
  ['Observatory', /^observatory\.[a-f0-9]{12}\.js$/, info.observatoryBytes],
  [
    'Discovery storage',
    /^discovery-storage\.[a-f0-9]{12}\.js$/,
    info.discoveryStorageBytes,
  ],
];
for (const [label, pattern, reportedBytes] of deferredAssets) {
  const matches = assetNames.filter((name) => pattern.test(name));
  assert.equal(matches.length, 1, `One hashed ${label.toLowerCase()} asset is emitted`);
  const name = matches[0];
  assert.equal(
    fs.statSync(path.join(root, 'dist/assets', name)).size,
    reportedBytes,
    `${label} bytes are reported separately`,
  );
  assert.ok(
    !serviceWorker.includes(`./assets/${name}`),
    `${label} stays outside the core offline shell`,
  );
}
const deferredBytes = info.observatoryBytes + info.discoveryStorageBytes;
const coreOfflineBytes = info.coreOfflineBytes - deferredBytes;
assert.ok(info.javascriptGzipBytes < 125 * 1024, 'Initial JavaScript stays under 125 KiB gzip');
assert.ok(
  coreOfflineBytes - info.officialContentBytes < 1.3 * 1024 * 1024,
  'Precached code and shell excluding official content stay under 1.3 MiB',
);
assert.ok(
  info.officialContentBytes < 1024 * 1024,
  'Official definitions and editorial data stay under 1 MiB',
);
assert.ok(
  coreOfflineBytes < 2.3 * 1024 * 1024,
  'Total core offline release stays under 2.3 MiB',
);
assert.ok(
  info.initialCodeAndContentGzipBytes < 200 * 1024,
  'Initial code plus official data stays under 200 KiB gzip',
);
for (const [prefix, limit] of [
  ['club-engines.', 8 * 1024],
  // Six offered Games Room games plus retained legacy compatibility surfaces: 33 KiB allows the measured 32.2 KiB stylesheet.
  // Initial JS, engine, combined initial payload and offline budgets remain unchanged.
  ['alibi.', 33 * 1024],
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
