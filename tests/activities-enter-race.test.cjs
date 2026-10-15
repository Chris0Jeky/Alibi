'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function load(env) {
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/activities.js'), 'utf8'), env);
  return env.AlibiActivities;
}

function makeHost() {
  const root = {};
  const host = {
    isConnected: true,
    shadowRoot: null,
    attachCalls: 0,
    attachShadow() {
      host.attachCalls += 1;
      host.shadowRoot = root;
      return root;
    },
  };
  return host;
}

function baseEnv(mount) {
  return {
    ALIBI_QUIET_CONFIG: {
      cssSource: '',
      media: {},
      sources: {},
      files: [],
      build: 'race-fixture',
      script: 'https://test.invalid/wing.js',
    },
    caches: {
      open: async () => ({ match: async () => true, addAll: async () => {} }),
      keys: async () => [],
      delete: async () => true,
    },
    AlibiQuietWing: { mount },
  };
}

test('a stale overlapping enter is disposed and the second host wins', async () => {
  const events = [];
  const roots = [];
  let releaseFirst;
  const registry = load(
    baseEnv(async ({ root }) => {
      const id = roots.length + 1;
      events.push('mount' + id);
      roots.push(root);
      if (id === 1)
        await new Promise((resolve) => {
          releaseFirst = resolve;
        });
      return {
        route: () => events.push('route' + id),
        flush: async () => events.push('flush' + id),
        dispose: () => events.push('dispose' + id),
      };
    }),
  );
  const hostA = makeHost();
  const hostB = makeHost();
  const first = registry.enter(hostA);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof releaseFirst, 'function');
  const leaving = registry.leave();
  const second = registry.enter(hostB);
  releaseFirst();
  await Promise.all([first, leaving, second]);
  // The stale first handle is dropped by the epoch guard without a flush and never
  // becomes the active activity; only the second host mounts.
  assert.deepEqual(events, ['mount1', 'dispose1', 'mount2']);
  assert.equal(roots[0], hostA.shadowRoot);
  assert.equal(roots[1], hostB.shadowRoot);
  assert.equal(hostA.attachCalls, 1);
  assert.equal(hostB.attachCalls, 1);
  assert.equal(registry.diagnostics().active, true);
  assert.equal(registry.diagnostics().kind, 'quiet');
  await registry.enter(hostB);
  assert.equal(events.at(-1), 'route2');
  await registry.leave();
  assert.deepEqual(events.slice(-2), ['flush2', 'dispose2']);
  assert.equal(registry.diagnostics().active, false);
});

test('a host that disconnects mid-mount never becomes active', async () => {
  const events = [];
  let releaseMount;
  const registry = load(
    baseEnv(async () => {
      events.push('mount');
      await new Promise((resolve) => {
        releaseMount = resolve;
      });
      return {
        flush: async () => events.push('flush'),
        dispose: () => events.push('dispose'),
      };
    }),
  );
  const host = makeHost();
  const pending = registry.enter(host);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof releaseMount, 'function');
  host.isConnected = false;
  releaseMount();
  await pending;
  // The resolved handle is disposed by the isConnected guard instead of mounting.
  assert.deepEqual(events, ['mount', 'dispose']);
  assert.equal(registry.diagnostics().active, false);
  assert.equal(registry.diagnostics().kind, null);
  await registry.leave();
});
