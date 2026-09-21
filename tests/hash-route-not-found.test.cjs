'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'boot.js'), 'utf8');

class FakeElement {
  constructor(tagName, document) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = document;
    this.children = [];
    this.attributes = new Map();
    this.className = '';
    this.id = '';
    this.href = '';
    this.textContent = '';
    this.parentNode = null;
    this.tabIndex = -1;
  }

  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  replaceChildren(...children) {
    this.children = [];
    this.textContent = '';
    this.append(...children);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }
}

function descendants(root) {
  return [root, ...root.children.flatMap(descendants)];
}

function createDocument() {
  const document = {
    title: 'Alibi · A little room to think',
    activeElement: null,
    createElement(tagName) {
      return new FakeElement(tagName, document);
    },
    getElementById(id) {
      return descendants(document.documentElement).find((element) => element.id === id) || null;
    },
  };
  document.documentElement = new FakeElement('html', document);
  document.body = new FakeElement('body', document);
  const app = new FakeElement('div', document);
  app.id = 'app';
  const main = new FakeElement('main', document);
  main.id = 'main';
  main.tabIndex = -1;
  app.append(main);
  document.body.append(app);
  document.documentElement.append(document.body);
  document.activeElement = document.body;
  return document;
}

function execute(hash) {
  const listeners = new Map();
  const observers = [];
  const replacements = [];
  const document = createDocument();
  const location = { hash, reload() {} };
  const history = {
    state: { retained: true },
    replaceState(state, title, url) {
      replacements.push({ state, title, url });
      location.hash = url;
    },
  };
  const context = {
    URL,
    clearTimeout() {},
    document,
    history,
    location,
    navigator: {},
    setTimeout() {
      return 1;
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    MutationObserver: class {
      constructor(callback) {
        this.callback = callback;
        observers.push(this);
      }
      observe() {}
      disconnect() {}
    },
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'src/boot.js' });
  return { context, document, history, listeners, location, observers, replacements };
}

function text(root) {
  return descendants(root)
    .map((element) => element.textContent)
    .filter(Boolean)
    .join(' ');
}

test('unknown hashes render a deliberate recovery surface after the app opens', () => {
  const result = execute('#/missing-room/archive?from=bookmark');
  result.context.AlibiBootReady();

  const panel = result.document.getElementById('route-not-found');
  assert.ok(panel, 'unknown route surface is rendered');
  assert.equal(panel.attributes.get('role'), 'status');
  assert.match(text(panel), /That door is not on the map/i);
  assert.match(text(panel), /#\/missing-room\/archive\?from=bookmark/);
  assert.match(text(panel), /saved progress is unchanged/i);
  assert.equal(result.document.title, 'Room not found · Alibi');
  assert.equal(result.document.activeElement, result.document.getElementById('main'));

  const links = descendants(panel).filter((element) => element.tagName === 'A');
  assert.deepEqual(
    links.map((link) => link.href),
    ['#/home', '#/library'],
  );
});

test('canonical routes do not receive the not-found surface', () => {
  for (const hash of ['#/home', '#/library', '#/salon', '#/quiet/castle/map', '#/settings']) {
    const result = execute(hash);
    result.context.AlibiBootReady();
    assert.equal(result.document.getElementById('route-not-found'), null, hash);
  }
});

test('unknown route copy is inserted as text rather than active markup', () => {
  const result = execute('#/<img-src=x-onerror=alert(1)>');
  result.context.AlibiBootReady();
  const panel = result.document.getElementById('route-not-found');
  assert.ok(panel);
  assert.match(text(panel), /<img-src=x-onerror=alert\(1\)>/);
  assert.equal(
    descendants(panel).some((element) => element.tagName === 'IMG'),
    false,
  );
});

test('the observer replaces a later unknown-route desk render', () => {
  const result = execute('#/home');
  result.context.AlibiBootReady();
  assert.equal(result.observers.length, 1);

  result.location.hash = '#/unmapped-gallery';
  result.listeners.get('hashchange')();
  const main = result.document.getElementById('main');
  main.replaceChildren(result.document.createElement('p'));
  result.observers[0].callback();

  assert.ok(result.document.getElementById('route-not-found'));
  assert.match(text(main), /unmapped-gallery/);
});
