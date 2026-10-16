'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Execute the production controller. Only the DOM and host scheduling are fixtures.
function fixture(origin = '#/home?ux=house') {
  const nodes = new Map(),
    listeners = new Map(),
    frames = new Map();
  let frame = 0;
  function element(tag, id = '') {
    return {
      tag,
      id,
      children: [],
      dataset: {},
      setAttribute(name, value) {
        this[name] = value;
      },
      append(child) {
        this.children.push(child);
        if (child.id) nodes.set(child.id, child);
      },
      prepend(child) {
        this.children.unshift(child);
        if (child.id) nodes.set(child.id, child);
      },
      remove() {
        nodes.delete(this.id);
      },
      focus() {
        document.activeElement = this;
      },
      matches() {
        return false;
      },
    };
  }
  const document = {
    body: { dataset: {} },
    activeElement: null,
    addEventListener(name, handler) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(handler);
    },
    getElementById: (id) => nodes.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => element(tag),
  };
  nodes.set('main', element('main', 'main'));
  const context = vm.createContext({
    document,
    location: { hash: origin },
    URLSearchParams,
    AbortController,
    AlibiCore: { DIFFICULTIES: [] },
    AlibiHouseView: {},
    requestAnimationFrame(callback) {
      frames.set(++frame, callback);
      return frame;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
  });
  for (const file of ['model.js', 'controller.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/house', file), 'utf8'), context);
  const bridge = {
    records: () => [],
    all: () => [{ id: 'binary-01', revision: 1 }],
    navigate(page, id) {
      context.location.hash = `#/${page}/${encodeURIComponent(id)}`;
    },
  };
  const controller = context.AlibiHouse.create(bridge, {});
  function clickGame(target = 'play') {
    const button = element('button', 'launch');
    button.dataset = { houseAction: 'play', key: 'binary-01@1' };
    nodes.set(button.id, button);
    const anchor = target === 'salon' ? { id: 'game', getAttribute: () => '#/salon/duel' } : null;
    const source = {
      closest(selector) {
        if (selector === 'a') return anchor;
        if (selector === '[data-house-action]') return anchor ? null : button;
        return {};
      },
    };
    for (const handler of listeners.get('click')) handler({ target: source });
    if (anchor) context.location.hash = '#/salon/duel';
  }
  return {
    controller,
    clickGame,
    context,
    render: (page) => controller.afterRender({ page }),
    link: () => nodes.get('hx-return')?.children[0],
    flushFocus() {
      for (const [id, callback] of frames) {
        frames.delete(id);
        callback();
      }
    },
    focused: () => document.activeElement?.id,
  };
}

for (const page of ['play', 'salon']) {
  test(`${page}: stale desk render after hash navigation does not erase the return destination`, () => {
    const f = fixture();
    f.clickGame(page);
    // The previous view can finish rendering before the async router commits its next view.
    f.render('home');
    f.render(page);
    assert.equal(f.link()?.href, '#/home?ux=house');
    f.render(page);
    assert.equal(f.link()?.href, '#/home?ux=house', 'board rerender retains the link');
  });
}

test('return to a filtered finder preserves its exact location and keyboard opener', () => {
  const origin = '#/home?ux=house&view=puzzles&family=binary&q=night';
  const f = fixture(origin);
  f.clickGame();
  f.render('home');
  f.render('play');
  assert.equal(f.link()?.href, origin);
  f.context.location.hash = origin;
  f.render('home');
  f.flushFocus();
  assert.equal(f.focused(), 'launch');
  f.context.location.hash = '#/play/another@1';
  f.render('play');
  assert.equal(f.link(), undefined, 'a consumed return must not leak into unrelated play');
});

for (const [hash, page] of [
  ['#/home', 'home'],
  ['#/settings', 'settings'],
  ['#/library', 'library'],
  ['#/play/missing@1', 'library'],
]) {
  test(`abandoning a pending house launch at ${hash} / ${page} clears the return context`, () => {
    const f = fixture();
    f.clickGame();
    f.context.location.hash = hash;
    f.render(page);
    f.context.location.hash = '#/play/another@1';
    f.render('play');
    assert.equal(f.link(), undefined);
  });
}

test('ordinary launch and disposal retain their existing return-link behavior', () => {
  const f = fixture();
  f.clickGame();
  f.render('play');
  assert.equal(f.link()?.href, '#/home?ux=house');
  f.controller.dispose();
  assert.equal(f.link(), undefined);
});
