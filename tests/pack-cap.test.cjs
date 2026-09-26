'use strict';
// Issue #267: every pack-cap surface must agree on 150 puzzles per pack.
// Both validators derive the cap from core's MAX_PACK_PUZZLES. The import
// worker bundles core before engines (tools/build.cjs), and engines'
// validatePack overwrites core's, so the shared constant is the effective
// limit in every bundle. Schema, UI text and docs are separate surfaces
// pinned to the same value below.
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  { test } = require('node:test');
require('../src/core.js');
const CoreC = globalThis.AlibiCore;
// engines.js mutates the shared AlibiCore object, so capture core's validator
// before loading engines; otherwise both sides would exercise engines.
const coreValidatePack = CoreC.validatePack;
require('../src/engines.js');
const C = globalThis.AlibiCore;

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/catalog.json')));
const seed = catalog.puzzles.find((p) => p.type === 'sudoku' && p.size === 4);
function packWith(n) {
  const puzzles = [];
  for (let i = 0; i < n; i++) {
    const p = CoreC.clone(seed);
    p.id = `cap-probe-${i}`;
    puzzles.push(p);
  }
  return { schemaVersion: 1, id: 'cap-probe-pack', version: 1, title: 'Cap probe', puzzles };
}

test('the pack cap constant is 150', () => {
  assert.equal(CoreC.MAX_PACK_PUZZLES, 150, 'core exports the 150 cap');
  assert.equal(C.MAX_PACK_PUZZLES, 150, 'engines sees the same constant');
});

test('core and engines agree on the 150-puzzle pack cap', () => {
  assert.notEqual(coreValidatePack, C.validatePack, 'validators are distinct functions');
  for (const [validatePack, name] of [
    [coreValidatePack, 'core'],
    [C.validatePack, 'engines'],
  ]) {
    assert.doesNotThrow(() => validatePack(packWith(50), false), `${name} accepts 50`);
    assert.doesNotThrow(() => validatePack(packWith(51), false), `${name} accepts 51`);
    assert.doesNotThrow(() => validatePack(packWith(150), false), `${name} accepts 150`);
    assert.throws(() => validatePack(packWith(151), false), /150/, `${name} rejects 151`);
    assert.throws(() => validatePack(packWith(0), false), /1–150/, `${name} rejects 0`);
  }
});

test('core and engines agree on pack header rules', () => {
  const validators = [
    [coreValidatePack, 'core'],
    [C.validatePack, 'engines'],
  ];
  const cases = [
    ['baseline pack', (p) => p, true],
    ['constructor id', (p) => ({ ...p, id: 'constructor' }), false],
    ['prototype id', (p) => ({ ...p, id: 'prototype' }), false],
    ['version 0', (p) => ({ ...p, version: 0 }), false],
    ['version 999999', (p) => ({ ...p, version: 999999 }), true],
    ['version 1000000', (p) => ({ ...p, version: 1000000 }), false],
    ['blank title', (p) => ({ ...p, title: '   ' }), false],
  ];
  for (const [validatePack, name] of validators)
    for (const [label, mutate, valid] of cases) {
      const pack = mutate(packWith(1));
      if (valid) assert.doesNotThrow(() => validatePack(pack, false), `${name} accepts ${label}`);
      else assert.throws(() => validatePack(pack, false), Error, `${name} rejects ${label}`);
    }
});

test('schema, UI text and docs promise the same 150 cap', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../schemas/pack.schema.json')));
  assert.equal(schema.properties.puzzles.maxItems, 150, 'schema maxItems');
  const app = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
  assert.ok(app.includes('150 puzzles per pack'), 'workshop UI text');
  for (const doc of ['AUTHORING.md', 'CURATION.md', 'SECURITY-AND-PRIVACY.md']) {
    const text = fs.readFileSync(path.join(__dirname, '..', 'docs', doc), 'utf8');
    assert.ok(text.includes('150'), `${doc} mentions the 150 cap`);
  }
});
