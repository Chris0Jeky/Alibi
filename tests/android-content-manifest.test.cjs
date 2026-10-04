'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { deriveAndroidPayload } = require('../tools/build-android.cjs');
const { inspectAndroidArtifact } = require('../tools/check-android-artifact.cjs');
const { readIdentity, writeIdentity, payloadDigest } = require('../tools/platform-identity.cjs');
const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'dist');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
function sources(directory) {
  return ['official-content', 'official-deferred'].map((role) => {
    const names = fs
      .readdirSync(path.join(directory, 'assets'))
      .filter((name) => new RegExp(`^${role}\\.[a-f0-9]{12}\\.js$`).test(name));
    assert.equal(names.length, 1);
    const filename = path.join(directory, 'assets', names[0]);
    return { filename, bytes: fs.readFileSync(filename) };
  });
}
function revisions(directory) {
  const [initial, deferred] = sources(directory);
  return {
    receipt: sha256(initial.bytes),
    runtime: sha256(
      JSON.stringify([
        'alibi-official-content-1',
        ['initial', initial.bytes.toString('utf8')],
        ['deferred', deferred.bytes.toString('utf8')],
      ]),
    ),
  };
}
function fixture(run) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-content-audit-'));
  try {
    return run(temp);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
function inspect(directory) {
  return inspectAndroidArtifact({ directory }).errors;
}
function copyWeb(temp) {
  const source = path.join(temp, 'web');
  fs.cpSync(WEB, source, { recursive: true });
  return source;
}

test('both Android flavors validate full runtime content separately from the legacy receipt', () => {
  const expected = revisions(WEB);
  assert.notEqual(expected.runtime, expected.receipt);
  for (const flavor of ['browser-preview', 'capacitor-preview'])
    fixture((temp) => {
      const target = path.join(temp, 'android');
      const receipt = deriveAndroidPayload({ target, flavor });
      assert.equal(receipt.contentManifestRevision, expected.receipt);
      assert.equal(readIdentity(target).identity.contentManifestRevision, expected.runtime);
      assert.deepEqual(inspect(target), [], flavor);
    });
});

test('a coherently inventoried initial-only runtime identity is rejected', () => {
  fixture((temp) => {
    const source = copyWeb(temp),
      target = path.join(temp, 'android');
    const web = readIdentity(source).identity;
    writeIdentity(
      source,
      { ...web, contentManifestRevision: revisions(source).receipt },
      { replace: true },
    );
    deriveAndroidPayload({ source, target });
    assert.deepEqual(inspect(target), ['Android runtime identity does not match its receipt.']);
  });
});

test('putting the aggregate in the legacy receipt is independently rejected', () => {
  fixture((temp) => {
    const target = path.join(temp, 'android');
    const receipt = deriveAndroidPayload({ target });
    fs.writeFileSync(
      path.join(target, 'android-build-identity.json'),
      JSON.stringify({
        ...receipt,
        contentManifestRevision: revisions(WEB).runtime,
      }),
    );
    assert.deepEqual(inspect(target), ['Android content manifest revision is stale.']);
  });
});

test('recomputed payload and receipt hashes cannot substitute foreign deferred bytes', () => {
  fixture((temp) => {
    const source = copyWeb(temp),
      target = path.join(temp, 'android');
    fs.appendFileSync(sources(source)[1].filename, '\n// Different deferred source\n');
    const changed = revisions(source),
      expected = revisions(WEB);
    assert.equal(changed.receipt, expected.receipt, 'initial source and locator are fixed');
    assert.notEqual(changed.runtime, expected.runtime);
    writeIdentity(
      source,
      {
        ...readIdentity(source).identity,
        payloadSha256: payloadDigest(source),
        contentManifestRevision: changed.runtime,
      },
      { replace: true },
    );
    deriveAndroidPayload({ source, target });
    assert.deepEqual(inspect(target), [
      'Android official content differs from the current web build.',
      'Android runtime identity does not match its receipt.',
    ]);
  });
});

test('retaining the claimed aggregate cannot hide different deferred payload bytes', () => {
  fixture((temp) => {
    const source = copyWeb(temp),
      target = path.join(temp, 'android');
    fs.appendFileSync(sources(source)[1].filename, '\n// Different bytes, old claim\n');
    writeIdentity(
      source,
      {
        ...readIdentity(source).identity,
        payloadSha256: payloadDigest(source),
      },
      { replace: true },
    );
    deriveAndroidPayload({ source, target });
    assert.ok(
      inspect(target).includes('Android official content differs from the current web build.'),
    );
  });
});

test('missing and duplicate deferred assets fail closed rather than selecting arbitrary bytes', () => {
  for (const mode of ['missing', 'duplicate'])
    fixture((temp) => {
      const target = path.join(temp, 'android');
      deriveAndroidPayload({ target });
      const deferred = sources(target)[1].filename;
      if (mode === 'missing') fs.rmSync(deferred);
      else
        fs.copyFileSync(deferred, path.join(target, 'assets', 'official-deferred.ffffffffffff.js'));
      assert.ok(
        inspect(target).some((error) =>
          /Android payload needs exactly one official-deferred asset/.test(error),
        ),
      );
    });
});

test('renaming identical deferred bytes cannot strand the initial loader at an absent URL', () => {
  fixture((temp) => {
    const source = copyWeb(temp),
      target = path.join(temp, 'android');
    fs.renameSync(
      sources(source)[1].filename,
      path.join(source, 'assets', 'official-deferred.ffffffffffff.js'),
    );
    writeIdentity(
      source,
      {
        ...readIdentity(source).identity,
        payloadSha256: payloadDigest(source),
      },
      { replace: true },
    );
    deriveAndroidPayload({ source, target });
    assert.ok(
      inspect(target).includes('Android official content differs from the current web build.'),
    );
  });
});
