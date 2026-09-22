import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapPlatform } from '../src/platform/bootstrap.mjs';
import { createAndroidPreviewPlatform } from '../src/platform/android.mjs';
import { __resetPlatformForTests } from '../src/platform/index.mjs';

const BUILD = Object.freeze({
  target: 'android',
  flavor: 'capacitor-preview',
  sourceSha: '1'.repeat(40),
  sourceDirty: false,
  payloadSha256: '2'.repeat(64),
  appVersion: '0.11.5',
  versionCode: 11,
  contentManifestRevision: 'catalogue-1',
  rulesCompatibility: Object.freeze({ cabinet: 4 }),
});

function hostFixture(overrides = {}) {
  const host = new EventTarget();
  Object.assign(host, {
    document: new EventTarget(),
    navigator: {},
    location: { origin: 'https://localhost', hostname: 'localhost' },
    setTimeout,
    clearTimeout,
    open: () => ({ opener: null }),
    Capacitor: {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
    },
    ...overrides,
  });
  return host;
}

test.afterEach(() => __resetPlatformForTests());

test('Android adapter rejects missing or incorrect native bridge before hydration', () => {
  assert.throws(
    () =>
      createAndroidPreviewPlatform({ host: hostFixture({ Capacitor: undefined }), build: BUILD }),
    /Capacitor bridge/i,
  );
  assert.throws(
    () =>
      createAndroidPreviewPlatform({
        host: hostFixture({
          Capacitor: { isNativePlatform: () => false, getPlatform: () => 'android' },
        }),
        build: BUILD,
      }),
    /native platform/i,
  );
  assert.throws(
    () =>
      createAndroidPreviewPlatform({
        host: hostFixture({
          Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
        }),
        build: BUILD,
      }),
    /android platform/i,
  );
  assert.throws(
    () =>
      createAndroidPreviewPlatform({
        host: hostFixture({ location: { origin: 'http://localhost' } }),
        build: BUILD,
      }),
    /https:\/\/localhost/i,
  );
});

test('Android adapter publishes honest native capabilities and immutable facade', async () => {
  const host = hostFixture({
    ALIBI_BUILD_TARGET: 'android',
    showOpenFilePicker() {},
    showSaveFilePicker() {},
  });
  const platform = bootstrapPlatform({
    host,
    build: BUILD,
    adapterFactory: createAndroidPreviewPlatform,
  });
  assert.deepEqual(platform.capabilities(), {
    target: 'android',
    nativeHost: true,
    nativeFeedback: false,
    userDocuments: false,
    recoveryVault: false,
    remoteTelemetry: false,
  });
  assert.equal(platform.build.flavor, 'capacitor-preview');
  assert.equal(
    (await platform.documents.pickBackup({ operationId: 'pick', timeoutMs: 50 })).ok,
    false,
  );
  assert.equal(
    (await platform.recovery.list('club', { operationId: 'list', timeoutMs: 50 })).ok,
    false,
  );
  const descriptor = Object.getOwnPropertyDescriptor(host, 'AlibiPlatform');
  assert.equal(descriptor.writable, false);
  assert.equal(descriptor.configurable, false);
  assert.throws(() => {
    host.AlibiPlatform = null;
  }, TypeError);
});

test('bootstrap validates adapter identity and target before installing it', () => {
  const host = hostFixture();
  const wrong = () => ({ build: { ...BUILD, target: 'web' } });
  assert.throws(
    () => bootstrapPlatform({ host, build: BUILD, adapterFactory: wrong }),
    /web build identity|platform capabilities|identity/i,
  );
  assert.equal(Object.hasOwn(host, 'AlibiPlatform'), false);
});
