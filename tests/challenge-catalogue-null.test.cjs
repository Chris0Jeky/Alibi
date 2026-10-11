'use strict';
// Load-time null-entry pin: a pack with challenges:[null] fails at load with a
// clean Error naming the pack, before runtime() mapping.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const catalogue = require('../tools/challenge-catalogue.cjs');

function fixtureRoot(challenges) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-challenge-null-'));
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

test('null challenge entry throws Error naming the pack at load', (t) => {
  const root = fixtureRoot([null]);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.throws(
    () => catalogue.load(root),
    (error) => {
      assert.ok(error instanceof Error, 'rejection is an Error');
      assert.ok(!(error instanceof TypeError), 'rejection is not a TypeError');
      assert.match(error.message, /test\.json/);
      return true;
    },
  );
});

test('valid challenge entry still loads', (t) => {
  const root = fixtureRoot([{ id: 'test-challenge-01' }]);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(catalogue.load(root), [{ id: 'test-challenge-01' }]);
});
