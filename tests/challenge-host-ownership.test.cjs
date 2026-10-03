'use strict';
// Exercise the actual host functions with controlled asynchronous storage/validation ports.
// This is not a full DOM, browser, IndexedDB or physical-device acceptance test.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../src/quiet-wing/app.js'), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const tick = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function harness() {
  let path = '';
  const nodes = new Map(),
    reads = [],
    restores = [],
    recoveries = [],
    messages = [],
    exports = [],
    mounts = [],
    validations = [];
  function node(key) {
    if (!nodes.has(key)) nodes.set(key, { value: '', files: [], disabled: false, click() {} });
    return nodes.get(key);
  }
  const main = {};
  Object.defineProperty(main, 'innerHTML', {
    set() {
      nodes.clear();
      nodes.set('#main', main);
    },
  });
  nodes.set('#main', main);
  const store = {
    open: async () => {},
    read: (id) => {
      const job = { id, ...deferred() };
      reads.push(job);
      return job.promise;
    },
    restore: (run) => {
      const job = { run, ...deferred() };
      restores.push(job);
      return job.promise;
    },
    recovery: (id) => {
      const job = { id, ...deferred() };
      recoveries.push(job);
      return job.promise;
    },
    write: async () => {},
  };
  const registry = {
    get: (id) => ({ id, title: id, family: 'hanoi' }),
    entries: () => [],
  };
  const A = { route: 'challenges', challengeRegistry: registry, challengeStore: store };
  const G = {
    ALIBI_CHALLENGE_DATA: {},
    AlibiChallenges: {},
    AlibiChallengeStore: {},
    AlibiChallengeLauncher: {
      names: { hanoi: 'Hanoi' },
      mount(host, registry, id, saved, save, navigate) {
        const handle = {
          host,
          id,
          saved,
          disposed: false,
          navigate,
          save: () => saved || { challengeId: id, log: [] },
          dispose() {
            this.disposed = true;
          },
        };
        mounts.push(handle);
        return handle;
      },
    },
    AlibiValidateImport: (request) => {
      const job = { request, ...deferred() };
      validations.push(job);
      return job.promise;
    },
  };
  const context = vm.createContext({
    A,
    G,
    E: {},
    challengeRegistry: registry,
    challengeStore: store,
    disposed: false,
    challengeView: null,
    clearInterval() {},
    clearTimeout() {},
    routePath: () => path,
    location: { hash: '' },
    URLSearchParams,
    $: (key) => node(key),
    $$: () => [],
    header: () => '',
    esc: String,
    toast: (message) => messages.push(message),
    exportChallenge: (run) => exports.push(run),
    navigate: (next) => {
      path = next;
    },
  });
  vm.runInContext(
    section('function disposeActivity()', 'function go()') +
      '\n' +
      section('function challengesPage()', 'function exportChallenge(') +
      '\nthis.api = { disposeActivity, challengesPage };',
    context,
  );
  function open(id) {
    context.api.disposeActivity();
    path = 'challenges/' + id;
    A.route = 'challenges';
    context.api.challengesPage();
    return {
      export: node('#challenge-export').onclick,
      input: node('#challenge-file'),
      recovery: node('#challenge-recovery').onclick,
    };
  }
  function leave(dispose = false) {
    path = 'realm';
    A.route = 'realm';
    context.disposed = dispose;
    context.api.disposeActivity();
    nodes.clear();
    nodes.set('#main', main);
  }
  function importFile(view, contents = Promise.resolve('{}')) {
    view.input.files = [{ size: 2, text: () => contents }];
    view.input.value = 'selected.json';
    return view.input.onchange();
  }
  return {
    open,
    leave,
    importFile,
    A,
    reads,
    restores,
    recoveries,
    messages,
    exports,
    mounts,
    validations,
  };
}

test('opening B clears and disposes A before export can observe it', async () => {
  const h = harness(),
    a = h.open('A');
  await tick();
  h.reads[0].resolve({ challengeId: 'A', log: ['old'] });
  await tick();
  const old = h.A.challengeHandle;
  const b = h.open('B');
  b.export();
  assert.equal(old.disposed, true);
  assert.equal(h.A.challengeHandle, null);
  assert.ok(
    h.exports.every((run) => run == null),
    'B cannot download A under its export control',
  );
  const count = h.exports.length;
  a.export();
  assert.equal(h.exports.length, count, 'detached A controls cannot export after navigation');
});

test('a delayed A read cannot mount into a later A after A/B/A navigation', async () => {
  const h = harness();
  h.open('A');
  await tick();
  h.open('B');
  await tick();
  h.open('A');
  await tick();
  h.reads[2].resolve({ challengeId: 'A', log: ['new'] });
  await tick();
  const current = h.A.challengeHandle;
  h.reads[0].resolve({ challengeId: 'A', log: ['old'] });
  h.reads[1].resolve({ challengeId: 'B', log: [] });
  await tick();
  assert.equal(h.A.challengeHandle, current);
  assert.equal(h.mounts.length, 1);
  assert.deepEqual(current.saved.log, ['new']);
});

test('old read errors do not put a toast on a newer route', async () => {
  const h = harness();
  h.open('A');
  await tick();
  h.open('B');
  await tick();
  h.reads[0].reject(Error('old A error'));
  await tick();
  assert.deepEqual(h.messages, []);
});

test('leaving during file reading never submits validation or writes a restore', async () => {
  const h = harness(),
    view = h.open('A'),
    text = deferred();
  const pending = h.importFile(view, text.promise);
  h.leave();
  text.resolve('{}');
  await tick();
  for (const job of h.validations) job.resolve({ challengeId: 'A', log: [] });
  await tick();
  for (const job of h.restores) job.resolve();
  await pending;
  assert.equal(h.validations.length, 0);
  assert.equal(h.restores.length, 0);
  assert.equal(view.input.value, '');
});

test('leaving during validation never writes a restore or clears the new file input', async () => {
  const h = harness(),
    a = h.open('A');
  const pending = h.importFile(a);
  await tick();
  const b = h.open('B');
  b.input.value = 'B.json';
  h.validations[0].resolve({ challengeId: 'A', log: [] });
  await tick();
  for (const job of h.restores) job.resolve();
  await pending;
  assert.equal(h.restores.length, 0);
  assert.equal(b.input.value, 'B.json');
  assert.equal(a.input.value, '');
});

test('an admitted A restore may finish but cannot dispose or remount B', async () => {
  const h = harness(),
    a = h.open('A');
  const pending = h.importFile(a);
  await tick();
  h.validations[0].resolve({ challengeId: 'A', log: ['restored'] });
  await tick();
  assert.equal(h.restores.length, 1);
  h.open('B');
  await tick();
  h.reads[1].resolve({ challengeId: 'B', log: ['B'] });
  await tick();
  const current = h.A.challengeHandle;
  h.restores[0].resolve();
  await pending;
  assert.equal(h.A.challengeHandle, current);
  assert.equal(current.disposed, false);
  assert.equal(h.mounts.length, 1);
  assert.deepEqual(h.messages, []);
});

test('an old same-ID restore also cannot replace the fresh A route', async () => {
  const h = harness(),
    a = h.open('A');
  const pending = h.importFile(a);
  await tick();
  h.validations[0].resolve({ challengeId: 'A', log: ['restore'] });
  await tick();
  h.open('B');
  await tick();
  h.open('A');
  await tick();
  h.reads[2].resolve({ challengeId: 'A', log: ['fresh route'] });
  await tick();
  const current = h.A.challengeHandle;
  h.restores[0].resolve();
  await pending;
  assert.equal(h.A.challengeHandle, current);
  assert.equal(current.disposed, false);
  assert.equal(h.mounts.length, 1);
});

test('a current restore wins over the initial read that resolves afterwards', async () => {
  const h = harness(),
    a = h.open('A');
  const pending = h.importFile(a);
  await tick();
  h.validations[0].resolve({ challengeId: 'A', log: ['restored'] });
  await tick();
  h.restores[0].resolve();
  await pending;
  const current = h.A.challengeHandle;
  h.reads[0].resolve({ challengeId: 'A', log: ['pre-restore'] });
  await tick();
  assert.equal(h.A.challengeHandle, current);
  assert.deepEqual(current.saved.log, ['restored']);
  assert.equal(h.mounts.length, 1);
});

test('stale recovery exports and errors do not escape to a later route', async () => {
  for (const fail of [false, true]) {
    const h = harness(),
      a = h.open('A');
    const pending = a.recovery();
    h.open('B');
    if (fail) h.recoveries[0].reject(Error('stale recovery'));
    else h.recoveries[0].resolve({ challengeId: 'A', log: [] });
    await pending;
    assert.equal(h.exports.length, 0);
    assert.deepEqual(h.messages, []);
  }
});

test('disposing the whole activity disposes the active challenge handle', async () => {
  const h = harness();
  h.open('A');
  await tick();
  h.reads[0].resolve({ challengeId: 'A', log: [] });
  await tick();
  const current = h.A.challengeHandle;
  h.leave(true);
  assert.equal(current.disposed, true);
  assert.equal(h.A.challengeHandle, null);
});

test('current restore still writes, renders and reports success, then clears its own input', async () => {
  const h = harness(),
    view = h.open('A');
  const pending = h.importFile(view);
  await tick();
  h.validations[0].resolve({ challengeId: 'A', log: ['kept'] });
  await tick();
  h.restores[0].resolve();
  await pending;
  assert.equal(h.A.challengeHandle.id, 'A');
  assert.deepEqual(h.A.challengeHandle.saved.log, ['kept']);
  assert.match(h.messages.at(-1), /save restored/);
  assert.equal(view.input.value, '');
});

test('current validation errors remain visible and do not write or mount', async () => {
  const h = harness(),
    view = h.open('A');
  const pending = h.importFile(view);
  await tick();
  h.validations[0].reject(Error('invalid challenge'));
  await pending;
  assert.deepEqual(h.messages, ['invalid challenge']);
  assert.equal(h.restores.length, 0);
  assert.equal(h.mounts.length, 0);
  assert.equal(view.input.value, '');
});
