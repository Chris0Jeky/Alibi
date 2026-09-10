/* Simulated CacheStorage/service-worker lifecycle, not a real offline browser test. */
const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(ROOT, 'dist/sw.js'), 'utf8');
const build = JSON.parse(fs.readFileSync(path.join(ROOT, 'build-info.json'))).build;
const name = 'alibi-shell-' + build;
let count = 0;
const check = (ok, msg) => {
  assert.ok(ok, msg);
  count++;
  console.log('PASS', msg);
};
function setup(failInstall = false) {
  const handlers = {},
    data = new Map(),
    calls = { skip: 0, claim: 0, network: 0 };
  const key = (x) => (typeof x === 'string' ? new URL(x, 'https://test.invalid/').href : x.url);
  const cache = {
    async open(n) {
      if (!data.has(n)) data.set(n, new Map());
      const entries = data.get(n);
      return {
        async addAll(reqs) {
          if (failInstall) throw new Error('simulated network interruption');
          for (const r of reqs) entries.set(key(r), { url: key(r), release: n });
        },
        async match(req) {
          return entries.get(key(req));
        },
      };
    },
    async keys() {
      return [...data.keys()];
    },
    async delete(n) {
      return data.delete(n);
    },
    async match(req) {
      for (const c of data.values()) if (c.has(key(req))) return c.get(key(req));
    },
  };
  const context = {
    URL,
    Request: class Request {
      constructor(url, options) {
        this.url = new URL(url, 'https://test.invalid/').href;
        Object.assign(this, options);
      }
    },
    caches: cache,
    fetch: async (req) => {
      calls.network++;
      return { network: true, url: key(req) };
    },
    self: {
      location: { origin: 'https://test.invalid' },
      registration: { scope: 'https://test.invalid/' },
      clients: {
        claim: async () => {
          calls.claim++;
        },
      },
      skipWaiting: () => {
        calls.skip++;
      },
      addEventListener: (n, f) => (handlers[n] = f),
    },
  };
  vm.runInNewContext(code, context);
  async function lifecycle(type, event = {}) {
    let waiting;
    handlers[type]({ ...event, waitUntil: (p) => (waiting = p) });
    await waiting;
  }
  async function request(url, options = {}) {
    let response;
    handlers.fetch({
      request: {
        url: new URL(url, 'https://test.invalid/').href,
        method: 'GET',
        mode: 'cors',
        ...options,
      },
      respondWith: (r) => (response = r),
    });
    return response ? await response : undefined;
  }
  return { handlers, data, calls, lifecycle, request };
}
(async () => {
  const standalone = fs.readFileSync(path.join(ROOT, 'alibi-deluxe-play.html'), 'utf8');
  const clubConfig = JSON.parse(standalone.match(/globalThis\.ALIBI_CLUB_CONFIG=(.*);\n/)[1]);
  check(
    clubConfig.engineSource === fs.readFileSync(path.join(ROOT, 'src/club-engines.js'), 'utf8'),
    'Standalone keeps exact game source including adjacent crate symbols',
  );
  const x = setup();
  await x.lifecycle('install');
  check(
    x.data.get(name).size ===
      6 +
        fs
          .readdirSync(path.join(ROOT, 'dist/assets'))
          .filter(
            (n) =>
              !n.startsWith('folio-') &&
              !n.startsWith('ambience-') &&
              !n.startsWith('enhanced-') &&
              !n.startsWith('observatory.') &&
              !/^quiet-(castle|activity|style|keeper|wave|portrait|bedroom|sunday|museum-rights|kenney-license|pet-cat|pet-fox|pet-owl)\./.test(
                n,
              ),
          ).length,
    'Release installs the core shell without optional activity assets',
  );
  for (const asset of fs
    .readdirSync(path.join(__dirname, '../dist/assets'))
    .filter(
      (n) =>
        !n.startsWith('folio-') &&
        !n.startsWith('ambience-') &&
        !n.startsWith('enhanced-') &&
        !n.startsWith('observatory.') &&
        !/^quiet-(castle|activity|style|keeper|wave|portrait|bedroom|sunday|museum-rights|kenney-license|pet-cat|pet-fox|pet-owl)\./.test(
          n,
        ),
    )) {
    check(
      [...x.data.get(name).keys()].some((url) => url.endsWith('/assets/' + asset)),
      'Offline release includes ' + asset,
    );
  }
  check(x.calls.skip === 0, 'Installation never forces activation');
  await x.lifecycle('activate');
  check(x.calls.claim === 1, 'Activation claims clients');
  const page = await x.request('/#/play/scene-01', { mode: 'navigate' });
  check(page.release === name, 'Navigation uses the coherent active-release shell');
  check(x.calls.network === 0, 'Cached navigation does not require network');
  const js = [...x.data.get(name).keys()].find((k) => k.endsWith('.js'));
  check((await x.request(js)).release === name, 'Hashed script served from current cache');
  check(
    (await x.request('/sw.js')) === undefined,
    'Service worker update request bypasses app cache',
  );
  check(
    (await x.request('https://other.invalid/')) === undefined,
    'Cross-origin requests are not intercepted',
  );
  check(
    (await x.request('/api/test', { method: 'POST' })) === undefined,
    'Mutating requests are not intercepted',
  );
  check((await x.request('/missing.png')).network, 'Unknown asset falls back to network');
  const old = 'alibi-shell-previous';
  x.data.set(old, new Map([['https://test.invalid/assets/old-hash.js', { release: old }]]));
  check(
    (await x.request('/assets/old-hash.js')).release === old,
    'An old open tab can fetch its exact earlier script hash',
  );
  x.data.set('unrelated-cache', new Map());
  x.data.set('alibi-shell-obsolete', new Map());
  await x.lifecycle('activate');
  check(x.data.has('unrelated-cache'), 'Cache cleanup leaves unrelated applications alone');
  check(
    [...x.data.keys()].filter((k) => k.startsWith('alibi-shell-')).length === 2,
    'Cleanup retains current and one earlier release',
  );
  x.handlers.message({ data: { type: 'UNKNOWN' } });
  check(x.calls.skip === 0, 'Unknown messages cannot trigger activation');
  x.handlers.message({ data: { type: 'ACTIVATE' } });
  check(x.calls.skip === 1, 'Explicit update action permits activation');
  const bad = setup(true);
  await assert.rejects(bad.lifecycle('install'), /simulated network/);
  check(!bad.data.has(name), 'Interrupted install deletes only its incomplete release cache');
  check(bad.calls.skip === 0, 'Interrupted install does not activate');
  const html = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))
    check(fs.existsSync(path.join(ROOT, 'dist', match[1])), 'HTML reference exists: ' + match[1]);
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist/manifest.webmanifest')));
  check(manifest.id === './', 'Manifest identity is stable across builds');
  check(
    manifest.icons.some((i) => i.purpose === 'maskable'),
    'Android maskable icon included',
  );
  fs.writeFileSync(
    path.join(ROOT, 'tests/sw-results.json'),
    JSON.stringify(
      {
        passed: true,
        scope: 'Node mock CacheStorage; no hosted browser/network',
        assertions: count,
      },
      null,
      2,
    ),
  );
  console.log('PASS', count, 'service-worker and build assertions');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
