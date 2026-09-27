'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const measure = (info) => require('../tools/content-budget-accounting.cjs')(info);
const base = { coreOfflineBytes: 1000, officialContentBytes: 200, deferredContentBytes: 100 };

test('official data includes both chunks and shell is the remaining precache', () => {
  assert.deepEqual(measure(base), { officialBytes: 300, shellBytes: 700 });
});
test('moving definitions between initial and deferred never changes the shell measurement', () => {
  assert.deepEqual(
    measure({ ...base, officialContentBytes: 120, deferredContentBytes: 180 }),
    measure(base),
  );
});
test('real shell growth cannot be hidden by excluding optional assets a second time', () => {
  const result = measure({ ...base, coreOfflineBytes: 1080, observatoryBytes: 80 });
  assert.equal(result.shellBytes, 780);
});
test('new deferred definitions still count against the official-data total', () => {
  const result = measure({ ...base, coreOfflineBytes: 1100, deferredContentBytes: 200 });
  assert.equal(result.officialBytes, 400);
  assert.equal(result.shellBytes, 700);
});
test('missing, negative, fractional and impossible byte receipts fail closed', () => {
  for (const key of Object.keys(base)) {
    for (const value of [undefined, -1, 0.5, NaN, Infinity, '100', Number.MAX_SAFE_INTEGER + 1])
      assert.throws(() => measure({ ...base, [key]: value }), /byte/i);
  }
  assert.throws(() => measure({ ...base, deferredContentBytes: 900 }), /precache/i);
});
