'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const BOOT = fs.readFileSync(path.join(__dirname, '..', 'src', 'boot.js'), 'utf8');

function boot(target) {
  let timer;
  let recovery = null;
  const app = {
    insertAdjacentHTML(_position, html) {
      const labels = [...html.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map((match) => match[1]);
      const note = {
        textContent: html.match(/<p>([^<]*)<\/p>/)?.[1] || '',
      };
      const buttons = labels.map((textContent) => ({ textContent, disabled: false }));
      recovery = {
        html,
        remove() {},
        querySelector(selector) {
          return selector === 'p' ? note : null;
        },
        querySelectorAll(selector) {
          return selector === 'button' ? buttons : [];
        },
      };
    },
  };
  const main = { focus() {} };
  const location = {
    hash: '',
    href: 'https://localhost/',
    pathname: '/',
    search: '',
    reload() {},
    toString() {
      return this.href;
    },
  };
  const context = {
    URL,
    Error,
    Promise,
    ALIBI_BUILD_TARGET: target,
    location,
    history: { state: null, replaceState() {} },
    navigator: {
      onLine: true,
      serviceWorker: {
        async getRegistrations() {
          return [];
        },
      },
    },
    caches: {
      async keys() {
        return [];
      },
    },
    addEventListener() {},
    setTimeout(callback) {
      timer = callback;
      return 1;
    },
    clearTimeout() {},
    MutationObserver: class {
      observe() {}
    },
    document: {
      title: '',
      getElementById(id) {
        if (id === 'app') return app;
        if (id === 'main') return main;
        if (id === 'boot-recovery') return recovery;
        return null;
      },
    },
  };
  context.globalThis = context;
  vm.runInNewContext(BOOT, context, { filename: 'src/boot.js' });
  assert.equal(typeof timer, 'function');
  timer();
  assert.ok(recovery, 'recovery surface rendered');
  return recovery;
}

function labels(recovery) {
  return [...recovery.querySelectorAll('button')].map((button) => button.textContent);
}

test('Android recovery offers retry without browser shell repair', () => {
  const recovery = boot('android');
  assert.deepEqual(labels(recovery), ['Retry opening']);
  assert.match(recovery.html, /bundled Android app/i);
  assert.doesNotMatch(recovery.html, /refresh app files|go online|service worker/i);
});

test('web recovery retains explicit service-worker shell repair', () => {
  const recovery = boot(undefined);
  assert.deepEqual(labels(recovery), ['Retry opening', 'Refresh app files']);
  assert.match(recovery.html, /Refresh app files/);
});
