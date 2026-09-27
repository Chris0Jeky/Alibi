'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const apiPath = path.join(__dirname, '../tools/case-session.cjs');
const S = fs.existsSync(apiPath) ? require(apiPath) : {};
const fixture = () =>
  JSON.parse(
    fs.readFileSync(path.join(__dirname, '../content/cases/reading-room-blackout.json'), 'utf8'),
  );
const answers = (d, id) =>
  d.steps
    .find((s) => s.id === id)
    .claims.map((c) => ({ id: c.id, verdict: c.answer, citations: [...c.evidence[0]] }));
test('session exports the bounded transitions', () => {
  for (const name of ['project', 'submit', 'hint', 'worked', 'available'])
    assert.equal(typeof S[name], 'function');
});
test('initial projection hides later records, answers and worked answers', () => {
  const d = fixture();
  const view = S.project(d, [], 'window', true);
  assert.deepEqual(
    view.records.map((r) => r.id),
    ['checks', 'model'],
  );
  assert.equal(view.claims.length, 3);
  assert.ok(!('answer' in view.claims[0]) && !('evidence' in view.claims[0]));
  assert.ok(!('workedAnswer' in view));
  assert.deepEqual(S.available(d, []), ['window']);
});
test('projection and hints never read answers or worked answers', () => {
  const d = fixture();
  for (const claim of d.steps[0].claims)
    for (const key of ['answer', 'evidence'])
      Object.defineProperty(claim, key, {
        get() {
          throw new Error('answer read');
        },
      });
  Object.defineProperty(d.steps[0], 'workedAnswer', {
    get() {
      throw new Error('reveal read');
    },
  });
  assert.equal(S.hint(S.project(d, [], 'window', false), 0).level, 'orientation');
});
for (const completed of [null, ['unknown'], ['window', 'window'], ['alarm'], new Array(1)]) {
  test(`rejects malformed completion state ${JSON.stringify(completed)}`, () =>
    assert.throws(() => S.available(fixture(), completed), /completion/));
}
test('unknown and locked steps cannot project, submit or reveal', () => {
  for (const step of ['unknown', 'attribution']) {
    const d = fixture();
    assert.throws(() => S.project(d, [], step, true), /step/);
    assert.throws(() => S.submit(d, [], step, []), /step/);
    assert.throws(() => S.worked(d, [], step, true), /step/);
  }
});
test('correct submissions progress all steps without mutating definition or inputs', () => {
  const d = fixture(),
    before = JSON.stringify(d);
  let completed = [];
  for (const step of d.steps) {
    const input = answers(d, step.id),
      old = JSON.stringify(input),
      previous = [...completed];
    const result = S.submit(d, completed, step.id, input);
    assert.equal(result.ok, true);
    assert.deepEqual(completed, previous);
    assert.equal(JSON.stringify(input), old);
    completed = result.completed;
  }
  assert.deepEqual(completed, ['window', 'alarm', 'attribution']);
  assert.equal(JSON.stringify(d), before);
});
test('repeat success is idempotent and an incorrect recheck cannot erase prior completion', () => {
  const d = fixture(),
    completed = ['window'];
  assert.deepEqual(S.submit(d, completed, 'window', answers(d, 'window')).completed, completed);
  const bad = answers(d, 'window');
  bad[0].verdict = 'contradicted';
  const result = S.submit(d, completed, 'window', bad);
  assert.equal(result.ok, false);
  assert.deepEqual(result.completed, completed);
  assert.equal(result.errors[0].code, 'verdict');
});
for (const mode of [
  'missing',
  'duplicate',
  'unknown',
  'wrong-verdict',
  'wrong-citation',
  'extra-citation',
  'duplicate-citation',
  'extra-field',
  'sparse',
]) {
  test(`rejects ${mode} without granting completion`, () => {
    const d = fixture();
    let input = answers(d, 'window');
    if (mode === 'missing') input.pop();
    if (mode === 'duplicate') input[1] = input[0];
    if (mode === 'unknown') input[0].id = 'unknown';
    if (mode === 'wrong-verdict') input[0].verdict = 'maybe';
    if (mode === 'wrong-citation') input[0].citations = ['maintenance'];
    if (mode === 'extra-citation') input[0].citations.push('admission');
    if (mode === 'duplicate-citation') input[0].citations.push(input[0].citations[0]);
    if (mode === 'extra-field') input[0].secret = true;
    if (mode === 'sparse') input = new Array(3);
    const result = S.submit(d, [], 'window', input);
    assert.equal(result.ok, false);
    assert.deepEqual(result.completed, []);
    assert.ok(result.errors.length);
  });
}
test('citation order does not matter and authored alternatives are accepted', () => {
  const d = fixture(),
    input = answers(d, 'window');
  input.forEach((a) => a.citations.reverse());
  assert.equal(S.submit(d, [], 'window', input).ok, true);
  d.steps[0].claims[0].evidence.push(['checks']);
  input[0].citations = ['checks'];
  assert.equal(S.submit(d, [], 'window', input).ok, true);
});
test('hint progression is bounded and revealing does not change completion', () => {
  const d = fixture(),
    done = [],
    view = S.project(d, done, 'window', true);
  assert.deepEqual(
    [0, 1, 2].map((n) => S.hint(view, n).level),
    ['orientation', 'constraint', 'method'],
  );
  for (const index of [-1, 3, 0.5, NaN]) assert.throws(() => S.hint(view, index), /hint/);
  assert.match(S.worked(d, done, 'window', true).text, /not established/);
  assert.deepEqual(done, []);
});
test('story modes preserve structural information and require a boolean mode', () => {
  const d = fixture();
  for (const story of [true, false]) {
    const v = S.project(d, ['window'], 'alarm', story);
    assert.deepEqual(
      v.records.map((r) => r.id),
      ['checks', 'model', 'bell-log', 'maintenance'],
    );
    assert.equal(v.claims[0].id, 'bell-silent');
  }
  assert.throws(() => S.project(d, [], 'window', 'false'), /story/);
});
