'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ANDROID_DIST, deriveAndroidPayload, sourceSha } = require('../tools/build-android.cjs');
const { inspectAndroidArtifact } = require('../tools/check-android-artifact.cjs');
const { checkPublicPayload } = require('../tools/sync-android.cjs');
const { readIdentity, payloadDigest } = require('../tools/platform-identity.cjs');

const ROOT = path.resolve(__dirname, '..');
const WEB_DIST = path.join(ROOT, 'dist');

function temporaryDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function writeJson(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

test('generated Android payload satisfies the closed artifact contract', () => {
  const result = inspectAndroidArtifact();
  assert.deepEqual(result.errors, []);
  assert.match(result.payloadSha256, /^[0-9a-f]{64}$/);
  assert.match(result.artifactSha256, /^[0-9a-f]{64}$/);
  assert.match(result.sourceSha, /^[0-9a-f]{40}$/);
  assert.ok(result.files > 20);
  assert.ok(result.bytes > 0);
});

test('Android replaces the web runtime identity with explicit browser-preview capabilities', () => {
  const web = readIdentity(WEB_DIST);
  const android = readIdentity(ANDROID_DIST);
  const receipt = readJson(path.join(ANDROID_DIST, 'android-build-identity.json'));
  assert.equal(web.identity.target, 'web');
  assert.equal(android.identity.target, 'android');
  assert.equal(android.identity.flavor, 'browser-preview');
  assert.equal(android.identity.sourceDirty, false);
  assert.equal(android.identity.payloadSha256, payloadDigest(ANDROID_DIST));
  assert.notEqual(android.identity.payloadSha256, web.identity.payloadSha256);
  assert.equal(fs.existsSync(path.join(ANDROID_DIST, web.path)), false);
  assert.equal(receipt.schemaVersion, 2);
  assert.deepEqual(receipt.rulesCompatibility, {});
  assert.match(receipt.rulesSourceDigest, /^[0-9a-f]{64}$/);
  assert.equal(receipt.payloadSha256, android.identity.payloadSha256);
  assert.notEqual(receipt.payloadSha256, receipt.artifactSha256);
});

test('native flavor substitutes the explicit Capacitor entry and rejects a browser flavor check', () => {
  const target = temporaryDirectory('alibi-android-native-');
  try {
    const identity = deriveAndroidPayload({ target, flavor: 'capacitor-preview' });
    assert.equal(identity.flavor, 'capacitor-preview');
    assert.deepEqual(
      inspectAndroidArtifact({ directory: target, expectedFlavor: 'capacitor-preview' }).errors,
      [],
    );
    const platform = fs
      .readdirSync(path.join(target, 'assets'))
      .find((name) => /^alibi-platform\.[0-9a-f]{12}\.js$/.test(name));
    assert.ok(platform);
    assert.match(
      fs.readFileSync(path.join(target, 'assets', platform), 'utf8'),
      /Capacitor bridge/,
    );
    assert.match(
      inspectAndroidArtifact({ directory: target, expectedFlavor: 'browser-preview' }).errors.join(
        '\n',
      ),
      /flavor must be browser-preview/i,
    );
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('runtime identity tampering and metadata tampering remain independently detectable', () => {
  const target = temporaryDirectory('alibi-android-runtime-');
  try {
    deriveAndroidPayload({ target });
    const runtime = readIdentity(target);
    fs.appendFileSync(path.join(target, runtime.path), '// changed\n');
    let errors = inspectAndroidArtifact({ directory: target }).errors.join('\n');
    assert.match(errors, /identity framing|filename hash|identity encoding/);
    assert.match(errors, /artifact digest is stale/i);
    fs.writeFileSync(path.join(target, runtime.path), runtime.source);
    fs.appendFileSync(path.join(target, 'privacy.html'), '<!-- changed -->');
    errors = inspectAndroidArtifact({ directory: target }).errors.join('\n');
    assert.match(errors, /artifact digest is stale/i);
    assert.doesNotMatch(
      errors,
      /payload digest is stale/i,
      'metadata does not enter the runtime graph',
    );
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('web output remains intact while Android output excludes hosting controls', () => {
  for (const filename of ['sw.js', 'manifest.webmanifest', '_headers', '404.html']) {
    assert.equal(fs.existsSync(path.join(WEB_DIST, filename)), true, `web ${filename}`);
    assert.equal(fs.existsSync(path.join(ANDROID_DIST, filename)), false, `android ${filename}`);
  }
  const index = fs.readFileSync(path.join(ANDROID_DIST, 'index.html'), 'utf8');
  assert.doesNotMatch(index, /rel="manifest"|https?:\/\//);
  assert.match(index, /assets\/alibi-target\.[0-9a-f]{12}\.js/);
  assert.equal(
    fs
      .readdirSync(path.join(ANDROID_DIST, 'assets'))
      .some((name) => name.startsWith('observatory.')),
    false,
  );
});

test('Android keeps the full bundled experience while the native target suppresses web lifecycle', () => {
  const manifest = readJson(path.join(ANDROID_DIST, 'android-assets.json'));
  const application = manifest.files.find((entry) =>
    /^assets\/alibi\.[0-9a-f]{12}\.js$/.test(entry.path),
  );
  assert.ok(application, 'fixture contains the application bundle');
  const bundle = fs.readFileSync(path.join(ANDROID_DIST, ...application.path.split('/')), 'utf8');
  assert.match(bundle, /"standalone":false/);
  assert.doesNotMatch(bundle, /"standalone":true/);
  assert.match(bundle, /!globalThis\.ALIBI_BUILD_TARGET&&"serviceWorker"in navigator/);
  assert.match(bundle, /ALIBI_THEATRE/);
  assert.match(bundle, /ALIBI_QUIET_CONFIG/);
  assert.ok(
    manifest.files.some((entry) => /^assets\/ambience-[^/]+\.[0-9a-f]{12}\.mp3$/.test(entry.path)),
    'fixture retains bundled theatre ambience',
  );

  const app = fs.readFileSync(path.join(ROOT, 'src/app.js'), 'utf8');
  assert.match(app, /!globalThis\.ALIBI_BUILD_TARGET[\s\S]{0,160}'serviceWorker' in navigator/);
});

test('generated Android output is ignored by Git', () => {
  const ignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  assert.match(ignore, /^dist-android\/$/m);
});

test('Capacitor sync checks exact public bytes and sibling config files', () => {
  const fixture = temporaryDirectory('alibi-capacitor-sync-');
  const source = path.join(fixture, 'source');
  const target = path.join(fixture, 'assets', 'public');
  try {
    fs.mkdirSync(source, { recursive: true });
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(source, 'index.html'), 'preview');
    fs.writeFileSync(path.join(target, 'index.html'), 'preview');
    for (const name of ['capacitor.config.json', 'capacitor.plugins.json']) {
      fs.writeFileSync(path.join(fixture, 'assets', name), '{}');
    }
    assert.deepEqual(checkPublicPayload({ source, target }), []);
    fs.writeFileSync(path.join(target, 'index.html'), 'stale');
    assert.match(checkPublicPayload({ source, target }).join('\n'), /differs for index.html/);
    fs.writeFileSync(path.join(target, 'index.html'), 'preview');
    fs.rmSync(path.join(fixture, 'assets', 'capacitor.plugins.json'));
    assert.match(checkPublicPayload({ source, target }).join('\n'), /capacitor.plugins.json/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('deriving twice from one shared graph is byte-for-byte deterministic', () => {
  const first = temporaryDirectory('alibi-android-first-');
  const second = temporaryDirectory('alibi-android-second-');
  try {
    const one = deriveAndroidPayload({ target: first });
    const two = deriveAndroidPayload({ target: second });
    assert.deepEqual(one, two);
    assert.equal(
      fs.readFileSync(path.join(first, 'android-assets.json'), 'utf8'),
      fs.readFileSync(path.join(second, 'android-assets.json'), 'utf8'),
    );
    assert.equal(
      fs.readFileSync(path.join(first, 'android-build-identity.json'), 'utf8'),
      fs.readFileSync(path.join(second, 'android-build-identity.json'), 'utf8'),
    );
    assert.deepEqual(inspectAndroidArtifact({ directory: first }).errors, []);
    assert.deepEqual(inspectAndroidArtifact({ directory: second }).errors, []);
  } finally {
    fs.rmSync(first, { recursive: true, force: true });
    fs.rmSync(second, { recursive: true, force: true });
  }
});

test('tampering with one bundled file invalidates its receipt and payload digest', () => {
  const target = temporaryDirectory('alibi-android-tamper-');
  try {
    deriveAndroidPayload({ target });
    const manifest = readJson(path.join(target, 'android-assets.json'));
    const application = manifest.files.find((entry) =>
      /^assets\/alibi\.[0-9a-f]{12}\.js$/.test(entry.path),
    );
    assert.ok(application, 'fixture contains the application bundle');
    fs.appendFileSync(path.join(target, ...application.path.split('/')), '\n// changed\n');
    const errors = inspectAndroidArtifact({ directory: target }).errors.join('\n');
    assert.match(errors, /Byte count differs|SHA-256 differs/);
    assert.match(errors, /payload digest is stale/i);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('tampering with source or content provenance invalidates the identity receipt', () => {
  const target = temporaryDirectory('alibi-android-provenance-');
  try {
    deriveAndroidPayload({ target });
    const identityPath = path.join(target, 'android-build-identity.json');
    const identity = readJson(identityPath);

    writeJson(identityPath, { ...identity, sourceSha: '0'.repeat(40) });
    assert.match(
      inspectAndroidArtifact({ directory: target }).errors.join('\n'),
      /source SHA is stale/i,
    );

    writeJson(identityPath, {
      ...identity,
      contentManifestRevision: '0'.repeat(64),
    });
    assert.match(
      inspectAndroidArtifact({ directory: target }).errors.join('\n'),
      /content manifest revision is stale/i,
    );
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('source provenance rejects dirty embedded application inputs', () => {
  const root = temporaryDirectory('alibi-android-dirty-source-');
  const source = path.join(root, 'src', 'app.js');
  try {
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, 'globalThis.Alibi = true;\n');
    execFileSync('git', ['init', '-q'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'test@example.invalid'], {
      cwd: root,
      stdio: 'ignore',
    });
    execFileSync('git', ['config', 'user.name', 'Alibi test'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['add', '.'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['commit', '-q', '-m', 'fixture'], { cwd: root, stdio: 'ignore' });
    fs.appendFileSync(source, 'globalThis.dirty = true;\n');
    assert.throws(() => sourceSha(root), /clean source tree/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('identity keeps unfinished save-domain and publication work explicit', () => {
  const identity = readJson(path.join(ANDROID_DIST, 'android-build-identity.json'));
  assert.equal(identity.target, 'android');
  assert.equal(identity.saveEnvelopeVersions.registryStatus, 'pending-CAP-05');
  assert.equal(identity.saveEnvelopeVersions.cabinetBackup, 1);
  assert.equal(identity.saveEnvelopeVersions.combinedBackup, 1);
  assert.ok(!Object.hasOwn(identity, 'productionApproved'));
  assert.ok(!Object.hasOwn(identity, 'applicationId'));
  assert.ok(!Object.hasOwn(identity, 'versionCode'));
});
