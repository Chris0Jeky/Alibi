'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { test } = require('node:test');
const baseline = require('../content/curation/editorial/night-baseline.json');
const registry = require('../content/official-packs.json');

const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('every published source pack and the legacy save catalogue remain byte-identical', () => {
  assert.equal(baseline.packs.length, 23);
  assert.equal(baseline.puzzleCount, 382);
  const paths = baseline.packs.map((entry) => entry.path);
  assert.deepEqual(registry.packs.slice(0, paths.length), paths);
  let count = 0;
  for (const entry of baseline.packs) {
    const file = `content/${entry.path}`;
    assert.equal(hash(file), entry.sha256, file);
    count += JSON.parse(fs.readFileSync(file, 'utf8')).puzzles.length;
  }
  assert.equal(count, 382);
  assert.equal(hash('content/legacy.json'), baseline.legacySha256);
});
