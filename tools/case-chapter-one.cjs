'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateCase } = require('./case-authoring.cjs');
const root = path.resolve(__dirname, '..');
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceFiles = [
  'src/castle/content.mjs',
  'src/castle/puzzles.mjs',
  'src/castle/engine.mjs',
  'src/castle/investigation.mjs',
  'src/castle/rooms.mjs',
  'src/castle/objects.mjs',
  'src/castle/object-data.mjs',
  'docs/castle/CONTINUATION.md',
  'tools/case-authoring.cjs',
  'tools/case-chapter-one.cjs',
];
const bindings = {
  'clock-corrected': { answer: 'supported', records: ['maintenance', 'ticket'] },
  'journey-feasible': { answer: 'supported', records: ['maintenance', 'ticket', 'path'] },
  'presence-established': { answer: 'not-established', records: ['maintenance', 'ticket', 'path'] },
};

// This fixed Chapter I check is not a general semantic evaluator.
function validateChapterOneProjection(definition) {
  const report = validateCase(definition);
  const claims = new Map(definition.steps.flatMap((step) => step.claims.map((c) => [c.id, c])));
  if (claims.size !== Object.keys(bindings).length) throw Error('Chapter I: unexpected claims.');
  for (const [id, expected] of Object.entries(bindings)) {
    const claim = claims.get(id);
    if (!claim || claim.answer !== expected.answer) throw Error(`${id}: unsupported verdict.`);
    if (
      claim.evidence.length !== 1 ||
      [...claim.evidence[0]].sort().join() !== [...expected.records].sort().join()
    )
      throw Error(`${id}: missing or substituted Chapter I premise.`);
  }
  return report;
}

async function chapterOneReceipt() {
  const [{ default: W }, E, objects, investigation] = await Promise.all([
    import('../src/castle/content.mjs'),
    import('../src/castle/engine.mjs'),
    import('../src/castle/objects.mjs'),
    import('../src/castle/investigation.mjs'),
  ]);
  const records = ['maintenance', 'ticket', 'path'].map((id) => {
    const matches = W.evidence.filter((r) => r.id === id);
    if (matches.length !== 1) throw Error(`${id}: expected one published record.`);
    return matches[0];
  });
  const allRecords = records.map((r) => r.id);
  // Both diagnostic modes retain the one published string; no story-off copy is authored here.
  const prose = (text) => ({ storyOn: text, storyOff: text });
  const claim = (id, text) => ({
    id,
    text: prose(text),
    answer: bindings[id].answer,
    evidence: [[...bindings[id].records]],
  });
  const definition = {
    format: 'postern-case-1',
    id: W.chapter.id,
    revision: W.version,
    title: W.chapter.title,
    intro: prose(W.chapter.premise),
    ending: prose(W.chapter.ending),
    provenance:
      'Diagnostic projection of published Chapter I; not a playable case or content revision.',
    records: records.map((r) => ({
      id: r.id,
      title: r.title,
      kind: r.id === 'maintenance' ? 'record' : 'model',
      source: `src/castle/content.mjs#evidence.${r.id}`,
      at: r.id === 'path' ? 'route' : 'clock',
      text: prose(r.text),
    })),
    steps: ['clock', 'route', 'inference'].map((id, i) => {
      const puzzle = W.puzzles[id];
      const citations = id === 'clock' ? ['maintenance', 'ticket'] : allRecords;
      return {
        id,
        title: puzzle.title,
        prompt: prose(puzzle.rules.join('\n')),
        requires: i ? (id === 'route' ? ['clock'] : ['clock', 'route']) : [],
        claims:
          id === 'clock'
            ? [claim('clock-corrected', records[1].text)]
            : id === 'route'
              ? [claim('journey-feasible', puzzle.after)]
              : [claim('presence-established', 'Finch reached the tower before the bell.')],
        // Reuse a published question and both hints, explicitly reported as a projection below.
        hints: [records[id === 'clock' ? 0 : 2].question, ...puzzle.hints].map((text, j) => ({
          level: ['orientation', 'constraint', 'method'][j],
          text: prose(text),
          records: [...citations],
        })),
        workedAnswer: { text: prose(puzzle.after), records: [...citations] },
      };
    }),
  };
  const structure = validateChapterOneProjection(definition);
  objects.validateAuthoredCollection(objects.authoredObjects);

  // Exercise the actual predicates and access rules, including each alternative Map Room key.
  const journeys = ['gate', 'bridges', 'magic'].map((key) => {
    let state = E.initial();
    for (const id of [key, 'shelves', 'clock', 'route', 'inference']) {
      const result = E.complete(state, id, W.puzzles[id].solution);
      if (!result.ok) throw Error(`${id}: published worked answer no longer completes Chapter I.`);
      state = E.validate(result.state);
    }
    return { key, collected: E.evidence(state).map((r) => r.id), progress: E.progress(state) };
  });
  if (E.check('inference', 'definitely-present') || E.check('inference', 'too-late'))
    throw Error('Chapter I: inference no longer preserves uncertainty.');

  return {
    scope: 'chapter-one-authoring-diagnostic',
    publishable: false,
    definition,
    mapping: records.map((r) => ({
      record: r.id,
      source: `src/castle/content.mjs#evidence.${r.id}`,
      completion: `src/castle/engine.mjs#check(${r.requires})`,
      puzzle: `src/castle/puzzles.mjs#${r.requires}`,
      publishedKind: r.kind,
      publishedRequires: r.requires,
    })),
    mismatches: [
      {
        concept: 'revision-domain',
        source: 'src/castle/content.mjs#version',
        detail:
          'Projection revision copies version 1; published records have no individual content revisions.',
      },
      {
        concept: 'story-modes',
        source: 'src/castle/content.mjs#evidence',
        detail:
          'Both diagnostic prose fields copy the same published text; no authored story-off variant is asserted.',
      },
      {
        concept: 'hint-ladder',
        source: 'src/castle/puzzles.mjs#clock,route,inference',
        detail:
          'Each diagnostic ladder uses a published evidence question followed by the two published hints; this is not an authored three-level ladder.',
      },
      {
        concept: 'derived-fact',
        source: 'src/castle/content.mjs#evidence.ticket',
        detail:
          'The derived ticket is projected as a model, not an independent observation; it still requires maintenance and ticket premises.',
      },
      {
        concept: 'exposure-and-or-access',
        source: 'src/castle/engine.mjs#available,evidence',
        detail:
          'Diagnostic step ancestry is source visibility, not runtime access: maintenance follows shelves, ticket follows clock, path follows route; Map Room access accepts gate OR bridges OR magic.',
      },
      {
        concept: 'bounded-numeric-predicate',
        source: 'src/castle/engine.mjs#check,routeTime',
        detail:
          'The accepted corrected timestamp and a no-revisit weighted route strictly before the bell remain runtime predicates. The case contract can cite their result, not encode their checks; no expression field is added.',
      },
    ],
    comparison: {
      caseAuthoring: structure,
      authoredObjects: {
        source: 'src/castle/objects.mjs#validateAuthoredCollection',
        count: objects.authoredObjects.length,
        valid: true,
        scope: 'room-open inspection data, not collected evidence or completion authority',
        overlap: records
          .filter((r) => objects.authoredObjects.some((o) => o.id === r.id))
          .map((r) => r.id),
      },
      runtime: {
        source: 'src/castle/engine.mjs#complete,validate,check,routeTime',
        clock: W.puzzles.clock.solution,
        route: [...W.puzzles.route.solution],
        minutes: E.routeTime(W.puzzles.route.solution),
        inference: W.puzzles.inference.solution,
        modelBoundary: investigation.labelQuestions.ur.transfer,
        journeys,
      },
    },
    receipt: {
      chapterId: W.chapter.id,
      publishedVersion: W.version,
      projectionSha256: hash(JSON.stringify(definition)),
      sources: sourceFiles.map((file) => {
        const bytes = fs.readFileSync(path.join(root, file));
        return { file, bytes: bytes.length, sha256: hash(bytes) };
      }),
    },
  };
}
module.exports = { chapterOneReceipt, validateChapterOneProjection };
if (require.main === module) {
  (async () => {
    if (process.argv.length !== 2) throw Error('Usage: node tools/case-chapter-one.cjs');
    console.log(JSON.stringify(await chapterOneReceipt(), null, 2));
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
