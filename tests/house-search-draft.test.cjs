'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function fixture() {
  const handlers = new Map(),
    windowHandlers = new Map();
  const location = { hash: '#/home?ux=house&view=puzzles' };
  const document = {
    body: { dataset: {} },
    addEventListener(name, fn) {
      handlers.set(name, fn);
    },
    getElementById: (id) =>
      id === 'hx-query' ? document.query : id === 'dialog' ? { close() {} } : null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  const context = vm.createContext({
    document,
    location,
    URLSearchParams,
    URL,
    AbortController,
    FormData: class FormData {
      constructor(form) {
        this.form = form;
      }
      get(name) {
        return this.form.values[name];
      }
    },
    addEventListener(name, fn, options) {
      windowHandlers.set(name, { fn, signal: options.signal });
    },
    AlibiCore: { DIFFICULTIES: [] },
    AlibiHouseView: { render: (data) => data },
    AlibiUI: { data: {} },
    AlibiHouseLoader: {},
    AlibiClubEngines: {},
    requestAnimationFrame() {},
    cancelAnimationFrame() {},
  });
  for (const file of ['model.js', 'controller.js'])
    vm.runInContext(fs.readFileSync(path.join('src/house', file), 'utf8'), context);
  const bridge = { all: () => [], records: () => [], settings: () => ({}), render() {} };
  const club = { diagnostics: () => ({ state: { runs: {} } }) };
  const controller = context.AlibiHouse.create(bridge, club);
  return {
    location,
    controller,
    document,
    handlers,
    windowHandlers,
    submit(id, values) {
      handlers.get('submit')({ target: { id, values }, preventDefault() {} });
    },
    input(value) {
      document.query = { id: 'hx-query', value, isConnected: true };
      handlers.get('input')?.({ target: document.query });
    },
    route(hash) {
      location.hash = hash;
      controller.afterRender({ page: 'home' });
    },
  };
}
test('same-route redraw retains the unsubmitted query without changing committed filters', () => {
  const f = fixture();
  f.controller.home();
  f.input('zzzz-no-match');
  const snapshot = f.controller.home();
  assert.equal(snapshot.queryDraft, 'zzzz-no-match');
  assert.equal(snapshot.route.q, '');
  assert.equal(f.location.hash, '#/home?ux=house&view=puzzles');
});
test('leaving and returning discards an unsubmitted draft', () => {
  const f = fixture();
  f.controller.home();
  f.input('private draft');
  f.route('#/home?ux=house&view=house');
  f.route('#/home?ux=house&view=puzzles');
  assert.equal(f.controller.home().queryDraft, '');
});

test('stale or detached inputs cannot seed a draft for another route', () => {
  const f = fixture();
  f.controller.home();
  const stale = { id: 'hx-query', value: 'stale', isConnected: false };
  f.handlers.get('input')({ target: stale });
  assert.equal(f.controller.home().queryDraft, '');
  f.location.hash = '#/home?ux=house&view=puzzles&family=binary';
  f.input('before new render');
  assert.equal(f.controller.home().queryDraft, '');
});
test('search and filter submission commit only their form fields', () => {
  const f = fixture();
  f.controller.home();
  f.input('draft');
  f.submit('hx-filter-form', { q: '', family: 'binary' });
  assert.match(f.location.hash, /family=binary/);
  assert.doesNotMatch(f.location.hash, /draft/);
  f.controller.home();
  f.input('chosen words');
  f.submit('hx-search-form', { q: 'chosen words', family: 'binary' });
  assert.match(f.location.hash, /q=chosen\+words/);
  assert.match(f.location.hash, /family=binary/);
});
test('hash transition and disposal clear draft ownership', () => {
  const f = fixture();
  f.controller.home();
  f.input('draft');
  const oldURL = 'https://example.test/' + f.location.hash;
  f.location.hash = '#/play/binary-01@1';
  const listener = f.windowHandlers.get('hashchange');
  listener.fn({ oldURL, newURL: 'https://example.test/' + f.location.hash });
  f.location.hash = '#/home?ux=house&view=puzzles';
  assert.equal(f.controller.home().queryDraft, '');
  f.input('another draft');
  f.controller.dispose();
  assert.equal(listener.signal.aborted, true);
  assert.equal(f.controller.home().queryDraft, '');
});
