'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { verifyDocuments } = require('../tools/ci-scope.cjs');
const root = path.resolve(__dirname, '..');
const archive = 'docs/STATE-HISTORY-2026-10-03.md';

test('the previous state ledger survives byte-for-byte in the same documentation directory', () => {
  const bytes = fs.readFileSync(path.join(root, archive));
  assert.equal(bytes.length, 96939);
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    'e6f38926f414a1e4a61d0f11af4b62020574ced0f62b3cb599881a6fc12cad94',
  );
  assert.equal(path.dirname(archive), path.dirname('docs/STATE.md'));
});
test('the current state links retained history, implementation plans and unresolved human gates', () => {
  const state = fs.readFileSync(path.join(root, 'docs/STATE.md'), 'utf8');
  for (const target of [
    'STATE-HISTORY-2026-10-03.md',
    '../HUMAN_TODO.md',
    'PROJECT-MAP.md',
    'gameplay/WORKSHOP-DISCOVERY.md',
    'superpowers/plans/2026-10-03-workshop-discovery.md',
    'qa/2026-10-03-workshop-discovery.md',
  ])
    assert.ok(state.includes('](' + target + ')'), `missing continuation target ${target}`);
  assert.deepEqual(verifyDocuments(root, ['docs/STATE.md']), []);
  assert.match(state, /Source merges are not a deployment/);
  assert.match(state, /#404/);
  assert.match(state, /#389/);
  assert.match(state, /#433/);
});
