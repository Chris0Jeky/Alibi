'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { contentManifestRevision, sha256 } = require('../tools/platform-identity.cjs');
const expected = (initial, deferred) =>
  crypto
    .createHash('sha256')
    .update(
      JSON.stringify([
        'alibi-official-content-1',
        ['initial', initial],
        ['deferred', deferred],
      ]),
    )
    .digest('hex');

test('official-content identity uses the documented versioned full-source framing', () => {
  assert.equal(typeof contentManifestRevision, 'function');
  assert.equal(contentManifestRevision('initial', 'deferred'), expected('initial', 'deferred'));
  assert.match(contentManifestRevision('', ''), /^[0-9a-f]{64}$/);
});

test('either source changes identity even when the initial deferred locator stays fixed', () => {
  const before = contentManifestRevision('loader', 'definition-a');
  assert.notEqual(contentManifestRevision('changed-loader', 'definition-a'), before);
  assert.notEqual(contentManifestRevision('loader', 'definition-b'), before);
  assert.equal(contentManifestRevision('loader', 'definition-a'), before);
});

test('roles and partition boundaries cannot collapse into ambiguous concatenation', () => {
  assert.notEqual(contentManifestRevision('ab', 'c'), contentManifestRevision('a', 'bc'));
  assert.notEqual(
    contentManifestRevision('first', 'second'),
    contentManifestRevision('second', 'first'),
  );
  assert.notEqual(contentManifestRevision('', 'x'), contentManifestRevision('x', ''));
});

test('Unicode, embedded separators and quotes retain exact source identity', () => {
  const initial = 'é\0"initial"',
    deferred = '🗝\nsource';
  assert.equal(contentManifestRevision(initial, deferred), expected(initial, deferred));
  assert.notEqual(
    contentManifestRevision(initial, deferred),
    contentManifestRevision(initial, deferred + '\n'),
  );
});

test('invalid source types fail rather than disappearing from JSON framing', () => {
  for (const value of [undefined, null, 1, false, {}, [], Buffer.from('text')]) {
    assert.throws(() => contentManifestRevision(value, 'valid'), /source strings/);
    assert.throws(() => contentManifestRevision('valid', value), /source strings/);
  }
});

test('historical initial-only identity already changed through hashed deferred filenames', () => {
  const initial = (source) => `loader('./official-deferred.${sha256(source).slice(0, 12)}.js')`;
  assert.notEqual(sha256(initial('one')), sha256(initial('two')));
});
