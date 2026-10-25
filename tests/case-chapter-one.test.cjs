'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { validateCase } = require('../tools/case-authoring.cjs');
const adapter = path.join(__dirname, '../tools/case-chapter-one.cjs');
const { chapterOneReceipt, validateChapterOneProjection } = require(adapter);
const prose = (text) => ({ storyOn: text, storyOff: text });
function fixture() {
  return {
    format: 'postern-case-1',
    id: 'seventeenth-minute',
    revision: 1,
    title: 'The Seventeenth Minute',
    intro: prose('Diagnostic fixture.'),
    ending: prose('Possibility does not establish presence.'),
    provenance: 'Chapter I diagnostic fixture, not published story.',
    records: ['maintenance', 'ticket', 'path'].map((id) => ({
      id,
      title: id,
      kind: 'record',
      source: `src/castle/content.mjs#evidence.${id}`,
      at: 'inference',
      text: prose('A source record.'),
    })),
    steps: [
      {
        id: 'inference',
        title: 'Inference',
        prompt: prose('Compare the records.'),
        requires: [],
        claims: [
          ['clock-corrected', 'supported', ['maintenance', 'ticket']],
          ['journey-feasible', 'supported', ['maintenance', 'ticket', 'path']],
          ['presence-established', 'not-established', ['maintenance', 'ticket', 'path']],
        ].map(([id, answer, records]) => ({ id, answer, text: prose(id), evidence: [records] })),
        hints: ['orientation', 'constraint', 'method'].map((level) => ({
          level,
          text: prose('Compare sources.'),
          records: ['maintenance', 'ticket', 'path'],
        })),
        workedAnswer: {
          text: prose('A feasible journey.'),
          records: ['maintenance', 'ticket', 'path'],
        },
      },
    ],
  };
}
test('Chapter I rejects a structurally valid journey claim with hidden clock/route premises', () => {
  const definition = fixture();
  assert.doesNotThrow(() => validateChapterOneProjection(definition));
  definition.steps[0].claims[1].evidence = [['ticket']];
  assert.doesNotThrow(() => validateCase(definition), 'generic validation is structure-only');
  assert.throws(() => validateChapterOneProjection(definition), /journey-feasible.*premise/);
});

test('receipt is deterministic, binds exact source bytes, and copies the published records', async () => {
  const { default: W } = await import('../src/castle/content.mjs');
  const before = JSON.stringify(W);
  const result = await chapterOneReceipt();
  assert.deepEqual(await chapterOneReceipt(), result);
  assert.equal(result.publishable, false);
  assert.equal(result.definition.id, W.chapter.id);
  assert.equal(result.definition.revision, W.version);
  assert.equal(result.definition.ending.storyOn, W.chapter.ending);
  assert.equal(
    result.receipt.projectionSha256,
    crypto.createHash('sha256').update(JSON.stringify(result.definition)).digest('hex'),
  );
  for (const source of result.receipt.sources) {
    const bytes = fs.readFileSync(path.join(__dirname, '..', source.file));
    assert.equal(source.bytes, bytes.length);
    assert.equal(source.sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
  }
  for (const r of result.definition.records) {
    const published = W.evidence.find((p) => p.id === r.id);
    assert.deepEqual(r.text, prose(published.text));
    assert.equal(r.title, published.title);
    assert.equal(r.source, `src/castle/content.mjs#evidence.${r.id}`);
    assert.equal(
      result.mapping.find((m) => m.record === r.id).publishedRequires,
      published.requires,
    );
  }
  assert.equal(JSON.stringify(W), before);
  assert.deepEqual(result.comparison.caseAuthoring, validateCase(result.definition));
});

test('actual Chapter I projection rejects duplicates, cycles and hidden future/sibling sources', async () => {
  const { definition } = await chapterOneReceipt();
  const mutate = (fn, pattern) => {
    const copy = structuredClone(definition);
    fn(copy);
    assert.throws(() => validateChapterOneProjection(copy), pattern);
  };
  mutate((d) => d.records.push(d.records[0]), /duplicate ID/);
  mutate((d) => d.steps[2].claims.push(d.steps[2].claims[0]), /duplicate ID/);
  mutate((d) => d.steps[0].requires.push('inference'), /cycle/);
  for (const at of ['route', 'inference']) {
    for (const channel of ['claim', 'hint', 'workedAnswer']) {
      mutate((d) => {
        d.records.push({ ...d.records[1], id: 'hidden-record', at });
        if (at === 'route') d.steps[1].requires = []; // sibling of clock
        const step = d.steps[0];
        if (channel === 'claim') step.claims[0].evidence = [['hidden-record']];
        if (channel === 'hint') step.hints[0].records = ['hidden-record'];
        if (channel === 'workedAnswer') step.workedAnswer.records = ['hidden-record'];
      }, /not visible/);
    }
  }
});

test('each diagnostic verdict retains every named premise, including alternative bundles', async () => {
  const { definition } = await chapterOneReceipt();
  for (let step = 0; step < definition.steps.length; step++) {
    const records = definition.steps[step].claims[0].evidence[0];
    for (const record of records) {
      const copy = structuredClone(definition);
      copy.steps[step].claims[0].evidence = [records.filter((r) => r !== record)];
      assert.doesNotThrow(() => validateCase(copy));
      assert.throws(() => validateChapterOneProjection(copy), /premise/);
    }
  }
  const copy = structuredClone(definition);
  copy.steps[1].claims[0].evidence.push(['ticket']);
  assert.throws(() => validateChapterOneProjection(copy), /premise/);
  copy.steps[1].claims[0].evidence.pop();
  copy.steps[2].claims[0].answer = 'supported';
  assert.throws(() => validateChapterOneProjection(copy), /presence-established.*verdict/);
});

test('feasibility and established presence stay distinct, with no continuation attribution', async () => {
  const result = await chapterOneReceipt();
  const claims = result.definition.steps.flatMap((s) => s.claims);
  assert.equal(claims.find((c) => c.id === 'journey-feasible').answer, 'supported');
  assert.equal(claims.find((c) => c.id === 'presence-established').answer, 'not-established');
  assert.match(
    result.comparison.runtime.modelBoundary,
    /possible arrival is not a witnessed arrival/,
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /Iona|garden-log|margin-author|wrenmere\.ch[2-5]|warning-intended/,
  );
  assert.deepEqual(
    result.definition.records.map((r) => r.id),
    ['maintenance', 'ticket', 'path'],
  );
  assert.deepEqual(
    result.mismatches.map((m) => m.concept),
    [
      'revision-domain',
      'story-modes',
      'hint-ladder',
      'derived-fact',
      'exposure-and-or-access',
      'bounded-numeric-predicate',
    ],
  );
});

test('existing authored-object validation remains a separate, stricter inspection contract', async () => {
  const O = await import('../src/castle/objects.mjs');
  const result = await chapterOneReceipt();
  assert.equal(O.validateAuthoredCollection(O.authoredObjects), O.authoredObjects);
  assert.equal(result.comparison.authoredObjects.count, 9);
  assert.equal(result.comparison.authoredObjects.valid, true);
  assert.deepEqual(result.comparison.authoredObjects.overlap, []);
  assert.throws(
    () => O.validateAuthoredCollection(result.definition.records),
    /unknown field|missing field/,
  );
  assert.throws(
    () => O.validateAuthoredCollection([...O.authoredObjects, O.authoredObjects[0]]),
    /Duplicate/,
  );
});

test('adapter refuses missing or duplicated published record IDs rather than substituting a premise', async () => {
  const { default: W } = await import('../src/castle/content.mjs');
  const original = W.evidence;
  try {
    W.evidence = original.filter((r) => r.id !== 'maintenance');
    await assert.rejects(chapterOneReceipt(), /maintenance.*expected one published record/);
    W.evidence = [...original, original.find((r) => r.id === 'ticket')];
    await assert.rejects(chapterOneReceipt(), /ticket.*expected one published record/);
  } finally {
    W.evidence = original;
  }
});

test('adapter uses unchanged runtime predicates and all three real access chains', async () => {
  const E = await import('../src/castle/engine.mjs');
  const { default: W } = await import('../src/castle/content.mjs');
  const before = new Map(
    ['content', 'engine', 'puzzles', 'investigation', 'objects', 'object-data', 'rooms'].map(
      (file) => {
        const source = path.join(__dirname, `../src/castle/${file}.mjs`);
        return [source, fs.readFileSync(source)];
      },
    ),
  );
  const result = await chapterOneReceipt();
  assert.equal(result.comparison.runtime.clock, '21:00');
  assert.equal(result.comparison.runtime.minutes, 7);
  assert.deepEqual(result.comparison.runtime.route, ['S', 'B', 'O', 'T']);
  assert.equal(result.comparison.runtime.inference, 'possible-not-proven');
  assert.deepEqual(
    result.comparison.runtime.journeys,
    ['gate', 'bridges', 'magic'].map((key) => ({
      key,
      collected: ['maintenance', 'ticket', 'path', 'margin'],
      progress: [5, 0],
    })),
  );
  for (let minute = 0; minute < 60; minute++)
    assert.equal(E.check('clock', `21:${String(minute).padStart(2, '0')}`), minute === 0);
  const enumerate = (route) => {
    if (route.at(-1) === 'T') return [route];
    return E.edges.flatMap(([a, b]) => {
      const next = a === route.at(-1) ? b : b === route.at(-1) ? a : null;
      return next && !route.includes(next) ? enumerate([...route, next]) : [];
    });
  };
  const routes = enumerate(['S']);
  assert.deepEqual(
    routes.filter((r) => E.check('route', r)),
    [['S', 'B', 'O', 'T']],
  );
  assert.equal(E.check('inference', 'definitely-present'), false);
  assert.equal(E.check('inference', 'too-late'), false);
  for (const [file, bytes] of before) assert.deepEqual(fs.readFileSync(file), bytes);
  // Refuse source/predicate drift instead of generating a plausible receipt from a bad answer.
  const answer = W.puzzles.route.solution;
  try {
    W.puzzles.route.solution = ['S', 'L', 'A', 'T'];
    await assert.rejects(chapterOneReceipt(), /route.*no longer completes/);
  } finally {
    W.puzzles.route.solution = answer;
  }
});

test('CLI emits deterministic JSON without creating a save or output file', () => {
  const run = (...args) => spawnSync(process.execPath, [adapter, ...args], { encoding: 'utf8' });
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  assert.equal(run().stdout, first.stdout);
  assert.equal(JSON.parse(first.stdout).scope, 'chapter-one-authoring-diagnostic');
  const bad = run('extra');
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Usage/);
});
