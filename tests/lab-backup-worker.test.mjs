import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { mount as eclipsePlayer } from '../src/eclipse-lab/player.mjs';
import { mount as timelinePlayer } from '../src/timeline-lab/player.mjs';
import * as eclipseStore from '../src/eclipse-lab/storage.mjs';
import * as timelineStore from '../src/timeline-lab/storage.mjs';
import { PUZZLES as ECLIPSE } from '../src/eclipse-lab/puzzles.mjs';

for (const [kind, mount, lab] of [
  ['eclipse', eclipsePlayer, eclipseStore],
  ['timeline', timelinePlayer, timelineStore],
]) {
  test(`${kind} delivered worker validates the restore revision and preserves recovery bytes`, () => {
    const assets = 'dist/assets';
    const bundle = fs.readdirSync(assets).find((file) => file.startsWith(`${kind}-lab.`));
    assert.ok(bundle);
    const replies = [];
    const worker = vm.createContext({
      WorkerGlobalScope: class {
        static [Symbol.hasInstance]() {
          return true;
        }
      },
      TextEncoder,
      postMessage: (reply) => replies.push(structuredClone(reply)),
    });
    vm.runInContext(fs.readFileSync(`${assets}/${bundle}`, 'utf8'), worker, { timeout: 1000 });
    function request(text, revision = 7) {
      worker.onmessage({ data: { type: 'review-backup', text, revision } });
      return replies.at(-1);
    }
    const raw = JSON.stringify({
      kind: `alibi-${kind}-backup`,
      schema: 1,
      save: { kind: `alibi-${kind}-save`, schema: 1, revision: 1, runs: {} },
      recovery: { raw: '{unknown save bytes}' },
    });
    assert.deepEqual(request(raw), {
      ok: true,
      value: {
        kind: `alibi-${kind}-save`,
        schema: 1,
        revision: 7,
        runs: {},
        retainedRaw: '{unknown save bytes}',
      },
    });
    assert.equal(request('{bad').ok, false);
    assert.equal(request(raw, Number.MAX_SAFE_INTEGER).ok, false);
    assert.match(request('é'.repeat(3 * 1024 * 1024 + 1)).error, /6 MB/);
    const next = request(raw).value;
    const prior = { ...next, revision: 6, retainedRaw: 'old bytes' };
    const active = JSON.stringify({ ...prior, recoverySnapshot: { ...prior, revision: 5 } });
    worker.onmessage({
      data: { type: 'prepare-restore', next, active, legacy: JSON.stringify(prior) },
    });
    const prepared = replies.at(-1);
    assert.deepEqual(prepared.value.previous, prior);
    assert.deepEqual(JSON.parse(prepared.value.encoded), { ...next, recoverySnapshot: prior });
    worker.onmessage({
      data: { type: 'prepare-restore', next, active, legacy: '{unrecognized recovery}' },
    });
    assert.match(replies.at(-1).error, /unknown recovery/i);
  });

  test(`${kind} prepares recovery before locking and refuses stale or timed-out preparation`, async () => {
    const { KEY, RECOVERY_KEY, createStore, parseBackup, prepareRestore } = lab;
    for (const changed of [KEY, RECOVERY_KEY, null]) {
      const shelf = JSON.stringify({
        kind: `alibi-${kind}-save`,
        schema: 1,
        revision: 1,
        runs: {},
      });
      const records = new Map([
        [KEY, shelf],
        [RECOVERY_KEY, shelf],
      ]);
      let locked = 0,
        wrote = 0,
        start,
        finish,
        fail;
      const started = new Promise((resolve) => {
        start = resolve;
      });
      const { promise: waiting, resolve: enqueued } = Promise.withResolvers();
      const { promise: gate, resolve: unlock } = Promise.withResolvers();
      const store = createStore({
        storage: {
          getItem: (key) => records.get(key) ?? null,
          setItem: (key, raw) => {
            wrote++;
            records.set(key, raw);
          },
        },
        locks: {
          request: async (_key, _options, run) => {
            locked++;
            enqueued();
            await gate;
            return run();
          },
        },
        validateBackup: parseBackup,
        prepareRestore: (next, active, legacy) => {
          assert.equal(active, shelf);
          assert.equal(legacy, shelf);
          start();
          return new Promise((resolve, reject) => {
            finish = () => resolve(prepareRestore(next, active, legacy));
            fail = reject;
          });
        },
      });
      const preview = await store.reviewBackup(store.exportData());
      const failure = assert.rejects(preview.restore(), changed ? /changed/i : /safety limit/i);
      await started;
      assert.equal(locked, 0, 'worker preparation does not hold the lock');
      if (changed) {
        finish();
        await waiting;
        records.set(changed, 'Newer bytes from another tab');
        unlock();
      } else {
        fail(Error('Validation reached its 25-second safety limit.'));
      }
      await failure;
      assert.equal(wrote, 0);
      assert.equal(records.get(KEY), changed === KEY ? 'Newer bytes from another tab' : shelf);
      assert.equal(
        records.get(RECOVERY_KEY),
        changed === RECOVERY_KEY ? 'Newer bytes from another tab' : shelf,
      );
    }
  });

  test(`${kind} ignores older validation results and cannot restore a cancelled or timed-out review`, async (t) => {
    const originalLocation = globalThis.location;
    const originalAlert = globalThis.alert;
    const alerts = [];
    globalThis.location = { hash: `#/quiet/${kind}` };
    globalThis.alert = (message) => alerts.push(message);
    const listeners = new Map();
    const root = {
      activeElement: null,
      host: { dataset: {} },
      querySelector: () => null,
      addEventListener: (name, handler) => listeners.set(name, handler),
      removeEventListener: (name) => listeners.delete(name),
    };
    const reviews = new Map();
    let restores = 0;
    const store = {
      status: () => ({ mode: 'saved' }),
      snapshot: () => ({ runs: {} }),
      flush: async () => {},
      reviewBackup: (raw) =>
        new Promise((resolve, reject) => reviews.set(raw, { resolve, reject })),
    };
    const panel = mount({ root, css: '', store });
    t.after(() => {
      panel.dispose();
      if (originalLocation === undefined) delete globalThis.location;
      else globalThis.location = originalLocation;
      if (originalAlert === undefined) delete globalThis.alert;
      else globalThis.alert = originalAlert;
    });
    await panel.route();
    const choose = (raw) =>
      listeners.get('change')({
        target: {
          matches: (selector) => selector === '[data-file]',
          files: [{ size: raw.length, text: async () => raw }],
        },
      });
    const click = (action) =>
      listeners.get('click')({
        target: {
          closest: (selector) => (selector === '[data-action]' ? { dataset: { action } } : null),
        },
      });
    const accepted = (count) => ({
      count,
      restore: async () => {
        restores++;
      },
    });
    const old = choose('older');
    await Promise.resolve();
    const newer = choose('newer');
    await Promise.resolve();
    reviews.get('newer').resolve(accepted(2));
    await newer;
    reviews.get('older').resolve(accepted(1));
    await old;
    assert.match(root.innerHTML, /Backup contains 2 /);
    assert.equal(restores, 0);
    await click('cancel-restore');
    await click('restore');
    assert.equal(restores, 0);
    assert.doesNotMatch(root.innerHTML, /Confirm restore/);

    const expired = choose('timeout');
    await Promise.resolve();
    reviews.get('timeout').reject(Error('Validation reached its 25-second safety limit.'));
    await expired;
    assert.deepEqual(alerts, ['Validation reached its 25-second safety limit.']);
    await click('restore');
    assert.equal(restores, 0);
    assert.doesNotMatch(root.innerHTML, /Confirm restore/);

    const acceptedReview = choose('valid');
    await Promise.resolve();
    const { promise: write, reject: rejectWrite } = Promise.withResolvers();
    reviews.get('valid').resolve({
      count: 3,
      restore: () => {
        restores++;
        return write;
      },
    });
    await acceptedReview;
    const confirming = click('restore');
    assert.match(root.innerHTML, /Restoring backup/);
    assert.doesNotMatch(root.innerHTML, /Cancel|Confirm restore/);
    await click('cancel-restore');
    assert.match(root.innerHTML, /Restoring backup/);
    rejectWrite(Error('The write failed.'));
    await confirming;
    assert.equal(restores, 1);
    assert.match(root.innerHTML, /Confirm restore/);
    await click('cancel-restore');
    assert.doesNotMatch(root.innerHTML, /Confirm restore/);
  });
}

test('an Eclipse remount waits for the shared store even when flush rejects', async (t) => {
  const puzzle = ECLIPSE[0];
  const previous = globalThis.location;
  globalThis.location = { hash: '#/quiet/eclipse/' + puzzle.id };
  const imported = { ...eclipseStore.freshRun(puzzle), feedback: 'Imported after waiting' };
  let release;
  const queued = new Promise((resolve) => {
    release = resolve;
  });
  let read = 0;
  const root = {
    innerHTML: '',
    activeElement: null,
    host: { dataset: {} },
    querySelector: () => null,
    addEventListener() {},
    removeEventListener() {},
  };
  const panel = eclipsePlayer({
    root,
    css: '',
    store: {
      async flush() {
        await queued;
        throw Error('Export the unsaved session before updating.');
      },
      getRun() {
        read++;
        return imported;
      },
      status: () => ({ mode: 'saved' }),
    },
  });
  t.after(() => {
    release();
    panel.dispose();
    if (previous === undefined) delete globalThis.location;
    else globalThis.location = previous;
  });
  const route = panel.route();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(read, 0);
  assert.equal(root.innerHTML, '');
  release();
  await route;
  assert.equal(read, 1);
  assert.match(root.innerHTML, /Imported after waiting/);
});
