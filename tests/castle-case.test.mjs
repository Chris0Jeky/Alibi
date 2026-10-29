import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { initial, validate, clone, score } from '../src/castle/engine.mjs';
import { backup, mergeStates, prepareRestore } from '../src/castle/backup.mjs';
import { freshCase, validateCaseStudy, verdicts } from '../src/castle/case-state.mjs';
import Session from '../tools/case-session.cjs';

const bytes = fs.readFileSync('content/cases/reading-room-blackout.json');
const definition = JSON.parse(bytes);
const specimen = () => ({
  id: definition.id,
  revision: definition.revision,
  sourceSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  answers: [],
  drafts: definition.steps.map((s) => s.claims.map(() => ['', []])),
  hints: [0, 0, 0],
  revealed: [false, false, false],
});
const notebook = () => ({ ...initial(), caseStudy: specimen() });
const solution = (i) => definition.steps[i].claims.map((c) => [c.answer, c.evidence[0]]);

test('the compact save validator matches every verdict/source-set choice in the frozen specimen', () => {
  assert.deepEqual(freshCase(), specimen());
  assert.deepEqual(
    definition.steps.map((s) => s.requires),
    [[], ['window'], ['alarm']],
  );
  for (let stage = 0; stage < 3; stage++) {
    const complete = definition.steps.slice(0, stage).map((s) => s.id);
    const sources = Session.project(definition, complete, definition.steps[stage].id, true).records;
    for (let claim = 0; claim < 3; claim++)
      for (const verdict of verdicts) {
        for (let mask = 0; mask < 2 ** sources.length; mask++) {
          const row = clone(solution(stage));
          row[claim] = [verdict, sources.filter((r, j) => mask & (1 << j)).map((r) => r.id)];
          const accepted = Session.submit(
            definition,
            complete,
            definition.steps[stage].id,
            definition.steps[stage].claims.map((c, j) => ({
              id: c.id,
              verdict: row[j][0],
              citations: row[j][1],
            })),
          ).ok;
          const save = specimen();
          save.answers = [...Array.from({ length: stage }, (_, i) => solution(i)), row];
          if (accepted) assert.doesNotThrow(() => validateCaseStudy(save));
          else assert.throws(() => validateCaseStudy(save));
        }
      }
  }
});

test('old Castle saves remain field-for-field unchanged; the pinned fresh case is accepted', () => {
  assert.deepEqual(validate(initial()), initial());
  assert.deepEqual(validate(notebook()), notebook());
  assert.equal(score(notebook()), 0);
});

test('case drafts may be incomplete or wrong; accepted answers replay the frozen contract', () => {
  const n = notebook();
  n.caseStudy.drafts[0][0] = ['contradicted', ['checks']];
  assert.deepEqual(validate(n), n);
  n.caseStudy.answers = [solution(0)];
  assert.deepEqual(validate(n), n);
  n.caseStudy.answers[0][0][0] = 'contradicted';
  assert.throws(() => validate(n));
});

test('case old/future revision, source substitution and unknown fields are refused without mutation', () => {
  for (const mutate of [
    (c) => (c.revision = 0),
    (c) => (c.revision = 2),
    (c) => (c.sourceSha256 = '0'.repeat(64)),
    (c) => (c.id = 'some-other-case'),
    (c) => (c.future = true),
    (c) => c.drafts[0][0][1].push('custody'),
    (c) => c.drafts[0][0][1].push('checks', 'checks'),
    (c) => c.answers.push(solution(1)),
  ]) {
    const n = notebook();
    mutate(n.caseStudy);
    const before = clone(n);
    assert.throws(() => validate(n));
    assert.deepEqual(n, before);
  }
});

test('case backup merge is idempotent, retains drafts, and refuses divergent progress', () => {
  const n = notebook();
  n.caseStudy.answers = [solution(0), solution(1), solution(2)];
  assert.deepEqual(validate(n), n);
  assert.deepEqual(mergeStates(initial(), n), n);
  assert.deepEqual(mergeStates(n, initial()), n);
  assert.deepEqual(mergeStates(n, n), n);
  const other = clone(n);
  other.caseStudy.drafts[0][0][0] = 'supported';
  assert.throws(() => mergeStates(n, other), /case.*differ/i);
  const restored = prepareRestore(backup(other), n, true);
  assert.deepEqual(restored.caseStudy, other.caseStudy);
  assert.equal(restored.revision, 1);
});
