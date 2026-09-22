'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'boot.js'), 'utf8');

function execute(hash) {
  const listeners = new Map();
  const replacements = [];
  const timers = [];
  const location = { hash, pathname: '/', search: '' };
  const state = { retained: true };
  const context = {
    document: { getElementById: () => null },
    location,
    history: {
      state,
      replaceState(retained, title, target) {
        assert.equal(retained, state);
        replacements.push(target);
        location.hash = target;
      },
    },
    addEventListener: (name, listener) => listeners.set(name, listener),
    setTimeout: (callback, delay) => timers.push({ callback, delay }),
    clearTimeout() {},
  };
  vm.runInNewContext(source, context, { filename: 'src/boot.js' });
  return { context, listeners, location, replacements, timers };
}

for (const hash of ['#/constructor', '#/__proto__', '#/CONSTRUCTOR/room?from=bookmark']) {
  test(`inherited names stay unknown routes without breaking boot: ${hash}`, () => {
    const result = execute(hash);
    assert.equal(result.location.hash, hash);
    assert.equal(result.replacements.length, 0);
    assert.equal(result.timers.length, 1, 'the recovery watchdog still installs');
    assert.equal(typeof result.context.AlibiBootReady, 'function');
  });
}

test('inherited names also remain harmless during hash navigation', () => {
  const result = execute('#/home');
  for (const hash of ['#/constructor', '#/__proto__']) {
    result.location.hash = hash;
    assert.doesNotThrow(() => result.listeners.get('hashchange')());
    assert.equal(result.location.hash, hash);
  }
  assert.equal(result.replacements.length, 0);
});

test('declared aliases still preserve their path, query and history state', () => {
  for (const [hash, expected] of [
    ['#/games/archive?seed=1?x=2', '#/salon/archive?seed=1?x=2'],
    ['#/CASTLE', '#/quiet/castle/map'],
    ['#/wrenmere/room/library', '#/quiet/castle/room/library'],
    ['#/space', '#/settings'],
    ['#/wing/garden', '#/quiet/garden'],
  ]) {
    assert.equal(execute(hash).location.hash, expected);
  }
});
