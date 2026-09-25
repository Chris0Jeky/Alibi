'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');

test('Night Gardens adds six original boards per placement family', () => {
  const filename = 'content/extra/night-gardens.json';
  assert.ok(fs.existsSync(filename), 'Night Gardens pack exists');
  const pack = JSON.parse(fs.readFileSync(filename, 'utf8'));
  for (const type of ['lightup', 'tents', 'aquarium']) {
    const count = pack.puzzles.filter((p) => p.type === type).length;
    assert.equal(count, 6);
  }
});

const { verifyCollection } = require('./helpers/night-collection-contract.cjs');
verifyCollection('night-gardens', ['lightup', 'tents', 'aquarium']);
