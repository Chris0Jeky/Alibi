'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const catalogue = JSON.parse(
  fs.readFileSync(path.join(root, 'assets-source/library/catalogue.json')),
);
test('Catalogue refers only to produced local files with matching hashes and truthful counts', () => {
  const ids = new Set();
  const files = new Set();
  for (const a of catalogue.assets) {
    assert.ok(a.title && a.provenance && a.integration && a.qa, a.id);
    assert.ok(!ids.has(a.id), 'unique design identity ' + a.id);
    ids.add(a.id);
    assert.ok(['original', 'reused'].includes(a.design));
    assert.ok(['current', 'proposed'].includes(a.status));
    assert.ok(a.files.length);
    for (const f of a.files) {
      assert.doesNotMatch(f.path, /(^\/|\.\.|\\|:)/);
      const bytes = fs.readFileSync(path.join(root, f.path));
      assert.equal(bytes.length, f.bytes, f.path);
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), f.sha256, f.path);
      files.add(f.path);
    }
  }
  assert.equal(catalogue.counts.uniqueFiles, files.size);
  assert.equal(
    catalogue.counts.original,
    catalogue.assets.filter((a) => a.design === 'original').length,
  );
  assert.equal(
    catalogue.counts.reused,
    catalogue.assets.filter((a) => a.design === 'reused').length,
  );
  assert.equal(catalogue.creditUse.remoteSubmissions, 0);
  assert.equal(catalogue.creditUse.newCharges, 0);
});
test('Solved evidence has an explicit spoiler boundary', () => {
  assert.equal(catalogue.assets.find((a) => a.id === 'existing-evidence').spoiler, true);
  assert.ok(
    catalogue.assets.filter((a) => a.category === 'highlights').every((a) => a.spoiler === false),
  );
  const gallery = fs.readFileSync(path.join(root, 'assets-source/library/index.html'), 'utf8');
  assert.doesNotMatch(gallery, /id="spoilers"[^>]*checked/);
});
