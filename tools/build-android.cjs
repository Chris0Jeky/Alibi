/* Derive a native-ready Android payload from Alibi's single reviewed web build graph. */
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
  'src/backup-validation.js',
  'src/club-engines.js',
  'src/challenges.js',
  'src/quiet-wing/calm.js',
  'src/quiet-wing/engine.js',
  'src/quiet-wing/storage.js',
  'src/castle/validation-entry.mjs',
];
const NATIVE_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
const NATIVE_UI_CSS = `${[
  'html[data-alibi-target="android"] [data-action="install"]',
  'html[data-alibi-target="android"] [data-action="check-update"]',
  'html[data-alibi-target="android"] .settings-grid > .panel:has([data-action="install"])',
].join(',')}{display:none!important}`;
const TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.mjs',
  '.mtl',
  '.obj',
  '.svg',
  '.txt',
]);

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

function cost(pathname, bytes) {
  const extension = path.extname(pathname).toLowerCase();
  const measurable = TEXT_EXTENSIONS.has(extension);
  return {
    payloadBytes: bytes,
    installBytes: bytes,
    download: {
      status: 'pending-CAP-04-package',
      bytes: null,
    },
    decodedMemory: measurable
      ? {
          status: 'lower-bound',
          bytes,
          basis: 'encoded text bytes; parser/runtime overhead excluded',
        }
      : {
          status: 'measurement-required-CAP-09',
          bytes: null,
          basis: 'compressed media/model bytes are not resident-memory evidence',
        },
  };
}

function sourceSha(root = ROOT) {
  const dirty = execFileSync(
    'git',
    ['status', '--porcelain=v1', '--untracked-files=all', '--', ...RULE_SOURCES],
    { cwd: root, encoding: 'utf8' },
  ).trim();
  if (dirty) throw new Error('Android builds require a clean source tree.');
  const value = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
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

function replaceExactly(source, matcher, replacement, label) {
  const matches = [
    ...source.matchAll(
      new RegExp(matcher.source, matcher.flags.includes('g') ? matcher.flags : matcher.flags + 'g'),
    ),
  ];
  if (matches.length !== 1)
    throw new Error(`${label} expected exactly one match; found ${matches.length}.`);
  return source.replace(matcher, replacement);
}

function makeTargetSource() {
  return `'use strict';
(() => {
  const g = globalThis;
  g.ALIBI_BUILD_TARGET = 'android';
  document.documentElement.dataset.alibiTarget = 'android';
  const wrap = (value) => {
    if (!value || typeof value.getStatus !== 'function') return value;
    const getStatus = value.getStatus.bind(value);
    value.getStatus = () => ({ ...getStatus(), target: 'android', offlineReady: true });
    return value;
  };
  const descriptor = Object.getOwnPropertyDescriptor(g, 'AlibiDiagnostics');
  if (!descriptor || descriptor.configurable) {
    let diagnostics;
    Object.defineProperty(g, 'AlibiDiagnostics', {
      configurable: true,
      get: () => diagnostics,
      set(value) {
        diagnostics = wrap(value);
        Object.defineProperty(g, 'AlibiDiagnostics', {
          configurable: true,
          writable: true,
          value: diagnostics,
        });
      },
    });
  }
})();
`;
}

function patchApplicationBundle(directory) {
  const candidates = files(path.join(directory, 'assets')).filter((filename) =>
    /^alibi\.[0-9a-f]{12}\.js$/.test(path.basename(filename)),
  );
  if (candidates.length !== 1)
    throw new Error(`Expected exactly one Alibi application bundle; found ${candidates.length}.`);
  const original = candidates[0];
  let source = fs.readFileSync(original, 'utf8');
  source = replaceExactly(
    source,
    /![A-Za-z_$][\w$]*\.standalone&&"serviceWorker"in navigator/,
    '!globalThis.ALIBI_BUILD_TARGET&&"serviceWorker"in navigator',
    'Android target lifecycle guard',
  );
  source = replaceExactly(
    source,
    /globalThis\.ALIBI_OBSERVATORY_URL="\.\/assets\/observatory\.[0-9a-f]{12}\.js"/,
    'globalThis.ALIBI_OBSERVATORY_URL=""',
    'Android Observatory disablement',
  );
  const nextName = `alibi.${sha256(source).slice(0, 12)}.js`;
  const next = path.join(path.dirname(original), nextName);
  fs.writeFileSync(next, source);
  if (next !== original) fs.rmSync(original);
  return {
    previous: `assets/${path.basename(original)}`,
    current: `assets/${nextName}`,
  };
}

function rewriteIndex(directory, targetScript, application) {
  const filename = path.join(directory, 'index.html');
  let html = fs.readFileSync(filename, 'utf8');
  html = replaceExactly(html, /<link rel="manifest"[^>]*>\s*/, '', 'Web manifest link');
  html = replaceExactly(
    html,
    /<meta http-equiv="Content-Security-Policy" content="[^"]*">/,
    `<meta http-equiv="Content-Security-Policy" content="${NATIVE_CSP}"><style id="alibi-native-ui">${NATIVE_UI_CSS}</style>`,
    'Content Security Policy',
  );
  html = replaceExactly(
    html,
    new RegExp(application.previous.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    application.current,
    'Application script reference',
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
        cost: cost(entry.path, bytes.length),
      };
    });
  const lowerBound = entries.filter((entry) => entry.cost.decodedMemory.bytes !== null);
  const unresolved = entries.filter((entry) => entry.cost.decodedMemory.bytes === null);
  const costs = {
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
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({ schemaVersion: 1, target: 'android', costs, files: entries }, null, 2)}\n`,
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

  const application = patchApplicationBundle(target);
  const targetSource = makeTargetSource();
  const targetScript = `assets/alibi-target.${sha256(targetSource).slice(0, 12)}.js`;
  fs.writeFileSync(path.join(target, targetScript), targetSource);
  rewriteIndex(target, targetScript, application);
  const assets = writeAssetManifest(target);

  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const webInfo = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json'), 'utf8'));
  const content = assets.find((entry) =>
    /^assets\/official-content\.[0-9a-f]{12}\.js$/.test(entry.path),
  );
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
  NATIVE_UI_CSS,
  RULE_SOURCES,
  buildAndroid,
  cost,
  deriveAndroidPayload,
  files,
  makeTargetSource,
  mime,
  sourceSha,
  sourceDigest,
  treeDigest,
};
