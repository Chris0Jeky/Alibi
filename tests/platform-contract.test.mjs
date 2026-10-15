import test from 'node:test';
import assert from 'node:assert/strict';
import { PlatformFailure, runBounded } from '../src/platform/contract.mjs';

const turn = () => new Promise((resolve) => setImmediate(resolve));

const options = (overrides = {}) => ({
  operationId: 'contract-probe',
  timeoutMs: 100,
  ...overrides,
});

// Injected host timers: deadlines fire only when the test fires them, so the
// suite never waits on wall-clock timeouts (including the 60000ms boundary).
function fakeHost() {
  let nextId = 0;
  const timers = new Map();
  return {
    timers,
    setTimeout(callback, delay) {
      const id = ++nextId;
      timers.set(id, { callback, delay, cleared: false, fired: false });
      return id;
    },
    clearTimeout(id) {
      const timer = timers.get(id);
      if (timer) timer.cleared = true;
    },
    fireFirst() {
      const timer = [...timers.values()].find((entry) => !entry.cleared && !entry.fired);
      assert.ok(timer, 'an injected deadline is armed');
      timer.fired = true;
      timer.callback();
    },
  };
}

test('invalid options are rejected without running the action', async () => {
  const invalid = [
    ['missing options', undefined],
    ['null options', null],
    ['missing operationId', { timeoutMs: 100 }],
    ['empty operationId', { operationId: '', timeoutMs: 100 }],
    ['blank operationId', { operationId: '   ', timeoutMs: 100 }],
    ['zero timeout', { operationId: 'contract-probe', timeoutMs: 0 }],
    ['negative timeout', { operationId: 'contract-probe', timeoutMs: -1 }],
    ['timeout above 60000', { operationId: 'contract-probe', timeoutMs: 60001 }],
    ['fractional timeout', { operationId: 'contract-probe', timeoutMs: 1.5 }],
    ['string timeout', { operationId: 'contract-probe', timeoutMs: '100' }],
    ['object signal', { operationId: 'contract-probe', timeoutMs: 100, signal: {} }],
    ['string signal', { operationId: 'contract-probe', timeoutMs: 100, signal: 'abort' }],
  ];
  for (const [label, probe] of invalid) {
    let ran = false;
    const result = await runBounded(
      () => {
        ran = true;
        return 'unexpected';
      },
      probe,
      fakeHost(),
    );
    assert.equal(ran, false, label);
    assert.equal(result.ok, false, label);
    assert.equal(result.code, 'invalid', label);
  }
  for (const timeoutMs of [1, 60000]) {
    const result = await runBounded(() => 'bounded', options({ timeoutMs }), fakeHost());
    assert.deepEqual(result, { ok: true, value: 'bounded' }, `timeoutMs ${timeoutMs} is accepted`);
  }
});

test('a pre-aborted signal returns cancelled without running the action', async () => {
  const controller = new AbortController();
  controller.abort();
  const host = fakeHost();
  let ran = false;
  const result = await runBounded(
    () => {
      ran = true;
      return 'unexpected';
    },
    options({ operationId: 'pre-aborted', signal: controller.signal }),
    host,
  );
  assert.equal(ran, false);
  assert.deepEqual(result, {
    ok: false,
    code: 'cancelled',
    message: 'The operation was cancelled.',
  });
  assert.equal(host.timers.size, 0, 'no deadline is armed for a pre-aborted operation');
});

test('a slow action loses to its injected deadline with a timeout failure', async () => {
  const host = fakeHost();
  let ran = false;
  const pending = runBounded(
    () => {
      ran = true;
      return new Promise(() => {});
    },
    options({ operationId: 'slow-action', timeoutMs: 50 }),
    host,
  );
  host.fireFirst();
  const result = await pending;
  assert.equal(ran, true);
  assert.deepEqual(result, {
    ok: false,
    code: 'timeout',
    message: 'The operation timed out.',
  });
  assert.ok(
    [...host.timers.values()].every((timer) => timer.cleared),
    'the deadline is released after the timeout settles',
  );
});

test('an explicit abort returns cancelled and a late provider value is ignored', async () => {
  const host = fakeHost();
  const controller = new AbortController();
  let guardRef = null;
  let resolveWork;
  const pending = runBounded(
    (guard) => {
      guardRef = guard;
      return new Promise((resolve) => {
        resolveWork = resolve;
      });
    },
    options({ operationId: 'explicit-abort', timeoutMs: 1000, signal: controller.signal }),
    host,
  );
  await turn();
  assert.ok(guardRef.signal instanceof AbortSignal);
  controller.abort();
  resolveWork('late-provider-value');
  assert.deepEqual(await pending, {
    ok: false,
    code: 'cancelled',
    message: 'The operation was cancelled.',
  });
  assert.throws(
    () => guardRef.throwIfCancelled(),
    (error) => error instanceof PlatformFailure && error.code === 'cancelled',
  );
});

test('commit wins the race: a committed result survives a late deadline and abort', async () => {
  const host = fakeHost();
  const controller = new AbortController();
  let resolveProvider;
  let committedSeen = false;
  let settled = false;
  const pending = runBounded(
    (guard) => {
      guard.commit();
      committedSeen = guard.committed;
      return new Promise((resolve) => {
        resolveProvider = resolve;
      });
    },
    options({ operationId: 'committed-write', timeoutMs: 5, signal: controller.signal }),
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
  await turn();
  assert.equal(committedSeen, true);
  assert.ok(
    [...host.timers.values()].every((timer) => timer.cleared),
    'committing the irreversible step releases its deadline',
  );
  // A stale deadline firing after the irreversible step began cannot cancel it.
  for (const timer of host.timers.values()) timer.callback();
  controller.abort();
  await turn();
  await turn();
  assert.equal(settled, false, 'the caller still waits for the definitive provider result');
  resolveProvider('provider-result');
  assert.deepEqual(await pending, { ok: true, value: 'provider-result' });
});

test('the guard throws once cancellation has won', async () => {
  const host = fakeHost();
  let guardRef = null;
  const pending = runBounded(
    (guard) => {
      guardRef = guard;
      return new Promise(() => {});
    },
    options({ operationId: 'guard-cancel', timeoutMs: 10 }),
    host,
  );
  await turn();
  assert.equal(guardRef.committed, false);
  assert.ok(guardRef.signal instanceof AbortSignal);
  assert.doesNotThrow(() => guardRef.throwIfCancelled());
  host.fireFirst();
  assert.deepEqual(await pending, {
    ok: false,
    code: 'timeout',
    message: 'The operation timed out.',
  });
  assert.throws(
    () => guardRef.throwIfCancelled(),
    (error) => error instanceof PlatformFailure && error.code === 'timeout',
  );
  assert.throws(
    () => guardRef.commit(),
    (error) => error instanceof PlatformFailure && error.code === 'timeout',
  );
});

test('provider errors map to cancelled, denied, quota, passthrough or the fallback', async () => {
  const cases = [
    [new DOMException('left', 'AbortError'), 'cancelled'],
    [new DOMException('blocked', 'NotAllowedError'), 'denied'],
    [new DOMException('blocked', 'SecurityError'), 'denied'],
    [new DOMException('full', 'QuotaExceededError'), 'quota'],
  ];
  for (const [error, code] of cases) {
    const result = await runBounded(
      () => {
        throw error;
      },
      options({ operationId: 'mapped-error' }),
      fakeHost(),
    );
    assert.equal(result.ok, false, error.name);
    assert.equal(result.code, code, error.name);
  }
  const rejected = await runBounded(
    async () => {
      throw new DOMException('blocked', 'NotAllowedError');
    },
    options({ operationId: 'rejected-denial' }),
    fakeHost(),
  );
  assert.equal(rejected.code, 'denied', 'rejections map like synchronous throws');
  const passthrough = await runBounded(
    () => {
      throw new PlatformFailure('denied', 'No entry.');
    },
    options({ operationId: 'denied-passthrough' }),
    fakeHost(),
  );
  assert.deepEqual(passthrough, { ok: false, code: 'denied', message: 'No entry.' });
  const fallback = await runBounded(
    () => {
      throw new Error('boom');
    },
    options({ operationId: 'unknown-error' }),
    fakeHost(),
  );
  assert.deepEqual(fallback, {
    ok: false,
    code: 'unavailable',
    message: 'The platform operation is unavailable.',
  });
  const custom = await runBounded(
    () => {
      throw new Error('boom');
    },
    options({ operationId: 'custom-fallback' }),
    fakeHost(),
    { code: 'conflict', message: 'Custom busy.' },
  );
  assert.deepEqual(custom, { ok: false, code: 'conflict', message: 'Custom busy.' });
});

test('the injected host arms the deadline and releases it on settle', async () => {
  const host = fakeHost();
  const result = await runBounded(
    () => 'fast',
    options({ operationId: 'timer-release', timeoutMs: 25 }),
    host,
  );
  assert.deepEqual(result, { ok: true, value: 'fast' });
  assert.equal(host.timers.size, 1);
  const [timer] = host.timers.values();
  assert.equal(timer.delay, 25);
  assert.equal(timer.cleared, true);
  assert.equal(timer.fired, false);
});
