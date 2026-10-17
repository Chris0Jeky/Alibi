'use strict';
// Pins the asset-delivery validated rejection paths in src/asset-delivery.js:
// a 200 response with the wrong MIME, wrong byte length or wrong sha256 must
// each reject, and resolve must keep the compact fallback instead of
// upgrading. Each rejection message is asserted so removing any single check
// (MIME, size or digest) turns a passing test red.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/asset-delivery.js'), 'utf8');

const HOOK = 'G.AlibiDelivery = { resolve, observe, setMode, mode };';

const goodBytes = Buffer.from('alibi validated upgrade fixture 0123456789');
const entry = {
  mime: 'image/webp',
  bytes: goodBytes.length,
  sha256: crypto.createHash('sha256').update(goodBytes).digest('hex'),
  urls: ['https://cdn.example/alibi/pinned.webp'],
  fallback: './compact.svg',
};

function truncatedBytes() {
  return goodBytes.subarray(0, goodBytes.length - 1);
}

function tamperedBytes() {
  const copy = Buffer.from(goodBytes);
  copy[copy.length - 1] ^= 0xff;
  return copy;
}

function stubResponse(bytes, mime) {
  return new Response(bytes, {
    status: 200,
    headers: { 'Content-Type': mime },
  });
}

// Loads src/asset-delivery.js unmodified except for exposing the internal
// validated function on the exported namespace for direct assertions.
// Behavior is otherwise identical to production.
function loadDelivery(fetchImpl, extraGlobals = {}) {
  const hooked = source.replace(
    HOOK,
    'G.AlibiDelivery = { resolve, observe, setMode, mode, __validated: validated };',
  );
  assert.ok(hooked !== source, 'asset-delivery export site moved; update the test hook');
  const digestCalls = { count: 0 };
  const subtle = crypto.webcrypto.subtle;
  const cache = {
    match: async () => null,
    put: async () => {},
  };
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    AbortController,
    Blob,
    Response,
    URL,
    fetch: fetchImpl,
    crypto: {
      subtle: {
        digest: async (...args) => {
          digestCalls.count += 1;
          return subtle.digest(...args);
        },
      },
    },
    caches: {
      delete: async () => false,
      open: async () => cache,
    },
    localStorage: { getItem: () => null, setItem: () => {} },
    ALIBI_DELIVERY: { 'test-image': entry },
    ALIBI_CONFIG: {},
    document: { hidden: false, addEventListener: () => {} },
    navigator: { onLine: true },
    location: { href: 'https://example.test/' },
    addEventListener: () => {},
    ...extraGlobals,
  };
  vm.createContext(sandbox);
  vm.runInContext(hooked, sandbox);
  return { delivery: sandbox.AlibiDelivery, digestCalls };
}

function neverFetch() {
  return async () => {
    throw Error('no network in validated unit check');
  };
}

test('validated rejects a 200 response with a mismatched MIME as invalid', async () => {
  const { delivery } = loadDelivery(neverFetch());
  // Same bytes and digest, only the MIME differs: without the MIME check this
  // response would be accepted.
  await assert.rejects(
    delivery.__validated(stubResponse(goodBytes, 'image/png'), entry),
    /Invalid image response/,
  );
});

test('validated rejects truncated bytes with a length mismatch', async () => {
  const { delivery, digestCalls } = loadDelivery(neverFetch());
  await assert.rejects(
    delivery.__validated(stubResponse(truncatedBytes(), entry.mime), entry),
    /length mismatch/,
  );
  // The size check fires before fingerprinting: without it the truncated
  // body would reach the digest instead.
  assert.equal(digestCalls.count, 0);
});

test('validated rejects same-length tampered bytes with a fingerprint mismatch', async () => {
  const tampered = tamperedBytes();
  assert.equal(tampered.length, entry.bytes);
  assert.notEqual(crypto.createHash('sha256').update(tampered).digest('hex'), entry.sha256);
  const { delivery, digestCalls } = loadDelivery(neverFetch());
  await assert.rejects(
    delivery.__validated(stubResponse(tampered, entry.mime), entry),
    /fingerprint mismatch/,
  );
  assert.equal(digestCalls.count, 1);
});

test('validated accepts exact bytes, MIME and digest', async () => {
  const { delivery } = loadDelivery(neverFetch());
  const blob = await delivery.__validated(stubResponse(goodBytes, entry.mime), entry);
  assert.equal(blob.type, entry.mime);
  assert.deepEqual(Buffer.from(await blob.arrayBuffer()), goodBytes);
});

test('resolve returns null when the network body fails any check', async () => {
  let body = goodBytes;
  let mime = entry.mime;
  const { delivery } = loadDelivery(async () => stubResponse(body, mime));
  const upgraded = await delivery.resolve('test-image');
  assert.ok(upgraded instanceof Blob, 'exact bytes still upgrade');
  mime = 'image/png';
  assert.equal(await delivery.resolve('test-image'), null, 'MIME mismatch upgrades nothing');
  mime = entry.mime;
  body = truncatedBytes();
  assert.equal(await delivery.resolve('test-image'), null, 'size mismatch upgrades nothing');
  body = tamperedBytes();
  assert.equal(await delivery.resolve('test-image'), null, 'digest mismatch upgrades nothing');
});

test('observe keeps the compact fallback when validation rejects the upgrade', async () => {
  const { delivery } = loadDelivery(async () => stubResponse(tamperedBytes(), entry.mime), {
    IntersectionObserver: class {
      constructor(callback) {
        this.callback = callback;
      }
      observe(target) {
        this.callback([{ isIntersecting: true, target }], this);
      }
      unobserve() {}
      disconnect() {}
    },
    Image: class {
      decode() {
        return Promise.resolve();
      }
    },
  });
  const img = {
    dataset: { adaptiveImage: 'test-image' },
    parentElement: { querySelector: () => null },
    isConnected: true,
    src: '',
  };
  const fakeRoot = {
    querySelectorAll: (selector) => (selector === 'img[data-adaptive-image]' ? [img] : []),
  };
  delivery.observe(fakeRoot);
  assert.equal(img.src, entry.fallback);
  assert.equal(img.dataset.assetQuality, 'compact');
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(img.src, entry.fallback, 'rejected upgrade retains the compact image');
  assert.equal(img.dataset.assetQuality, 'compact');
});
