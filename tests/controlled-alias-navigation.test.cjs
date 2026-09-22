'use strict';
// Issue #244: directory-form (and leaf-form) shared links must boot under a
// controlling service worker. The cached root shell resolves its relative
// `./assets/` URLs against the alias directory base, so controlled
// navigations to a known alias must answer the cached alias document
// instead. These assertions run against the built dist/ output.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const serviceWorker = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');

const ALIASES = ['privacy', 'about', 'login'];

for (const alias of ALIASES) {
  test(`${alias} ships both redirect documents without directory-relative assets`, () => {
    const documents = [path.join(dist, `${alias}.html`), path.join(dist, alias, 'index.html')];
    for (const document of documents) {
      assert.ok(fs.existsSync(document), `${document} is emitted`);
      const body = fs.readFileSync(document, 'utf8');
      assert.ok(
        body.includes(`(location.hash||'#/${alias}')`),
        `${document} keeps an explicit hash instead of clobbering it`,
      );
      assert.ok(
        body.includes(`url=/#/${alias}`),
        `${document} forwards to the hash route without JavaScript`,
      );
      assert.ok(
        !/(src|href)="\.\.?\//.test(body.replace(/location\.replace[^;]*;/, '')),
        `${document} carries no relative subresource URLs`,
      );
    }
  });
}

test('the redirect script runs under the global CSP instead of relaxing it', () => {
  const crypto = require('node:crypto');
  const headers = fs.readFileSync(path.join(dist, '_headers'), 'utf8');
  const policy = headers.match(/Content-Security-Policy: (.+)/)[1];
  assert.ok(
    !/script-src[^;]*'unsafe-inline'/.test(policy),
    'script-src stays free of unsafe-inline',
  );
  for (const alias of ALIASES) {
    const body = fs.readFileSync(path.join(dist, `${alias}.html`), 'utf8');
    const script = body.match(/<script>([\s\S]*?)<\/script>/)[1];
    assert.ok(
      script.includes(`querySelector('meta[http-equiv="refresh"]')`),
      `${alias} redirect drops the meta refresh before forwarding`,
    );
    const digest = `'sha256-${crypto.createHash('sha256').update(script).digest('base64')}'`;
    assert.ok(policy.includes(digest), `_headers allowlists the exact ${alias} redirect script`);
  }
});

test('the offline shell precaches every alias redirect document', () => {
  for (const alias of ALIASES) {
    for (const cached of [`./${alias}.html`, `./${alias}/index.html`]) {
      assert.ok(serviceWorker.includes(`"${cached}"`), `sw.js SHELL precaches ${cached}`);
    }
  }
});

function loadAliasRoute() {
  const routes = serviceWorker.match(/const ALIAS_ROUTES=(\[[^\]]*\]);/);
  assert.ok(routes, 'sw.js embeds the alias route table');
  const matcher = serviceWorker.match(/function aliasRoute\(pathname\)\{[^}]*\}/);
  assert.ok(matcher, 'sw.js embeds the alias pathname matcher');
  const sandbox = {};
  vm.runInNewContext(`${routes[0]}${matcher[0]}`, sandbox, { filename: 'dist/sw.js' });
  return vm.runInNewContext('aliasRoute', sandbox);
}

test('controlled alias navigations map to their redirect document', () => {
  const aliasRoute = loadAliasRoute();
  for (const [pathname, expected] of [
    ['/privacy', 'privacy'],
    ['/privacy/', 'privacy'],
    ['/about/', 'about'],
    ['/login', 'login'],
    ['/PRIVACY', 'privacy'],
    ['/About//', 'about'],
  ]) {
    assert.equal(aliasRoute(pathname), expected, pathname);
  }
});

test('unknown, nested and root paths keep the root shell', () => {
  const aliasRoute = loadAliasRoute();
  for (const pathname of [
    '/',
    '',
    '/library',
    '/privacy/archive',
    '/settings',
    '/alibi/privacy',
    '/foo/',
  ]) {
    assert.equal(aliasRoute(pathname), null, pathname);
  }
});

test('the navigate branch prefers the cached alias document', () => {
  assert.ok(
    serviceWorker.includes('aliasRoute(u.pathname)'),
    'sw.js navigate branch consults aliasRoute before the root shell',
  );
  assert.ok(
    serviceWorker.includes("'./'+alias+'.html'"),
    'sw.js navigate branch answers the cached alias document',
  );
});
