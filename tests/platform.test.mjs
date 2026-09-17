import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createWebPlatform } from '../src/platform/web.mjs';
import {
  getPlatform,
  installPlatform,
  __resetPlatformForTests,
} from '../src/platform/index.mjs';

const BUILD = Object.freeze({
  target: 'web',
  sourceSha: '1'.repeat(40),
  payloadSha256: '2'.repeat(64),
  appVersion: '0.11.4',
  contentManifestRevision: 'catalogue-1',
  rulesCompatibility: Object.freeze({ cabinet: 4, club: 2 }),
});
const operation = (overrides = {}) => ({
  operationId: 'operation-1',
  timeoutMs: 100,
  ...overrides,
});

function hostFixture(overrides = {}) {
  const host = new EventTarget();
  const document = new EventTarget();
  document.hidden = false;
  Object.assign(host, {
    document,
    navigator: { userAgent: 'Android localhost fixture', vibrate: () => true },
    location: { hostname: 'localhost', origin: 'https://localhost' },
    crypto: globalThis.crypto,
    setTimeout,
    clearTimeout,
    open: () => ({ opener: null }),
    ...overrides,
  });
  return host;
}

function web(options = {}) {
  return createWebPlatform({ host: hostFixture(), build: BUILD, ...options });
}

test('web is the explicit default; Android-looking UA and localhost never imply a native host', () => {
  const platform = web();
  assert.deepEqual(platform.capabilities(), {
    target: 'web',
    nativeFeedback: false,
    userDocuments: false,
    recoveryVault: false,
    remoteTelemetry: false,
  });
  assert.equal(platform.build.target, 'web');
  assert.throws(
    () => createWebPlatform({ host: hostFixture(), build: { ...BUILD, target: 'android' } }),
    /web build identity/i,
  );
});

test('unsupported document and recovery operations return bounded failures instead of throwing', async () => {
  const platform = web();
  assert.deepEqual(await platform.documents.pickBackup(operation()), {
    ok: false,
    code: 'unavailable',
    message: 'User-selected documents are unavailable in this browser.',
  });
  assert.equal((await platform.recovery.list('club', operation())).code, 'unavailable');
  assert.equal((await platform.recovery.read('not-a-domain', 0, operation())).code, 'invalid');
  assert.equal(
    (await platform.recovery.checkpoint({ domain: 'club' }, 0, operation())).code,
    'unavailable',
  );
});

test('web feedback is best effort, preference-bound and safely disposable', () => {
  let vibrations = 0;
  const host = hostFixture({
    navigator: {
      vibrate() {
        vibrations++;
        throw Error('fixture hardware failure');
      },
    },
  });
  const feedback = createWebPlatform({ host, build: BUILD }).feedback;
  feedback.emit('place');
  assert.equal(vibrations, 0, 'haptics are opt-in');
  feedback.setPreferences({ sound: false, haptics: true, reducedMotion: false });
  assert.doesNotThrow(() => feedback.emit('invalid'));
  assert.equal(vibrations, 1);
  feedback.suspend();
  feedback.emit('clear');
  assert.equal(vibrations, 1, 'suspended feedback is silent');
  feedback.dispose();
  feedback.dispose();
  feedback.setPreferences({ sound: true, haptics: true, reducedMotion: false });
  feedback.emit('complete');
  assert.equal(vibrations, 1, 'disposed feedback stays inert');
});

test('document handles stay opaque, bounded and invalid after release', async () => {
  const payload = JSON.stringify({ cabinet: 1 });
  const handle = {
    async getFile() {
      return { size: Buffer.byteLength(payload), text: async () => payload };
    },
  };
  const host = hostFixture({ showOpenFilePicker: async () => [handle] });
  const documents = createWebPlatform({ host, build: BUILD }).documents;
  const selected = await documents.pickBackup(operation());
  assert.equal(selected.ok, true);
  assert.match(selected.value, /^web-document:[a-z0-9-]+$/);
  assert.equal(selected.value.includes('/'), false);
  assert.deepEqual(await documents.readLimited(selected.value, 1024, operation()), {
    ok: true,
    value: payload,
  });
  assert.equal((await documents.readLimited(selected.value, 2, operation())).code, 'protected');
  assert.equal((await documents.readLimited('web-document:forged', 1024, operation())).code, 'invalid');
  await documents.release(selected.value);
  assert.equal((await documents.readLimited(selected.value, 1024, operation())).code, 'invalid');
});

test('picker cancellation, denial, malformed responses and timeout stay distinct', async () => {
  const cancelled = createWebPlatform({
    host: hostFixture({
      showOpenFilePicker: async () => {
        throw new DOMException('left picker', 'AbortError');
      },
    }),
    build: BUILD,
  });
  assert.equal((await cancelled.documents.pickBackup(operation())).code, 'cancelled');

  const denied = createWebPlatform({
    host: hostFixture({
      showOpenFilePicker: async () => {
        throw new DOMException('blocked', 'NotAllowedError');
      },
    }),
    build: BUILD,
  });
  assert.equal((await denied.documents.pickBackup(operation())).code, 'denied');

  const malformed = createWebPlatform({
    host: hostFixture({ showOpenFilePicker: async () => [] }),
    build: BUILD,
  });
  assert.equal((await malformed.documents.pickBackup(operation())).code, 'invalid');

  const slow = createWebPlatform({
    host: hostFixture({ showOpenFilePicker: () => new Promise(() => {}) }),
    build: BUILD,
  });
  assert.equal(
    (await slow.documents.pickBackup(operation({ operationId: 'slow-pick', timeoutMs: 5 }))).code,
    'timeout',
  );
});

test('save writes close the provider stream and report only verified bytes', async () => {
  const writes = [];
  let closed = 0;
  const payload = '{"club":true}';
  const host = hostFixture({
    showSaveFilePicker: async () => ({
      async createWritable() {
        return {
          async write(value) {
            writes.push(value);
          },
          async close() {
            closed++;
          },
          async abort() {},
        };
      },
      async getFile() {
        return { size: Buffer.byteLength(payload), text: async () => payload };
      },
    }),
  });
  const digest = createHash('sha256').update(payload).digest('hex');
  const result = await createWebPlatform({ host, build: BUILD }).documents.writeBackup(
    { suggestedName: 'alibi-backup.json', utf8Payload: payload, digest },
    operation(),
  );
  assert.deepEqual(result, {
    ok: true,
    value: { verifiedReadback: true, bytes: Buffer.byteLength(payload) },
  });
  assert.deepEqual(writes, [payload]);
  assert.equal(closed, 1);
});

test('lifecycle subscriptions own and dispose only their listeners', async () => {
  const host = hostFixture();
  const platform = createWebPlatform({ host, build: BUILD });
  const first = [];
  const second = [];
  const leaseA = await platform.subscribeLifecycle((event) => first.push(event.kind));
  const leaseB = await platform.subscribeLifecycle((event) => second.push(event.kind));

  host.document.hidden = true;
  host.document.dispatchEvent(new Event('visibilitychange'));
  host.document.hidden = false;
  host.document.dispatchEvent(new Event('visibilitychange'));
  host.dispatchEvent(new Event('popstate'));
  assert.deepEqual(first, ['pause', 'resume', 'back']);
  assert.deepEqual(second, ['pause', 'resume', 'back']);

  leaseA.dispose();
  leaseA.dispose();
  host.dispatchEvent(new Event('popstate'));
  assert.deepEqual(first, ['pause', 'resume', 'back']);
  assert.deepEqual(second, ['pause', 'resume', 'back', 'back']);
  leaseB.dispose();
});

test('assets and external destinations are resolved only through reviewed allowlists', async () => {
  const opened = [];
  const host = hostFixture({
    open(url, target, features) {
      opened.push({ url, target, features });
      return { opener: null };
    },
  });
  const platform = createWebPlatform({
    host,
    build: BUILD,
    assets: [
      {
        id: 'castle.prologue.poster',
        revision: '1',
        status: 'bundled',
        url: './assets/prologue.webp',
        digest: 'a'.repeat(64),
        bytes: 512,
      },
    ],
    externalLinks: { privacy: 'https://example.test/privacy' },
  });
  assert.equal((await platform.assets.resolve('castle.prologue.poster', '1', operation())).ok, true);
  assert.equal((await platform.assets.resolve('../private', '1', operation())).code, 'invalid');
  assert.equal((await platform.assets.resolve('castle.prologue.poster', '2', operation())).code, 'unavailable');
  assert.equal((await platform.openExternal('unknown', operation())).code, 'invalid');
  assert.equal((await platform.openExternal('privacy', operation())).ok, true);
  assert.deepEqual(opened, [
    {
      url: 'https://example.test/privacy',
      target: '_blank',
      features: 'noopener,noreferrer',
    },
  ]);
  assert.throws(
    () =>
      createWebPlatform({
        host,
        build: BUILD,
        externalLinks: { unsafe: 'javascript:alert(1)' },
      }),
    /approved HTTPS URL/i,
  );
});

test('the injection seam accepts one validated platform before first use and rejects late replacement', () => {
  __resetPlatformForTests();
  const selected = web();
  assert.equal(installPlatform(selected), selected);
  assert.equal(getPlatform(), selected);
  assert.throws(() => installPlatform(web()), /already installed/i);

  __resetPlatformForTests();
  assert.throws(() => installPlatform({ capabilities() {} }), /platform/i);
  const fallback = getPlatform({ host: hostFixture(), build: BUILD });
  assert.equal(fallback.capabilities().target, 'web');
  assert.throws(() => installPlatform(selected), /already installed/i);
  __resetPlatformForTests();
});
