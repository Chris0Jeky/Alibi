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

function setup(fetcher) {
  const data = new Map(),
    calls = [];
  const context = {
    Blob,
    Response,
    URL,
    AbortController,
    Uint8Array,
    crypto: crypto.webcrypto,
    setTimeout,
    clearTimeout,
    location: { href: 'https://app.example/' },
    navigator: { onLine: true, connection: { addEventListener() {} } },
    ALIBI_DELIVERY: { art: entry },
    localStorage: {
      getItem: () => undefined,
      setItem: () => {},
    },
    caches: {
      delete: async () => true,
      open: async () => ({
        match: async (key) => data.get(key)?.clone(),
        put: async (key, value) => {
          data.set(key, value);
        },
      }),
    },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return fetcher(url, options);
    },
  };
  vm.runInNewContext(source, context);
  return { api: context.AlibiDelivery, data, calls };
}

test('rejects fingerprint mismatch case', async () => {
  const wrong = Buffer.alloc(bytes.length, 0);
  assert.equal(wrong.length, entry.bytes, 'wrong bytes keep the stubbed length');
  assert.notDeepEqual(wrong, bytes, 'wrong bytes differ from the stubbed payload');
  const wrongSha = crypto.createHash('sha256').update(wrong).digest('hex');
  assert.notEqual(wrongSha, entry.sha256, 'wrong bytes miss the stubbed sha256');

  const bad = setup(async () => new Response(wrong, { status: 200, headers: { 'Content-Type': entry.mime } }));
  assert.equal(await bad.api.resolve('art'), null, 'fingerprint mismatch retains the fallback');
  assert.equal(bad.data.size, 0, 'fingerprint mismatch poisons no cache entry');

  const good = setup(async () => new Response(bytes, { status: 200, headers: { 'Content-Type': entry.mime } }));
  assert.equal(await (await good.api.resolve('art')).text(), bytes.toString(), 'stubbed bytes verify end to end');
});
