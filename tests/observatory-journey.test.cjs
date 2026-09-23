'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const loaderSource = fs.readFileSync(path.join(root, 'src/observatory-loader.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const browserSource = fs.readFileSync(path.join(root, 'observatory/browser.js'), 'utf8');

// Runs the real loader with a stub facade standing in for the generated adapter.
function harness({ standalone = false } = {}) {
  const windowListeners = {};
  const documentListeners = [];
  const events = [];
  let active = false;
  const facade = () => ({
    status: () => ({ active }),
    track(event) {
      if (!active) return false;
      events.push(event);
      return true;
    },
  });
  const context = {
    ALIBI_CONFIG: { standalone, version: '0.11.5' },
    ALIBI_OBSERVATORY_URL: 'assets/observatory.test.js',
    location: { hash: '#/play/test@1' },
    document: {
      readyState: 'complete',
      createElement: (tag) => ({ tag }),
      head: { append() {} },
      addEventListener(type, listener, capture) {
        documentListeners.push({ type, listener, capture });
      },
    },
    addEventListener(type, listener) {
      (windowListeners[type] ||= []).push(listener);
    },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(loaderSource, context, { filename: 'observatory-loader.js' });
  context.PulseboardUsage = facade();
  let current = { key: 'first' };
  return {
    context,
    events,
    documentListeners,
    call: (event) => context.AlibiJourney(current, event),
    change(value) {
      current = value;
    },
    setActive(value) {
      active = value;
    },
    remount() {
      context.PulseboardUsage = facade();
    },
    consentChange(inside = true) {
      const target = {
        closest: (selector) => (inside && selector === '#pulseboard-usage-sharing' ? {} : null),
      };
      for (const { type, listener } of documentListeners)
        if (type === 'change') listener({ target });
    },
    hashchange() {
      for (const listener of windowListeners.hashchange || []) listener({ type: 'hashchange' });
    },
  };
}

test('fixed journey events are emitted only while consent is active', () => {
  const h = harness();
  assert.equal(h.call(), false);
  assert.deepEqual(h.events, []);

  h.setActive(true);
  assert.equal(h.call(), true);
  assert.equal(h.call(), true, 'an already-open attempt is stable, not another start');
  assert.equal(h.call('hint.requested'), true);
  assert.equal(h.call('puzzle.failed'), true);
  assert.equal(h.call(), true);
  assert.equal(h.call('puzzle.completed'), true);
  assert.deepEqual(h.events, [
    'puzzle.started',
    'hint.requested',
    'puzzle.failed',
    'puzzle.started',
    'puzzle.completed',
  ]);
});

test('withdrawal and puzzle changes reset local attempt state', () => {
  const h = harness();
  h.setActive(true);
  h.call();
  h.setActive(false);
  assert.equal(h.call('hint.requested'), false);
  h.setActive(true);
  assert.equal(
    h.call('puzzle.completed'),
    false,
    'an attempt not observed under current consent has no terminal',
  );
  assert.equal(h.call(), true, 're-consent begins a fresh bounded attempt');
  assert.equal(h.call('puzzle.completed'), true);
  assert.deepEqual(h.events, ['puzzle.started', 'puzzle.started', 'puzzle.completed']);

  h.call();
  h.change({ key: 'second' });
  assert.equal(h.call('puzzle.failed'), false, 'a puzzle change closes nothing on the new puzzle');
  h.call();
  h.call('puzzle.failed');
  assert.deepEqual(h.events.slice(-3), ['puzzle.started', 'puzzle.started', 'puzzle.failed']);
});

test('unknown events are refused and nothing is buffered before consent', () => {
  const h = harness();
  h.setActive(true);
  assert.equal(h.call('puzzle.unknown'), false);
  assert.equal(h.call('puzzle.solved'), false);
  assert.equal(h.call('puzzle.abandon'), false, 'the control event name is exact');
  assert.deepEqual(h.events, []);

  h.setActive(false);
  h.call();
  h.call('hint.requested');
  h.call('puzzle.failed');
  h.setActive(true);
  assert.deepEqual(h.events, [], 'pre-consent calls are dropped, never replayed');
  assert.equal(h.call('hint.requested'), true);
  assert.deepEqual(h.events, ['hint.requested'], 'a hint is reported without opening an attempt');
});

test('one attempt yields at most one terminal: repeated checks, hints and undo reviews add none', () => {
  const h = harness();
  h.setActive(true);
  assert.equal(h.call('hint.requested'), true);
  assert.equal(h.call('puzzle.failed'), false, 'a check before any move closes nothing');
  h.call();
  assert.equal(h.call('puzzle.failed'), true);
  assert.equal(
    h.call('puzzle.failed'),
    false,
    'pressing Check again on the same board is not another attempt',
  );
  assert.equal(h.call('hint.requested'), true);
  assert.equal(h.call('puzzle.failed'), false);
  h.call();
  assert.equal(h.call('puzzle.completed'), true);
  assert.equal(
    h.call('puzzle.completed'),
    false,
    'undo/redo back to the solved state is a review, not a solve',
  );
  assert.deepEqual(h.events, [
    'hint.requested',
    'puzzle.started',
    'puzzle.failed',
    'hint.requested',
    'puzzle.started',
    'puzzle.completed',
  ]);
});

test('restart abandons the open attempt locally without emitting a terminal', () => {
  const h = harness();
  h.setActive(true);
  assert.equal(
    h.call('puzzle.abandoned'),
    true,
    'abandoning with no open attempt is a silent no-op',
  );
  assert.deepEqual(h.events, []);
  h.call();
  assert.equal(h.call('puzzle.abandoned'), true);
  assert.deepEqual(h.events, ['puzzle.started']);
  assert.equal(
    h.call('puzzle.failed'),
    false,
    'the abandoned attempt cannot be closed by a later check',
  );
  assert.equal(h.call(), true, 'the next real board change opens a fresh attempt');
  assert.equal(h.call('puzzle.completed'), true);
  assert.deepEqual(h.events, ['puzzle.started', 'puzzle.started', 'puzzle.completed']);
});

test('route changes reset the attempt and still report a page view', () => {
  const h = harness();
  h.setActive(true);
  h.call();
  h.hashchange();
  assert.deepEqual(h.events, ['puzzle.started', 'page.view']);
  assert.equal(h.call('puzzle.completed'), false, 'the route change closed the attempt');
  h.call();
  assert.equal(h.call('puzzle.completed'), true);
  assert.deepEqual(h.events.slice(2), ['puzzle.started', 'puzzle.completed']);
});

test('consent transitions reset the attempt even with no call while sharing was off', () => {
  const h = harness();
  h.setActive(true);
  h.call();
  h.consentChange(false);
  h.call();
  assert.deepEqual(
    h.events,
    ['puzzle.started'],
    'an unrelated form change is not a consent change',
  );

  h.consentChange();
  h.call();
  assert.deepEqual(h.events, ['puzzle.started', 'puzzle.started']);

  h.remount();
  h.call();
  assert.deepEqual(
    h.events,
    ['puzzle.started', 'puzzle.started', 'puzzle.started'],
    'a remounted facade starts a fresh consent state',
  );
  assert.ok(
    h.documentListeners.some(({ type, capture }) => type === 'change' && capture === true),
    'consent changes are observed before the control applies them',
  );
});

test('a missing or inert facade keeps the journey silent', () => {
  const h = harness();
  h.context.PulseboardUsage = null;
  assert.equal(h.call(), false);
  assert.equal(h.call('puzzle.completed'), false);
  assert.deepEqual(h.events, []);
});

test('standalone builds install no journey helper', () => {
  const h = harness({ standalone: true });
  assert.equal(h.context.AlibiJourney, undefined);
  assert.equal(h.documentListeners.length, 0);
});

test('the generated control keeps the id the loader watches for consent changes', () => {
  assert.match(browserSource, /details\.id = 'pulseboard-usage-sharing'/);
  assert.match(browserSource, /checkbox\.addEventListener\('change'/);
  assert.doesNotMatch(browserSource, /AlibiJourney|createJourney|journey/i);
});

test('application lifecycle calls the helper with fixed names only', () => {
  assert.match(appSource, /globalThis\.AlibiJourney\?\.\(current\);[\s\S]*current\.state = next;/);
  assert.match(
    appSource,
    /issues\.length\) \{\s*globalThis\.AlibiJourney\?\.\(current, 'puzzle\.failed'\);/,
  );
  assert.match(
    appSource,
    /current\.firstCompletedAt = current\.firstCompletedAt \|\| current\.completedAt;\s*globalThis\.AlibiJourney\?\.\(current, 'puzzle\.completed'\);/,
  );
  assert.match(
    appSource,
    /function showHint\(\) \{\s*if \(!current\) return;\s*globalThis\.AlibiJourney\?\.\(current, 'hint\.requested'\);/,
  );
  assert.match(
    appSource,
    /C\.equal\(current\.state, d\.before\)\) return;\s*globalThis\.AlibiJourney\?\.\(current\);/,
  );
  assert.match(
    appSource,
    /completion\(\);\s*\/\/ Undo after a failure reopens the retry\.[\s\S]*?if \(wasSolved \|\| current\.completedAt\) reviewing = true;\s*else if \(!reviewing\) globalThis\.AlibiJourney\?\.\(current\);/,
  );
  assert.match(
    appSource,
    /current\.completedAt = null;\s*reviewing = false;\s*globalThis\.AlibiJourney\?\.\(current, 'puzzle\.abandoned'\);/,
  );
  assert.match(
    appSource,
    /globalThis\.AlibiJourney\?\.\(current\);\s*reviewing = false;\s*if \(history\)/,
  );
  assert.match(appSource, /checking = false;\s*reviewing = false;\s*feedback = '';/);
  const calls = appSource.match(/globalThis\.AlibiJourney\?\.\([^)]*\)/g) || [];
  assert.equal(calls.length, 7);
  for (const call of calls)
    assert.match(
      call,
      /^globalThis\.AlibiJourney\?\.\(current(, '(puzzle\.(failed|completed|abandoned)|hint\.requested)')?\)$/,
    );
  assert.doesNotMatch(appSource, /PulseboardUsage/);
  assert.doesNotMatch(appSource, /current\.reviewing/, 'the review flag is UI state, never saved');
});

// Runs the real loader and the real generated adapter together, with a minimal DOM that dispatches
// change events through document capture listeners the way a browser does.
function integrated() {
  const { webcrypto } = require('node:crypto');
  const windowListeners = {};
  const captures = [];
  const created = [];
  function element(tag) {
    const node = {
      tag,
      children: [],
      listeners: {},
      textContent: '',
      checked: false,
      disabled: false,
      parent: null,
      append(...children) {
        for (const child of children) {
          if (child && typeof child === 'object') child.parent = node;
          node.children.push(child);
        }
      },
      setAttribute() {},
      addEventListener(type, listener) {
        (node.listeners[type] ||= []).push(listener);
      },
      remove() {},
      closest(selector) {
        for (let at = node; at; at = at.parent) if ('#' + at.id === selector) return at;
        return null;
      },
    };
    created.push(node);
    return node;
  }
  const document = {
    readyState: 'complete',
    body: element('body'),
    head: { append() {} },
    createElement: element,
    createTextNode: (text) => ({ text }),
    addEventListener(type, listener, capture) {
      if (type === 'change' && capture === true) captures.push(listener);
    },
    removeEventListener() {},
  };
  const context = {
    document,
    location: {
      origin: 'https://alibi-after-hours-preview.commit-atlas.workers.dev',
      protocol: 'https:',
      pathname: '/',
      hash: '#/play/test@1',
    },
    navigator: {},
    crypto: webcrypto,
    AbortController,
    TextEncoder,
    Response,
    URL,
    Date,
    JSON,
    // No host Object: the adapter checks that events carry this realm's plain-object prototype.
    localStorage: { getItem: () => null, setItem: () => {} },
    fetch: async () => new Response('{}', { status: 202 }),
    setTimeout: () => 1,
    clearTimeout: () => {},
    addEventListener(type, listener) {
      (windowListeners[type] ||= []).push(listener);
    },
    removeEventListener() {},
    ALIBI_CONFIG: { standalone: false, version: '0.11.5' },
    ALIBI_OBSERVATORY_URL: 'assets/observatory.test.js',
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(loaderSource, context, { filename: 'observatory-loader.js' });
  vm.runInContext(browserSource, context, { filename: 'observatory/browser.js' });
  const checkbox = created.find((node) => node.type === 'checkbox');
  return {
    context,
    toggle(value) {
      checkbox.checked = value;
      for (const listener of captures) listener({ target: checkbox });
      for (const listener of checkbox.listeners.change || []) listener({ target: checkbox });
    },
    queued: () => context.PulseboardUsage.status().queued,
  };
}

test('the generated adapter admits every journey event the loader emits', () => {
  const h = integrated();
  const run = { key: 'integrated' };
  assert.equal(h.context.AlibiJourney(run), false, 'nothing is tracked before consent');
  assert.equal(h.queued(), 0);

  h.toggle(true);
  const afterConsent = h.queued();
  assert.equal(afterConsent, 0, 'the consent page view is already in flight');
  assert.equal(h.context.PulseboardUsage.status().requests, 1);
  assert.equal(h.context.AlibiJourney(run), true);
  assert.equal(h.context.AlibiJourney(run, 'hint.requested'), true);
  assert.equal(h.context.AlibiJourney(run, 'puzzle.failed'), true);
  assert.equal(h.context.AlibiJourney(run), true);
  assert.equal(h.context.AlibiJourney(run, 'puzzle.completed'), true);
  assert.equal(h.queued(), afterConsent + 5, 'started, hint, failed, started, completed');

  assert.equal(h.context.AlibiJourney(run), true);
  assert.equal(h.context.AlibiJourney(run, 'puzzle.abandoned'), true);
  assert.equal(h.context.AlibiJourney(run, 'puzzle.failed'), false);
  assert.equal(
    h.queued(),
    afterConsent + 6,
    'the abandoned start is collected, the abandon itself is local-only',
  );

  h.context.AlibiJourney(run);
  h.toggle(false);
  assert.equal(h.queued(), 0, 'withdrawal clears the queue');
  assert.equal(h.context.AlibiJourney(run, 'puzzle.failed'), false);
  h.toggle(true);
  assert.equal(
    h.context.AlibiJourney(run, 'puzzle.failed'),
    false,
    'the withdrawn attempt cannot be closed',
  );
  assert.equal(h.context.AlibiJourney(run), true);
  assert.equal(h.context.AlibiJourney(run, 'puzzle.failed'), true);
  assert.equal(h.queued(), 2, 're-consent opens a fresh attempt instead of continuing the old one');
});
