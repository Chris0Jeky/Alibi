'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('../tools/curation/afterlight-pictures.cjs');
const { writeFixture } = require('./helpers/afterlight-cli.cjs');
const blueprint = require('../content/curation/editorial/afterlight-blueprints.json');

const message = /Invalid pack header: expected alibi-afterlight-workshop/;

test('Afterlight refuses a different syntactically valid pack identity', () => {
  const source = structuredClone(blueprint);
  source.packId = 'alibi-afterlight-workshop-v2';
  const before = JSON.stringify(source);
  assert.throws(() => build(source), message);
  assert.equal(JSON.stringify(source), before);
});

test('--write preserves the existing collection when a valid-looking pack ID changes', () => {
  const source = structuredClone(blueprint);
  source.packId = 'alibi-afterlight-workshop-v2';
  const { result, before, after } = writeFixture(source);
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, message, 'refusal must come from identity validation');
  assert.deepEqual(after, before, 'neither header nor puzzle bytes may be replaced');
});
