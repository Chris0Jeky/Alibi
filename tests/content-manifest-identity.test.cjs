'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { contentManifestRevision, sha256 } = require('../tools/platform-identity.cjs');

function expected(initial, deferred) {
  const frame = [
    'alibi-official-content-1',
    ['initial', initial],
    ['deferred', deferred],
  ];
  return crypto.createHash('sha256').update(JSON.stringify(frame)).digest('hex');
}

test('identity uses versioned full-source framing', () => {
  assert.equal(typeof contentManifestRevision, 'function');
  const actual = contentManifestRevision('initial', 'deferred');
  assert.equal(actual, expected('initial', 'deferred'));
  assert.match(contentManifestRevision('', ''), /^[0-9a-f]{64}$/);
});

test('either source changes identity with a fixed initial locator', () => {
  const before = contentManifestRevision('loader', 'definition-a');
  const changedInitial = contentManifestRevision('changed-loader', 'definition-a');
  const changedDeferred = contentManifestRevision('loader', 'definition-b');
  assert.notEqual(changedInitial, before);
  assert.notEqual(changedDeferred, before);
  assert.equal(contentManifestRevision('loader', 'definition-a'), before);
});

test('roles and partition boundaries prevent concatenation ambiguity', () => {
  const first = contentManifestRevision('first', 'second');
  const reversed = contentManifestRevision('second', 'first');
  assert.notEqual(first, reversed);
  assert.notEqual(contentManifestRevision('ab', 'c'), contentManifestRevision('a', 'bc'));
  assert.notEqual(contentManifestRevision('', 'x'), contentManifestRevision('x', ''));
});

test('Unicode and embedded separators retain exact source identity', () => {
  const initial = 'é\0"initial"';
  const deferred = '🗝\nsource';
  const actual = contentManifestRevision(initial, deferred);
  const changed = contentManifestRevision(initial, deferred + '\n');
  assert.equal(actual, expected(initial, deferred));
  assert.notEqual(actual, changed);
});

test('invalid source types fail rather than disappearing from framing', () => {
  for (const value of [undefined, null, 1, false, {}, [], Buffer.from('text')]) {
    assert.throws(() => contentManifestRevision(value, 'valid'), /source strings/);
    assert.throws(() => contentManifestRevision('valid', value), /source strings/);
  }
});

test('old identity already changed through hashed deferred filenames', () => {
  function initial(source) {
    const digest = sha256(source).slice(0, 12);
    return `loader('./official-deferred.${digest}.js')`;
  }
  assert.notEqual(sha256(initial('one')), sha256(initial('two')));
});
