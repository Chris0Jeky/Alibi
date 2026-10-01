import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

function between(start, end) {
  assert.equal(app.split(start).length, 2, `expected unique start anchor: ${start}`);
  assert.equal(app.split(end).length, 2, `expected unique end anchor: ${end}`);
  return app.slice(app.indexOf(start), app.indexOf(end));
}

const blockedSource = between('  function blocked()', '  function completion()');

function runBlocked({
  updateRequested,
  current,
  paused = false,
  storageFatal = false,
  saveError = false,
}) {
  const toasts = [];
  const context = {
    current: current ?? { completedAt: null },
    paused,
    storageFatal,
    saveError,
    updateRequested,
    toast: (message, error = false) => {
      toasts.push({ message, error });
    },
  };
  const result = vm.runInNewContext(`${blockedSource}\nblocked();`, context);
  return { result, toasts };
}

test('move gate allows input before an update is requested', () => {
  const { result, toasts } = runBlocked({ updateRequested: false });
  assert.equal(result, false, 'pre-activation moves stay allowed');
  assert.deepEqual(toasts, [], 'no notice before an update is requested');
});

test('move gate refuses input with notice once an update is requested', () => {
  const { result, toasts } = runBlocked({ updateRequested: true });
  assert.equal(result, true, 'post-ACTIVATE moves are refused');
  assert.equal(toasts.length, 1, 'refused update-window move shows a notice');
  assert.match(String(toasts[0].message), /update/i, 'notice names the pending update');
});

test('apply-update flags the pending update when it posts ACTIVATE', () => {
  const apply = between("case 'apply-update':", "case 'reload':");
  const flagAt = apply.indexOf('updateRequested = true');
  const activateAt = apply.indexOf('ACTIVATE');
  assert.ok(flagAt !== -1 && activateAt !== -1, 'apply-update sets the flag and posts ACTIVATE');
  assert.ok(flagAt < activateAt, 'flag is set when ACTIVATE is posted');
});

test('controllerchange clears the update request when the final save fails', () => {
  const handler = between(
    "addEventListener('controllerchange'",
    'await navigator.serviceWorker.ready',
  );
  assert.ok(handler.includes('if (updateRequested)'), 'handler guards on the pending update');
  assert.ok(handler.includes('updateRequested = false'), 'failure path clears the flag');
});
