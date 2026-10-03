'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const clubSource = fs.readFileSync(path.join(root, 'src/club.js'), 'utf8');

function section(from, to) {
  const start = source.indexOf(from);
  assert.ok(start >= 0, `expected source to contain ${from}`);
  const end = to ? source.indexOf(to, start + from.length) : source.length;
  assert.ok(end > start, `expected ${to} after ${from}`);
  return source.slice(start, end);
}

test('board input stays frozen once an update is requested', () => {
  const blockedBody = section('function blocked() {', 'function completion() {');
  assert.ok(
    blockedBody.includes('updateRequested'),
    'blocked() must freeze board input while updateRequested is set',
  );
  const commitBody = section('function commit(next,', 'function act(action,');
  assert.ok(
    commitBody.includes('updateRequested'),
    'commit() must refuse new moves while updateRequested is set',
  );
});

test('update request freezes input before the save snapshot, snapshot precedes ACTIVATE', () => {
  const applyBody = section("case 'apply-update':", "case 'reload':");
  const pauseBody = section('function pauseForUpdate(paused)', 'async function handleAction');
  assert.ok(pauseBody.includes('updateRequested = paused'));
  assert.ok(pauseBody.includes('AlibiClub.pauseForUpdate(paused)'));
  const freezeAt = applyBody.indexOf('pauseForUpdate(true)');
  assert.ok(freezeAt >= 0, 'apply-update must set updateRequested');
  const pauseAt = freezeAt;
  assert.ok(pauseAt >= 0, 'apply-update must pause the Club before flushing');
  for (const marker of ['AlibiActivities.flush()', 'enqueueSave()', 'await queue']) {
    assert.ok(applyBody.includes(marker), `apply-update must still ${marker}`);
    assert.ok(
      freezeAt < applyBody.indexOf(marker),
      `updateRequested must be set before ${marker} so taps cannot slip in`,
    );
    assert.ok(
      pauseAt < applyBody.indexOf(marker),
      `Club pause must be set before ${marker} so late Club moves cannot slip in`,
    );
  }
  assert.ok(
    applyBody.includes('AlibiClub.flush()'),
    'apply-update must flush the Club queue before ACTIVATE',
  );
  const activateAt = applyBody.indexOf('ACTIVATE');
  assert.ok(activateAt >= 0, 'apply-update must still send ACTIVATE');
  assert.ok(
    applyBody.lastIndexOf('await queue') < activateAt,
    'the save snapshot must settle before ACTIVATE is posted',
  );
  assert.ok(
    applyBody.indexOf('AlibiActivities.flush()') < activateAt &&
      applyBody.indexOf('AlibiClub.flush()') < activateAt,
    'activity flushes must precede ACTIVATE',
  );
  assert.ok(
    applyBody.includes('updateRequested && registration'),
    'ACTIVATE must recheck updateRequested before posting',
  );
  assert.ok(
    applyBody.includes('pauseForUpdate(false)'),
    'every apply-update release path must also release the Club pause',
  );
});

test('the freeze is visible and survives until the controllerchange reload', () => {
  assert.ok(
    source.includes('updateRequested') && source.includes('Controls are paused until it loads.'),
    'a visible notice must explain the frozen controls while updateRequested is set',
  );
  assert.ok(
    source.includes("document.getElementById('main')") &&
      source.includes('.inert = updateRequested'),
    '#main must be made inert while updateRequested is set',
  );
  assert.ok(
    source.includes("document.getElementById('quiet-host')") &&
      source.includes('quietHost.inert = updateRequested'),
    '#quiet-host must be made inert in the quiet render branch',
  );
  const handleBody = section('async function handleAction(el, e) {', "case 'navigate':");
  assert.ok(
    handleBody.includes('if (updateRequested) return;'),
    'handleAction must return immediately while updateRequested is set',
  );
  for (const marker of [
    "addEventListener('input'",
    "addEventListener('change'",
    "addEventListener('keydown'",
  ]) {
    const at = source.indexOf(marker);
    assert.ok(at >= 0, `expected source to contain ${marker}`);
    const window = source.slice(at, at + 400);
    assert.ok(
      window.includes('if (updateRequested) return;'),
      `${marker} must return immediately while updateRequested is set`,
    );
  }
  assert.ok(
    clubSource.includes('pauseForUpdate') && clubSource.includes('updatePaused'),
    'Club must own the updatePaused flag and export pauseForUpdate',
  );
  const swapBody = section(
    "addEventListener('controllerchange'",
    'await navigator.serviceWorker.ready',
  );
  assert.ok(swapBody.includes('updateRequested'), 'controllerchange must honor updateRequested');
  assert.ok(
    swapBody.includes('enqueueSave()'),
    'controllerchange must flush the save before reloading',
  );
  for (const marker of [
    'AlibiActivities.flush()',
    'AlibiClub.flush()',
    'AlibiClub.diagnostics().saveError',
    'pauseForUpdate(false)',
  ]) {
    assert.ok(swapBody.includes(marker), `controllerchange must still ${marker}`);
  }
  assert.ok(
    swapBody.includes('if (!updateRequested) return;'),
    'controllerchange must recheck updateRequested before reloading',
  );
  const reloadAt = swapBody.indexOf('location.reload()');
  assert.ok(reloadAt >= 0, 'controllerchange must still reload after the save settles');
  assert.ok(
    swapBody.indexOf('enqueueSave()') < reloadAt,
    'controllerchange save must precede the reload',
  );
  assert.ok(
    swapBody.includes('toast('),
    'controllerchange failures must surface instead of silently swallowing flush errors',
  );
  assert.ok(
    !/if\s*\(updateRequested\)\s*\{\s*location\.reload\(\)/.test(swapBody),
    'controllerchange must not reload before flushing the save',
  );
});
