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
  assert.equal(h.call('puzzle.completed'), true, 're-consent begins a fresh bounded attempt');
  assert.deepEqual(h.events, ['puzzle.started', 'puzzle.started', 'puzzle.completed']);

  h.call();
  h.change({ key: 'second' });
  h.call('puzzle.failed');
  assert.deepEqual(h.events.slice(-3), ['puzzle.started', 'puzzle.started', 'puzzle.failed']);
});

test('unknown events are refused and nothing is buffered before consent', () => {
  const h = harness();
  h.setActive(true);
  assert.equal(h.call('puzzle.unknown'), false);
  assert.equal(h.call('puzzle.solved'), false);
  assert.deepEqual(h.events, []);

  h.setActive(false);
  h.call();
  h.call('hint.requested');
  h.call('puzzle.failed');
  h.setActive(true);
  assert.deepEqual(h.events, [], 'pre-consent calls are dropped, never replayed');
  assert.equal(h.call('hint.requested'), true);
  assert.deepEqual(h.events, ['puzzle.started', 'hint.requested']);
});

test('route changes reset the attempt and still report a page view', () => {
  const h = harness();
  h.setActive(true);
  h.call();
  h.hashchange();
  assert.deepEqual(h.events, ['puzzle.started', 'page.view']);
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

test('application lifecycle calls the helper with fixed event names only', () => {
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
  const calls = appSource.match(/globalThis\.AlibiJourney\?\.\([^)]*\)/g) || [];
  assert.equal(calls.length, 5);
  for (const call of calls)
    assert.match(
      call,
      /^globalThis\.AlibiJourney\?\.\(current(, '(puzzle\.(failed|completed)|hint\.requested)')?\)$/,
    );
  assert.doesNotMatch(appSource, /PulseboardUsage/);
});
