'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { load } = require('../tools/curation-editorial.cjs');
const catalogue = require('../tools/official-catalogue.cjs').load(undefined, false);
test('explicit editorial registry covers 208 puzzles in four standalone anthologies', () => {
  const data = load(path.resolve(__dirname, '..'), catalogue);
  assert.equal(data.entries.length, 208);
  assert.equal(data.collections.length, 4);
  assert.ok(data.collections.every((c) => c.puzzleIds.length === 52));
  for (const n of data.entries) {
    assert.ok(n.difficultyStatus.includes('provisional'));
    assert.ok(!('nativeDeductionTrace' in n));
    assert.ok(!('assets' in n));
    assert.ok(!('hints' in n));
  }
});
