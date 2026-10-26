'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseCase } = require('../tools/case-authoring.cjs');

// Minimal event/element fixture executes the real preview handlers. Layout, native focus,
// clipboard permissions and browser security remain the actual-browser suite's job.
function preview() {
  let document;
  class Element {
    constructor() {
      this.children = [];
      this.attrs = {};
      this.listeners = {};
      this.textContent = '';
    }
    append(...nodes) {
      this.children.push(...nodes);
    }
    replaceChildren(...nodes) {
      this.children = nodes;
    }
    setAttribute(key, value) {
      this.attrs[key] = value;
    }
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    }
    focus() {
      document.activeElement = this;
    }
    find(id) {
      if (this.attrs.id === id) return this;
      for (const child of this.children) {
        const found = child.find?.(id);
        if (found) return found;
      }
      return null;
    }
  }
  const root = new Element();
  const data = new Element();
  data.textContent = JSON.stringify(
    parseCase(
      fs.readFileSync(path.join(__dirname, '../content/cases/reading-room-blackout.json'), 'utf8'),
    ),
  );
  document = {
    documentElement: { dataset: {} },
    activeElement: null,
    createElement: () => new Element(),
    getElementById: (id) => (id === 'case-data' ? data : id === 'workbench' ? root : root.find(id)),
  };
  const navigator = { clipboard: { writeText: async () => {} } };
  const context = vm.createContext({
    document,
    navigator,
    matchMedia: () => ({ matches: false }),
    confirm: () => true,
  });
  for (const file of ['case-session.cjs', 'case-playtest-receipt.cjs', 'cases/preview.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../tools', file), 'utf8'), context);
  const get = (id) => {
    const node = document.getElementById(id);
    assert.ok(node, id);
    return node;
  };
  return {
    get,
    click: (id) => get(id).listeners.click(),
    navigator,
    draft: () => JSON.parse(get('playtest-preview').textContent),
  };
}

test('preview imports prior help baseline only, retaining hidden exposure across discard and restart', () => {
  const p = preview();
  p.click('reveal');
  p.click('reveal');
  for (const reset of [null, 'playtest-cancel', 'restart']) {
    if (reset) p.click(reset);
    p.click('playtest-start');
    p.click('playtest-review');
    const draft = p.draft();
    assert.equal(draft.assisted, true);
    assert.equal(draft.stages[0].priorAssistance, true);
    assert.equal(draft.stages[0].hints + draft.stages[0].reveals, 0);
  }
});

for (const reset of ['playtest-cancel', 'restart']) {
  test(`pending copy completion does not replace ${reset} state or promise clipboard erasure`, async () => {
    const p = preview();
    let finish;
    p.navigator.clipboard.writeText = () =>
      new Promise((resolve) => {
        finish = resolve;
      });
    p.click('playtest-start');
    p.click('playtest-review');
    const copy = p.click('playtest-copy');
    p.click(reset);
    const status = p.get('status').textContent;
    assert.doesNotMatch(status, /Nothing was copied/);
    finish();
    await copy;
    assert.equal(p.get('status').textContent, status);
    assert.ok(p.get('playtest-start'));
  });
}
