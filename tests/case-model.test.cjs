'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { classifyModels, createModelReceipt } = require('../tools/case-model.cjs');
const source = fs.readFileSync(
  path.join(__dirname, '../content/cases/reading-room-blackout.json'),
  'utf8',
);
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
function fixture() {
  return {
    id: 'receipt-controls',
    revision: 1,
    caseId: 'reading-room-blackout',
    caseRevision: 1,
    sourceSha256: sha256(source),
    assumptions: ['Synthetic receipt controls, not an interpretation of the case.'],
    bounds: { value: [false, true] },
    maxModels: 2,
    models: [{ value: false }, { value: true }],
    predicates: { 'bounded-window': (w) => w.value },
  };
}

test('classifies universal truth, universal falsity and ambiguity with replayable witnesses', () => {
  const models = [{ value: false }, { value: true }];
  assert.deepEqual(
    classifyModels(models, () => true),
    {
      verdict: 'supported',
      trueWitness: { model: { value: false } },
      falseWitness: null,
    },
  );
  assert.deepEqual(
    classifyModels(models, () => false),
    {
      verdict: 'contradicted',
      trueWitness: null,
      falseWitness: { model: { value: false } },
    },
  );
  const ambiguous = classifyModels(models, (w) => w.value);
  assert.equal(ambiguous.verdict, 'not-established');
  assert.equal(ambiguous.trueWitness.model.value, true);
  assert.equal(ambiguous.falseWitness.model.value, false);
});

test('refuses zero worlds even for an unsupported predicate', () => {
  for (const predicate of [() => true, () => false, undefined])
    assert.throws(() => classifyModels([], predicate), /No admissible worlds/);
  assert.throws(() => createModelReceipt(source, { ...fixture(), models: [] }), /No admissible/);
});

test('evaluates every world once and refuses invalid, asynchronous or mutating predicates', () => {
  const seen = [];
  const models = [{ n: 1 }, { n: 2 }, { n: 3 }];
  classifyModels(models, (w) => {
    seen.push(w.n);
    return w.n === 1;
  });
  assert.deepEqual(seen, [1, 2, 3]);
  for (const invalid of [undefined, null, 0, 1, 'true', Promise.resolve(true)])
    assert.throws(() => classifyModels(models, () => invalid), /boolean/);
  assert.throws(() => classifyModels(models, (w) => (w.n < 3 ? w.n === 1 : undefined)), /boolean/);
  assert.throws(
    () =>
      classifyModels(models, (w) => {
        w.n = 4;
        return true;
      }),
    /mutate/,
  );
  assert.deepEqual(models, [{ n: 1 }, { n: 2 }, { n: 3 }]);
});

test('requires a finite complete array within the declared ceiling', () => {
  for (const limit of [0, -1, 1.5, Infinity, 100001])
    assert.throws(() => classifyModels([{}], () => true, limit), /maxModels/);
  assert.throws(() => classifyModels([{}, {}], () => true, 1), /maxModels/);
  assert.throws(() => classifyModels(new Set([{}]), () => true), /array/);
  for (const models of [new Array(1), [undefined], [{ n: NaN }], [{ n: Infinity }], [new Date()]])
    assert.throws(() => classifyModels(models, () => true), /Sparse|finite JSON/);
  assert.equal(classifyModels([null], () => true).verdict, 'supported');
});

test('missing predicates and unsupported adapters produce explicit non-proof receipts', () => {
  const partial = createModelReceipt(source, fixture());
  assert.equal(partial.status, 'unsupported-model');
  assert.equal(partial.claims[0].verdict, 'not-established');
  assert.equal(partial.claims[0].matchesAuthoredAnswer, false);
  assert.equal(partial.claims[1].verdict, 'unsupported-model');
  assert.equal(partial.claims[1].matchesAuthoredAnswer, null);
  assert.equal(partial.claims[1].trueWitness, null);
  const model = { ...fixture(), models: null, unsupportedReason: 'No bounded time adapter' };
  const receipt = createModelReceipt(source, model);
  assert.equal(receipt.modelCount, null);
  assert.ok(
    receipt.claims.every(
      (c) => c.verdict === 'unsupported-model' && c.reason === model.unsupportedReason,
    ),
  );
  delete model.unsupportedReason;
  assert.throws(() => createModelReceipt(source, model), /reason/);
});

test('receipt bytes and witnesses are deterministic across object and model ordering', () => {
  const first = fixture();
  first.models = [
    { z: 1, value: true },
    { value: false, z: 0 },
  ];
  const second = {
    ...first,
    models: [
      { z: 0, value: false },
      { value: true, z: 1 },
    ],
  };
  const receipt = createModelReceipt(source, first);
  assert.equal(JSON.stringify(receipt), JSON.stringify(createModelReceipt(source, second)));
  assert.equal(JSON.stringify(receipt), JSON.stringify(createModelReceipt(source, first)));
  assert.equal(receipt.scope, 'bounded-model-only');
  assert.equal(receipt.caseRevision, 1);
  assert.equal(receipt.sourceSha256, sha256(source));
  assert.deepEqual(receipt.model.assumptions, first.assumptions);
  assert.deepEqual(receipt.model.bounds, first.bounds);
});

test('refuses stale case identity, revision and source bytes before evaluating a predicate', () => {
  for (const change of [
    { caseId: 'another-case' },
    { caseRevision: 2 },
    { sourceSha256: '0'.repeat(64) },
  ])
    assert.throws(() => createModelReceipt(source, { ...fixture(), ...change }), /binding/);
  assert.throws(() => createModelReceipt(`${source}\n`, fixture()), /binding/);
  const revised = JSON.stringify({ ...JSON.parse(source), revision: 2 });
  assert.throws(
    () => createModelReceipt(revised, { ...fixture(), sourceSha256: sha256(revised) }),
    /binding/,
  );
});

test('requires explicit assumptions, bounds and model revision', () => {
  for (const change of [
    { assumptions: [] },
    { assumptions: [''] },
    { bounds: {} },
    { bounds: 'unbounded' },
    { bounds: { value: [] } },
    { bounds: { value: Infinity } },
    { revision: 0 },
  ])
    assert.throws(() => createModelReceipt(source, { ...fixture(), ...change }), /required/);
});
