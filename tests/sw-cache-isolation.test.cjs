'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// The origin may host unrelated applications; only Alibi release caches may supply old assets.
function serviceWorker() {
  const handlers = {};
  const data = new Map();
  const calls = { network: 0 };
  const key = (value) =>
    typeof value === 'string' ? new URL(value, 'https://test.invalid/').href : value.url;
  const caches = {
    async open(name) {
      if (!data.has(name)) data.set(name, new Map());
      const entries = data.get(name);
      return {
        async addAll(requests) {
          for (const request of requests)
            entries.set(key(request), { owner: name, url: key(request) });
        },
        async match(request) {
          return entries.get(key(request));
        },
      };
    },
    async keys() {
      return [...data.keys()];
    },
    async delete(name) {
      return data.delete(name);
    },
    async match(request) {
      for (const entries of data.values()) {
        const response = entries.get(key(request));
        if (response) return response;
      }
      return undefined;
    },
  };
  const context = {
    URL,
    Request: class Request {
      constructor(url, options = {}) {
        this.url = new URL(url, 'https://test.invalid/').href;
        Object.assign(this, options);
      }
    },
    caches,
    fetch: async (request) => {
      calls.network++;
      return { network: true, url: key(request) };
    },
    self: {
      location: { origin: 'https://test.invalid' },
      registration: { scope: 'https://test.invalid/' },
      clients: { claim: async () => {} },
      skipWaiting() {},
      addEventListener(name, handler) {
        handlers[name] = handler;
      },
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../dist/sw.js'), 'utf8'), context);
  async function request(url) {
    let pending;
    handlers.fetch({
      request: {
        url: new URL(url, 'https://test.invalid/').href,
        method: 'GET',
        mode: 'cors',
      },
      respondWith(value) {
        pending = value;
      },
    });
    return pending ? await pending : undefined;
  }
  return { calls, data, request };
}

test('hashed fallback reads only Alibi-owned release caches', async () => {
  const worker = serviceWorker();
  const foreignUrl = 'https://test.invalid/assets/foreign.123456789abc.js';
  const foreignCache = new Map();
  foreignCache.set(foreignUrl, {
    owner: 'another-application-cache',
    url: foreignUrl,
  });
  worker.data.set('another-application-cache', foreignCache);

  const foreign = await worker.request(foreignUrl);
  assert.equal(foreign.network, true, 'a foreign cache entry must not satisfy an Alibi request');
  assert.equal(worker.calls.network, 1);

  const priorUrl = 'https://test.invalid/assets/alibi-old.abcdef123456.js';
  const priorCache = new Map();
  priorCache.set(priorUrl, { owner: 'alibi-shell-previous', url: priorUrl });
  worker.data.set('alibi-shell-previous', priorCache);

  const prior = await worker.request(priorUrl);
  assert.equal(prior.owner, 'alibi-shell-previous', 'the retained Alibi release remains eligible');
  assert.equal(worker.calls.network, 1);

  const optionalUrl = 'https://test.invalid/assets/block-motion-old.js';
  const optionalCache = new Map();
  optionalCache.set(optionalUrl, {
    owner: 'alibi-block-motion-previous',
    url: optionalUrl,
  });
  worker.data.set('alibi-block-motion-previous', optionalCache);
  const optional = await worker.request(optionalUrl);
  assert.equal(
    optional.owner,
    'alibi-block-motion-previous',
    'an Alibi optional release cache remains eligible',
  );
  assert.equal(worker.calls.network, 1);
});
