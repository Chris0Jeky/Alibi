'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const loaderSource = fs.readFileSync(path.join(root, 'src/observatory-loader.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');

function harness() {
  const listeners = new Map(), events = [], appended = [];
  let active = false;
  const context = {
    ALIBI_OBSERVATORY_URL: './observer.js',
    ALIBI_CONFIG: { standalone: false, version: '0.11.4' },
    location: { hash: '#/play/curated-aquarium-01' },
    document: {
      readyState: 'loading',
      createElement: () => ({}),
      head: { append: tag => appended.push(tag) },
    },
    addEventListener(type, listener) { listeners.set(type, listener); },
    PulseboardUsage: {
      status: () => ({ active }),
      track(event) {
        if (!active) return false;
        events.push(event);
        return true;
      },
    },
  };
  context.globalThis = context;
  vm.runInNewContext(loaderSource, context, { filename: 'observatory-loader.js' });
  return {
    context,
    events,
    appended,
    listeners,
    setActive(value) { active = value; },
  };
}

test('journey adapter emits only bounded events while consent is active', () => {
  const h = harness();
  const journey = h.context.ALIBI_OBSERVATORY_JOURNEY;
  assert.ok(journey, 'loader must publish the bounded journey adapter');
  assert.deepEqual(Object.keys(journey).sort(), ['begin', 'complete', 'fail', 'hint', 'reset']);

  assert.equal(journey.begin(), false);
  assert.deepEqual(h.events, []);

  h.setActive(true);
  assert.equal(journey.begin(), true);
  assert.equal(journey.begin(), true, 'an already-open attempt is stable, not another start');
  assert.equal(journey.hint(), true);
  assert.equal(journey.fail(), true);
  assert.equal(journey.begin(), true);
  assert.equal(journey.complete(), true);
  assert.deepEqual(h.events, [
    'puzzle.started',
    'hint.requested',
    'puzzle.failed',
    'puzzle.started',
    'puzzle.completed',
  ]);
});

test('withdrawal and route changes clear local attempt state', () => {
  const h = harness(), journey = h.context.ALIBI_OBSERVATORY_JOURNEY;
  h.setActive(true);
  journey.begin();
  h.setActive(false);
  assert.equal(journey.hint(), false);
  h.setActive(true);
  assert.equal(journey.complete(), true, 'completion after re-consent begins a fresh bounded attempt');
  assert.deepEqual(h.events, ['puzzle.started', 'puzzle.started', 'puzzle.completed']);

  h.context.location.hash = '#/home';
  h.listeners.get('hashchange')();
  h.context.location.hash = '#/play/another';
  h.listeners.get('hashchange')();
  journey.fail();
  assert.deepEqual(h.events.slice(-4), ['page.view', 'page.view', 'puzzle.started', 'puzzle.failed']);
});

test('application lifecycle calls the adapter without passing product data', () => {
  assert.match(appSource, /ALIBI_OBSERVATORY_JOURNEY\?\.begin\?\.\(\);[\s\S]*current\.state = next;/);
  assert.match(appSource, /issues\.length\)[\s\S]*ALIBI_OBSERVATORY_JOURNEY\?\.fail\?\.\(\)/);
  assert.match(appSource, /current\.firstCompletedAt = current\.firstCompletedAt \|\| current\.completedAt;\s*globalThis\.ALIBI_OBSERVATORY_JOURNEY\?\.complete\?\.\(\);/);
  assert.match(appSource, /function showHint\(\) \{\s*if \(!current\) return;\s*globalThis\.ALIBI_OBSERVATORY_JOURNEY\?\.hint\?\.\(\);/);
  assert.doesNotMatch(appSource, /ALIBI_OBSERVATORY_JOURNEY[^;]*(?:puzzle|current|state|answer|id)\s*[,)]/i);
});
