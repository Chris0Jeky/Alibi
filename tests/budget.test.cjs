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
  ['Pulseboard SDK', /^pulseboard\.[a-f0-9]{12}\.js$/, info.observatoryBytes],
  ['Discovery storage', /^discovery-storage\.[a-f0-9]{12}\.js$/, info.discoveryStorageBytes],
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
{
  // Registry-deferred official definitions leave the startup payload but stay offline-ready.
  const matches = assetNames.filter((name) => /^official-deferred\.[a-f0-9]{12}\.js$/.test(name));
  assert.equal(matches.length, 1, 'One hashed deferred official-definitions asset is emitted');
  const bytes = fs.readFileSync(path.join(root, 'dist/assets', matches[0]));
  assert.equal(bytes.length, info.deferredContentBytes, 'Deferred definitions are reported');
  assert.equal(zlib.gzipSync(bytes).length, info.deferredContentGzipBytes);
  assert.ok(
    serviceWorker.includes(`"./assets/${matches[0]}"`),
    'Deferred definitions are precached in the core offline shell',
  );
  assert.ok(
    !fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8').includes(matches[0]),
    'Deferred definitions are not a startup script',
  );
  assert.ok(
    info.deferredContentGzipBytes < 12 * 1024,
    'Deferred official definitions stay under 12 KiB gzip',
  );
}
const deferredBytes = info.observatoryBytes + info.discoveryStorageBytes;
const coreOfflineBytes = info.coreOfflineBytes - deferredBytes;
// CAP-03 adds the bounded Cabinet picker consumer to the startup application shell.
// Merges through #297 add a measured net 102 gzip bytes (128,943 -> 129,045)
// for the journey-boundary fix and the single-sourced pack cap.
// Keyboard arrows for dossier/witness mark grids add reachable focus motion (#272).
// #333: atomic restore and stale-merge protection need a measured 256-byte ceiling extension.
// The settings-first sharing hotfix (route visibility sync plus a late-mount observer) needs a
// further measured 128-byte extension: 130,290 -> 130,366 gzip bytes. Moving the control into the
// Settings/Privacy slot (render rescue plus slot move) needs another measured 64 bytes: -> 130,443.
// Pulseboard SDK v3 (0.14.1): the host glue (slot, routes, id-and-number journey props) plus the
// required Privacy copy for the three categories, EEA gating, GPC/DNT and retention measured
// 130,084 -> 130,678 gzip bytes (130,703 on the 0.14.0 base); the SDK stays a separate deferred
// asset. Ceiling +256.
assert.ok(
  info.javascriptGzipBytes < 127 * 1024 + 704,
  'Application bundle stays under 127 KiB + 704 bytes gzip',
);
assert.ok(info.platformGzipBytes < 6 * 1024, 'Platform and identity stay under 6 KiB gzip');
assert.ok(
  // CAP-03 adds the complete local platform facade (~14 KiB uncompressed). The 200 KiB
  // compressed startup and 2.3 MiB total offline ceilings remain unchanged.
  coreOfflineBytes - info.officialContentBytes < 1.32 * 1024 * 1024,
  'Precached code and shell excluding official content stay under 1.32 MiB',
);
assert.ok(
  info.officialContentBytes < 1024 * 1024,
  'Official definitions and editorial data stay under 1 MiB',
);
assert.ok(coreOfflineBytes < 2.3 * 1024 * 1024, 'Total core offline release stays under 2.3 MiB');
assert.ok(
  info.initialCodeAndContentGzipBytes < 200 * 1024,
  'Initial code plus official data stays under 200 KiB gzip',
);
for (const [prefix, limit] of [
  ['club-engines.', 8 * 1024],
  // Six offered Games Room games plus retained legacy compatibility surfaces use 33 KiB;
  // the visible first-visit sharing notice adds a measured 170 gzip bytes in 0.12.0.
  // Initial JS, engine, combined initial payload and offline budgets remain unchanged.
  ['alibi.', 33 * 1024 + 256],
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
