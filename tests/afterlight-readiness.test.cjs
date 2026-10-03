'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// Exercise the actual browser predicates, including the offline reload call site.
const source = fs.readFileSync(path.join(__dirname, 'browser_afterlight_studies.py'), 'utf8');
const predicates = [...source.matchAll(/wait_for_function\(\s*'([^'\n]+)'/g)].map((m) => m[1]);
const ready = predicates.filter((p) => p.startsWith('(id) =>'));

test('both Afterlight navigation waits tolerate boot before diagnostics exists', () => {
  assert.equal(ready.length, 2, 'initial play and offline reopen remain covered');
  for (const expression of ready) {
    const context = vm.createContext({});
    const predicate = vm.runInContext(expression, context);
    assert.equal(predicate('afterlight-picture-01'), false);
    context.AlibiDiagnostics = { getCurrent: () => null };
    assert.equal(predicate('afterlight-picture-01'), false);
    context.AlibiDiagnostics.getCurrent = () => ({ puzzle: { id: 'another-puzzle' } });
    assert.equal(predicate('afterlight-picture-01'), false);
    context.AlibiDiagnostics.getCurrent = () => ({ puzzle: { id: 'afterlight-picture-01' } });
    assert.equal(predicate('afterlight-picture-01'), true);
  }
});

test('Workshop readiness still requires both offline readiness and a controller', () => {
  const expression = predicates.find((p) => p.includes('navigator.serviceWorker'));
  assert.ok(expression);
  const context = vm.createContext({ navigator: { serviceWorker: { controller: {} } } });
  const predicate = vm.runInContext(expression, context);
  assert.ok(!predicate(), 'a claimed service worker alone is not application readiness');
  context.AlibiDiagnostics = { getStatus: () => ({ offlineReady: false }) };
  assert.ok(!predicate());
  context.AlibiDiagnostics.getStatus = () => ({ offlineReady: true });
  assert.ok(predicate());
  context.navigator.serviceWorker.controller = null;
  assert.ok(!predicate());
});
