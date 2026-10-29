'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/app.js', 'utf8');
const start = source.indexOf("  $('#dialog').addEventListener('close', () => {");
const end = source.indexOf("  $('#dialog').addEventListener('cancel',", start);
assert.ok(start >= 0 && end > start);

function fixture({
  active = 'body',
  connected = true,
  replacement = true,
  visible = true,
  reopened = false,
} = {}) {
  const calls = [];
  const body = {},
    html = {},
    hiddenDialogControl = {},
    newer = {};
  const opener = {
    id: 'opener',
    isConnected: connected,
    disabled: false,
    getClientRects: () => (visible ? [1] : []),
    focus: () => calls.push('opener'),
  };
  const replacementNode = {
    disabled: false,
    getClientRects: () => (visible ? [1] : []),
    focus: () => calls.push('replacement'),
  };
  const main = { focus: () => calls.push('main') };
  let handler;
  const dialog = {
    open: reopened,
    contains: (el) => el === hiddenDialogControl,
    addEventListener: (_, fn) => {
      handler = fn;
    },
  };
  const doc = {
    body,
    documentElement: html,
    activeElement: { body, html, hiddenDialogControl, newer }[active],
    getElementById: () => (replacement ? replacementNode : null),
  };
  const context = { document: doc, $: (s) => (s === '#dialog' ? dialog : main), opener, calls };
  vm.createContext(context);
  vm.runInContext(
    `let stagedCabinet = 'pending', dialogOpener = opener;\n${source.slice(start, end)}\nglobalThis.inspect = () => ({stagedCabinet, dialogOpener});`,
    context,
  );
  return { run: () => handler(), inspect: () => context.inspect(), calls };
}

test('queued close preserves newer external focus while clearing dialog ownership', () => {
  const f = fixture({ active: 'newer' });
  f.run();
  assert.deepEqual(f.calls, []);
  assert.equal(f.inspect().stagedCabinet, null);
  assert.equal(f.inspect().dialogOpener, null);
});
test('close recovers missing or hidden-dialog focus to opener, replacement or main', () => {
  for (const [options, expected] of [
    [{ active: 'body' }, 'opener'],
    [{ active: 'missing' }, 'opener'],
    [{ active: 'html', connected: false }, 'replacement'],
    [{ active: 'hiddenDialogControl', connected: false, replacement: false }, 'main'],
    [{ active: 'body', visible: false }, 'main'],
  ]) {
    const f = fixture(options);
    f.run();
    assert.deepEqual(f.calls, [expected]);
    assert.equal(f.inspect().dialogOpener, null);
  }
});
test('a reopened dialog retains ownership and focus', () => {
  const f = fixture({ reopened: true });
  f.run();
  assert.deepEqual(f.calls, []);
  assert.equal(f.inspect().stagedCabinet, 'pending');
  assert.ok(f.inspect().dialogOpener);
});
