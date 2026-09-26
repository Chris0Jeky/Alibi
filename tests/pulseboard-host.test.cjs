'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const hostSource = fs.readFileSync(path.join(root, 'src/pulseboard-host.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const sdkSource = fs.readFileSync(path.join(root, 'observatory/pulseboard.js'), 'utf8');
const ORIGIN = 'https://alibi-after-hours-preview.commit-atlas.workers.dev';

function node(tag, doc) {
  const el = {
    tag,
    id: '',
    hidden: false,
    style: {},
    attributes: {},
    children: [],
    listeners: {},
    parentElement: null,
    className: '',
    textContent: '',
    append(...nodes) {
      for (const n of nodes) {
        if (n.parentElement)
          n.parentElement.children.splice(n.parentElement.children.indexOf(n), 1);
        n.parentElement = el;
        el.children.push(n);
      }
    },
    prepend(...nodes) {
      for (const n of [...nodes].reverse()) {
        if (n.parentElement)
          n.parentElement.children.splice(n.parentElement.children.indexOf(n), 1);
        n.parentElement = el;
        el.children.unshift(n);
      }
    },
    remove() {
      if (el.parentElement)
        el.parentElement.children.splice(el.parentElement.children.indexOf(el), 1);
      el.parentElement = null;
    },
    setAttribute(name, value) {
      el.attributes[name] = String(value);
      if (name === 'hidden') el.hidden = true;
    },
    getAttribute: (name) => el.attributes[name] ?? null,
    addEventListener(type, fn) {
      (el.listeners[type] ||= []).push(fn);
    },
    removeEventListener() {},
    emit(type) {
      for (const fn of el.listeners[type] || []) fn({ type });
    },
    focus() {},
  };
  if (doc) doc.all.push(el);
  return el;
}

const walk = (el, out = []) => {
  out.push(el);
  for (const child of el.children) walk(child, out);
  return out;
};

// A small DOM with the web index's reserved notice space and the persistent button slot.
function storage(initial = {}, { throws = false } = {}) {
  const map = new Map(Object.entries(initial));
  const guard = () => {
    if (throws) throw new Error('SecurityError');
  };
  return {
    map,
    get length() {
      guard();
      return map.size;
    },
    key: (i) => (guard(), [...map.keys()][i] ?? null),
    getItem: (k) => (guard(), map.has(k) ? map.get(k) : null),
    setItem: (k, v) => (guard(), map.set(k, String(v))),
    removeItem: (k) => (guard(), map.delete(k)),
  };
}

function page({
  hash = '',
  readyState = 'complete',
  standalone = false,
  sdk = null,
  local = storage(),
} = {}) {
  const windowListeners = {};
  const docListeners = {};
  const document = { all: [] };
  const body = node('body', document);
  const bar = node('div', document);
  bar.attributes['data-pulseboard-bar'] = '';
  bar.style.minHeight = '2.5rem';
  const slot = node('div', document);
  slot.id = 'pulseboard-slot';
  slot.attributes['data-pulseboard-slot'] = '';
  slot.hidden = true;
  body.append(bar, slot);
  Object.assign(document, {
    body,
    readyState,
    referrer: '',
    visibilityState: 'visible',
    documentElement: { scrollHeight: 1000, clientHeight: 800, scrollTop: 0, dataset: {} },
    createElement: (tag) => node(tag, document),
    getElementById: (id) => walk(body).find((el) => el.id === id) ?? null,
    querySelector: (selector) =>
      selector === '[data-pulseboard-bar]'
        ? bar
        : selector === '[data-pulseboard-slot]'
          ? slot.parentElement
            ? slot
            : null
          : null,
    addEventListener(type, fn) {
      (docListeners[type] ||= []).push(fn);
    },
    removeEventListener() {},
  });
  const context = {
    document,
    location: { hash, origin: ORIGIN, protocol: 'https:', href: ORIGIN + '/', search: '' },
    ALIBI_CONFIG: { standalone, version: '0.14.1' },
    ALIBI_CATALOG: { puzzles: [{ id: 'expert-sudoku-01' }, { id: 'scene-01' }] },
    localStorage: local,
    addEventListener(type, fn) {
      (windowListeners[type] ||= []).push(fn);
    },
    removeEventListener() {},
  };
  if (sdk) context.Pulseboard = sdk;
  context.globalThis = context;
  vm.createContext(context);
  return {
    context,
    document,
    body,
    bar,
    slot,
    run: () => vm.runInContext(hostSource, context, { filename: 'pulseboard-host.js' }),
    hashchange(next) {
      context.location.hash = next;
      for (const fn of windowListeners.hashchange || []) fn({ type: 'hashchange' });
    },
    ready() {
      document.readyState = 'interactive';
      for (const fn of docListeners.DOMContentLoaded || []) fn({ type: 'DOMContentLoaded' });
    },
    listeners: () => Object.keys(windowListeners).length + Object.keys(docListeners).length,
  };
}

// A recording stand-in for window.Pulseboard with switchable consent.
function fakeSdk() {
  const calls = [];
  const state = { counts: true, diagnostics: true, journeys: true };
  return {
    calls,
    state,
    api: {
      version: '3.1.0',
      route: (name) => (calls.push(['route', name]), true),
      count: (event) => (calls.push(['count', event]), state.counts),
      track: (name, props) => (calls.push(['track', name, props]), state.journeys),
      consent: { get: () => ({ ...state, decided: true, region: 'other', blocked: false }) },
    },
  };
}

test('hash routes map to the registered Pulseboard routes', () => {
  const sdk = fakeSdk();
  const h = page({ sdk: sdk.api });
  h.run();
  const cases = [
    ['', 'home'],
    ['#/home', 'home'],
    ['#/play/expert-sudoku-01@2', 'puzzle'],
    ['#/story/chapter@1?book=bellweather', 'puzzle'],
    ['#/quiet/castle/room/library', 'castle'],
    ['#/quiet/realm', 'quiet-wing'],
    ['#/library/sudoku', 'other'],
    ['#/settings', 'other'],
  ];
  for (const [hash] of cases) h.hashchange(hash);
  assert.deepEqual(
    sdk.calls.map((c) => c[1]),
    cases.map((c) => c[1]),
  );
});

test('a deep link names its landing route for the SDK mount, without an extra view', () => {
  const deep = fakeSdk();
  const h = page({ hash: '#/quiet/castle', readyState: 'interactive' });
  h.run();
  assert.equal(h.document.documentElement.dataset.pulseboardRoute, 'castle');
  h.context.Pulseboard = deep.api;
  h.ready();
  assert.deepEqual(deep.calls, [], 'the SDK records the landing view itself');
  const home = page({ hash: '' });
  home.run();
  assert.equal(home.document.documentElement.dataset.pulseboardRoute, 'home');
});

test('the deferred bundle waits for the SDK script that follows it', () => {
  // Deferred scripts run while readyState is 'interactive'; the SDK is the next script.
  const h = page({ hash: '#/play/expert-sudoku-01@1', readyState: 'interactive' });
  h.run();
  assert.equal(h.bar.hidden, false, 'the space is not released before the SDK had its turn');
  h.context.Pulseboard = fakeSdk().api;
  h.ready();
  assert.equal(h.bar.hidden, false);
});

test('without the SDK the game still runs and the reserved notice space is released', () => {
  const h = page({ hash: '#/play/expert-sudoku-01@1', readyState: 'loading' });
  h.run();
  assert.equal(h.bar.hidden, false, 'the space stays reserved while scripts may still load');
  h.ready();
  assert.equal(h.bar.hidden, true);
  assert.equal(h.bar.style.height, '0');
  assert.equal(h.bar.style.minHeight, '0');
  const run = { puzzle: { id: 'expert-sudoku-01' } };
  assert.equal(h.context.AlibiJourney(run), false);
  assert.equal(h.context.AlibiJourney(run, 'puzzle.completed', 30), false);
  assert.doesNotThrow(() => h.hashchange('#/home'));
  assert.equal(h.context.AlibiUsageSlot(), true);
});

test('a throwing SDK never throws into the game', () => {
  const boom = () => {
    throw new Error('blocked');
  };
  const h = page({
    hash: '#/play/x@1',
    sdk: { route: boom, count: boom, track: boom, consent: { get: boom } },
  });
  assert.doesNotThrow(() => h.run());
  assert.doesNotThrow(() => h.hashchange('#/home'));
  assert.equal(h.context.AlibiJourney({ puzzle: { id: 'x' } }), false);
});

test('standalone builds install nothing', () => {
  const h = page({ standalone: true });
  h.run();
  assert.equal(h.context.AlibiJourney, undefined);
  assert.equal(h.context.AlibiUsageSlot, undefined);
  assert.equal(h.listeners(), 0);
});

test('the button slot moves into Settings or Privacy and parks hidden elsewhere', () => {
  const h = page();
  h.run();
  const panel = node('div', h.document);
  panel.id = 'usage-sharing-slot';
  const fallback = node('p', h.document);
  panel.append(fallback);
  h.body.append(panel);
  assert.equal(h.context.AlibiUsageSlot(), true);
  assert.equal(h.slot.parentElement, panel);
  assert.equal(panel.children[0], h.slot, 'the slot precedes the fallback line');
  assert.equal(h.slot.hidden, false);
  h.context.AlibiUsageSlot(true);
  assert.equal(h.slot.parentElement, h.body, 'rescued before a re-render replaces the panel');
  assert.equal(h.slot.hidden, true);
  panel.remove();
  h.context.AlibiUsageSlot();
  assert.equal(h.slot.parentElement, h.body);
  assert.equal(h.slot.hidden, true);
});

test('journey events carry official ids and numbers only, one terminal per attempt', () => {
  const sdk = fakeSdk();
  const h = page({ sdk: sdk.api });
  h.run();
  const run = { puzzle: { id: 'expert-sudoku-01', solution: [1, 2, 3] }, state: { cells: [1] } };
  const J = (event, seconds) => h.context.AlibiJourney(run, event, seconds);
  assert.equal(J('hint.requested'), true, 'a hint is reported without opening an attempt');
  assert.equal(J('puzzle.failed', 5), false, 'a check before any move closes nothing');
  assert.equal(J(), true);
  assert.equal(J(), true, 'an open attempt is not another start');
  assert.equal(J('puzzle.failed', 40.4), true);
  assert.equal(J('puzzle.failed', 41), false, 'pressing Check again is not another attempt');
  assert.equal(J('hint.requested'), true);
  J();
  assert.equal(J('puzzle.completed', 212), true);
  assert.equal(J('puzzle.completed', 213), false, 'undo/redo back to solved is a review');
  assert.equal(J('puzzle.solved'), false, 'unknown names are refused');
  const tracked = JSON.parse(
    JSON.stringify(sdk.calls.filter((c) => c[0] === 'track').map((c) => [c[1], c[2]])),
  );
  assert.deepEqual(tracked, [
    ['hint.requested', { puzzle: 'expert-sudoku-01', hint: 1 }],
    ['puzzle.started', { puzzle: 'expert-sudoku-01' }],
    ['puzzle.failed', { puzzle: 'expert-sudoku-01', seconds: 40, attempts: 1 }],
    ['hint.requested', { puzzle: 'expert-sudoku-01', hint: 2 }],
    ['puzzle.started', { puzzle: 'expert-sudoku-01' }],
    ['puzzle.completed', { puzzle: 'expert-sudoku-01', seconds: 212, hints: 2, attempts: 2 }],
  ]);
  assert.deepEqual(
    sdk.calls.filter((c) => c[0] === 'count').map((c) => c[1]),
    tracked.map((c) => c[0]),
    'every journey event is also an aggregate count',
  );
  assert.doesNotMatch(JSON.stringify(sdk.calls), /solution|cells|\[1,2,3\]/);
});

test('imported and workshop puzzles are reported as custom, never by their authored id', () => {
  const sdk = fakeSdk();
  const h = page({ sdk: sdk.api });
  h.run();
  const run = { puzzle: { id: 'my secret puzzle name' } };
  h.context.AlibiJourney(run);
  h.context.AlibiJourney(run, 'hint.requested');
  assert.doesNotMatch(JSON.stringify(sdk.calls), /secret/);
  assert.equal(sdk.calls.find((c) => c[0] === 'track')[2].puzzle, 'custom');
});

test('restart, route changes, a new run and consent changes each reset the attempt', () => {
  const sdk = fakeSdk();
  const h = page({ sdk: sdk.api });
  h.run();
  let run = { puzzle: { id: 'scene-01' } };
  const J = (event, seconds) => h.context.AlibiJourney(run, event, seconds);
  const names = () => sdk.calls.filter((c) => c[0] === 'track').map((c) => c[1]);
  assert.equal(J('puzzle.abandoned'), true, 'abandoning nothing is a silent no-op');
  J();
  assert.equal(J('puzzle.abandoned'), true);
  assert.equal(J('puzzle.failed'), false, 'the abandoned attempt cannot be closed');
  J();
  h.hashchange('#/home');
  assert.equal(J('puzzle.completed'), false, 'a route change closed the attempt');
  J();
  run = { puzzle: { id: 'scene-01' } };
  assert.equal(J('puzzle.failed'), false, 'a new run closes nothing');
  J();
  sdk.state.journeys = false;
  assert.equal(J('puzzle.failed'), false, 'a consent change resets the open attempt');
  assert.deepEqual(names(), [
    'puzzle.started',
    'puzzle.started',
    'puzzle.started',
    'puzzle.started',
  ]);
  sdk.state.counts = false;
  assert.equal(J(), false, 'with everything off nothing opens or is buffered');
  assert.equal(J('puzzle.completed'), false);
});

test('application lifecycle calls the journey helper with fixed names and elapsed seconds', () => {
  assert.match(appSource, /globalThis\.AlibiJourney\?\.\(current\);[\s\S]*current\.state = next;/);
  assert.match(
    appSource,
    /issues\.length\) \{\s*globalThis\.AlibiJourney\?\.\(current, 'puzzle\.failed', sessionSeconds\);/,
  );
  assert.match(
    appSource,
    /current\.firstCompletedAt = current\.firstCompletedAt \|\| current\.completedAt;\s*globalThis\.AlibiJourney\?\.\(current, 'puzzle\.completed', sessionSeconds\);/,
  );
  assert.match(
    appSource,
    /function showHint\(\) \{\s*if \(!current\) return;\s*globalThis\.AlibiJourney\?\.\(current, 'hint\.requested'\);/,
  );
  assert.match(
    appSource,
    /current\.completedAt = null;\s*reviewing = false;\s*globalThis\.AlibiJourney\?\.\(current, 'puzzle\.abandoned'\);/,
  );
  const calls = appSource.match(/globalThis\.AlibiJourney\?\.\([^)]*\)/g) || [];
  assert.equal(calls.length, 7);
  for (const call of calls)
    assert.match(
      call,
      /^globalThis\.AlibiJourney\?\.\(current(, '(puzzle\.(failed|completed)', sessionSeconds|puzzle\.abandoned'|hint\.requested'))?\)$/,
    );
  assert.doesNotMatch(appSource, /PulseboardUsage|pulseboard-usage-sharing/);
  assert.match(appSource, /globalThis\.AlibiUsageSlot\?\.\(true\);/);
  assert.match(
    appSource,
    /\$\('#app'\)\.innerHTML = shell\([^;]+;\s*globalThis\.AlibiUsageSlot\?\.\(\);/,
  );
  assert.equal(appSource.match(/id="usage-sharing-slot"/g).length, 2, 'Settings and Privacy');
});

// The real pinned SDK and the real host glue together, on the registered origin at phone width.
function integrated(local = storage()) {
  const h = page({ hash: '#/settings', readyState: 'loading', local });
  const timers = [];
  const fetches = [];
  const store = () => {
    const map = new Map();
    return {
      map,
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
    };
  };
  Object.assign(h.context, {
    navigator: {},
    innerWidth: 390,
    innerHeight: 844,
    sessionStorage: store(),
    AbortController,
    TextEncoder,
    URL,
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
    performance: { now: () => 0, getEntriesByType: () => [] },
    matchMedia: () => ({ matches: false }),
    setTimeout: (fn, ms) => (timers.push({ fn, ms }), timers.length),
    clearTimeout() {},
    fetch(url, init) {
      fetches.push({ url, body: init?.body ? JSON.parse(init.body) : null });
      return new Promise(() => {});
    },
  });
  h.run();
  vm.runInContext(sdkSource, h.context, { filename: 'observatory/pulseboard.js' });
  const panel = node('section', h.document);
  panel.id = 'usage-sharing-slot';
  return { ...h, fetches, panel };
}

test('the real SDK renders its notice in flow and its Beta button inline in Settings, never fixed', () => {
  const h = integrated();
  assert.equal(typeof h.context.Pulseboard.track, 'function');
  assert.deepEqual(h.fetches, [], 'nothing leaves before the notice mounts');
  h.ready();
  const [notice] = h.bar.children;
  assert.equal(notice?.className, 'pb-bar', 'the notice renders into the reserved space');
  assert.notEqual(notice.style.position, 'fixed');
  assert.notEqual(notice.style.position, 'absolute');
  assert.match(
    walk(notice)
      .map((n) => n.textContent)
      .join(''),
    /Beta.*thanks for helping test Alibi/,
  );
  // The app renders Settings and moves the slot in; the visitor presses OK.
  h.body.append(h.panel);
  h.context.AlibiUsageSlot();
  walk(notice)
    .find((n) => n.className === 'pb-ok')
    .emit('click');
  assert.equal(h.bar.hidden, true, 'the space is released once the notice collapses');
  const pill = walk(h.body).find((n) => n.className === 'pb-pill');
  assert.ok(pill, 'the Beta button exists');
  assert.equal(pill.parentElement, h.slot, 'inline in the slot, not appended to <body>');
  assert.equal(h.slot.parentElement, h.panel);
  assert.equal(pill.style.position, undefined);
  pill.emit('click');
  const panel = walk(h.body).find((n) => n.className === 'pb-panel');
  assert.equal(panel.parentElement, h.slot);
  assert.equal(panel.style.position, undefined, 'the switches open inline too');
  // Leaving Settings parks the slot, with the button inside it, hidden on the body.
  h.context.AlibiUsageSlot(true);
  assert.equal(h.slot.hidden, true);
  assert.equal(pill.parentElement, h.slot);
  // Journeys are on after OK; puzzle props pass the SDK's validation and are queued.
  const run = { puzzle: { id: 'expert-sudoku-01' } };
  assert.equal(h.context.AlibiJourney(run), true);
  assert.equal(
    h.context.Pulseboard.track('puzzle.completed', {
      puzzle: 'expert-sudoku-01',
      seconds: 9,
      hints: 0,
      attempts: 1,
    }),
    true,
  );
});

const OLD = 'pulseboard:statistics:v1:alibi';
const LEGACY =
  'pulseboard:consent:v1:alibi:https://pulseboard-observatory.commit-atlas.workers.dev/v1/collect/alibi';
const V3 = 'pulseboard:consent:v3:alibi';
const offRecord = (raw) => {
  const record = JSON.parse(raw);
  assert.deepEqual(Object.keys(record).sort(), [
    'counts',
    'decided',
    'diagnostics',
    'journeys',
    'month',
  ]);
  assert.equal(record.counts, false);
  assert.equal(record.diagnostics, false);
  assert.equal(record.journeys, false);
  assert.equal(record.decided, true);
  assert.match(record.month, /^\d{4}-(0[1-9]|1[0-2])$/);
};

test('an opt-out under the old embed becomes an all-off SDK choice and old keys are removed', () => {
  for (const key of [OLD, LEGACY]) {
    const local = storage({ [key]: '{"allow":false}', [OLD + ':probe']: '1', unrelated: 'keep' });
    page({ local }).run();
    offRecord(local.map.get(V3));
    assert.deepEqual([...local.map.keys()].sort(), [V3, 'unrelated'].sort(), key);
  }
});

test('an old opt-in, a corrupt value or an existing SDK choice writes nothing; old keys still go', () => {
  const cases = [
    [{ [OLD]: '{"allow":true}' }, null],
    [{ [OLD]: '{broken' }, null],
    [{ [LEGACY]: '{"allow":true}' }, null],
    [{ [OLD]: '{"allow":false}', [V3]: 'mine' }, 'mine'],
  ];
  for (const [seed, expected] of cases) {
    const local = storage(seed);
    page({ local }).run();
    assert.equal(local.map.get(V3) ?? null, expected, JSON.stringify(seed));
    assert.ok(
      ![...local.map.keys()].some(
        (k) => k.startsWith('pulseboard:statistics:v1:') || k.startsWith('pulseboard:consent:v1:'),
      ),
    );
  }
});

test('unavailable storage never breaks the game', () => {
  assert.doesNotThrow(() =>
    page({ local: storage({ [OLD]: '{"allow":false}' }, { throws: true }) }).run(),
  );
  const h = page({ local: undefined });
  delete h.context.localStorage;
  assert.doesNotThrow(() => h.run());
});

test('the real SDK honours a migrated opt-out: no notice, every category off, nothing sent', () => {
  const h = integrated(storage({ [OLD]: '{"allow":false}' }));
  h.ready();
  const choice = h.context.Pulseboard.consent.get();
  assert.equal(choice.decided, true);
  assert.equal(choice.counts || choice.diagnostics || choice.journeys, false);
  assert.equal(h.bar.children.length, 0, 'no notice for a recorded choice');
  assert.equal(h.context.Pulseboard.count('page.view'), false);
  assert.ok(
    h.fetches.every((f) => f.url.includes('/v1/consent/')),
    'at most the region hint',
  );
});

test('the Settings panel and its notice hint show only while the SDK shows something', () => {
  const run = (mount) => {
    const h = page({ readyState: 'interactive' });
    h.run();
    h.context.Pulseboard = fakeSdk().api;
    mount?.(h);
    h.ready();
    return h.document.documentElement.dataset.pulseboardActive;
  };
  assert.equal(run(null), undefined, 'an inert SDK (another origin) mounts nothing');
  assert.equal(
    run((h) => h.bar.append(node('div'))),
    '',
    'the notice is showing',
  );
  assert.equal(
    run((h) => h.slot.append(node('button'))),
    '',
    'the Beta button exists (a recorded choice, or GPC)',
  );
  const absent = page({ readyState: 'interactive' });
  absent.run();
  absent.ready();
  assert.equal(absent.document.documentElement.dataset.pulseboardActive, undefined);
});
