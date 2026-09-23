'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'boot.js'), 'utf8');

function execute({ hash = '', pathname = '/', search = '' } = {}) {
  const listeners = new Map();
  const replacements = [];
  const timers = [];
  const location = { hash, pathname, search };
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

test('shared privacy path opens the privacy route with its query', () => {
  for (const [pathname, search, expected] of [
    ['/privacy', '', '#/privacy'],
    ['/privacy/', '', '#/privacy'],
    ['/PRIVACY', '', '#/privacy'],
    ['/privacy', '?from=shared-link', '#/privacy?from=shared-link'],
  ]) {
    const result = execute({ pathname, search });
    assert.deepEqual(result.replacements, [expected], `${pathname}${search}`);
    assert.equal(result.location.hash, expected);
  }
});

test('shared about and login paths land on their named app routes', () => {
  for (const pathname of ['/about', '/login', '/About/', '/LOGIN']) {
    const result = execute({ pathname });
    const expected = `#/${pathname.replace(/^\/+|\/+$/g, '').toLowerCase()}`;
    assert.deepEqual(result.replacements, [expected], pathname);
  }
});

test('an explicit hash route wins over the shared path', () => {
  const result = execute({ hash: '#/library', pathname: '/privacy' });
  assert.equal(result.replacements.length, 0);
  assert.equal(result.location.hash, '#/library');
});

test('root, unknown and nested paths keep current startup behavior', () => {
  for (const pathname of ['/', '', '/library', '/privacy/archive', '/settings', '/alibi/privacy']) {
    const result = execute({ pathname });
    assert.equal(result.replacements.length, 0, pathname);
    assert.equal(result.location.hash, '');
  }
});

test('inherited names stay inert as paths without breaking boot', () => {
  for (const pathname of ['/constructor', '/__proto__', '/toString', '/CONSTRUCTOR']) {
    const result = execute({ pathname });
    assert.equal(result.replacements.length, 0, pathname);
    assert.equal(result.timers.length, 1, 'the recovery watchdog still installs');
    assert.equal(typeof result.context.AlibiBootReady, 'function');
  }
});

test('canonical hash page casing is normalized without changing IDs or queries', () => {
  for (const [hash, expected] of [
    ['#/ABOUT', '#/about'],
    ['#/LoGiN?from=Desk?Detail', '#/login?from=Desk?Detail'],
    ['#/PLAY/Custom-Case%40A?book=MyBook', '#/play/Custom-Case%40A?book=MyBook'],
  ]) {
    const result = execute({ hash });
    assert.deepEqual(result.replacements, [expected]);
    result.listeners.get('hashchange')();
    assert.deepEqual(result.replacements, [expected], 'normalization is idempotent');
  }
});

test('subsequent hash changes normalize before the app reads the route', () => {
  const result = execute({ hash: '#/home' });
  result.location.hash = '#/LOGIN';
  result.listeners.get('hashchange')();
  assert.equal(result.location.hash, '#/login');
});

test('unknown, encoded and inherited hash names are not promoted to known pages', () => {
  for (const hash of [
    '#/ABOUT-other',
    '#/%61bout',
    '#/constructor',
    '#/__proto__',
    '#/toString',
    '#/<img-src=x-onerror=alert(1)>',
  ]) {
    const result = execute({ hash });
    assert.deepEqual(result.replacements, [], hash);
    assert.equal(result.location.hash, hash);
  }
});
