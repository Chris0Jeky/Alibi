const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  vm = require('node:vm'),
  crypto = require('node:crypto');
const source = fs.readFileSync(
  require('node:path').join(__dirname, '../src/asset-delivery.js'),
  'utf8',
);
const bytes = Buffer.from('fixture image bytes');
const entry = {
  urls: ['https://cdn.example/image.webp', './assets/enhanced-fixture.webp'],
  bytes: bytes.length,
  mime: 'image/webp',
  sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
};
const response = (body = bytes, status = 200, type = 'image/webp') =>
  new Response(body, { status, headers: { 'Content-Type': type } });
function setup(fetcher = async () => response(), opts = {}) {
  const data = new Map(),
    calls = [],
    stored = new Map();
  const cache = {
    match: async (key) => data.get(key)?.clone(),
    keys: async () => [...data.keys()].map((url) => ({ url })),
    delete: async (key) => data.delete(key.url || key),
    put: async (key, value) => {
      if (opts.quota) throw Error('Quota exceeded');
      data.set(key, value);
    },
  };
  const context = {
    Blob,
    Response,
    URL,
    AbortController,
    Uint8Array,
    crypto: crypto.webcrypto,
    setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 80)),
    clearTimeout,
    location: { href: 'https://app.example/' },
    navigator: { onLine: true, connection: { addEventListener() {} } },
    ALIBI_DELIVERY: { art: entry },
    localStorage: {
      getItem: (key) => stored.get(key),
      setItem: (key, value) => stored.set(key, value),
    },
    caches: {
      open: async () => {
        if (opts.denied) throw Error('Denied');
        return cache;
      },
    },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return fetcher(url, options);
    },
  };
  vm.runInNewContext(source, context);
  return { api: context.AlibiDelivery, context, data, calls };
}
test('CDN bytes are verified, cached under a local fingerprint, and reused offline', async () => {
  const x = setup();
  assert.equal(await (await x.api.resolve('art')).text(), bytes.toString());
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(x.data.size, 1);
  x.context.navigator.onLine = false;
  assert.ok(await x.api.resolve('art'));
  assert.equal(x.calls.length, 1);
  assert.equal(x.calls[0].options.credentials, 'omit');
  assert.equal(x.calls[0].options.mode, 'cors');
  assert.equal(x.calls[0].options.redirect, 'error');
});
test('CDN errors fall through to same-origin bytes', async () => {
  const x = setup(async (url) => {
    if (url.startsWith('https:')) throw Error('CORS');
    return response();
  });
  assert.ok(await x.api.resolve('art'));
  assert.equal(x.calls.length, 2);
});
for (const [label, value] of [
  ['HTML', () => response(bytes, 200, 'text/html')],
  ['partial', () => response(bytes, 206)],
  ['oversize', () => response(Buffer.alloc(100))],
  ['wrong hash', () => response(Buffer.alloc(bytes.length))],
  ['opaque', () => ({ ok: false, type: 'opaque' })],
]) {
  test(label + ' cannot replace or poison offline artwork', async () => {
    const x = setup(async () => value());
    assert.equal(await x.api.resolve('art'), null);
    assert.equal(x.data.size, 0);
  });
}
test('offline, save-data, slow connection, hidden and user preference skip new fetches', async () => {
  for (const configure of [
    (x) => (x.context.navigator.onLine = false),
    (x) => (x.context.navigator.connection.saveData = true),
    (x) => (x.context.navigator.connection.effectiveType = '2g'),
    (x) => (x.context.document = { hidden: true }),
    (x) => x.api.setMode('local'),
    (x) => (x.context.ALIBI_CONFIG = { standalone: true }),
  ]) {
    const x = setup();
    configure(x);
    assert.equal(await x.api.resolve('art'), null);
    assert.equal(x.calls.length, 0);
  }
});
test('denied storage and quota retain online enhancement without breaking play', async () => {
  for (const opts of [{ denied: true }, { quota: true }]) {
    const x = setup(undefined, opts);
    assert.ok(await x.api.resolve('art'));
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(x.data.size, 0);
  }
});
test('hung network and route cancellation have bounded completion', async () => {
  const x = setup(
    (url, { signal }) =>
      new Promise((_, reject) =>
        signal.addEventListener('abort', () => reject(Error('Aborted')), { once: true }),
      ),
  );
  assert.equal(await x.api.resolve('art'), null);
  const controller = new AbortController();
  const request = x.api.resolve('art', controller.signal);
  controller.abort();
  assert.equal(await request, null);
});
test('optional cache is capped at eight entries without touching other stores', async () => {
  const x = setup();
  for (let i = 0; i < 12; i++) x.data.set('https://app.example/assets/old-' + i, response());
  assert.ok(await x.api.resolve('art'));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(x.data.size, 8);
});
