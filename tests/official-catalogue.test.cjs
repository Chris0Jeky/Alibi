'use strict';
// Absolute pack paths never escape the content directory.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const { load, partition } = require('../tools/official-catalogue.cjs');

test('absolute official pack paths are rejected', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-catalogue-'));
  try {
    fs.mkdirSync(path.join(temp, 'content'));
    fs.writeFileSync(
      path.join(temp, 'content', 'official-packs.json'),
      JSON.stringify({ schemaVersion: 1, packs: ['/tmp/x.json'], deferred: [] }),
    );
    assert.throws(() => load(temp, false), /Invalid official pack path/);
    assert.throws(() => partition(temp, false), /Invalid official pack path/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('valid relative entries still load', () => {
  const catalog = load(root, false);
  assert.ok(catalog.puzzles.length > 0);
});
