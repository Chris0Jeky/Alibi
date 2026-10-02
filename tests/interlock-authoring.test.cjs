'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { test } = require('node:test');
const Q = require('../tools/curation/study-quality.cjs');
const path = '../tools/curation/interlock.cjs';
const pool = require('../content/extra/night-routes.json').puzzles;

test('Interlock authorship boundary exists without runtime dependencies', () => {
  assert.ok(fs.existsSync('tools/curation/interlock.cjs'), 'offline selection boundary exists');
});
test('the complete 510-puzzle prefix and challenge inputs stay byte-identical', () => {
  const baseline = require('../content/curation/editorial/interlock-baseline.json');
  assert.equal(baseline.puzzleCount, 510);
  assert.equal(baseline.packCount, 30);
  assert.deepEqual(require('../content/official-packs.json').packs.slice(0, 30), baseline.packs);
  for (const file of baseline.files)
    assert.equal(
      crypto.createHash('sha256').update(fs.readFileSync(file.path)).digest('hex'),
      file.sha256,
      file.path,
    );
});
test('eligibility rejects missing, changed, nonunique and exhausted evidence', () => {
  const { eligible } = require(path);
  const p = pool.find((p) => p.type === 'network');
  const proof = Q.certify(p);
  assert.equal(eligible(p, null), false);
  assert.equal(eligible(p, { ...proof, semanticSolutions: 2 }), false);
  assert.equal(eligible({ ...p, title: 'changed' }, proof), false);
  assert.equal(eligible(p, { ...proof, nativeNodes: 250000 }), false);
  assert.equal(eligible(p, { ...proof, independentNodes: 500001 }), false);
  assert.equal(eligible(p, { ...proof, independentNodes: 1 }), false);
});
test('selection rejects structural reskins, bad counts and insufficient candidates', () => {
  const { select } = require(path);
  const p = pool.find((p) => p.type === 'network' && Q.metrics(p).junctions >= 8);
  assert.ok(p);
  const item = { seed: 3, p, proof: Q.certify(p) };
  const eligible = require(path).eligible(p, item.proof);
  assert.equal(eligible, true);
  assert.deepEqual(select([item], [], 1), [item]);
  assert.throws(() => select([item], [p], 1), /insufficient/i);
  assert.throws(() => select([item, { ...item, seed: 4 }], [], 2), /insufficient/i);
  for (const count of [-1, 0, 1.5, Infinity])
    assert.throws(() => select([item], [], count), /count/i);
});
