'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/boot.js'), 'utf8');
const names = fs
  .readdirSync(path.join(root, 'dist/assets'))
  .filter((name) => /^boot\.[a-f0-9]{12}\.js$/.test(name));
assert.equal(names.length, 1, 'one complete boot artifact is emitted');
const emitted = fs.readFileSync(path.join(root, 'dist/assets', names[0]), 'utf8');

function boot(code, { hash = '', pathname = '/', search = '', target } = {}) {
  let timeout,
    recovery = null,
    clears = 0;
  const listeners = new Map();
  const app = {
    insertAdjacentHTML(_position, html) {
      const buttons = [...html.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map((match) => ({
        textContent: match[1],
      }));
      recovery = {
        html,
        querySelectorAll: () => buttons,
        remove: () => {
          recovery = null;
        },
      };
    },
  };
  const location = { hash, pathname, search, reload() {} };
  const history = {
    state: { retained: true },
    replaceState(state, _title, url) {
      assert.equal(state, history.state, 'startup preserves existing history state');
      location.hash = url;
    },
  };
  const context = {
    URL,
    location,
    history,
    navigator: {},
    ALIBI_BUILD_TARGET: target,
    document: {
      getElementById: (id) => (id === 'app' ? app : id === 'boot-recovery' ? recovery : null),
    },
    addEventListener: (type, listener) => listeners.set(type, listener),
    setTimeout(callback, delay) {
      assert.equal(delay, 12000);
      timeout = callback;
      return 1;
    },
    clearTimeout(id) {
      assert.equal(id, 1);
      clears++;
    },
    MutationObserver: class {
      observe(element) {
        assert.equal(element, app);
      }
    },
  };
  vm.runInNewContext(code, context);
  return {
    context,
    listeners,
    location,
    timeout: () => timeout(),
    recovery: () => recovery,
    clears: () => clears,
  };
}

test('boot is the exact pinned compiler output, not unminified startup overhead', () => {
  assert.equal(emitted, esbuild.transformSync(source, { minify: true, target: 'es2022' }).code);
  assert.ok(Buffer.byteLength(emitted) < Buffer.byteLength(source));
});
for (const [hash, expected] of [
  ['#/games', '#/salon'],
  ['#/space', '#/settings'],
  ['#/wing', '#/quiet'],
  ['#/castle', '#/quiet/castle/map'],
  ['#/wrenmere/journal', '#/quiet/castle/journal'],
  ['#/games/blockcabinet?mode=zen', '#/salon/blockcabinet?mode=zen'],
  ['#/PLAY/Scene-01?from=Share', '#/play/Scene-01?from=Share'],
  ['#/__proto__', '#/__proto__'],
  ['#/constructor', '#/constructor'],
  ['#/not-a-room', '#/not-a-room'],
]) {
  test(`compiled boot preserves routing for ${hash}`, () => {
    const original = boot(source, { hash });
    const compiled = boot(emitted, { hash });
    assert.equal(compiled.location.hash, expected);
    assert.equal(compiled.location.hash, original.location.hash);
    compiled.location.hash = '#/games/mahjong';
    compiled.listeners.get('hashchange')();
    assert.equal(compiled.location.hash, '#/salon/mahjong');
  });
}
test('compiled boot preserves path queries and gives an explicit fragment precedence', () => {
  assert.equal(
    boot(emitted, { pathname: '/privacy/', search: '?from=share' }).location.hash,
    '#/privacy?from=share',
  );
  assert.equal(
    boot(emitted, { pathname: '/privacy/', search: '?from=share', hash: '#/library' }).location
      .hash,
    '#/library',
  );
});
for (const target of ['android', undefined]) {
  test(`compiled ${target || 'web'} boot retains recovery controls and readiness cleanup`, () => {
    const original = boot(source, { target });
    const compiled = boot(emitted, { target });
    original.timeout();
    compiled.timeout();
    assert.equal(compiled.recovery().html, original.recovery().html);
    assert.equal(
      compiled.recovery().querySelectorAll('button').length,
      target === 'android' ? 1 : 2,
    );
    compiled.context.AlibiBootReady();
    assert.equal(compiled.recovery(), null);
    assert.equal(compiled.clears(), 1);
  });
}
