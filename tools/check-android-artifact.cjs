#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { payloadDigest, readIdentity, identitySource } = require('./platform-identity.cjs');
const {
  ANDROID_DIST,
  HOST_ONLY,
  NATIVE_CSP,
  cost: expectedCost,
  files,
  makeTargetSource,
  mime: expectedMime,
  sourceSha,
  sourceDigest,
  treeDigest,
  ANDROID_FLAVORS,
} = require('./build-android.cjs');

const ROOT = path.resolve(__dirname, '..');
const MANIFESTS = new Set(['android-assets.json', 'android-build-identity.json']);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function relative(directory, filename) {
  return path.relative(directory, filename).split(path.sep).join('/');
}

function readJson(filename, errors) {
  try {
    const value = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      errors.push(`${path.basename(filename)} must contain a JSON object.`);
      return {};
    }
    return value;
  } catch (error) {
    errors.push(`${path.basename(filename)} cannot be read: ${error.message}`);
    return {};
  }
}

function checkLocalReferences(directory, html, errors) {
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const reference = match[1];
    if (
      !reference ||
      reference.startsWith('#') ||
      reference.startsWith('data:') ||
      reference.startsWith('blob:')
    )
      continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(reference) || reference.startsWith('//')) {
      errors.push(`index.html contains a remote or unsupported reference: ${reference}.`);
      continue;
    }
    const clean = reference.split(/[?#]/)[0].replace(/^\.\//, '');
    const resolved = path.resolve(directory, clean);
    if (!resolved.startsWith(path.resolve(directory) + path.sep) || !fs.existsSync(resolved)) {
      errors.push(`index.html references a missing local file: ${reference}.`);
    }
  }
}

function expectedCosts(entries) {
  const lowerBound = entries.filter((entry) => entry.cost.decodedMemory.bytes !== null);
  const unresolved = entries.filter((entry) => entry.cost.decodedMemory.bytes === null);
  return {
    payloadBytes: entries.reduce((total, entry) => total + entry.cost.payloadBytes, 0),
    installBytes: entries.reduce((total, entry) => total + entry.cost.installBytes, 0),
    download: {
      status: 'pending-CAP-04-package',
      bytes: null,
      files: entries.length,
    },
    decodedMemory: {
      status: unresolved.length ? 'lower-bound-with-CAP-09-measurement-required' : 'lower-bound',
      lowerBoundBytes: lowerBound.reduce(
        (total, entry) => total + entry.cost.decodedMemory.bytes,
        0,
      ),
      measurementRequiredFiles: unresolved.length,
      measurementRequiredInstallBytes: unresolved.reduce(
        (total, entry) => total + entry.cost.installBytes,
        0,
      ),
    },
  };
}

function currentContentManifestRevision(root, errors) {
  const directory = path.join(root, 'dist', 'assets');
  const candidates = files(directory).filter((filename) =>
    /^official-content\.[0-9a-f]{12}\.js$/.test(path.basename(filename)),
  );
  if (candidates.length !== 1) {
    errors.push(
      `Current web build needs exactly one official-content asset; found ${candidates.length}.`,
    );
    return '';
  }
  return sha256(fs.readFileSync(candidates[0]));
}

function inspectAndroidArtifact({
  root = ROOT,
  directory = ANDROID_DIST,
  expectedFlavor = process.env.ALIBI_ANDROID_FLAVOR || null,
} = {}) {
  const errors = [];
  const need = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const manifestPath = path.join(directory, 'android-assets.json');
  const identityPath = path.join(directory, 'android-build-identity.json');
  if (!fs.existsSync(directory)) return { errors: ['dist-android is missing.'] };
  const manifest = readJson(manifestPath, errors);
  const identity = readJson(identityPath, errors);

  need(manifest.schemaVersion === 1, 'Unsupported Android asset-manifest schema.');
  need(manifest.target === 'android', 'Android asset manifest has the wrong target.');
  need(Array.isArray(manifest.files), 'Android asset manifest needs a files array.');
  need(identity.schemaVersion === 2, 'Unsupported Android build-identity schema.');
  need(identity.target === 'android', 'Android build identity has the wrong target.');
  need(ANDROID_FLAVORS.has(identity.flavor), 'Android build identity has an unsupported flavor.');
  if (expectedFlavor)
    need(identity.flavor === expectedFlavor, `Android artifact flavor must be ${expectedFlavor}.`);
  need(/^[0-9a-f]{40}$/.test(identity.sourceSha || ''), 'Build identity needs a full source SHA.');
  need(identity.sourceDirty === false, 'Android source identity must be clean.');
  for (const [field, value] of [
    ['payloadSha256', identity.payloadSha256],
    ['artifactSha256', identity.artifactSha256],
    ['contentManifestRevision', identity.contentManifestRevision],
    ['rulesSourceDigest', identity.rulesSourceDigest],
  ])
    need(/^[0-9a-f]{64}$/.test(value || ''), `Build identity has an invalid ${field}.`);

  const packageJson = readJson(path.join(root, 'package.json'), errors);
  const webInfo = readJson(path.join(root, 'build-info.json'), errors);
  const expectedSourceSha = sourceSha(root);
  const expectedContentManifestRevision = currentContentManifestRevision(root, errors);
  need(identity.appVersion === packageJson.version, 'Android and package versions differ.');
  need(identity.sourceSha === expectedSourceSha, 'Android source SHA is stale.');
  need(
    identity.contentManifestRevision === expectedContentManifestRevision,
    'Android content manifest revision is stale.',
  );
  need(
    identity.webBuild === webInfo.build,
    'Android identity is not tied to the current web build.',
  );
  need(identity.rulesSourceDigest === sourceDigest(root), 'Rules source digest is stale.');
  need(
    identity.rulesCompatibility &&
      typeof identity.rulesCompatibility === 'object' &&
      !Array.isArray(identity.rulesCompatibility) &&
      Object.keys(identity.rulesCompatibility).length === 0,
    'Rules compatibility remains undeclared until CAP-05.',
  );
  need(identity.assetManifest === 'android-assets.json', 'Unexpected asset-manifest path.');
  need(
    identity.saveEnvelopeVersions?.registryStatus === 'pending-CAP-05',
    'CAP-02 must not claim a completed save-domain registry.',
  );
  need(identity.saveEnvelopeVersions?.cabinetBackup === 1, 'Cabinet backup version is missing.');
  need(identity.saveEnvelopeVersions?.combinedBackup === 1, 'Combined backup version is missing.');
  for (const field of ['productionApproved', 'applicationId', 'versionCode'])
    need(!Object.hasOwn(identity, field), `CAP-02 must not claim ${field}.`);

  const actualFiles = files(directory);
  for (const filename of actualFiles) {
    if (fs.lstatSync(filename).isSymbolicLink())
      errors.push(`Android payload contains a symlink: ${relative(directory, filename)}.`);
  }
  const actualPaths = actualFiles.map((filename) => relative(directory, filename));
  const listed = new Map();
  for (const entry of Array.isArray(manifest.files) ? manifest.files : []) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push('Android asset entry must be an object.');
      continue;
    }
    const name = entry.path;
    if (
      typeof name !== 'string' ||
      !name ||
      name.startsWith('/') ||
      name.split('/').some((part) => !part || part === '..')
    ) {
      errors.push(`Unsafe Android asset path: ${name}.`);
      continue;
    }
    if (listed.has(name)) {
      errors.push(`Duplicate Android asset path: ${name}.`);
      continue;
    }
    listed.set(name, entry);
    const filename = path.join(directory, ...name.split('/'));
    if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
      errors.push(`Listed Android asset is missing: ${name}.`);
      continue;
    }
    const bytes = fs.readFileSync(filename);
    need(entry.bytes === bytes.length, `Byte count differs for ${name}.`);
    need(entry.sha256 === sha256(bytes), `SHA-256 differs for ${name}.`);
    need(entry.mime === expectedMime(name), `MIME type differs for ${name}.`);
    need(
      JSON.stringify(entry.cost) === JSON.stringify(expectedCost(name, bytes.length)),
      `Cost inventory differs for ${name}.`,
    );
  }
  for (const name of actualPaths)
    if (!MANIFESTS.has(name) && !listed.has(name))
      errors.push(`Android asset is not inventoried: ${name}.`);
  for (const name of listed.keys())
    if (!actualPaths.includes(name))
      errors.push(`Manifest contains a missing Android asset: ${name}.`);

  const listedEntries = [...listed.values()];
  need(
    JSON.stringify(manifest.costs) === JSON.stringify(expectedCosts(listedEntries)),
    'Android aggregate cost inventory is stale.',
  );
  need(identity.files === actualPaths.length, 'Build identity file count is stale.');
  need(identity.payloadSha256 === payloadDigest(directory), 'Android payload digest is stale.');
  need(
    identity.artifactSha256 === treeDigest(directory, new Set(['android-build-identity.json'])),
    'Android artifact digest is stale.',
  );
  let runtimeIdentity;
  try {
    runtimeIdentity = readIdentity(directory);
    const expected = {
      target: 'android',
      flavor: identity.flavor,
      sourceSha: expectedSourceSha,
      sourceDirty: false,
      payloadSha256: identity.payloadSha256,
      appVersion: packageJson.version,
      contentManifestRevision: expectedContentManifestRevision,
      rulesCompatibility: {},
    };
    need(
      runtimeIdentity.source === identitySource(expected),
      'Android runtime identity does not match its receipt.',
    );
  } catch (error) {
    errors.push(error.message);
  }
  for (const filename of HOST_ONLY)
    need(!actualPaths.includes(filename), `Host-only file leaked into Android: ${filename}.`);
  need(
    !actualPaths.some((name) => /^assets\/observatory\.[0-9a-f]{12}\.js$/.test(name)),
    'The online Observatory adapter leaked into Android.',
  );

  const indexPath = path.join(directory, 'index.html');
  const index = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
  need(index.length > 0, 'Android index.html is missing.');
  need(!/rel="manifest"/.test(index), 'Android index still advertises a web manifest.');
  need(!/serviceWorker|sw\.js/.test(index), 'Android index references a service worker.');
  need(!/https?:\/\//.test(index), 'Android index contains a remote URL.');
  need(
    index.includes(`<meta http-equiv="Content-Security-Policy" content="${NATIVE_CSP}">`),
    'Android index does not use the native offline CSP.',
  );
  checkLocalReferences(directory, index, errors);

  const scripts = [...index.matchAll(/<script src="([^"]+)"/g)].map((match) =>
    match[1].replace(/^\.\//, ''),
  );
  need(scripts.length > 1, 'Android index has no application scripts.');
  need(
    /^assets\/alibi-target\.[0-9a-f]{12}\.js$/.test(scripts[0] || ''),
    'Android target marker must be the first script.',
  );
  if (scripts[0]) {
    const targetPath = path.join(directory, ...scripts[0].split('/'));
    const targetSource = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';
    need(targetSource === makeTargetSource(), 'Android target marker has unexpected code.');
  }
  const identityIndex = scripts.indexOf(runtimeIdentity?.path);
  const platformIndex = scripts.findIndex((name) =>
    /^assets\/alibi-platform\.[0-9a-f]{12}\.js$/.test(name),
  );
  const applicationIndex = scripts.findIndex((name) =>
    /^assets\/alibi\.[0-9a-f]{12}\.js$/.test(name),
  );
  need(
    identityIndex > 0 && platformIndex > identityIndex && applicationIndex > platformIndex,
    'Android identity and platform must load after the target marker and before the application.',
  );

  const applicationScripts = actualPaths.filter((name) =>
    /^assets\/alibi\.[0-9a-f]{12}\.js$/.test(name),
  );
  need(applicationScripts.length === 1, 'Android payload needs exactly one application bundle.');
  if (applicationScripts[0]) {
    const source = fs.readFileSync(
      path.join(directory, ...applicationScripts[0].split('/')),
      'utf8',
    );
    need(
      source.includes('"standalone":false'),
      'Android application lost the hosted build configuration.',
    );
    need(
      !source.includes('"standalone":true'),
      'Standalone preview configuration leaked into Android.',
    );
    need(
      source.includes('!globalThis.ALIBI_BUILD_TARGET&&"serviceWorker"in navigator'),
      'Android target marker does not suppress web lifecycle behavior.',
    );
    need(
      source.includes('globalThis.ALIBI_OBSERVATORY_URL=""'),
      'Android application did not disable Observatory.',
    );
    need(
      source.includes('ALIBI_HOUSE_CONFIG'),
      'Android bootstrap is missing Wrenmere configuration.',
    );
    need(source.includes('Classic desk'), 'Android application is missing the Wrenmere fallback.');
  }

  const houseScripts = actualPaths.filter((name) => /^assets\/house\.[0-9a-f]{12}\.js$/.test(name));
  const houseStyles = actualPaths.filter((name) => /^assets\/house\.[0-9a-f]{12}\.css$/.test(name));
  need(houseScripts.length === 1, 'Android payload needs exactly one Wrenmere script.');
  need(houseStyles.length === 1, 'Android payload needs exactly one Wrenmere stylesheet.');
  need(
    actualPaths.some((name) => /^assets\/quiet-activity\.[0-9a-f]{12}\.js$/.test(name)),
    'Android payload is missing the Quiet Wing executable.',
  );
  need(
    actualPaths.some((name) => /^assets\/quiet-style\.[0-9a-f]{12}\.css$/.test(name)),
    'Android payload is missing the Quiet Wing stylesheet.',
  );

  return {
    errors,
    files: actualPaths.length,
    bytes: actualFiles.reduce((total, filename) => total + fs.statSync(filename).size, 0),
    costs: manifest.costs || null,
    payloadSha256: identity.payloadSha256 || '',
    artifactSha256: identity.artifactSha256 || '',
    webBuild: identity.webBuild || '',
    sourceSha: identity.sourceSha || '',
  };
}

if (require.main === module) {
  const flag = process.argv.find((value) => value.startsWith('--flavor='));
  const result = inspectAndroidArtifact({
    expectedFlavor: flag ? flag.slice('--flavor='.length) : undefined,
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.errors.length ? 1 : 0;
}

module.exports = { inspectAndroidArtifact };
