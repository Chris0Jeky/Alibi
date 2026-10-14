'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('../tools/curation/afterlight-pictures.cjs');
const { writeFixture } = require('./helpers/afterlight-cli.cjs');
const blueprint = require('../content/curation/editorial/afterlight-blueprints.json');

const cases = [
  [
    'blank title',
    (s) => {
      s.studies[0].title = '  ';
    },
    /Invalid title/,
  ],
  [
    'oversized title',
    (s) => {
      s.studies[0].title = 'x'.repeat(91);
    },
    /Invalid title/,
  ],
  [
    'non-text title',
    (s) => {
      s.studies[0].title = {};
    },
    /Invalid title/,
  ],
  [
    'unsupported difficulty',
    (s) => {
      s.studies[0].difficulty = 'Impossible';
    },
    /Invalid title, subtitle or difficulty/,
  ],
  [
    'invalid pack ID',
    (s) => {
      s.packId = 'bad id!';
    },
    /Invalid pack header/,
  ],
  [
    'missing pack ID',
    (s) => {
      delete s.packId;
    },
    /Invalid pack header/,
  ],
  [
    'ambiguous drawing',
    (s) => {
      s.studies[0].rows = Array(15).fill('.'.repeat(15));
      s.studies[0].rows[0] = '#' + '.'.repeat(14);
      s.studies[0].rows[1] = '.#' + '.'.repeat(13);
    },
    /expected one solution, found at least 2/,
  ],
];
for (const [name, mutate, message] of cases) {
  test(`Afterlight build rejects ${name} through the production pack contract`, () => {
    const source = structuredClone(blueprint);
    mutate(source);
    const before = JSON.stringify(source);
    assert.throws(() => build(source), message);
    assert.equal(JSON.stringify(source), before, 'validation does not rewrite the source');
  });
  test(`Afterlight --write preserves the previous pack when rejecting ${name}`, () => {
    const source = structuredClone(blueprint);
    mutate(source);
    const { result, before, after } = writeFixture(source);
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0, 'invalid authoring must fail before writing');
    assert.match(
      result.stderr,
      message,
      'the expected validation must reject, not a missing module',
    );
    assert.deepEqual(after, before);
  });
}
test('the valid authoring command still reproduces the exact accepted pack', () => {
  const { result, before, after } = writeFixture(blueprint);
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(after, before);
});
