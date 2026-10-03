'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { deferredRuntime } = require('../tools/build-official-content.cjs');
function fixture(append) {
  const scripts = [], clocks = new Map();
  let id = 0;
  const context = vm.createContext({
    setTimeout(fn, ms) { clocks.set(++id, { fn, ms }); return id; },
    clearTimeout(key) { clocks.delete(key); },
    document: {
      createElement() { return { remove() { this.removed = true; } }; },
      head: { append(s) { scripts.push(s); append?.(s, context); } },
    },
  });
  vm.runInContext(deferredRuntime('./assets/definitions.js', ['test@1']), context);
  return { D: context.ALIBI_DEFERRED, scripts, clocks, context };
}
const tick = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
test('a stalled definition load has a ten-second deadline and supports retry', async () => {
  const f = fixture(), first = f.D.ensure();
  const failure = assert.rejects(first, /did not load/);
  await tick();
  assert.equal(f.scripts.length, 1);
  assert.equal(f.clocks.size, 1, 'a network stall must have a bounded deadline');
  const timer = [...f.clocks.values()][0];
  assert.equal(timer.ms, 10000);
  timer.fn(); await failure;
  assert.equal(f.scripts[0].removed, true);
  assert.equal(f.scripts[0].onload, null);
  assert.equal(f.scripts[0].onerror, null);
  assert.equal(f.clocks.size, 0);
  const retry = f.D.ensure(); await tick();
  assert.equal(f.scripts.length, 2);
  f.D.ready = true; f.scripts[1].onload(); await retry;
  assert.equal(f.clocks.size, 0);
});
test('concurrent readers share one request and success clears its deadline', async () => {
  const f = fixture(), first = f.D.ensure();
  assert.equal(f.D.ensure(), first); await tick();
  assert.equal(f.scripts.length, 1); assert.equal(f.clocks.size, 1);
  f.D.ready = true; f.scripts[0].onload(); await first;
  assert.equal(f.clocks.size, 0); await f.D.ensure(); assert.equal(f.scripts.length, 1);
});
test('network failure clears handlers and a detached old callback cannot reset a retry', async () => {
  const f = fixture(), first = f.D.ensure();
  const failed = assert.rejects(first, /did not load/); await tick();
  const stale = f.scripts[0].onerror; stale(); await failed;
  const retry = f.D.ensure(); await tick(); stale();
  assert.equal(f.D.ensure(), retry, 'old completion cannot discard the current attempt');
  f.D.ready = true; f.scripts[1].onload(); await retry;
});
test('a script that never validates cannot be counted as loaded', async () => {
  const f = fixture(), pending = f.D.ensure();
  const failed = assert.rejects(pending, /did not load/); await tick();
  f.scripts[0].onload(); await failed;
  assert.equal(f.D.ready, false); assert.equal(f.clocks.size, 0);
});
test('synchronous script insertion failure releases the request for a fresh attempt', async () => {
  let fail = true;
  const f = fixture(() => { if (fail) throw Error('blocked append'); });
  await assert.rejects(f.D.ensure()); fail = false;
  const retry = f.D.ensure(); await tick();
  assert.equal(f.scripts.length, 2, 'failed setup cannot leave a rejected promise pinned');
  f.D.ready = true; f.scripts[1].onload(); await retry;
});
test('a synchronously delivered script still settles once and clears all timers', async () => {
  const f = fixture((script, c) => { c.ALIBI_DEFERRED.ready = true; script.onload(); });
  await f.D.ensure(); assert.equal(f.clocks.size, 0);
  await f.D.ensure(); assert.equal(f.scripts.length, 1);
});
