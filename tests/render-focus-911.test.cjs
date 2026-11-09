'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync(require('node:path').join(__dirname, '../src/app.js'), 'utf8');
const source = app.slice(
  app.indexOf('      if (focusID'),
  app.indexOf("      if (paused) document.querySelector('.paused-cover button')"),
);

function restore({
  focusID = '',
  index = -1,
  visible = true,
  input = false,
  fallbackVisible = true,
}) {
  const calls = [];
  const target = {
    hidden: false,
    disabled: false,
    getAttribute: () => null,
    getClientRects: () => (visible ? [1] : []),
    focus: (options) => calls.push(['target', options?.preventScroll]),
    setSelectionRange: (start, end) => calls.push(['selection', start, end]),
  };
  const fallback = {
    hidden: false,
    disabled: false,
    getAttribute: () => null,
    getClientRects: () => (fallbackVisible ? [1] : []),
    focus: () => calls.push(['fallback']),
  };
  const context = {
    focusID,
    focusMatchIndex: index,
    focusSelector: 'fixture',
    focusFallbackID: 'fallback',
    selection: input ? [1, 3] : null,
    usedFocusFallback: false,
    document: {
      getElementById: (id) => (id === 'fallback' ? fallback : target),
      querySelectorAll: () => [target],
    },
    $: () => fallback,
    isFocusTarget: (el) =>
      el &&
      !el.hidden &&
      !el.disabled &&
      el.getAttribute('aria-hidden') !== 'true' &&
      el.getClientRects().length,
  };
  vm.runInNewContext(source, context);
  return { calls, fallback: context.usedFocusFallback };
}

test('focus restoration keeps input selection and prevents scrolling', () => {
  assert.deepEqual(restore({ focusID: 'input', input: true }).calls, [
    ['target', true],
    ['selection', 1, 3],
  ]);
});
test('action-matched focus uses the matched control without applying input selection', () => {
  assert.deepEqual(restore({ index: 0, input: true }).calls, [['target', true]]);
});
test('a hidden focus target uses a visible fallback, but an absent focus target does nothing', () => {
  assert.deepEqual(restore({ focusID: 'x', visible: false }), {
    calls: [['fallback']],
    fallback: true,
  });
  assert.deepEqual(restore({ index: 0, visible: false, fallbackVisible: false }), {
    calls: [],
    fallback: false,
  });
  assert.deepEqual(restore({}), { calls: [], fallback: false });
});
