'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
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
  const leaving = registry.leave(),
    second = registry.enter(host());
  finishFirst();
  await Promise.all([first, leaving, second]);
  assert.deepEqual(calls, ['mount1', 'dispose1', 'mount2']);
  assert.equal(registry.diagnostics().active, true);
  await registry.enter(host());
  assert.equal(calls.at(-1), 'route2');
  await registry.leave();
  assert.deepEqual(calls.slice(-2), ['flush2', 'dispose2']);
  assert.equal(registry.diagnostics().active, false);
});
