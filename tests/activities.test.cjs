'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

test('optional download cannot block leaving a mounted activity or flushing its save', async () => {
  const calls = [];
  let completeDownload;
  const env = {
    Request,
    AbortSignal,
    ALIBI_QUIET_CONFIG: {
      cssSource: '',
      media: {},
      files: ['https://test.invalid/wing.js'],
      script: 'https://test.invalid/wing.js',
      build: 'fixture',
    },
    caches: {
      open: async () => ({
        match: async () => undefined,
        addAll: () =>
          new Promise((resolve) => {
            completeDownload = resolve;
          }),
      }),
      keys: async () => [],
    },
    AlibiQuietWing: {
      mount: async () => ({
        flush: async () => calls.push('flush'),
        dispose: () => calls.push('dispose'),
      }),
    },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/activities.js'), 'utf8'), env);
  const done = Promise.resolve().then(async () => {
    await env.AlibiActivities.enter({ isConnected: true, attachShadow: () => ({}) });
    await env.AlibiActivities.leave();
    return true;
  });
  let timer;
  try {
    assert.equal(
      await Promise.race([
        done,
        new Promise((resolve) => {
          timer = setTimeout(() => resolve(false), 150);
        }),
      ]),
      true,
    );
    assert.deepEqual(calls, ['flush', 'dispose']);
    assert.equal(env.AlibiActivities.diagnostics().offline, false);
  } finally {
    clearTimeout(timer);
    completeDownload?.();
  }
});
test('a route exit serializes with a pending mount and disposes it before the next mount', async () => {
  const calls = [];
  let finishFirst;
  const host = () => ({ isConnected: true, attachShadow: () => ({}) });
  const env = {
    ALIBI_QUIET_CONFIG: { cssSource: '', media: {} },
    AlibiQuietWing: {
      mount: async () => {
        const id = calls.filter((c) => c.startsWith('mount')).length + 1;
        calls.push('mount' + id);
        if (id === 1)
          await new Promise((resolve) => {
            finishFirst = resolve;
          });
        return {
          route: () => calls.push('route' + id),
          flush: async () => calls.push('flush' + id),
          dispose: () => calls.push('dispose' + id),
        };
      },
    },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/activities.js'), 'utf8'), env);
  const registry = env.AlibiActivities;
  const first = registry.enter(host());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof finishFirst, 'function');
  const secondHost = host();
  const leaving = registry.leave(),
    second = registry.enter(secondHost);
  finishFirst();
  await Promise.all([first, leaving, second]);
  assert.deepEqual(calls, ['mount1', 'dispose1', 'mount2']);
  assert.equal(registry.diagnostics().active, true);
  await registry.enter(secondHost);
  assert.equal(calls.at(-1), 'route2');
  await registry.enter(host());
  assert.deepEqual(calls.slice(-3), ['flush2', 'dispose2', 'mount3']);
  await registry.leave();
  assert.deepEqual(calls.slice(-2), ['flush3', 'dispose3']);
  assert.equal(registry.diagnostics().active, false);
});

test('root preferences reach the mounted wing and update it while active', async () => {
  const mounted = [],
    updates = [],
    host = () => ({ isConnected: true, attachShadow: () => ({}) });
  const env = {
    ALIBI_QUIET_CONFIG: { cssSource: '', media: {} },
    AlibiQuietWing: {
      mount: async (context) => {
        mounted.push(context.preferences);
        return {
          route() {},
          setPreferences: (value) => updates.push(value),
          flush: async () => {},
          dispose: () => {},
        };
      },
    },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/activities.js'), 'utf8'), env);
  const first = { theme: 'night', reducedMotion: true, contrast: true, largeText: false };
  env.AlibiActivities.setPreferences(first);
  await env.AlibiActivities.enter(host());
  assert.deepEqual(JSON.parse(JSON.stringify(mounted)), [first]);
  const second = { theme: 'light', reducedMotion: false, contrast: false, largeText: true };
  env.AlibiActivities.setPreferences(second);
  assert.deepEqual(JSON.parse(JSON.stringify(updates)), [second]);
  await env.AlibiActivities.leave();
});
