'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const quiet = require('../src/quiet-wing/engine.js');
const club = require('../src/club-engines.js');
const catalogue = require('../tools/challenge-catalogue.cjs');
const registry = require('../src/challenges.js').create(catalogue.runtime(catalogue.load()), {
  quiet,
  club,
});
const launcher = require('../src/challenge-launcher.js');
function open(id, saved) {
  const saves = [];
  const host = {
    innerHTML: '',
    replaceChildren() {
      this.innerHTML = '';
    },
    getRootNode: () => ({ activeElement: null }),
    contains: () => false,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  const handle = launcher.mount(host, registry, id, saved, (run) => saves.push(run));
  const press = (dataset) => host.onclick({ target: { closest: () => ({ dataset }) } });
  return { host, handle, saves, press };
}

test('completed classic board actions preserve the winning route and cancel stale reset consent', () => {
  const id = 'curated-classic-hanoi-01',
    run = registry.begin(id);
  run.log = structuredClone(registry.get(id).solutionActions);
  const view = open(id, run);
  assert.equal(registry.replay(run).complete, true);
  view.press({ challenge: 'reset' });
  assert.match(view.host.innerHTML, /Clear your finished route/);
  view.press({ action: 'peg', value: '2' });
  view.press({ action: 'peg', value: '0' });
  assert.deepEqual(view.handle.save(), run, 'a completed route is not accidentally uncompleted');
  assert.equal(view.saves.length, 0);
  assert.doesNotMatch(view.host.innerHTML, /Clear your finished route/);
  view.press({ challenge: 'reset' });
  assert.deepEqual(view.handle.save(), run, 'fresh reset consent is required');
  view.press({ challenge: 'keep' });
  view.press({ challenge: 'undo' });
  assert.equal(
    view.handle.save().log.length,
    run.log.length - 1,
    'explicit undo is still available',
  );
});

test('settling an old Ink-to-move save persists once without mutating its input', () => {
  const c = registry.entries().find((p) => p.family === 'reversi');
  const saved = registry.begin(c.id);
  saved.log = c.principalVariation.slice(0, 1);
  const original = structuredClone(saved);
  const view = open(c.id, saved);
  assert.equal(view.saves.length, 1, 'the automatic reply is not left only in memory');
  assert.deepEqual(view.saves[0], view.handle.save());
  assert.deepEqual(saved, original);
  assert.ok(view.saves[0].log.length > saved.log.length);
  const reopened = open(c.id, view.saves[0]);
  assert.equal(reopened.saves.length, 0, 'an already settled save is not rewritten');
});

test('fresh and rejected challenge opens do not manufacture save writes', () => {
  const id = 'curated-classic-hanoi-01';
  assert.equal(open(id).saves.length, 0);
  assert.throws(() => open(id, registry.begin('curated-classic-hanoi-02')), /belongs/);
});

test('concurrent list and board opens share one IndexedDB connection attempt', async () => {
  let attempts = 0;
  const requests = [];
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    indexedDB: {
      open() {
        attempts++;
        const request = {};
        requests.push(request);
        return request;
      },
    },
    module: { exports: {} },
  });
  vm.runInContext(
    fs.readFileSync(require.resolve('../src/challenge-storage.js'), 'utf8'),
    context,
  );
  const store = context.module.exports.create({ validateRun: (r) => structuredClone(r) });
  const opening = [store.open(), store.open(), store.open()];
  for (const request of requests) {
    request.result = { close() {} };
    request.onsuccess();
  }
  const results = await Promise.all(opening);
  assert.equal(attempts, 1, 'only one request owns the live database handle');
  assert.ok(results.every((r) => r.mode === 'indexeddb'));
  assert.equal((await store.open()).mode, 'indexeddb');
  assert.equal(attempts, 1);
});
