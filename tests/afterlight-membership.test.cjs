'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { writeFixture } = require('./helpers/afterlight-cli.cjs');
const { build } = require('../tools/curation/afterlight-pictures.cjs');
const blueprint = require('../content/curation/editorial/afterlight-blueprints.json');
const pack = require('../content/workshop/afterlight-pictures.json');

const invalid = [
  ['missing a study', (source) => source.studies.pop()],
  [
    'empty collection',
    (source) => {
      source.studies = [];
    },
  ],
  [
    'unexpected ID',
    (source) => {
      source.studies[9].id = 'afterlight-picture-99';
    },
  ],
  [
    'extra study',
    (source) => source.studies.push({ ...source.studies[0], id: 'afterlight-picture-11' }),
  ],
  [
    'sparse collection',
    (source) => {
      delete source.studies[5];
    },
  ],
  [
    'duplicate membership',
    (source) => {
      source.studies[9].id = source.studies[0].id;
    },
  ],
];
for (const [name, mutate] of invalid) {
  test(`Afterlight compiler refuses ${name} before reading pixel rows`, () => {
    const source = structuredClone(blueprint);
    mutate(source);
    for (const study of source.studies) {
      if (study)
        Object.defineProperty(study, 'rows', {
          get() {
            throw Error('PIXELS_READ_TOO_EARLY');
          },
        });
    }
    assert.throws(() => build(source), /complete ten-study Afterlight collection/);
  });
}

test('the fixed membership may be reordered without changing any puzzle definition', () => {
  const source = structuredClone(blueprint);
  source.studies.reverse();
  assert.deepEqual(build(source).puzzles, [...pack.puzzles].reverse());
});

test('--write leaves the existing pack byte-for-byte intact when a study is missing', () => {
  const source = structuredClone(blueprint);
  source.studies.pop();
  const { result, before, after } = writeFixture(source);
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.notEqual(result.status, 0, '--write must refuse an incomplete collection');
  assert.match(result.stderr, /complete ten-study Afterlight collection/);
  assert.deepEqual(after, before, 'a failed compile must not touch the existing bytes');
});
