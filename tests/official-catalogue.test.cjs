'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const registry = require('../content/official-packs.json');
const { load, aggregate } = require('../tools/official-catalogue.cjs');
const C = globalThis.AlibiCore;
const original = require('../content/catalog.json');
test('trusted catalogue validates every registered puzzle and retains published definitions', () => {
  const catalogue = load();
  const expected = registry.packs.flatMap(
    (file) => JSON.parse(fs.readFileSync(`content/${file}`, 'utf8')).puzzles,
  );
  assert.deepEqual(catalogue.puzzles, expected);
  assert.ok(catalogue.puzzles.length >= 382);
  assert.deepEqual(catalogue.puzzles.slice(0, original.puzzles.length), original.puzzles);
  assert.equal(new Set(catalogue.puzzles.map((p) => p.id)).size, expected.length);
  assert.throws(() => C.validatePack(catalogue, false), /150/);
});
test('official source checks global puzzle and pack IDs', () => {
  assert.throws(() => aggregate([original, original], false), /pack ID/);
  assert.throws(
    () => aggregate([original, { ...original, id: 'another-pack' }], false),
    /puzzle ID/,
  );
  assert.throws(() => aggregate([], false), /empty/);
});
