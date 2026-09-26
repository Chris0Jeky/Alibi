'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'observatory-loader.js'), 'utf8');
const PREF_KEY = 'pulseboard:statistics:v1:alibi';

function run({
  hash = '#/home',
  readyState = 'complete',
  standalone = false,
  url = 'assets/observatory.test.js',
  seed,
  notice = null,
  storage = 'map',
} = {}) {
  const listeners = new Map();
  const scripts = [];
  const documentListeners = [];
  const observed = [];
  const mobCallbacks = [];
  let disconnected = 0;
  const box = { notice };
  const store = new Map();
  if (seed !== undefined) store.set(PREF_KEY, seed);
  const localStorage =
    storage === 'map'
      ? {
          getItem: (key) => (store.has(key) ? store.get(key) : null),
          setItem: (key, value) => store.set(key, String(value)),
          removeItem: (key) => store.delete(key),
        }
      : storage === 'throws'
        ? {
            getItem: () => {
              throw new Error('storage blocked');
            },
            setItem: () => {
              throw new Error('storage blocked');
            },
            removeItem: () => {
              throw new Error('storage blocked');
            },
          }
        : undefined;
  const context = {
    ALIBI_CONFIG: { standalone, version: '0.11.3' },
    ALIBI_OBSERVATORY_URL: url,
    location: { hash },
    localStorage,
    MutationObserver: function (callback) {
      mobCallbacks.push(callback);
      this.observe = (target, options) => observed.push([target, options]);
      this.disconnect = () => {
        disconnected += 1;
      };
    },
    document: {
      readyState,
      body: {},
      createElement(tag) {
        return { tag };
      },
      getElementById(id) {
        return id === 'pulseboard-usage-sharing' ? box.notice : null;
      },
      head: {
        append(node) {
          scripts.push(node);
        },
      },
      addEventListener(type) {
        documentListeners.push(type);
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
    store,
    observed,
    mobCallbacks,
    documentListeners,
    setNotice(value) {
      box.notice = value;
    },
    disconnected() {
      return disconnected;
    },
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

test('standalone and unconfigured builds stay completely inert', () => {
  for (const options of [{ standalone: true }, { url: '' }]) {
    const harness = run(options);
    assert.equal(harness.scripts.length, 0);
    assert.equal(harness.listenerCount('hashchange'), 0);
    assert.equal(harness.context.ALIBI_OBSERVATORY_CONTEXT, undefined);
    assert.equal(harness.context.AlibiJourney, undefined);
    assert.deepEqual(harness.documentListeners, []);
  }
});

test('the loader records no preference; the adapter default applies', () => {
  const harness = run();
  assert.equal(harness.store.has(PREF_KEY), false);
  for (const seed of ['{"allow":true}', '{"allow":false}', '{broken']) {
    const seeded = run({ seed });
    assert.equal(seeded.store.get(PREF_KEY), seed);
  }
});

test('the control is shown only on Settings and Privacy, never as a popup elsewhere', () => {
  const cases = [
    ['#/settings', true],
    ['#/settings?from=privacy', true],
    ['#/privacy', true],
    ['#/privacy/', true],
    ['#/home', false],
    ['#/play/expert-sudoku-01@2', false],
    ['#/quiet/castle/room/library', false],
    ['#/library/sudoku', false],
    ['', false],
  ];
  for (const [hash, show] of cases) {
    const notice = { hidden: false, open: true };
    run({ hash, notice });
    assert.equal(notice.hidden, !show, `${hash || '(empty hash)'} visibility`);
    assert.equal(notice.open, true, `${hash || '(empty hash)'} keeps its disclosure`);
  }
});

test('route changes re-sync visibility and still report a fresh page view', () => {
  const notice = { hidden: true, open: true };
  const harness = run({ hash: '#/home', notice });
  assert.equal(notice.hidden, true);
  const events = [];
  harness.context.PulseboardUsage = {
    track(event) {
      events.push(event);
    },
  };
  harness.context.location.hash = '#/settings';
  harness.emit('hashchange');
  assert.equal(notice.hidden, false);
  assert.equal(notice.open, true);
  assert.deepEqual(events, ['page.view']);
});

test('a late mount is observed once, synced, then released', () => {
  const harness = run({ hash: '#/home' });
  assert.equal(harness.observed.length, 1);
  assert.equal(harness.disconnected(), 0);
  const notice = { hidden: false, open: true };
  harness.setNotice(notice);
  harness.mobCallbacks[0]();
  assert.equal(notice.hidden, true);
  assert.equal(harness.disconnected(), 1);
});

test('unavailable or throwing storage keeps the loader safe', () => {
  for (const storage of [null, 'throws']) {
    const harness = run({ storage });
    assert.equal(harness.scripts.length, 1);
    assert.equal(harness.store.size, 0);
    harness.emit('hashchange');
  }
});
