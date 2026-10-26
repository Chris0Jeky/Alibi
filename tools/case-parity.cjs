'use strict';
const { isDeepStrictEqual } = require('node:util');
const { readCase, VERDICTS } = require('./case-authoring.cjs');
const S = require('./case-session.cjs');

function buildParityReceipt(file) {
  const { definition: d, receipt } = readCase(file);
  const rows = [];
  const pair = (path, prose) => rows.push({ path, ...prose });
  pair('intro', d.intro);
  pair('ending', d.ending);
  for (const record of d.records) pair(`records.${record.id}.text`, record.text);
  const contract = {
    records: d.records.map(({ id, at, kind }) => ({ id, at, kind })),
    verdicts: [...VERDICTS],
    steps: d.steps.map((step) => {
      pair(`steps.${step.id}.prompt`, step.prompt);
      for (const claim of step.claims) pair(`claims.${claim.id}.text`, claim.text);
      for (const hint of step.hints) pair(`steps.${step.id}.hints.${hint.level}`, hint.text);
      pair(`steps.${step.id}.workedAnswer`, step.workedAnswer.text);
      return {
        id: step.id,
        requires: [...step.requires].sort(),
        claims: step.claims.map(({ id, answer, evidence }) => ({
          id,
          answer,
          evidence: evidence.map((bundle) => [...bundle].sort()).sort(),
        })),
      };
    }),
  };
  function prerequisites(step) {
    const done = new Set();
    function visit(id) {
      if (done.has(id)) return;
      done.add(id);
      d.steps.find((s) => s.id === id).requires.forEach(visit);
    }
    step.requires.forEach(visit);
    return d.steps.filter((s) => done.has(s.id)).map((s) => s.id);
  }
  function access(action) {
    try {
      action();
      return true;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Unknown or locked step') return false;
      throw error;
    }
  }
  function projection(step, completed, story) {
    const view = S.project(d, completed, step.id, story);
    const workedAccessible = access(() => S.worked(d, completed, step.id, story));
    return {
      completed,
      available: S.available(d, completed),
      id: view.id,
      records: view.records.map(({ id, kind }) => ({ id, kind })),
      claims: view.claims.map(({ id }) => ({
        id,
        citationChoices: view.records.map((record) => record.id),
      })),
      hints: view.hints.map((_, index) => {
        const { level, records } = S.hint(view, index);
        return { level, records };
      }),
      workedAnswer: {
        accessible: workedAccessible,
        records: workedAccessible ? S.worked(d, completed, step.id, story).records : [],
      },
    };
  }
  const modes = {};
  for (const [name, story] of [
    ['storyOn', true],
    ['storyOff', false],
  ]) {
    modes[name] = d.steps.map((step) => ({
      id: step.id,
      initialAccess: {
        projection: access(() => S.project(d, [], step.id, story)),
        workedAnswer: access(() => S.worked(d, [], step.id, story)),
      },
      // All-completed also checks that sibling progress cannot expose unrelated sources.
      beforeCompletion: projection(step, prerequisites(step), story),
      afterCompletion: projection(
        step,
        d.steps.map((s) => s.id),
        story,
      ),
    }));
  }
  const differences = modes.storyOn
    .filter((step, index) => !isDeepStrictEqual(step, modes.storyOff[index]))
    .map((step) => step.id);
  return {
    ...receipt,
    scope: 'mechanical-parity-only',
    mechanical: { status: differences.length ? 'fail' : 'pass', differences, contract, modes },
    editorial: {
      status: 'required',
      semanticEquivalence: 'not-certified',
      rows,
    },
  };
}

module.exports = { buildParityReceipt };
if (require.main === module) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node tools/case-parity.cjs <case.json>');
    const receipt = buildParityReceipt(process.argv[2]);
    console.log(JSON.stringify(receipt, null, 2));
    if (receipt.mechanical.status !== 'pass') process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
