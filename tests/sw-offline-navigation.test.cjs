'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

// Evaluate the actual build template and precache list without invoking the asset
// pipeline. These are source-level worker checks, not emitted-build/browser proof.
const build = fs.readFileSync(path.join(__dirname, '../tools/build.cjs'), 'utf8');
function section(start, end) {
  const from = build.indexOf(start);
  const to = build.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `production build section exists: ${start}`);
  return build.slice(from, to);
}
const definitions = vm.runInNewContext(
  `${section('const PATH_ROUTE_ALIASES = ', '\nfunction pathRouteAliasScript')}
${section('  const aliasShellDocuments = ', '  // Hosts may canonicalize')}
${section('  const sw = `', "  write(path.join(DIST, 'sw.js')")}
({code: sw, shell: assets, aliases: Object.keys(PATH_ROUTE_ALIASES)})`,
  {
    release: 'navigation-fixture',
    jsName: 'assets/app.fixture.js',
    cssName: 'assets/app.fixture.css',
    engineURL: './assets/engine.fixture.js',
    blockLoaderURL: './assets/block.fixture.js',
    bootURL: './assets/boot.fixture.js',
    identityURL: './assets/identity.fixture.js',
    platformURL: './assets/platform.fixture.js',
    workerURL: './assets/worker.fixture.js',
    contentURL: './assets/content.fixture.js',
    deferredURL: './assets/deferred.fixture.js',
    voicesURL: './assets/voices.fixture.js',
    curation: { media: {} },
    media: {},
  },
);
const origin = 'https://test.invalid';
const scope = `${origin}/`;
const notFound = '<!doctype html><title>No clue here</title><h1>This clue leads nowhere.</h1>';
const networkError = new Error('network unavailable');
async function setup(network = async () => Promise.reject(networkError)) {
  const handlers = {};
  const data = new Map();
  const calls = { network: 0 };
  const key = (request) => new URL(typeof request === 'string' ? request : request.url, scope).href;
  const cacheName = 'alibi-shell-navigation-fixture';
  const caches = {
    async open(name) {
      if (!data.has(name)) data.set(name, new Map());
      const entries = data.get(name);
      return {
        async addAll(requests) {
          for (const request of requests) {
            const url = key(request);
            entries.set(
              url,
              new Response(url.endsWith('/404.html') ? notFound : `cached:${url}`, {
                headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Release': name },
              }),
            );
          }
        },
        async match(request) {
          return entries.get(key(request))?.clone();
        },
      };
    },
    async keys() {
      return [...data.keys()];
    },
    async delete(name) {
      return data.delete(name);
    },
  };
  vm.runInNewContext(definitions.code, {
    URL,
    Response,
    Request: class Request {
      constructor(url) {
        this.url = key(url);
      }
    },
    caches,
    fetch: async (request) => {
      calls.network++;
      return network(request);
    },
    self: {
      location: { origin },
      registration: { scope },
      addEventListener: (name, handler) => (handlers[name] = handler),
    },
  });
  let installed;
  handlers.install({ waitUntil: (promise) => (installed = promise) });
  await installed;
  return {
    data,
    entries: data.get(cacheName),
    calls,
    async request(url, overrides = {}) {
      let pending;
      handlers.fetch({
        request: { url: new URL(url, scope).href, method: 'GET', mode: 'navigate', ...overrides },
        respondWith: (promise) => (pending = promise),
      });
      return pending;
    },
  };
}

test('the production shell precaches its offline 404 document', () => {
  assert.ok(definitions.shell.includes('./404.html'));
});
for (const pathname of [
  'a/b/x.html',
  'a/b/',
  'missing.html',
  '404.html',
  '404',
  '404?from=share',
  'privacy/private.html',
]) {
  test(`offline non-shell navigation ${pathname} returns the current release 404`, async () => {
    const worker = await setup();
    const response = await worker.request(pathname);
    assert.equal(response.status, 404);
    assert.equal(response.statusText, 'Not Found');
    assert.equal(response.redirected, false);
    assert.equal(response.headers.get('X-Release'), 'alibi-shell-navigation-fixture');
    assert.equal(response.headers.get('Content-Type'), 'text/html; charset=utf-8');
    assert.equal(await response.text(), notFound);
    assert.equal(worker.calls.network, 1, 'unknown paths still try the host first');
  });
}
for (const alias of definitions.aliases) {
  for (const suffix of ['.html', '/index.html', '.html?from=email', '/index.html?from=email']) {
    test(`offline ${alias}${suffix} resolves to its own cached alias`, async () => {
      const worker = await setup();
      const response = await worker.request(`${alias}${suffix}`);
      assert.equal(response.status, 200);
      assert.equal(await response.text(), `cached:${scope}${alias}.html`);
      assert.equal(worker.calls.network, 0);
    });
  }
}
for (const pathname of ['', 'index.html', '?from=share', 'single-segment']) {
  test(`offline shell navigation ${pathname || '/'} keeps the cached application`, async () => {
    const worker = await setup();
    const response = await worker.request(pathname);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), `cached:${scope}`);
    assert.equal(worker.calls.network, 0);
  });
}
for (const status of [200, 404, 503]) {
  test(`an online non-shell response with status ${status} is not replaced`, async () => {
    const original = new Response('host response', { status });
    const worker = await setup(async () => original);
    assert.equal(await worker.request('a/b/missing.html'), original);
    assert.equal(worker.calls.network, 1);
  });
}
test('a missing offline 404 preserves the original network failure', async () => {
  const worker = await setup();
  worker.entries.delete(`${scope}404.html`);
  await assert.rejects(worker.request('missing.html'), (error) => error === networkError);
});
test('a foreign or retained release cannot supply the current navigation fallback', async () => {
  const worker = await setup();
  worker.entries.delete(`${scope}404.html`);
  for (const name of ['another-app', 'alibi-shell-previous']) {
    worker.data.set(name, new Map([[`${scope}404.html`, new Response('wrong release')]]));
  }
  await assert.rejects(worker.request('missing.html'), (error) => error === networkError);
});
test('failed asset requests never receive an HTML navigation fallback', async () => {
  const worker = await setup();
  await assert.rejects(
    worker.request('assets/missing.js', { mode: 'cors' }),
    (error) => error === networkError,
  );
});
for (const [url, overrides] of [
  ['api/private', {}],
  ['sw.js', {}],
  ['missing.html', { method: 'POST' }],
  ['https://another.invalid/missing.html', {}],
]) {
  test(`navigation fallback does not intercept excluded request ${url}`, async () => {
    const worker = await setup();
    assert.equal(await worker.request(url, overrides), undefined);
    assert.equal(worker.calls.network, 0);
  });
}

test('online canonical 404 route retains the host document instead of the cached shell', async () => {
  const response = new Response(notFound, { status: 200 });
  const worker = await setup(async () => response);
  assert.equal(await worker.request('404'), response);
  assert.equal(worker.calls.network, 1);
});
