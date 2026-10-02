'use strict';
/* Regression coverage for the cachePack offline/eviction protocol in
 * src/activities.js: a failed addAll must leave diagnostics offline false
 * and delete the partial pack; success must set offline true; eviction must
 * keep the current pack plus one previous pack and delete older packs.
 * cachePack is module-private, so each test drives it through
 * AlibiActivities.enter() with a stubbed Quiet Wing mount. enter/flush
 * routing and the service worker are out of scope and unasserted here. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'src', 'activities.js'), 'utf8');

function createCacheStorage({ failAddAll = false } = {}) {
  const stores = new Map();
  const calls = { opened: [], deleted: [] };
  const keyOf = (input) => (typeof input === 'string' ? input : String(input.url));
  const storage = {
    async open(name) {
      calls.opened.push(name);
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async match(request) {
          return entries.get(keyOf(request));
        },
        async addAll(requests) {
          if (failAddAll) throw new Error('simulated offline pack fetch');
          for (const request of requests) {
            const url = keyOf(request);
            entries.set(url, { url });
          }
        },
      };
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      calls.deleted.push(name);
      return stores.delete(name);
    },
  };
  return { storage, stores, calls };
}

function seedPack(stores, name, urls) {
  stores.set(name, new Map(urls.map((url) => [url, { url }])));
}

function loadActivities(config, harness) {
  const sandbox = {
    console,
    AbortSignal: { timeout: () => ({ aborted: false }) },
    Request: class Request {
      constructor(url, init) {
        this.url = String(url);
        this.init = init;
      }
    },
    URL,
    fetch: async () => {
      throw new Error('network disabled in activities cachePack test');
    },
    document: {
      head: { append() {} },
      createElement: () => ({ remove() {} }),
    },
    location: { hash: '#/quiet' },
    ALIBI_QUIET_CONFIG: config,
    AlibiQuietWing: {
      mount: async () => ({ route() {}, dispose() {} }),
    },
    caches: harness.storage,
  };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox, { filename: 'activities.js' });
  return sandbox;
}

function testConfig(build, files) {
  return { build, files, cssSource: '/* test */', media: {}, sources: {} };
}

async function enterAndSettle(sandbox) {
  await sandbox.AlibiActivities.enter({ isConnected: true, shadowRoot: {} });
  // cachePack runs detached from enter's returned promise; drain the loop
  // so its open/match/addAll/keys/delete chain settles before asserting.
  for (let i = 0; i < 50; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

test('failing addAll leaves diagnostics offline false and deletes the partial pack', async () => {
  const pack = 'alibi-quiet-wing-pack-fail-build';
  const harness = createCacheStorage({ failAddAll: true });
  const sandbox = loadActivities(testConfig('fail-build', ['quiet/a.js', 'quiet/b.js']), harness);
  await enterAndSettle(sandbox);

  assert.equal(sandbox.AlibiActivities.diagnostics().offline, false);
  assert.ok(harness.calls.deleted.includes(pack), 'partial pack is deleted');
  assert.ok(!(await harness.storage.keys()).includes(pack));
});

test('successful pack caching sets diagnostics offline true', async () => {
  const files = ['quiet/a.js', 'quiet/b.js'];
  const pack = 'alibi-quiet-wing-pack-ok-build';
  const harness = createCacheStorage();
  const sandbox = loadActivities(testConfig('ok-build', files), harness);
  await enterAndSettle(sandbox);

  assert.equal(sandbox.AlibiActivities.diagnostics().offline, true);
  const cache = await harness.storage.open(pack);
  for (const file of files) {
    assert.ok(await cache.match(file), `pack contains ${file}`);
  }
});

test('eviction keeps the current pack plus one previous pack and deletes older packs', async () => {
  const current = 'alibi-quiet-wing-pack-new-build';
  const previous = 'alibi-quiet-wing-pack-old-2';
  const older = 'alibi-quiet-wing-pack-old-1';
  const unrelated = 'alibi-shell-unrelated';
  const harness = createCacheStorage();
  seedPack(harness.stores, older, ['quiet/a.js']);
  seedPack(harness.stores, previous, ['quiet/a.js']);
  seedPack(harness.stores, unrelated, ['shell.js']);
  const sandbox = loadActivities(testConfig('new-build', ['quiet/a.js']), harness);
  await enterAndSettle(sandbox);

  const keys = await harness.storage.keys();
  assert.ok(keys.includes(current), 'current pack survives eviction');
  assert.ok(keys.includes(previous), 'one previous pack survives eviction');
  assert.ok(keys.includes(unrelated), 'unrelated caches survive eviction');
  assert.ok(!keys.includes(older), 'older packs are evicted');
  assert.ok(harness.calls.deleted.includes(older));
  assert.ok(!harness.calls.deleted.includes(current));
  assert.ok(!harness.calls.deleted.includes(previous));
  assert.equal(sandbox.AlibiActivities.diagnostics().offline, true);
});
