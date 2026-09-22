'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test(
  'cached aliases remain navigable after a host canonicalizes their HTML URLs',
  { timeout: 20000 },
  async (t) => {
    const server = http.createServer((request, response) => {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (pathname.endsWith('.html')) {
        response.writeHead(302, { Location: pathname.slice(0, -5) });
        response.end();
        return;
      }
      response.writeHead(200, 'OK', {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "default-src 'self'",
        'X-Release': 'cached-release',
      });
      response.end(`<!doctype html><title>${pathname}</title>`);
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => {
      server.closeAllConnections();
      server.close();
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const entries = new Map();
    const handlers = {};
    let networkCalls = 0;
    const fallback = new Response('network fallback');
    const sandbox = {
      URL,
      Response,
      caches: {
        open: async () => ({ match: async (url) => entries.get(url) }),
      },
      fetch: async () => {
        networkCalls++;
        return fallback;
      },
      self: {
        location: { origin },
        registration: { scope: `${origin}/` },
        addEventListener: (type, handler) => (handlers[type] = handler),
      },
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../dist/sw.js'), 'utf8'), sandbox);
    async function navigate(pathname) {
      let result;
      handlers.fetch({
        request: { url: origin + pathname, method: 'GET', mode: 'navigate', redirect: 'manual' },
        respondWith: (promise) => (result = promise),
      });
      return result;
    }
    for (const [alias, pathname] of [
      ['privacy', '/privacy/'],
      ['about', '/about?from=email'],
      ['login', '/LOGIN/'],
    ]) {
      const fetched = await fetch(`${origin}/${alias}.html`);
      assert.equal(fetched.redirected, true, 'fixture follows a real HTTP canonical redirect');
      const expectedBody = await fetched.clone().text();
      entries.set(`${origin}/${alias}.html`, fetched);
      const result = await navigate(pathname);
      assert.equal(
        result.redirected,
        false,
        'manual-mode navigation must not receive a followed redirect',
      );
      assert.equal(result.status, fetched.status);
      assert.equal(result.statusText, fetched.statusText);
      assert.deepEqual(
        [...result.headers],
        [...fetched.headers],
        'cached security and release headers survive',
      );
      assert.equal(await result.text(), expectedBody, 'the exact cached alias body survives');
    }
    assert.equal(networkCalls, 0, 'cached navigation remains available without a network request');

    const direct = new Response('direct cached alias', {
      headers: { 'Content-Type': 'text/html' },
    });
    entries.set(`${origin}/privacy.html`, direct);
    assert.equal(
      await navigate('/privacy'),
      direct,
      'an unredirected cached alias retains its response',
    );
    entries.delete(`${origin}/privacy.html`);
    assert.equal(await navigate('/privacy'), fallback, 'a cache miss retains the network fallback');
    assert.equal(networkCalls, 1);
  },
);
