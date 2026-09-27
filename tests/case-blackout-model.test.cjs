'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const definition = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/cases/reading-room-blackout.json'), 'utf8'));
// Independent, deliberately small model of the explicit fictional premises.
// Times are minute offsets from 18:00, not a model of real-world clock accuracy.
function worlds(times = [3, 4, 5, 6, 7], actors = ['ari', 'bea']) {
  return times.flatMap((minute) => actors.flatMap((actor) => [false, true].map((doorOpened) => ({ minute, actor, doorOpened, bellConnected: false, bellHeard: false }))));
}
function classify(models, predicate) {
  if (!models.length) throw new Error('No admissible worlds');
  const yes = models.find((w) => predicate(w)), no = models.find((w) => !predicate(w));
  return { verdict: yes && no ? 'not-established' : yes ? 'supported' : 'contradicted', trueWitness: yes || null, falseWitness: no || null };
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
test('binds the semantic fixture to the reviewed premise text, not just answer IDs', () => {
  const hash = crypto.createHash('sha256').update(JSON.stringify(definition.records)).digest('hex');
  assert.equal(hash, 'b2b48b665bd4531952201833669fe22e4fd0bd41c44a36ea41a0569357459a99', 'Premises changed: review this model instead of blindly updating its digest.');
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
  assert.equal(classify(worlds([1, 3, 5]), predicates['bounded-window']).verdict, 'not-established');
  assert.equal(classify(worlds(undefined, ['ari', 'bea', 'cleo']), predicates['cleo-took']).verdict, 'not-established');
  assert.equal(classify(worlds([5]), predicates['exact-five']).verdict, 'supported');
});
test('certainty and counterexample logic is not derived from the authored answer', () => {
  for (const value of [true, false]) assert.equal(classify(worlds(), () => value).verdict, value ? 'supported' : 'contradicted');
  const wrong = { ...definition.steps[0].claims[0], answer: 'contradicted' };
  assert.notEqual(classify(worlds(), predicates[wrong.id]).verdict, wrong.answer);
});
