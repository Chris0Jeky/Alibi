'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { classifyModels: classify, createModelReceipt } = require('../tools/case-model.cjs');
const source = fs.readFileSync(
  path.join(__dirname, '../content/cases/reading-room-blackout.json'),
  'utf8',
);
const definition = JSON.parse(source);
// Independent, deliberately small model of the explicit fictional premises.
// Times are minute offsets from 18:00, not a model of real-world clock accuracy.
function worlds(times = [3, 4, 5, 6, 7], actors = ['ari', 'bea']) {
  return times.flatMap((minute) =>
    actors.flatMap((actor) =>
      [false, true].map((doorOpened) => ({
        minute,
        actor,
        doorOpened,
        bellConnected: false,
        bellHeard: false,
      })),
    ),
  );
}
const predicates = {
  'bounded-window': (w) => w.minute > 2 && w.minute < 8,
  'exact-five': (w) => w.minute === 5,
  'before-two': (w) => w.minute < 2,
  'bell-silent': (w) => !w.bellHeard,
  'door-unused': (w) => !w.doorOpened,
  'bell-live': (w) => w.bellConnected,
  'ari-took': (w) => w.actor === 'ari',
  'cleo-took': (w) => w.actor === 'cleo',
  'bea-access': () => true, // Explicit complete admission roster, not inference from the actor.
};
const model = {
  id: 'blackout-whole-minute',
  revision: 1,
  caseId: 'reading-room-blackout',
  caseRevision: 1,
  sourceSha256: '6b86c2495fdf4b8c720203b00b4765772aeac0505614b31be4b1aa378cfb6a2c',
  assumptions: [
    'Accurate synchronized instantaneous checks; one whole-minute removal with no return.',
    'Removal is strictly between 18:02 and 18:08.',
    'Only Ari and Bea have access; exactly one permitted actor removes the folio.',
    'The bell is disconnected at 18:05 and unheard; either door state is possible.',
    'Bea has access independently of which permitted actor removed the folio.',
  ],
  bounds: {
    minuteOffsetsFrom1800: [3, 4, 5, 6, 7],
    actors: ['ari', 'bea'],
    doorOpened: [false, true],
    bellConnected: [false],
    bellHeard: [false],
  },
  maxModels: 20,
  models: worlds(),
  predicates,
};

test('reusable receipt binds the complete source and compares independent predicates to the key', () => {
  const receipt = createModelReceipt(source, model);
  assert.equal(receipt.status, 'classified');
  assert.equal(receipt.modelCount, 20);
  assert.equal(receipt.claims.length, 9);
  for (const claim of receipt.claims) {
    assert.equal(claim.matchesAuthoredAnswer, true, claim.claimId);
    for (const [witness, expected] of [
      [claim.trueWitness, true],
      [claim.falseWitness, false],
    ])
      if (witness) assert.equal(predicates[claim.claimId](witness.model), expected);
  }
  assert.equal(JSON.stringify(receipt), JSON.stringify(createModelReceipt(source, model)));
});

// Mutant source bindings are intentional test inputs; the reviewed baseline hash above stays pinned.
function mutantReceipt(definition, overrides) {
  const text = JSON.stringify(definition);
  return createModelReceipt(text, {
    ...model,
    revision: 2,
    sourceSha256: crypto.createHash('sha256').update(text).digest('hex'),
    ...overrides,
  });
}
const resultFor = (receipt, id) => receipt.claims.find((c) => c.claimId === id);

test('mutating one hearing clue changes the deduction and rejects the unchanged authored key', () => {
  const changed = structuredClone(definition);
  for (const mode of ['storyOn', 'storyOff'])
    changed.records.find((r) => r.id === 'bell-log').text[mode] =
      'The caretaker heard a bell between the two checks. This reports only what was heard.';
  const receipt = mutantReceipt(changed, {
    assumptions: [
      ...model.assumptions.slice(0, 3),
      'A bell was heard; neither door state is identified.',
      model.assumptions[4],
    ],
    bounds: { ...model.bounds, bellHeard: [true] },
    models: worlds().map((w) => ({ ...w, bellHeard: true })),
  });
  assert.equal(receipt.status, 'answer-mismatch');
  assert.equal(resultFor(receipt, 'bell-silent').verdict, 'contradicted');
  assert.equal(resultFor(receipt, 'bell-silent').matchesAuthoredAnswer, false);
});

test('removing the exhaustive actor premise retains a Cleo counterexample', () => {
  const receipt = createModelReceipt(source, {
    ...model,
    revision: 2,
    assumptions: model.assumptions.map((s, i) =>
      i === 2 ? 'Counterfactual: remove the exhaustive actor restriction; Cleo may act.' : s,
    ),
    bounds: { ...model.bounds, actors: ['ari', 'bea', 'cleo'] },
    maxModels: 30,
    models: worlds(undefined, ['ari', 'bea', 'cleo']),
  });
  const claim = resultFor(receipt, 'cleo-took');
  assert.equal(receipt.status, 'answer-mismatch');
  assert.equal(claim.verdict, 'not-established');
  assert.equal(claim.trueWitness.model.actor, 'cleo');
  assert.notEqual(claim.falseWitness.model.actor, 'cleo');
});

test('moving the later observation boundary admits 18:08 and invalidates the old strict window', () => {
  const changed = structuredClone(definition);
  for (const mode of ['storyOn', 'storyOff'])
    changed.records[0].text[mode] = changed.records[0].text[mode].replace('18:08', '18:09');
  const minutes = [3, 4, 5, 6, 7, 8];
  const receipt = mutantReceipt(changed, {
    assumptions: model.assumptions.map((s, i) =>
      i === 1 ? 'Removal is strictly between 18:02 and 18:09.' : s,
    ),
    bounds: { ...model.bounds, minuteOffsetsFrom1800: minutes },
    maxModels: 24,
    models: worlds(minutes),
  });
  const claim = resultFor(receipt, 'bounded-window');
  assert.equal(receipt.status, 'answer-mismatch');
  assert.equal(claim.verdict, 'not-established');
  assert.equal(claim.falseWitness.model.minute, 8);
  assert.equal(claim.matchesAuthoredAnswer, false);
});

test('an ambiguous culprit key cannot be certified by changing the authored answer', () => {
  const changed = structuredClone(definition);
  changed.steps[2].claims[0].answer = 'supported';
  const receipt = mutantReceipt(changed, {});
  assert.equal(receipt.status, 'answer-mismatch');
  assert.equal(resultFor(receipt, 'ari-took').verdict, 'not-established');
  assert.equal(resultFor(receipt, 'ari-took').matchesAuthoredAnswer, false);
});
test('binds the semantic fixture to the reviewed premise text, not just answer IDs', () => {
  const hash = crypto.createHash('sha256').update(JSON.stringify(definition.records)).digest('hex');
  assert.equal(
    hash,
    'b2b48b665bd4531952201833669fe22e4fd0bd41c44a36ea41a0569357459a99',
    'Premises changed: review this model instead of blindly updating its digest.',
  );
});
for (const claim of definition.steps.flatMap((s) => s.claims)) {
  test(`bounded model verifies ${claim.id}`, () => {
    assert.equal(typeof predicates[claim.id], 'function');
    const result = classify(worlds(), predicates[claim.id]);
    assert.equal(result.verdict, claim.answer);
    if (result.verdict === 'not-established') assert.ok(result.trueWitness && result.falseWitness);
  });
}
test('has 20 nonempty admissible worlds and rejects vacuous proof', () => {
  assert.equal(worlds().length, 20);
  assert.throws(() => classify([], () => true), /No admissible/);
});
test('removing time and access premises changes conclusions, proving they matter', () => {
  assert.equal(
    classify(worlds([1, 3, 5]), predicates['bounded-window']).verdict,
    'not-established',
  );
  assert.equal(
    classify(worlds(undefined, ['ari', 'bea', 'cleo']), predicates['cleo-took']).verdict,
    'not-established',
  );
  assert.equal(classify(worlds([5]), predicates['exact-five']).verdict, 'supported');
});
test('certainty and counterexample logic is not derived from the authored answer', () => {
  for (const value of [true, false])
    assert.equal(classify(worlds(), () => value).verdict, value ? 'supported' : 'contradicted');
  const wrong = { ...definition.steps[0].claims[0], answer: 'contradicted' };
  assert.notEqual(classify(worlds(), predicates[wrong.id]).verdict, wrong.answer);
});

test('rejects an undefined predicate result instead of certifying a contradiction', () => {
  assert.throws(() => classify(worlds(), () => undefined), /boolean/);
});
