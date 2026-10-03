'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build, serialize } = require('../tools/curation/afterlight-pictures.cjs');
const { writeFixture } = require('./helpers/afterlight-cli.cjs');
const blueprint = require('../content/curation/editorial/afterlight-blueprints.json');

const invalid = [
  ['missing', undefined],
  ['empty', ''],
  ['whitespace-only', ' \n\t '],
  ['null', null],
  ['numeric', 41],
  ['object', {}],
  ['array', []],
  ['over-limit', 'x'.repeat(1201)],
];
for (const [name, story] of invalid) {
  const candidate = () => {
    const source = structuredClone(blueprint);
    if (story === undefined) delete source.studies[0].story;
    else source.studies[0].story = story;
    return source;
  };
  test(`Afterlight build rejects ${name} story without rewriting the source`, () => {
    const source = candidate();
    const before = JSON.stringify(source);
    assert.throws(() => build(source), /Invalid story/);
    assert.equal(JSON.stringify(source), before);
  });
  test(`Afterlight --write preserves the previous pack for ${name} story`, () => {
    const { result, before, after } = writeFixture(candidate());
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid story/, 'the story guard must cause refusal');
    assert.deepEqual(after, before);
  });
}

test('maximum-length Unicode stories stay exact and below the existing import limit', () => {
  const source = structuredClone(blueprint);
  for (const study of source.studies) study.story = '\u6f22'.repeat(1200);
  const before = JSON.stringify(source);
  const pack = build(source);
  const output = serialize(pack);
  assert.ok(pack.puzzles.every((puzzle) => puzzle.story === source.studies[0].story));
  assert.ok(Buffer.byteLength(output) < 3 * 1024 * 1024);
  assert.equal(JSON.stringify(source), before);
  const { result, after } = writeFixture(source);
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(after.toString(), output);
});
