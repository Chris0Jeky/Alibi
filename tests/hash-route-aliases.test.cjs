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
  const location = {
    hash,
    reload() {},
  };
  const history = {
    state: { retained: true },
    replaceState(state, title, url) {
      replacements.push({ state, title, url });
      location.hash = url;
    },
  };
  const context = {
    URL,
    clearTimeout() {},
    document: {
      createElement() {
        throw new Error('The recovery timer must not execute during alias tests.');
      },
      getElementById() {
        return null;
      },
    },
    history,
    location,
    navigator: {},
    setTimeout() {
      return 1;
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
  };
  context.globalThis = context;

  vm.runInNewContext(source, context, { filename: 'src/boot.js' });
  return { history, listeners, location, replacements };
}

test('normalizes visible destination aliases before the application shell starts', () => {
  const cases = new Map([
    ['#/games', '#/salon'],
    ['#/space', '#/settings'],
    ['#/wing', '#/quiet'],
    ['#/castle', '#/quiet/castle/map'],
    ['#/wrenmere', '#/quiet/castle/map'],
  ]);

  for (const [input, expected] of cases) {
    const result = execute(input);
    assert.equal(result.location.hash, expected, input);
    assert.deepEqual(result.replacements, [
      { state: result.history.state, title: '', url: expected },
    ]);
  }
});

test('preserves nested game and castle destinations plus query strings', () => {
  const cases = new Map([
    ['#/games/blockcabinet?mode=zen', '#/salon/blockcabinet?mode=zen'],
    ['#/wing/castle/directory', '#/quiet/castle/directory'],
    ['#/castle/room/library?from=share', '#/quiet/castle/room/library?from=share'],
    ['#/wrenmere/journal', '#/quiet/castle/journal'],
  ]);

  for (const [input, expected] of cases)
    assert.equal(execute(input).location.hash, expected, input);
});

test('leaves canonical and unknown hashes untouched', () => {
  for (const hash of ['#/salon', '#/quiet/castle/map', '#/settings', '#/not-a-room']) {
    const result = execute(hash);
    assert.equal(result.location.hash, hash);
    assert.deepEqual(result.replacements, []);
  }
});

test('normalizes aliases entered after startup without reloading the page', () => {
  const result = execute('#/home');
  const listener = result.listeners.get('hashchange');
  assert.equal(typeof listener, 'function');

  result.location.hash = '#/games/mahjong';
  listener();

  assert.equal(result.location.hash, '#/salon/mahjong');
  assert.equal(result.replacements.at(-1).url, '#/salon/mahjong');
});
