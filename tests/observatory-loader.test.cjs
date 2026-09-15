'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'observatory-loader.js'), 'utf8');

function run({
  hash = '#/home',
  readyState = 'complete',
  standalone = false,
  target = 'web',
  url = 'assets/observatory.test.js',
} = {}) {
  const listeners = new Map();
  const scripts = [];
  const context = {
    ALIBI_BUILD_TARGET: target,
    ALIBI_CONFIG: { standalone, version: '0.11.3' },
    ALIBI_OBSERVATORY_URL: url,
    location: { hash },
    document: {
      readyState,
      createElement(tag) {
        return { tag };
      },
      head: {
        append(node) {
          scripts.push(node);
        },
      },
    },
    addEventListener(type, listener) {
      const bucket = listeners.get(type) || [];
      bucket.push(listener);
      listeners.set(type, bucket);
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'observatory-loader.js' });
  return {
    context,
    scripts,
    emit(type) {
      for (const listener of listeners.get(type) || []) listener({ type });
    },
    listenerCount(type) {
      return (listeners.get(type) || []).length;
    },
  };
}

test('route context maps Alibi hashes to the closed Observatory vocabulary', () => {
  const harness = run();
  const cases = [
    ['', 'home'],
    ['#/home', 'home'],
    ['#/play/expert-sudoku-01@2', 'puzzle'],
    ['#/story/chapter@1?book=bellweather', 'puzzle'],
    ['#/quiet/castle/room/library', 'castle'],
    ['#/quiet/realm', 'quiet-wing'],
    ['#/library/sudoku', 'other'],
  ];
  for (const [hash, expected] of cases) {
    harness.context.location.hash = hash;
    const value = harness.context.ALIBI_OBSERVATORY_CONTEXT();
    assert.equal(value.route, expected, hash || '(empty hash)');
    assert.equal(value.release, '0.11.3');
  }
});

test('the deferred asset is injected once and route changes report a fresh page view', () => {
  const harness = run();
  assert.equal(harness.scripts.length, 1);
  assert.equal(harness.scripts[0].tag, 'script');
  assert.equal(harness.scripts[0].src, 'assets/observatory.test.js');
  assert.equal(harness.listenerCount('hashchange'), 1);
  const events = [];
  harness.context.PulseboardUsage = {
    track(event) {
      events.push([event, harness.context.ALIBI_OBSERVATORY_CONTEXT().route]);
    },
  };
  harness.context.location.hash = '#/quiet/castle';
  harness.emit('hashchange');
  assert.deepEqual(events, [['page.view', 'castle']]);
});

test('loading documents defer injection until load without duplicating route listeners', () => {
  const harness = run({ readyState: 'loading' });
  assert.equal(harness.scripts.length, 0);
  assert.equal(harness.listenerCount('load'), 1);
  assert.equal(harness.listenerCount('hashchange'), 1);
  harness.emit('load');
  assert.equal(harness.scripts.length, 1);
});

test('standalone, Android and unconfigured builds stay completely inert', () => {
  for (const options of [{ standalone: true }, { target: 'android' }, { url: '' }]) {
    const harness = run(options);
    assert.equal(harness.scripts.length, 0);
    assert.equal(harness.listenerCount('hashchange'), 0);
    assert.equal(harness.context.ALIBI_OBSERVATORY_CONTEXT, undefined);
  }
});
