'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load, aggregate } = require('../tools/official-catalogue.cjs');
const C = globalThis.AlibiCore;
const original = require('../content/catalog.json');
test('trusted catalogue validates 355 puzzles while retaining every published definition', () => {
  const catalogue = load();
  assert.equal(catalogue.puzzles.length, 355);
  assert.deepEqual(catalogue.puzzles.slice(0, original.puzzles.length), original.puzzles);
  assert.equal(new Set(catalogue.puzzles.map((p) => p.id)).size, 355);
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
