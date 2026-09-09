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
const fs = require('node:fs');
const vm = require('node:vm');
test('editorial presentation hides spoilers and never attaches to another revision', () => {
  const data = load(path.resolve(__dirname, '..'), catalogue);
  const ctx = { ALIBI_CURATION: data };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/curation.js'), 'utf8'), ctx);
  const p = catalogue.puzzles.find((p) => p.id === data.entries[0].id);
  assert.ok(!ctx.AlibiCuration.notes(p, false).includes('data-curation-answer'));
  assert.ok(ctx.AlibiCuration.notes(p, true).includes('data-curation-answer'));
  assert.equal(ctx.AlibiCuration.get({ ...p, revision: 2 }), undefined);
  assert.equal(ctx.AlibiCuration.get({ ...p, id: 'imported-puzzle' }), undefined);
  data.entries[0].goal = '<script>bad()</script>';
  assert.ok(ctx.AlibiCuration.notes(p, false).includes('&lt;script&gt;'));
});
