'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/validator-loader.js'), 'utf8');

function setup(fetcher, timeout = false) {
  const context = {
    AbortController,
    TextDecoder,
    Uint8Array,
    fetch: fetcher,
    setTimeout: timeout ? (fn) => setTimeout(fn, 20) : setTimeout,
    clearTimeout,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.AlibiValidatorLoader;
}

test('validator loader decodes a bounded response', async () => {
  const loader = setup(async () => new Response('worker-source'));
  assert.equal(await loader.load('/validator.js'), 'worker-source');
});

test('validator loader rejects declared and streamed oversize bodies', async () => {
  const loader = setup(
    async () =>
      new Response('x', {
        headers: { 'content-length': String(4 * 1024 * 1024 + 1) },
      }),
  );
  await assert.rejects(loader.load('/validator.js'), /4 MiB limit/);

  const streamed = setup(async () => ({
    ok: true,
    headers: { get: () => null },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(4 * 1024 * 1024));
        controller.enqueue(new Uint8Array(1));
        controller.close();
      },
    }),
  }));
  await assert.rejects(streamed.load('/validator.js'), /4 MiB limit/);
});

test('validator fetch deadline aborts before worker creation', async () => {
  const loader = setup(
    async (_, options) =>
      new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(Error('aborted')), { once: true });
      }),
    true,
  );
  await assert.rejects(loader.load('/validator.js'), /10-second deadline/);
});
