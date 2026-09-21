'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, '..', 'observatory', 'browser.js'), 'utf8');

function element(tag) {
  const node = {
    tag,
    children: [],
    listeners: {},
    attributes: {},
    textContent: '',
    checked: false,
    append: (...children) => node.children.push(...children),
    setAttribute: (name, value) => {
      node.attributes[name] = value;
    },
    addEventListener: (type, listener) => {
      (node.listeners[type] ||= []).push(listener);
    },
    removeEventListener: (type, listener) => {
      node.listeners[type] = (node.listeners[type] || []).filter((item) => item !== listener);
    },
    remove: () => {
      node.removed = true;
    },
    emit: (type, event = {}) => {
      for (const listener of [...(node.listeners[type] || [])]) listener(event);
    },
  };
  return node;
}

function run({ contextProvider = true } = {}) {
  const created = [];
  const windowListeners = {};
  const document = element('document');
  Object.assign(document, {
    readyState: 'complete',
    body: element('body'),
    createElement(tag) {
      const node = element(tag);
      created.push(node);
      return node;
    },
    createTextNode: (text) => ({ text }),
  });
  let contextReads = 0;
  const context = {
    document,
    location: {
      origin: 'https://alibi-after-hours-preview.commit-atlas.workers.dev',
      protocol: 'https:',
      pathname: '/',
    },
    navigator: {},
    crypto: webcrypto,
    AbortController,
    Response,
    URL,
    Date,
    JSON,
    Object,
    console,
    localStorage: {
      getItem: () => null,
      setItem: () => {},
    },
    fetch: async () => new Response('{}', { status: 202 }),
    setTimeout: () => 1,
    clearTimeout: () => {},
    addEventListener(type, listener) {
      (windowListeners[type] ||= []).push(listener);
    },
    removeEventListener(type, listener) {
      windowListeners[type] = (windowListeners[type] || []).filter((item) => item !== listener);
    },
    emit(type, event = {}) {
      for (const listener of [...(windowListeners[type] || [])]) listener(event);
    },
    ALIBI_CONFIG: { standalone: false, version: '0.11.3' },
  };
  if (contextProvider)
    context.ALIBI_OBSERVATORY_CONTEXT = () => {
      contextReads += 1;
      return { route: 'home', release: '0.11.3' };
    };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'observatory/browser.js' });
  return {
    context,
    document,
    checkbox: created.find((node) => node.type === 'checkbox'),
    contextReads: () => contextReads,
  };
}

test('generated Alibi adapter does not inspect host context without active consent', async () => {
  const harness = run();
  let optionReads = 0;
  const options = {
    get route() {
      optionReads += 1;
      return 'home';
    },
  };

  assert.equal(harness.contextReads(), 0);
  assert.equal(harness.context.PulseboardUsage.track('page.view', options), false);
  harness.context.emit('error');
  assert.equal(harness.contextReads(), 0);
  assert.equal(optionReads, 0);

  harness.checkbox.checked = true;
  harness.checkbox.emit('change');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.contextReads(), 1, 'consented initial page view resolves context once');

  harness.checkbox.checked = false;
  harness.checkbox.emit('change');
  const afterWithdrawal = harness.contextReads();
  assert.equal(harness.context.PulseboardUsage.track('page.view', options), false);
  harness.context.emit('error');
  assert.equal(harness.contextReads(), afterWithdrawal);
  assert.equal(optionReads, 0);

  harness.context.PulseboardUsage.dispose();
  assert.equal(harness.context.PulseboardUsage.track('page.view', options), false);
  harness.context.emit('error');
  assert.equal(harness.contextReads(), afterWithdrawal);
  assert.equal(optionReads, 0);
});

test('deferred adapter maps Alibi hashes to the closed Observatory vocabulary', () => {
  const harness = run({ contextProvider: false });
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
