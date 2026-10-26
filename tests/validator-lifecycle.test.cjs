'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the production adapter without mounting the rest of the player.
const app = fs.readFileSync(
  process.env.ALIBI_APP_SOURCE || path.join(__dirname, '../src/app.js'),
  'utf8',
);
const start = app.indexOf('  async function inWorker(message) {');
const end = app.indexOf('\n  async function installPack(', start);
assert.ok(start >= 0 && end > start, 'validation adapter boundaries exist');

function fixture({ supported = true, inline = true, load } = {}) {
  const workers = [],
    blobs = new Map(),
    revoked = [],
    timers = new Map(),
    delays = [];
  let serial = 0,
    started;
  const ready = new Promise((resolve) => (started = resolve));
  class Worker {
    constructor(url) {
      this.url = url;
      this.terminations = 0;
      workers.push(this);
      started(this);
    }
    postMessage(message) {
      this.message = structuredClone(message);
    }
    terminate() {
      this.terminations++;
    }
  }
  const context = {
    Blob,
    Worker,
    window: { Worker: supported ? Worker : undefined },
    ALIBI_WORKER_SOURCE: inline ? 'validator source' : undefined,
    ALIBI_WORKER_URL: '/validator.js',
    AlibiValidatorLoader: { load },
    URL: {
      createObjectURL(blob) {
        const url = `blob:validator-${++serial}`;
        blobs.set(url, blob);
        return url;
      },
      revokeObjectURL(url) {
        revoked.push(url);
        blobs.delete(url);
      },
    },
    setTimeout(fn, delay) {
      const id = ++serial;
      delays.push(delay);
      timers.set(id, fn);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  const run = vm.runInNewContext(app.slice(start, end) + '; inWorker;', context);
  return {
    run,
    ready,
    workers,
    blobs,
    revoked,
    timers,
    delays,
    expire() {
      assert.equal(timers.size, 1, 'one validation deadline is armed');
      [...timers.values()][0]();
    },
    assertReleased(worker) {
      assert.equal(worker.terminations, 1, 'worker is terminated exactly once');
      assert.equal(blobs.has(worker.url), false, 'worker Blob URL is revoked');
      assert.equal(revoked.filter((url) => url === worker.url).length, 1);
      assert.equal(timers.size, 0, 'deadline is cancelled');
    },
  };
}

test('validator adapter returns a successful worker result and releases its resources', async () => {
  const f = fixture();
  const message = { type: 'cabinet-backup', text: '{"runs":[]}' };
  const pending = f.run(message);
  const worker = f.workers[0];
  assert.deepEqual(worker.message, message);
  assert.equal(await f.blobs.get(worker.url).text(), 'validator source');
  assert.equal(f.blobs.get(worker.url).type, 'text/javascript');
  const value = { runs: [] };
  worker.onmessage({ data: { ok: true, value } });
  assert.equal(await pending, value);
  f.assertReleased(worker);
  worker.onerror({ message: 'late error' });
  worker.onmessage({ data: { ok: false, error: 'late refusal' } });
  f.assertReleased(worker);
});

test('validator adapter rejects a refused import and releases its resources', async () => {
  const f = fixture();
  const pending = f.run({ type: 'pack', pack: {} });
  const worker = f.workers[0];
  worker.onmessage({ data: { ok: false, error: 'Invalid pack.' } });
  await assert.rejects(pending, /Invalid pack\./);
  f.assertReleased(worker);
});

for (const message of ['Worker script failed.', '']) {
  test(`validator adapter rejects a worker error (${message || 'no message'})`, async () => {
    const f = fixture();
    const pending = f.run({ type: 'pack', pack: {} });
    const worker = f.workers[0];
    worker.onerror({ message });
    await assert.rejects(pending, {
      message: message || 'The validation worker could not start.',
    });
    f.assertReleased(worker);
  });
}

test('validator adapter times out a silent worker and ignores late acceptance', async () => {
  const f = fixture();
  const pending = f.run({ type: 'pack', pack: {} });
  const worker = f.workers[0];
  assert.deepEqual(f.delays, [25000], 'the production safety limit remains 25 seconds');
  f.expire();
  await assert.rejects(pending, /25-second safety limit/);
  f.assertReleased(worker);
  worker.onmessage({ data: { ok: true, value: { shouldNotBeAccepted: true } } });
  worker.onerror({ message: 'late error' });
  f.assertReleased(worker);
  // A failed import must not poison a later, independently validated request.
  const retry = f.run({ type: 'pack', pack: { id: 'retry' } });
  const next = f.workers[1];
  next.onmessage({ data: { ok: true, value: 'validated retry' } });
  assert.equal(await retry, 'validated retry');
  f.assertReleased(next);
});

test('validator adapter refuses unsupported workers before allocating a Blob URL', async () => {
  const f = fixture({ supported: false });
  await assert.rejects(f.run({ type: 'pack' }), /does not support background validation/);
  assert.equal(f.workers.length, 0);
  assert.equal(f.blobs.size, 0);
  assert.equal(f.timers.size, 0);
});

test('validator adapter loads external source before starting the worker deadline', async () => {
  let finish;
  const calls = [];
  const f = fixture({
    inline: false,
    load: (url) => {
      calls.push(url);
      return new Promise((resolve) => (finish = resolve));
    },
  });
  const pending = f.run({ type: 'pack' });
  assert.deepEqual(calls, ['/validator.js']);
  assert.equal(f.workers.length, 0);
  assert.equal(f.timers.size, 0);
  finish('downloaded validator');
  const worker = await f.ready;
  assert.equal(await f.blobs.get(worker.url).text(), 'downloaded validator');
  worker.onmessage({ data: { ok: true, value: 'accepted' } });
  assert.equal(await pending, 'accepted');
  f.assertReleased(worker);
});

test('validator adapter propagates loader failure without starting a worker', async () => {
  const f = fixture({
    inline: false,
    load: async () => {
      throw Error('Validator download failed.');
    },
  });
  await assert.rejects(f.run({ type: 'pack' }), /Validator download failed\./);
  assert.equal(f.workers.length, 0);
  assert.equal(f.blobs.size, 0);
  assert.equal(f.timers.size, 0);
});
