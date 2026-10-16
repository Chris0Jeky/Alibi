'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { contentManifestRevision } = require('../tools/build.cjs');
const { readIdentity, sha256 } = require('../tools/platform-identity.cjs');

test('content identity binds deferred definition bytes, not only the startup script', () => {
  const startup = 'startup-script';
  const revision = contentManifestRevision(startup, 'definitions-a');
  assert.equal(revision, sha256(`${startup}\0definitions-a`));
  assert.notEqual(revision, sha256(startup));
  assert.notEqual(revision, contentManifestRevision(startup, 'definitions-b'));
  assert.notEqual(revision, contentManifestRevision('other-startup', 'definitions-a'));
});

test('the emitted web identity covers the deferred definition file', () => {
  const root = path.resolve(__dirname, '..');
  const names = fs.readdirSync(path.join(root, 'dist/assets'));
  const read = (pattern) => {
    const found = names.filter((name) => pattern.test(name));
    assert.equal(found.length, 1, String(pattern));
    return fs.readFileSync(path.join(root, 'dist/assets', found[0]), 'utf8');
  };
  const content = read(/^official-content\.[a-f0-9]{12}\.js$/);
  const deferred = read(/^official-deferred\.[a-f0-9]{12}\.js$/);
  const { identity } = readIdentity(path.join(root, 'dist'));
  assert.equal(identity.contentManifestRevision, contentManifestRevision(content, deferred));
  assert.notEqual(identity.contentManifestRevision, sha256(content));
});
