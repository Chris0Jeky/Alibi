'use strict';
// Load-time shape pins for tools/challenge-catalogue.cjs: null/non-object
// challenges and empty ids fail at load, before runtime/validation mapping.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const catalogue = require('../tools/challenge-catalogue.cjs');

function fixtureRoot(challenges) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-challenge-catalogue-'));
  const dir = path.join(root, 'content', 'challenges');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'registry.json'),
    JSON.stringify({ schema: 1, packs: ['test.json'] }),
  );
  fs.writeFileSync(
    path.join(dir, 'test.json'),
    JSON.stringify({
      schema: 'alibi-curation-challenges/v1',
      notASchema1ImportPack: true,
      challenges,
    }),
  );
  return root;
}

function assertLoadRejects(t, challenges) {
  const root = fixtureRoot(challenges);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  try {
    catalogue.load(root);
  } catch (error) {
    assert.ok(error instanceof Error, 'rejection is a clean Error');
    assert.match(error.message, /Invalid challenge source (pack|count)/);
    return;
  }
  assert.fail('expected load to throw');
}

test('a null challenge is rejected at load with a clean Error', (t) => {
  assertLoadRejects(t, [null]);
});

test('non-object challenges are rejected at load with a clean Error', (t) => {
  for (const bad of ['test-challenge-01', 42, true]) assertLoadRejects(t, [bad]);
});

test('empty-id challenges are rejected at load with a clean Error', (t) => {
  assertLoadRejects(t, [{ id: '' }]);
  assertLoadRejects(t, [{}]);
});

test('duplicate ids are rejected on the validated id basis', (t) => {
  assertLoadRejects(t, [{ id: 'test-challenge-01' }, { id: 'test-challenge-01' }]);
});

test('valid packs still load', (t) => {
  const root = fixtureRoot([{ id: 'test-challenge-01' }]);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(catalogue.load(root), [{ id: 'test-challenge-01' }]);
});
