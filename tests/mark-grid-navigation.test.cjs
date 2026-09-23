'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
const start = source.indexOf("  document.addEventListener('keydown', (e) => {");
const end = source.indexOf("  $('#dialog').addEventListener('keydown'", start);
assert.ok(start >= 0 && end > start, 'the real application key handler is present');

function harness(type, { tab = 0, paused = false, modal = false } = {}) {
  const focused = [];
  let handler;
  const context = {
    current: { puzzle: { type, size: 3, statements: Array(5).fill({}) } },
    dossierTab: tab,
    selectedCell: 0,
    paused,
    $: () => ({ open: modal }),
    document: {
      addEventListener: (_type, fn) => (handler = fn),
      getElementById: (id) => ({ focus: () => focused.push(id) }),
    },
    render() {
      assert.fail('arrow navigation must not rerender the board');
    },
    enqueueSave() {
      assert.fail('arrow navigation must not write a save');
    },
  };
  vm.runInNewContext(source.slice(start, end), context);
  return {
    focused,
    context,
    key(key, index, overrides = {}) {
      let prevented = false;
      const target = {
        tagName: 'BUTTON',
        disabled: false,
        dataset: { cell: String(index) },
        closest: () => target,
      };
      handler({
        key,
        target,
        preventDefault: () => (prevented = true),
        ...overrides,
      });
      return prevented;
    },
  };
}

test('dossier arrows use focused marks and remain within each category', () => {
  for (const tab of [0, 1]) {
    const h = harness('dossier', { tab });
    const offset = tab * 9;
    for (const [key, from, to] of [
      ['ArrowRight', 0, 1],
      ['ArrowLeft', 1, 0],
      ['ArrowDown', 1, 4],
      ['ArrowUp', 4, 1],
      ['ArrowLeft', 3, 3],
      ['ArrowRight', 2, 2],
      ['ArrowUp', 0, 0],
      ['ArrowDown', 8, 8],
    ]) {
      assert.equal(h.key(key, offset + from), true, key);
      assert.equal(h.focused.at(-1), 'mark-' + (offset + to));
      assert.equal(h.context.selectedCell, offset + to);
    }
  }
});

test('witness arrows follow statement count, not people count, without wrapping', () => {
  const h = harness('witness');
  for (const [key, from, to] of [
    ['ArrowRight', 2, 3],
    ['ArrowDown', 3, 4],
    ['ArrowLeft', 4, 3],
    ['ArrowUp', 3, 2],
    ['ArrowRight', 4, 4],
    ['ArrowLeft', 0, 0],
  ]) {
    assert.equal(h.key(key, from), true);
    assert.equal(h.focused.at(-1), 'mark-' + to);
  }
});

test('mark navigation leaves modified keys, native activation and other controls alone', () => {
  const h = harness('dossier');
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey'])
    assert.equal(h.key('ArrowRight', 0, { [modifier]: true }), false);
  for (const key of ['Tab', 'Enter', ' ']) assert.equal(h.key(key, 0), false);
  assert.equal(
    h.key('ArrowRight', 0, { target: { tagName: 'BUTTON', closest: () => null } }),
    false,
  );
  assert.equal(h.focused.length, 0);
});

test('paused, modal, input and invalid or stale mark targets do not move focus', () => {
  for (const options of [{ paused: true }, { modal: true }]) {
    const h = harness('witness', options);
    assert.equal(h.key('ArrowRight', 0), false);
    assert.equal(h.focused.length, 0);
  }
  const h = harness('dossier', { tab: 1 });
  for (const index of [-1, 0, 8, 18, 1.5, NaN])
    assert.equal(h.key('ArrowRight', index), false);
  for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT', 'SUMMARY'])
    assert.equal(h.key('ArrowRight', 9, { target: { tagName } }), false);
  assert.equal(h.focused.length, 0);
});
