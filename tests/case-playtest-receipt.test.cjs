'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../tools/case-playtest-receipt.cjs');
const S = require('../tools/case-session.cjs');
const d = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../content/cases/reading-room-blackout.json'), 'utf8'),
);
const ids = d.steps.map((s) => s.id);
const fresh = () =>
  R.create({ caseId: d.id, revision: d.revision, sourceSha256: 'f'.repeat(64), stageIds: ids });
const correct = (step) =>
  step.claims.map((c) => ({ id: c.id, verdict: c.answer, citations: [...c.evidence[0]] }));
// Synthetic fixture text, labelled as such; not a human observation.
const SYNTHETIC = 'SYNTHETIC FIXTURE: not a tester observation';

test('collection is off until chosen: recorders before start leave nothing', () => {
  const r = fresh();
  assert.equal(r.enabled, false);
  r.mode(false);
  r.open('window');
  r.hint('window');
  r.reveal('window');
  r.submission('window', { ok: true }, correct(d.steps[0]));
  r.observe(SYNTHETIC);
  assert.equal(r.draft(), null);
  r.start(true, 'window');
  const draft = r.draft();
  assert.deepEqual(draft.modes, ['storyOn']);
  assert.equal(draft.observation, '');
  assert.deepEqual(draft.stages, [
    {
      id: 'window',
      outcome: 'not-completed',
      assisted: false,
      hints: 0,
      reveals: 0,
      submissions: 0,
      rejectedIncomplete: 0,
      rejectedReasoning: 0,
      afterCompletion: 0,
    },
  ]);
});

test('counts completed, abandoned and repeated stages through the real session engine', () => {
  const r = fresh();
  r.start(false, 'window');
  let completed = [];
  const [w, a] = d.steps;
  // Incomplete form: empty verdicts -> interface, not reasoning.
  const empty = w.claims.map((c) => ({ id: c.id, verdict: '', citations: [] }));
  let result = S.submit(d, completed, 'window', empty);
  r.submission('window', result, empty);
  // Filled but wrong verdict -> uncertain reasoning.
  const wrong = correct(w).map((x, i) =>
    i === 0 ? { ...x, verdict: x.verdict === 'supported' ? 'contradicted' : 'supported' } : x,
  );
  result = S.submit(d, completed, 'window', wrong);
  assert.equal(result.ok, false);
  r.submission('window', result, wrong);
  r.hint('window');
  result = S.submit(d, completed, 'window', correct(w));
  assert.equal(result.ok, true);
  r.submission('window', result, correct(w));
  completed = result.completed;
  // Repeated check of a completed stage is counted apart from its submissions.
  r.submission('window', S.submit(d, completed, 'window', correct(w)), correct(w));
  r.mode(true);
  r.mode(false);
  // Abandoned: opened, revealed, one reasoning rejection, never completed.
  r.open('alarm');
  r.reveal('alarm');
  const wrongAlarm = correct(a).map((x) => ({ ...x, citations: [d.records[0].id] }));
  r.submission('alarm', S.submit(d, completed, 'alarm', wrongAlarm), wrongAlarm);
  r.hint('unknown-stage');
  const draft = r.draft();
  assert.deepEqual(draft.modes, ['storyOff', 'storyOn']);
  assert.equal(draft.assisted, true);
  assert.deepEqual(
    draft.stages.map((s) => s.id),
    ['window', 'alarm'],
  );
  assert.deepEqual(draft.stages[0], {
    id: 'window',
    outcome: 'completed',
    assisted: true,
    hints: 1,
    reveals: 0,
    submissions: 3,
    rejectedIncomplete: 1,
    rejectedReasoning: 1,
    afterCompletion: 1,
  });
  assert.deepEqual(draft.stages[1], {
    id: 'alarm',
    outcome: 'not-completed',
    assisted: true,
    hints: 0,
    reveals: 1,
    submissions: 1,
    rejectedIncomplete: 0,
    rejectedReasoning: 1,
    afterCompletion: 0,
  });
});

test('unassisted run is distinguished from an assisted one', () => {
  const r = fresh();
  r.start(true, 'window');
  r.submission('window', { ok: true }, correct(d.steps[0]));
  assert.equal(r.draft().assisted, false);
  assert.equal(r.draft().stages[0].assisted, false);
});

test('consent on an already completed stage preserves its outcome and repeat checks', () => {
  const r = fresh();
  r.start(true, 'window', true);
  assert.equal(r.draft().stages[0].outcome, 'completed');
  const empty = d.steps[0].claims.map((c) => ({ id: c.id, verdict: '', citations: [] }));
  r.submission('window', S.submit(d, ['window'], 'window', empty), empty);
  const stage = r.draft().stages[0];
  assert.equal(stage.submissions, 0);
  assert.equal(stage.afterCompletion, 1);
  assert.equal(stage.rejectedIncomplete, 0);
  assert.equal(stage.outcome, 'completed');
  r.cancel();
  r.start(false, 'alarm');
  r.open('window', true);
  assert.equal(r.draft().stages[0].outcome, 'completed');
});

test('allowlist: answers, citations, unknown fields and timestamps never reach the report', () => {
  const r = fresh();
  r.start(true, 'window');
  const answers = correct(d.steps[0]).map((x) => ({ ...x, note: 'PRIVATE-NOTE' }));
  r.submission('window', { ok: false, secret: 'PRIVATE-RESULT', errors: [] }, answers);
  r.hint('window', { answer: 'PRIVATE-ARG' });
  // The fixed limitations prose is constant; everything else is scanned for leaks.
  const text = JSON.stringify({ ...r.draft(), limitations: undefined });
  for (const leak of ['PRIVATE', 'evidence', 'citations', 'verdict', ...d.records.map((x) => x.id)])
    assert.ok(!text.includes(leak), leak);
  assert.doesNotMatch(text, /time|date|agent|device|20\d\d-/i);
  assert.deepEqual(Object.keys(r.draft()), [
    'format',
    'caseId',
    'revision',
    'sourceSha256',
    'modes',
    'assisted',
    'stages',
    'truncated',
    'observation',
    'limitations',
  ]);
});

test('event count and observation text are bounded', () => {
  const r = fresh();
  r.start(true, 'window');
  for (let i = 0; i < R.MAX_EVENTS + 50; i++) r.hint('window');
  const draft = r.draft();
  assert.equal(draft.truncated, true);
  assert.equal(draft.stages[0].hints, R.MAX_EVENTS - 1);
  r.observe(`${SYNTHETIC} ${'x'.repeat(R.MAX_OBSERVATION * 2)}`);
  assert.equal(r.draft().observation.length, R.MAX_OBSERVATION);
});

test('cancel discards everything and returns to off; a later start is fresh', () => {
  const r = fresh();
  r.start(false, 'window');
  r.hint('window');
  r.observe(SYNTHETIC);
  r.cancel();
  assert.equal(r.enabled, false);
  assert.equal(r.draft(), null);
  r.hint('window');
  r.start(true, 'alarm');
  const draft = r.draft();
  assert.deepEqual(draft.modes, ['storyOn']);
  assert.equal(draft.observation, '');
  assert.deepEqual(
    draft.stages.map((s) => [s.id, s.hints]),
    [['alarm', 0]],
  );
});
