'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { serviceWorkerSource } = require('../tools/build.cjs');

test(
  'navigation policy keeps precached documents offline and falls back to the styled 404',
  async () => {
    assert.equal(typeof serviceWorkerSource, 'function');
    const origin = 'https://alibi.test';
    const cacheName = 'alibi-shell-navigation-test';
    const assets = [
      './',
      './index.html',
      './privacy.html',
      './about/index.html',
      './404.html',
      './assets/app.js',
    ];
    const source = serviceWorkerSource('navigation-test', assets);
    const handlers = {};
    const entries = new Map();
    let offline = false;
    let networkCalls = 0;
    const urlOf = (value) =>
      typeof value === 'string' ? new URL(value, `${origin}/`).href : value.url;
    const cache = {
      async addAll(requests) {
        for (const request of requests) {
          const url = urlOf(request);
          entries.set(url, { url, cache: cacheName });
        }
      },
      async match(request) {
        return entries.get(urlOf(request));
      },
    };
    const sandbox = {
      URL,
      Response,
      Request: class Request {
        constructor(url, options = {}) {
          this.url = new URL(url, `${origin}/`).href;
          Object.assign(this, options);
        }
      },
      caches: {
        open: async () => cache,
        keys: async () => [cacheName],
        delete: async () => true,
      },
      fetch: async (request) => {
        networkCalls++;
        if (offline) throw new Error('offline');
        return { url: urlOf(request), network: true };
      },
      self: {
        location: { origin },
        registration: { scope: `${origin}/` },
        clients: { claim: async () => {} },
        skipWaiting() {},
        addEventListener(type, handler) {
          handlers[type] = handler;
        },
      },
    };
    vm.runInNewContext(source, sandbox);
    let installed;
    handlers.install({
      waitUntil(value) {
        installed = value;
      },
    });
    await installed;

    async function navigate(pathname) {
      let result;
      handlers.fetch({
        request: {
          url: new URL(pathname, `${origin}/`).href,
          method: 'GET',
          mode: 'navigate',
        },
        respondWith(value) {
          result = value;
        },
      });
      return result ? await result : undefined;
    }

    assert.equal((await navigate('/privacy.html')).url, `${origin}/privacy.html`);
    assert.equal((await navigate('/about/index.html')).url, `${origin}/about/index.html`);
    assert.equal(networkCalls, 0, 'precache hits must not touch the network');

    assert.equal(
      (await navigate('/assets/app.js')).network,
      true,
      'only precached HTML documents bypass navigation networking',
    );
    assert.equal((await navigate('/a/b/x.html')).network, true);
    offline = true;
    for (const pathname of ['/a/b/x.html', '/a/b/', '/missing.html']) {
      const result = await navigate(pathname);
      assert.equal(result.url, `${origin}/404.html`, pathname);
      assert.equal(result.cache, cacheName, pathname);
    }
  },
);
