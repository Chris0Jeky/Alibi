import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapPlatform } from '../src/platform/bootstrap.mjs';
import { installPlatform, __resetPlatformForTests } from '../src/platform/index.mjs';

const BUILD = Object.freeze({
  target: 'web',
  sourceSha: '1'.repeat(40),
  sourceDirty: false,
  payloadSha256: '2'.repeat(64),
  appVersion: '0.11.6',
  contentManifestRevision: 'catalogue-1',
  rulesCompatibility: Object.freeze({ cabinet: 4 }),
});

function hostFixture(overrides = {}) {
  const host = new EventTarget();
  Object.assign(host, {
    document: new EventTarget(),
    navigator: {},
    location: { origin: 'https://example.test', hostname: 'example.test' },
    setTimeout,
    clearTimeout,
    open: () => ({ opener: null }),
    ...overrides,
  });
  return host;
}

test.afterEach(() => __resetPlatformForTests());

test('bootstrap requires a complete identity and rejects malformed or marker-mismatched builds', () => {
  assert.throws(() => bootstrapPlatform({ host: hostFixture() }), /valid platform build identity/i);
  assert.throws(
    () => bootstrapPlatform({ host: hostFixture({ ALIBI_BUILD_TARGET: 'android' }), build: BUILD }),
    /android build identity/i,
  );
  assert.throws(
    () =>
      bootstrapPlatform({
        host: hostFixture(),
        build: Object.freeze({ ...BUILD, target: 'android' }),
      }),
    /web build identity/i,
  );
  assert.throws(
    () => bootstrapPlatform({ host: hostFixture(), build: { ...BUILD, sourceSha: 'dirty' } }),
    /sourceSha/i,
  );
  assert.throws(
    () => bootstrapPlatform({ host: hostFixture(), build: { ...BUILD, sourceDirty: 1 } }),
    /sourceDirty/i,
  );
  assert.throws(
    () => bootstrapPlatform({ host: hostFixture({ ALIBI_BUILD_TARGET: 'web' }), build: BUILD }),
    /ALIBI_BUILD_TARGET/i,
  );
  assert.throws(
    () => bootstrapPlatform({ host: hostFixture({ AlibiPlatform: {} }), build: BUILD }),
    /AlibiPlatform is already defined/i,
  );
});

test('absent and standalone markers select web without inspecting browser identity', () => {
  for (const marker of [undefined, 'standalone']) {
    const host = hostFixture({
      navigator: { userAgent: 'Android' },
      location: { hostname: 'localhost', origin: 'https://localhost' },
      ALIBI_PLATFORM_BUILD: BUILD,
      ...(marker === undefined ? {} : { ALIBI_BUILD_TARGET: marker }),
    });
    const platform = bootstrapPlatform({ host });
    assert.equal(platform.build.target, 'web');
    assert.equal(platform.capabilities().nativeHost, false);
    assert.equal(Object.getOwnPropertyDescriptor(host, 'AlibiPlatform').value, platform);
    __resetPlatformForTests();
  }
});

test('Android marker keeps browser fallback capabilities and installs one immutable facade', async () => {
  const androidBuild = Object.freeze({
    ...BUILD,
    target: 'android',
    flavor: 'browser-preview',
    versionCode: 7,
  });
  const host = hostFixture({
    ALIBI_BUILD_TARGET: 'android',
    ALIBI_PLATFORM_BUILD: androidBuild,
    showOpenFilePicker() {},
    showSaveFilePicker() {},
  });
  const platform = bootstrapPlatform({ host });
  assert.equal(platform.build.target, 'android');
  assert.deepEqual(platform.capabilities(), {
    target: 'android',
    nativeHost: false,
    nativeFeedback: false,
    userDocuments: true,
    recoveryVault: false,
    remoteTelemetry: false,
  });
  assert.equal(
    (await platform.recovery.list('club', { operationId: 'list', timeoutMs: 50 })).message,
    'Recovery checkpoints are unavailable in this browser adapter.',
  );
  const descriptor = Object.getOwnPropertyDescriptor(host, 'AlibiPlatform');
  assert.equal(descriptor.writable, false);
  assert.equal(descriptor.configurable, false);
  assert.throws(() => bootstrapPlatform({ host }), /already installed|already defined/i);
  assert.throws(() => installPlatform(platform), /already installed/i);
  assert.throws(() => {
    host.AlibiPlatform = null;
  }, TypeError);
});
