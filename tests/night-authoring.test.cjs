'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

test('night recipes expose deterministic candidates without writing catalogue files', () => {
  const file = path.join(__dirname, '../tools/curation/night-recipes.cjs');
  assert.ok(fs.existsSync(file), 'offline candidate recipes exist');
  const { random, candidate, families } = require(file);
  const a = random(25092026);
  const b = random(25092026);
  assert.deepEqual(Array.from({ length: 20 }, a), Array.from({ length: 20 }, b));
  assert.throws(() => candidate('missing', 1), /Unsupported family/);
  const expected = [
    'lightup',
    'tents',
    'aquarium',
    'network',
    'trail',
    'bridges',
    'binary',
    'futoshiki',
  ];
  assert.deepEqual(families, expected);
  assert.deepEqual(candidate('network', 25092026), candidate('network', 25092026));
});

test('Futoshiki pruning retains a definition below its authoring proof budget', () => {
  const { candidate } = require('../tools/curation/night-recipes.cjs');
  const { certify } = require('../tools/curation/study-quality.cjs');
  const p = candidate('futoshiki', 32171216);
  assert.ok(p, 'bounded candidate is retained');
  const result = globalThis.AlibiCore.solve(p, null, 2, 60000);
  assert.ok(result.nodes < 6000, `authoring search exceeded 6000 nodes: ${result.nodes}`);
  assert.equal(certify(p).semanticSolutions, 1);
});
