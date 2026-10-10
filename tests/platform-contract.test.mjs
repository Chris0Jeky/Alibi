import test from 'node:test';
import assert from 'node:assert/strict';
import { runBounded } from '../src/platform/contract.mjs';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ticks = async (count = 10) => {
  for (let index = 0; index < count; index++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

test('committed work is not cancelled by its timeout', async () => {
  const result = await runBounded(
    async (guard) => {
      guard.commit();
      await delay(60);
      return 'done';
    },
    { operationId: 'commit-wins', timeoutMs: 20 },
  );
  assert.deepEqual(result, { ok: true, value: 'done' });
});

test('committing releases the timeout deadline', async () => {
  let nextTimerId = 0;
  const timers = new Map();
  const host = {
    setTimeout(callback, ms) {
      const id = ++nextTimerId;
      timers.set(id, { callback, delay: ms, cleared: false });
      return id;
    },
    clearTimeout(id) {
      const timer = timers.get(id);
      if (timer) timer.cleared = true;
    },
  };
  let resolveProvider;
  const providerGate = new Promise((resolve) => {
    resolveProvider = resolve;
  });
  let settled = false;
  const pending = runBounded(
    async (guard) => {
      guard.commit();
      await providerGate;
      return 'done';
    },
    { operationId: 'commit-clears-deadline', timeoutMs: 20 },
    host,
  );
  void pending.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  await ticks();
  const entries = [...timers.values()];
  assert.equal(entries.length, 1);
  assert.equal(entries[0].delay, 20);
  assert.equal(entries[0].cleared, true, 'commit clears the timeout timer');
  entries[0].callback();
  await ticks(2);
  assert.equal(settled, false, 'a stale deadline cannot cancel committed work');
  resolveProvider();
  assert.deepEqual(await pending, { ok: true, value: 'done' });
});

test('work cancelled before commit reports timeout', async () => {
  const result = await runBounded(
    async () => {
      await delay(60);
      return 'late';
    },
    { operationId: 'timeout-before-commit', timeoutMs: 20 },
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, 'timeout');
});

test('work cancelled before commit reports cancelled', async () => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 10);
  const result = await runBounded(
    async () => {
      await delay(60);
      return 'late';
    },
    { operationId: 'cancelled-before-commit', timeoutMs: 1000, signal: controller.signal },
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, 'cancelled');
});
