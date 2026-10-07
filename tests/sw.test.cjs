/* Simulated CacheStorage/service-worker lifecycle, not a real offline browser test. */
const { after, test } = require('node:test');
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
let x;

test('standalone keeps exact game source', () => {
  const standalone = fs.readFileSync(path.join(ROOT, 'alibi-deluxe-play.html'), 'utf8');
  const clubConfig = JSON.parse(standalone.match(/globalThis\.ALIBI_CLUB_CONFIG=(.*);\n/)[1]);
  check(
    clubConfig.engineSource === fs.readFileSync(path.join(ROOT, 'src/club-engines.js'), 'utf8'),
    'Standalone keeps exact game source including adjacent crate symbols',
  );
});

test('release install caches the emitted shell', async () => {
  x = setup();
  await x.lifecycle('install');
  const shell = JSON.parse(code.match(/SHELL=(\[.*?\])/)[1]);
  check(
    x.data.get(name).size === shell.length,
    'Release installs exactly the emitted shell entries',
  );
  check(
    shell.length ===
      6 +
        6 +
        fs
          .readdirSync(path.join(ROOT, 'dist/assets'))
          .filter(
            (n) =>
              n !== 'workshop' &&
              !n.startsWith('folio-') &&
              !n.startsWith('ambience-') &&
              !n.startsWith('enhanced-') &&
              !n.startsWith('pulseboard.') &&
              !n.startsWith('discovery-storage.') &&
              !n.startsWith('house.') &&
              !n.startsWith('block-motion.') &&
              !n.startsWith('block-replay-worker.') &&
              !n.startsWith('block-atelier.') &&
              !/^quiet-(castle|activity|style|keeper|wave|portrait|bedroom|sunday|museum-rights|kenney-license|pet-cat|pet-fox|pet-owl)\./.test(
                n,
              ),
          ).length,
    'Release installs the core shell plus the six alias redirect documents, without optional activity assets',
  );
});

test('optional collection is not precached', async () => {
  const optional = setup();
  await optional.lifecycle('install');
  for (const file of require('../tools/build-workshop-shelf.cjs').buildShelf(ROOT).files) {
    const response = await optional.request('/' + file.path, {
      mode: file.path.endsWith('.html') ? 'navigate' : 'cors',
    });
    check(response?.network, 'Optional collection is not precached: ' + file.path);
  }
});

test('offline release includes core assets', () => {
  for (const asset of fs
    .readdirSync(path.join(__dirname, '../dist/assets'))
    .filter(
      (n) =>
        n !== 'workshop' &&
        !n.startsWith('folio-') &&
        !n.startsWith('ambience-') &&
        !n.startsWith('enhanced-') &&
        !n.startsWith('pulseboard.') &&
        !n.startsWith('discovery-storage.') &&
        !n.startsWith('house.') &&
        !n.startsWith('block-motion.') &&
        !n.startsWith('block-replay-worker.') &&
        !n.startsWith('block-atelier.') &&
        !/^quiet-(castle|activity|style|keeper|wave|portrait|bedroom|sunday|museum-rights|kenney-license|pet-cat|pet-fox|pet-owl)\./.test(
          n,
        ),
    )) {
    check(
      [...x.data.get(name).keys()].some((url) => url.endsWith('/assets/' + asset)),
      'Offline release includes ' + asset,
    );
  }
});

test('activation claims clients without forcing install', async () => {
  check(x.calls.skip === 0, 'Installation never forces activation');
  await x.lifecycle('activate');
  check(x.calls.claim === 1, 'Activation claims clients');
});

test('navigation and alias routing use the cached shell', async () => {
  const page = await x.request('/#/play/scene-01', { mode: 'navigate' });
  check(page.release === name, 'Navigation uses the coherent active-release shell');
  check(x.calls.network === 0, 'Cached navigation does not require network');
  const aliasDirectory = await x.request('/privacy/', { mode: 'navigate' });
  check(
    aliasDirectory && aliasDirectory.url.endsWith('/privacy.html'),
    'Controlled directory alias navigation answers the cached redirect',
  );
  const aliasLeaf = await x.request('/LOGIN', { mode: 'navigate' });
  check(
    aliasLeaf && aliasLeaf.url.endsWith('/login.html'),
    'Controlled alias matching ignores case and trailing slashes',
  );
  check(x.calls.network === 0, 'Controlled alias navigation does not require network');
  for (const url of ['/index.html', '/unknown-leaf', '/?from=share']) {
    const shell = await x.request(url, { mode: 'navigate' });
    check(
      shell && shell.url === 'https://test.invalid/',
      `Root-level navigation ${url} keeps the shell`,
    );
  }
  check(x.calls.network === 0, 'Root-level shell navigations do not require network');
});

test('deeper navigation reaches the network', async () => {
  // 0.14.1 audit M4: the shell's asset URLs are relative, so a deeper or file-like URL
  // that received it rendered an unstyled page stuck on "Opening the puzzle cabinet…".
  for (const url of ['/alibi/privacy', '/a/b/x.html', '/a/b/', '/404.html', '/missing.html']) {
    const network = await x.request(url, { mode: 'navigate' });
    check(network && network.network, `Navigation to ${url} reaches the network and its 404`);
  }
});

test('fetch routing for scripts, updates and mutations', async () => {
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
});

test('cache cleanup and explicit activation', async () => {
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
});

test('interrupted install rolls back', async () => {
  const bad = setup(true);
  await assert.rejects(bad.lifecycle('install'), /simulated network/);
  check(!bad.data.has(name), 'Interrupted install deletes only its incomplete release cache');
  check(bad.calls.skip === 0, 'Interrupted install does not activate');
});

test('built html references and manifest icons', () => {
  const html = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))
    check(fs.existsSync(path.join(ROOT, 'dist', match[1])), 'HTML reference exists: ' + match[1]);
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist/manifest.webmanifest')));
  check(manifest.id === './', 'Manifest identity is stable across builds');
  check(
    manifest.icons.some((i) => i.purpose === 'maskable'),
    'Android maskable icon included',
  );
});

after(() => {
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
});
