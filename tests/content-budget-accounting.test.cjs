'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const measure = (info) => require('../tools/content-budget-accounting.cjs')(info);
const base = { coreOfflineBytes: 1000, officialContentBytes: 300, deferredContentBytes: 100 };

test('official data includes both chunks and shell is the remaining precache', () => {
  assert.deepEqual(measure(base), { officialBytes: 300, shellBytes: 700 });
});
test('moving definitions between initial and deferred never changes the shell measurement', () => {
  assert.deepEqual(
    measure({ ...base, officialContentBytes: 300, deferredContentBytes: 180 }),
    measure(base),
  );
});
test('real shell growth cannot be hidden by excluding optional assets a second time', () => {
  const result = measure({ ...base, coreOfflineBytes: 1080, observatoryBytes: 80 });
  assert.equal(result.shellBytes, 780);
});
test('new deferred definitions still count against the official-data total', () => {
  const result = measure({
    ...base,
    coreOfflineBytes: 1100,
    officialContentBytes: 400,
    deferredContentBytes: 200,
  });
  assert.equal(result.officialBytes, 400);
  assert.equal(result.shellBytes, 700);
});
test('missing, negative, fractional and impossible byte receipts fail closed', () => {
  for (const key of Object.keys(base)) {
    for (const value of [undefined, -1, 0.5, NaN, Infinity, '100', Number.MAX_SAFE_INTEGER + 1])
      assert.throws(() => measure({ ...base, [key]: value }), /byte/i);
  }
  assert.throws(() => measure({ ...base, officialContentBytes: 1100 }), /precache/i);
  assert.throws(() => measure({ ...base, deferredContentBytes: 400 }), /official/i);
});

// Exercise the producer's emitted contract, not a synthetic receipt with a different meaning.
test('the emitted official receipt already includes the deferred script exactly once', () => {
  const root = path.resolve(__dirname, '..');
  const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json')));
  const assets = path.join(root, 'dist/assets');
  const names = fs.readdirSync(assets);
  const initial = names.find((name) => /^official-content\.[a-f0-9]{12}\.js$/.test(name));
  const deferred = names.find((name) => /^official-deferred\.[a-f0-9]{12}\.js$/.test(name));
  assert.ok(initial && deferred, 'both official scripts are emitted');
  const deferredBytes = fs.statSync(path.join(assets, deferred)).size;
  const combined =
    fs.statSync(path.join(assets, initial)).size + deferredBytes + info.curationMediaBytes;
  assert.equal(info.deferredContentBytes, deferredBytes);
  assert.equal(info.officialContentBytes, combined);
  assert.deepEqual(measure(info), {
    officialBytes: combined,
    shellBytes: info.coreOfflineBytes - combined,
  });
});
