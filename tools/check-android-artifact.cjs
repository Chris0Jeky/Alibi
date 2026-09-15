#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  ANDROID_DIST,
  HOST_ONLY,
  NATIVE_CSP,
  files,
  sourceDigest,
  treeDigest,
} = require('./build-android.cjs');

const ROOT = path.resolve(__dirname, '..');
const MANIFESTS = new Set(['android-assets.json', 'android-build-identity.json']);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function relative(directory, filename) {
  return path.relative(directory, filename).split(path.sep).join('/');
}

function expectedMime(filename) {
  const extension = path.extname(filename).toLowerCase();
  return (
    {
      '.css': 'text/css',
      '.glb': 'model/gltf-binary',
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.mjs': 'text/javascript',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.mtl': 'text/plain',
      '.obj': 'text/plain',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain',
      '.wasm': 'application/wasm',
      '.webp': 'image/webp',
      '.woff2': 'font/woff2',
      '.zip': 'application/zip',
    }[extension] || 'application/octet-stream'
  );
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

function inspectAndroidArtifact({ root = ROOT, directory = ANDROID_DIST } = {}) {
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
  need(identity.schemaVersion === 1, 'Unsupported Android build-identity schema.');
  need(identity.target === 'android', 'Android build identity has the wrong target.');
  need(/^[0-9a-f]{40}$/.test(identity.sourceSha || ''), 'Build identity needs a full source SHA.');
  for (const [field, value] of [
    ['payloadSha256', identity.payloadSha256],
    ['contentManifestRevision', identity.contentManifestRevision],
    ['rulesCompatibility', identity.rulesCompatibility],
  ])
    need(/^[0-9a-f]{64}$/.test(value || ''), `Build identity has an invalid ${field}.`);

  const packageJson = readJson(path.join(root, 'package.json'), errors);
  const webInfo = readJson(path.join(root, 'build-info.json'), errors);
  need(identity.appVersion === packageJson.version, 'Android and package versions differ.');
  need(identity.webBuild === webInfo.build, 'Android identity is not tied to the current web build.');
  need(identity.rulesCompatibility === sourceDigest(root), 'Rules compatibility digest is stale.');
  need(identity.assetManifest === 'android-assets.json', 'Unexpected asset-manifest path.');
  need(
    identity.saveEnvelopeVersions?.registryStatus === 'pending-CAP-05',
    'CAP-02 must not claim a completed save-domain registry.',
  );
  need(identity.saveEnvelopeVersions?.cabinetBackup === 1, 'Cabinet backup version is missing.');
  need(identity.saveEnvelopeVersions?.combinedBackup === 1, 'Combined backup version is missing.');

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
  }
  for (const name of actualPaths)
    if (!MANIFESTS.has(name) && !listed.has(name)) errors.push(`Android asset is not inventoried: ${name}.`);
  for (const name of listed.keys())
    if (!actualPaths.includes(name)) errors.push(`Manifest contains a missing Android asset: ${name}.`);

  need(identity.files === actualPaths.length, 'Build identity file count is stale.');
  need(
    identity.payloadSha256 === treeDigest(directory, new Set(['android-build-identity.json'])),
    'Android payload digest is stale.',
  );
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
    need(
      targetSource === "'use strict';globalThis.ALIBI_BUILD_TARGET='android';\n",
      'Android target marker has unexpected code.',
    );
  }

  const houseScripts = actualPaths.filter((name) => /^assets\/house\.[0-9a-f]{12}\.js$/.test(name));
  const houseStyles = actualPaths.filter((name) => /^assets\/house\.[0-9a-f]{12}\.css$/.test(name));
  need(houseScripts.length === 1, 'Android payload needs exactly one Wrenmere script.');
  need(houseStyles.length === 1, 'Android payload needs exactly one Wrenmere stylesheet.');
  const applicationScripts = actualPaths
    .filter((name) => /^assets\/alibi\.[0-9a-f]{12}\.js$/.test(name))
    .map((name) => fs.readFileSync(path.join(directory, ...name.split('/')), 'utf8'));
  need(
    applicationScripts.some((source) => source.includes('ALIBI_HOUSE_CONFIG')),
    'Android bootstrap is missing Wrenmere configuration.',
  );
  need(
    actualPaths.some((name) => /^assets\/quiet-wing\./.test(name)),
    'Android payload is missing Quiet Wing executable assets.',
  );

  return {
    errors,
    files: actualPaths.length,
    bytes: actualFiles.reduce((total, filename) => total + fs.statSync(filename).size, 0),
    payloadSha256: identity.payloadSha256 || '',
    webBuild: identity.webBuild || '',
    sourceSha: identity.sourceSha || '',
  };
}

if (require.main === module) {
  const result = inspectAndroidArtifact();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.errors.length ? 1 : 0;
}

module.exports = { expectedMime, inspectAndroidArtifact };
