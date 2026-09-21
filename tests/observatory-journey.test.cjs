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

function harness() {
  const block = /\/\/ Alibi journey helper start\.\n([\s\S]*?)\/\/ Alibi journey helper end\./.exec(
    browserSource,
  );
  assert.ok(block, 'adapter must contain the bounded journey helper block');
  const events = [];
  let active = false;
  const context = {
    track(event) {
      if (!active) return false;
      events.push(event);
      return true;
    },
    active: () => active,
  };
  context.globalThis = context;
  vm.runInNewContext(`${block[1]}\nglobalThis.__journey = createJourney(track, active);`, context, {
    filename: 'observatory-journey-helper.js',
  });
  let current = { key: 'first' };
  return {
    events,
    call(event) {
      return context.__journey.observe(current, event);
    },
    change(value) {
      current = value;
    },
    reset: context.__journey.reset,
    setActive(value) {
      active = value;
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

test('route resets require a fresh start without buffering', () => {
  const h = harness();
  h.setActive(true);
  assert.equal(h.call('puzzle.unknown'), false);
  assert.deepEqual(h.events, []);

  h.call();
  h.reset();
  assert.equal(h.call('puzzle.completed'), true);
  assert.deepEqual(h.events, ['puzzle.started', 'puzzle.started', 'puzzle.completed']);
});

test('application lifecycle calls the helper with fixed event names only', () => {
  assert.match(
    appSource,
    /PulseboardUsage\?\.journey\?\.\(current\);[\s\S]*current\.state = next;/,
  );
  assert.match(
    appSource,
    /issues\.length\)[\s\S]*PulseboardUsage\?\.journey\?\.\(current, 'puzzle\.failed'\)/,
  );
  assert.match(
    appSource,
    /current\.firstCompletedAt = current\.firstCompletedAt \|\| current\.completedAt;\s*globalThis\.PulseboardUsage\?\.journey\?\.\(current, 'puzzle\.completed'\);/,
  );
  assert.match(
    appSource,
    /function showHint\(\) \{\s*if \(!current\) return;\s*globalThis\.PulseboardUsage\?\.journey\?\.\(current, 'hint\.requested'\);/,
  );
  assert.match(loaderSource, /PulseboardUsage\?\.resetJourney\?\.\(\);/);
  assert.equal((appSource.match(/globalThis\.PulseboardUsage\?\.journey\?\./g) || []).length, 4);
  assert.doesNotMatch(appSource, /observeJourney|resetJourney/);
  assert.doesNotMatch(loaderSource, /ALIBI_OBSERVATORY_JOURNEY/);
});
