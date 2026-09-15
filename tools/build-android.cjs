/* Derive a native-ready Android payload from Alibi's single reviewed build graph. */
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const WEB_DIST = path.join(ROOT, 'dist');
const ANDROID_DIST = path.join(ROOT, 'dist-android');
const HOST_ONLY = new Set(['404.html', '_headers', 'manifest.webmanifest', 'sw.js']);
const RULE_SOURCES = [
  'src/core.js',
  'src/engines.js',
  'src/bridges.js',
  'src/club-engines.js',
  'src/challenges.js',
  'src/quiet-wing/calm.js',
  'src/quiet-wing/engine.js',
  'src/castle/validation-entry.mjs',
];
const NATIVE_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function files(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? files(absolute) : [absolute];
    })
    .sort();
}

function relative(directory, filename) {
  return path.relative(directory, filename).split(path.sep).join('/');
}

function copyTree(source, target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  for (const filename of files(source)) {
    const destination = path.join(target, path.relative(source, filename));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(filename, destination);
  }
}

function mime(filename) {
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
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.woff2': 'font/woff2',
    }[extension] || 'application/octet-stream'
  );
}

function sourceSha(root = ROOT) {
  const supplied = process.env.ALIBI_SOURCE_SHA || '';
  const value = supplied || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error('Android builds require a full source SHA.');
  return value;
}

function sourceDigest(root = ROOT) {
  const hash = crypto.createHash('sha256');
  for (const filename of RULE_SOURCES) {
    const bytes = fs.readFileSync(path.join(root, filename));
    hash.update(filename).update('\0').update(bytes).update('\0');
  }
  return hash.digest('hex');
}

function treeDigest(directory, ignored = new Set()) {
  const hash = crypto.createHash('sha256');
  for (const filename of files(directory)) {
    const name = relative(directory, filename);
    if (ignored.has(name)) continue;
    hash.update(name).update('\0').update(fs.readFileSync(filename)).update('\0');
  }
  return hash.digest('hex');
}

function rewriteIndex(directory, targetScript) {
  const filename = path.join(directory, 'index.html');
  let html = fs.readFileSync(filename, 'utf8');
  html = html.replace(/<link rel="manifest"[^>]*>/, '');
  html = html.replace(
    /<meta http-equiv="Content-Security-Policy" content="[^"]*">/,
    `<meta http-equiv="Content-Security-Policy" content="${NATIVE_CSP}">`,
  );
  const firstScript = html.indexOf('<script ');
  if (firstScript < 0) throw new Error('Built index has no external script anchor.');
  html = `${html.slice(0, firstScript)}<script src="./${targetScript}"></script>${html.slice(firstScript)}`;
  fs.writeFileSync(filename, html);
}

function writeAssetManifest(directory) {
  const manifestPath = path.join(directory, 'android-assets.json');
  const ignored = new Set(['android-assets.json', 'android-build-identity.json']);
  const entries = files(directory)
    .map((filename) => ({ filename, path: relative(directory, filename) }))
    .filter((entry) => !ignored.has(entry.path))
    .map((entry) => {
      const bytes = fs.readFileSync(entry.filename);
      return {
        path: entry.path,
        bytes: bytes.length,
        sha256: sha256(bytes),
        mime: mime(entry.path),
      };
    });
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({ schemaVersion: 1, target: 'android', files: entries }, null, 2)}\n`,
  );
  return entries;
}

function deriveAndroidPayload({ root = ROOT, source = WEB_DIST, target = ANDROID_DIST } = {}) {
  if (!fs.existsSync(path.join(source, 'index.html'))) {
    throw new Error('Web build is missing. Run the shared build before deriving Android assets.');
  }
  copyTree(source, target);
  for (const filename of HOST_ONLY) fs.rmSync(path.join(target, filename), { force: true });
  for (const filename of files(path.join(target, 'assets'))) {
    if (/^observatory\.[0-9a-f]{12}\.js$/.test(path.basename(filename))) fs.rmSync(filename);
  }

  const targetSource = "'use strict';globalThis.ALIBI_BUILD_TARGET='android';\n";
  const targetScript = `assets/alibi-target.${sha256(targetSource).slice(0, 12)}.js`;
  fs.writeFileSync(path.join(target, targetScript), targetSource);
  rewriteIndex(target, targetScript);
  const assets = writeAssetManifest(target);

  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const webInfo = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json'), 'utf8'));
  const content = assets.find((entry) => /^assets\/official-content\.[0-9a-f]{12}\.js$/.test(entry.path));
  if (!content) throw new Error('Android payload is missing official content.');
  const identity = {
    schemaVersion: 1,
    target: 'android',
    appVersion: packageJson.version,
    sourceSha: sourceSha(root),
    payloadSha256: treeDigest(target, new Set(['android-build-identity.json'])),
    webBuild: webInfo.build,
    contentManifestRevision: content.sha256,
    rulesCompatibility: sourceDigest(root),
    saveEnvelopeVersions: {
      registryStatus: 'pending-CAP-05',
      cabinetBackup: 1,
      combinedBackup: 1,
    },
    assetManifest: 'android-assets.json',
    files: assets.length + 2,
  };
  fs.writeFileSync(
    path.join(target, 'android-build-identity.json'),
    `${JSON.stringify(identity, null, 2)}\n`,
  );
  return identity;
}

function buildAndroid() {
  execFileSync(process.execPath, [path.join(ROOT, 'tools/build.cjs')], {
    cwd: ROOT,
    env: { ...process.env, ALIBI_BUILD_TARGET: 'web' },
    stdio: 'inherit',
  });
  const identity = deriveAndroidPayload();
  console.log(JSON.stringify(identity, null, 2));
  return identity;
}

if (require.main === module) buildAndroid();
module.exports = {
  ANDROID_DIST,
  HOST_ONLY,
  NATIVE_CSP,
  RULE_SOURCES,
  buildAndroid,
  deriveAndroidPayload,
  files,
  sourceDigest,
  treeDigest,
};
