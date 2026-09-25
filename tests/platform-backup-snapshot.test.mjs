import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { createWebPlatform } from '../src/platform/web.mjs';

const BUILD = {
  target: 'web',
  sourceSha: '1'.repeat(40),
  sourceDirty: false,
  payloadSha256: '2'.repeat(64),
  appVersion: '0.11.6',
  contentManifestRevision: 'catalogue-1',
  rulesCompatibility: { cabinet: 4, club: 2 },
};
const OPTIONS = { operationId: 'backup-snapshot', timeoutMs: 2000 };
const hash = (value) => createHash('sha256').update(value).digest('hex');
const pending = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
function request() {
  const utf8Payload = JSON.stringify({ notebook: 'A café by the river.' });
  return { suggestedName: 'alibi-backup.json', utf8Payload, digest: hash(utf8Payload) };
}
function fixture(overrides = {}) {
  const written = [];
  const handle = {
    async createWritable() {
      return {
        async write(value) {
          written.push(value);
        },
        async close() {},
      };
    },
    async getFile() {
      const text = written.at(-1);
      return { size: Buffer.byteLength(text), text: async () => text };
    },
  };
  const host = {
    crypto: webcrypto,
    setTimeout,
    clearTimeout,
    showSaveFilePicker: async () => handle,
    ...overrides,
  };
  return { handle, host, written };
}

for (const [label, replacement] of [
  ['different payload and digest', '{"unreviewed":true}'],
  ['payload above the validated byte bound', 'x'.repeat(16 * 1024 * 1024 + 1)],
]) {
  test(`backup keeps its validated snapshot while picker waits: ${label}`, async () => {
    const input = request(),
      original = { ...input };
    const reached = pending(),
      resume = pending();
    const f = fixture();
    f.host.showSaveFilePicker = async () => {
      reached.resolve();
      await resume.promise;
      return f.handle;
    };
    const documents = createWebPlatform({ host: f.host, build: BUILD }).documents;
    const result = documents.writeBackup(input, OPTIONS);
    await reached.promise;
    input.utf8Payload = replacement;
    input.digest = hash(replacement);
    resume.resolve();
    const outcome = await result;
    assert.equal(outcome.ok, true);
    assert.equal(f.written.length, 1);
    assert.equal(Buffer.byteLength(f.written[0]), Buffer.byteLength(original.utf8Payload));
    assert.equal(f.written[0], original.utf8Payload);
    assert.deepEqual(outcome.value, {
      bytes: Buffer.byteLength(original.utf8Payload),
      verifiedReadback: true,
    });
    assert.equal(input.utf8Payload, replacement, 'the adapter must not rewrite caller state');
  });
}

test('backup filename is captured before the first digest wait', async () => {
  const input = request(),
    original = { ...input };
  const reached = pending(),
    resume = pending();
  let name;
  const f = fixture({
    crypto: {
      subtle: {
        async digest(...args) {
          reached.resolve();
          await resume.promise;
          return webcrypto.subtle.digest(...args);
        },
      },
    },
  });
  f.host.showSaveFilePicker = async (options) => {
    name = options.suggestedName;
    return f.handle;
  };
  const result = createWebPlatform({ host: f.host, build: BUILD }).documents.writeBackup(
    input,
    OPTIONS,
  );
  await reached.promise;
  input.suggestedName = '../changed-after-validation.json';
  resume.resolve();
  assert.equal((await result).ok, true);
  assert.equal(name, original.suggestedName);
});

test('backup receipt describes committed bytes when caller mutates during write', async () => {
  const input = request(),
    original = { ...input };
  const f = fixture();
  f.handle.createWritable = async () => ({
    async write(value) {
      f.written.push(value);
      input.utf8Payload = '{}';
      input.digest = hash('{}');
    },
    async close() {},
  });
  const outcome = await createWebPlatform({ host: f.host, build: BUILD }).documents.writeBackup(
    input,
    OPTIONS,
  );
  assert.equal(outcome.ok, true);
  assert.deepEqual(f.written, [original.utf8Payload]);
  assert.deepEqual(outcome.value, {
    bytes: Buffer.byteLength(original.utf8Payload),
    verifiedReadback: true,
  });
});

test('backup rejects a mutable filename object before opening the picker', async () => {
  const input = request();
  input.suggestedName = { toString: () => 'alibi-backup.json' };
  let opened = false;
  const f = fixture({
    showSaveFilePicker: async () => {
      opened = true;
      return f.handle;
    },
  });
  const outcome = await createWebPlatform({ host: f.host, build: BUILD }).documents.writeBackup(
    input,
    OPTIONS,
  );
  assert.equal(outcome.ok, false);
  assert.equal(outcome.code, 'invalid');
  assert.equal(opened, false);
});
