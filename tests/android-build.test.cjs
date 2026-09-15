'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  ANDROID_DIST,
  deriveAndroidPayload,
} = require('../tools/build-android.cjs');
const { inspectAndroidArtifact } = require('../tools/check-android-artifact.cjs');

const ROOT = path.resolve(__dirname, '..');
const WEB_DIST = path.join(ROOT, 'dist');

function temporaryDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

test('generated Android payload satisfies the closed artifact contract', () => {
  const result = inspectAndroidArtifact();
  assert.deepEqual(result.errors, []);
  assert.match(result.payloadSha256, /^[0-9a-f]{64}$/);
  assert.match(result.sourceSha, /^[0-9a-f]{40}$/);
  assert.ok(result.files > 20);
  assert.ok(result.bytes > 0);
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
    fs.readdirSync(path.join(ANDROID_DIST, 'assets')).some((name) => name.startsWith('observatory.')),
    false,
  );
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

test('tampering with one bundled file invalidates both its receipt and payload digest', () => {
  const target = temporaryDirectory('alibi-android-tamper-');
  try {
    deriveAndroidPayload({ target });
    const manifest = readJson(path.join(target, 'android-assets.json'));
    const application = manifest.files.find((entry) => /^assets\/alibi\.[0-9a-f]{12}\.js$/.test(entry.path));
    assert.ok(application, 'fixture contains the application bundle');
    fs.appendFileSync(path.join(target, ...application.path.split('/')), '\n// changed\n');
    const errors = inspectAndroidArtifact({ directory: target }).errors.join('\n');
    assert.match(errors, /Byte count differs|SHA-256 differs/);
    assert.match(errors, /payload digest is stale/i);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('identity keeps unfinished save-domain work explicit', () => {
  const identity = readJson(path.join(ANDROID_DIST, 'android-build-identity.json'));
  assert.equal(identity.target, 'android');
  assert.equal(identity.saveEnvelopeVersions.registryStatus, 'pending-CAP-05');
  assert.equal(identity.saveEnvelopeVersions.cabinetBackup, 1);
  assert.equal(identity.saveEnvelopeVersions.combinedBackup, 1);
  assert.ok(!Object.hasOwn(identity, 'productionApproved'));
  assert.ok(!Object.hasOwn(identity, 'applicationId'));
});
