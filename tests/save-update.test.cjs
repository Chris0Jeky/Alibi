'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');

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
  const freezeAt = applyBody.indexOf('updateRequested = true');
  assert.ok(freezeAt >= 0, 'apply-update must set updateRequested');
  for (const marker of ['AlibiActivities.flush()', 'enqueueSave()', 'await queue']) {
    assert.ok(applyBody.includes(marker), `apply-update must still ${marker}`);
    assert.ok(
      freezeAt < applyBody.indexOf(marker),
      `updateRequested must be set before ${marker} so taps cannot slip in`,
    );
  }
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
});

test('the freeze is visible and survives until the controllerchange reload', () => {
  assert.ok(
    source.includes('updateRequested') && source.includes('Board input is paused'),
    'a visible notice must explain the frozen board while updateRequested is set',
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
  const reloadAt = swapBody.indexOf('location.reload()');
  assert.ok(reloadAt >= 0, 'controllerchange must still reload after the save settles');
  assert.ok(
    swapBody.indexOf('enqueueSave()') < reloadAt,
    'controllerchange save must precede the reload',
  );
  assert.ok(
    !/if\s*\(updateRequested\)\s*\{\s*location\.reload\(\)/.test(swapBody),
    'controllerchange must not reload before flushing the save',
  );
});
