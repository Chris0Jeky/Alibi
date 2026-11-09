const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function harness() {
  const calls = [];
  const scope = {
    console,
    location: { hash: '#/quiet/timeline' },
    ALIBI_QUIET_CONFIG: { cssSource: '', timeline: { source: '' } },
    AlibiTimeline: {
      mount: async () => {
        calls.push('mount');
        return {
          route() {
            calls.push('route');
          },
          flush: async () => calls.push('flush'),
          dispose() {
            calls.push('dispose');
          },
          setPreferences(p) {
            calls.push(p);
          },
        };
      },
      cachePack() {
        calls.push('cache');
      },
      offline: () => true,
      flush: async () => calls.push('retained-flush'),
    },
    AlibiQuietWing: { mount: async () => ({ route() {}, flush() {}, dispose() {} }) },
  };
  vm.runInNewContext(fs.readFileSync('src/activities.js', 'utf8'), scope);
  return { scope, calls, host: { isConnected: true, shadowRoot: {} } };
}
test('Timeline enters through the optional lifecycle without mounting Quiet Wing', async () => {
  const { scope, calls, host } = harness();
  await scope.AlibiActivities.enter(host, { preferences: { reducedMotion: true } });
  assert.deepEqual(calls, ['mount', 'cache']);
  assert.equal(scope.AlibiActivities.diagnostics().kind, 'timeline');
  assert.equal(scope.AlibiActivities.diagnostics().offline, true);
  await scope.AlibiActivities.enter(host);
  assert.ok(calls.includes('route'));
  await scope.AlibiActivities.leave();
  assert.ok(calls.includes('flush'));
  assert.ok(calls.includes('dispose'));
  await scope.AlibiActivities.flush();
  assert.ok(calls.includes('retained-flush'));
});
test('navigation invalidates a pending Timeline mount and disposes its late handle', async () => {
  const { scope, host } = harness();
  let release,
    disposed = 0;
  scope.AlibiTimeline.mount = () =>
    new Promise(
      (resolve) =>
        (release = () =>
          resolve({
            flush() {},
            dispose() {
              disposed++;
            },
          })),
    );
  const entering = scope.AlibiActivities.enter(host);
  while (!release) await new Promise((resolve) => setImmediate(resolve));
  const leaving = scope.AlibiActivities.leave();
  release();
  await entering;
  await leaving;
  assert.equal(disposed, 1);
  assert.equal(scope.AlibiActivities.diagnostics().active, false);
});
