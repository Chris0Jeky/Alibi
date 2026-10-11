'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
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
  return { host, handle, saves };
}

test('corrupt saved run mounts a fresh run with a recoverable message', () => {
  const id = 'curated-borough-01';
  const corrupt = registry.begin(id);
  corrupt.log = [{ slot: 99, cell: 99 }];
  assert.throws(() => registry.validateRun(corrupt), 'repro: corrupt log fails replay');
  const before = structuredClone(corrupt);

  let view;
  assert.doesNotThrow(() => {
    view = open(id, corrupt);
  }, 'corrupt saved must not throw');
  assert.match(view.host.innerHTML, /challenge-launcher/, 'host renders fresh run');
  assert.match(view.host.innerHTML, /started again/i, 'recoverable message is shown');
  assert.equal(view.handle.save().challengeId, id);
  assert.deepEqual(view.handle.save().log, [], 'fresh run starts empty');
  assert.deepEqual(view.handle.rejected, before, 'bad payload preserved for export');
  assert.deepEqual(corrupt, before, 'input payload is not mutated');
});

test('valid saved run still mounts without recovery', () => {
  const id = 'curated-borough-01';
  const saved = registry.begin(id);
  const view = open(id, saved);
  assert.match(view.host.innerHTML, /challenge-launcher/);
  assert.doesNotMatch(view.host.innerHTML, /started again/i);
  assert.equal(view.handle.save().challengeId, id);
  assert.equal(view.handle.rejected, null);
});

test('valid save from another challenge is rejected without mutation', () => {
  const saved = registry.begin('curated-borough-01');
  const before = structuredClone(saved);
  assert.doesNotThrow(() => registry.validateRun(saved));
  assert.throws(() => open('curated-borough-02', saved), /another challenge/);
  assert.deepEqual(saved, before);
});
