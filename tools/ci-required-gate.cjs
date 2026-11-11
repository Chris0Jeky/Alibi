'use strict';

const RUNS = ['cabinet', 'origin-1', 'origin-2', 'origin-3', 'origin-4'];
const SOURCE_SHA = /^[a-f0-9]{40}$/;
const ARCHIVE_SHA = /^[a-f0-9]{64}$/;
const POSITIVE_INTEGER = /^[1-9][0-9]*$/;

function verifyRequiredGate(env) {
  if (env.ALIBI_CANCELLED !== 'false') throw new Error('Verification was cancelled or unknown.');
  const { GITHUB_RUN_ID: run, GITHUB_SHA: sha, ALIBI_HEAD_SHA: head, ALIBI_BASE_SHA: base } = env;
  if (
    !POSITIVE_INTEGER.test(run) ||
    !SOURCE_SHA.test(sha) ||
    !SOURCE_SHA.test(head) ||
    (base !== '' && !SOURCE_SHA.test(base))
  ) {
    throw new Error('Incomplete event source identity.');
  }

  const needs = JSON.parse(env.ALIBI_NEEDS);
  if (
    !needs ||
    Object.keys(needs).length !== RUNS.length + 1 ||
    RUNS.some((name) => !Object.hasOwn(needs, name))
  ) {
    throw new Error('Incomplete required job set.');
  }
  const prepare = needs.prepare;
  const output = prepare?.outputs;
  if (prepare?.result !== 'success' || output?.source !== [sha, head, base].join(':')) {
    throw new Error('Preparation did not succeed for this checkout, head and base.');
  }

  if (output.mode === 'publication-docs') {
    if (
      output['docs-verified'] !== 'true' ||
      output['artifact-id'] ||
      output['archive-sha256'] ||
      RUNS.some((name) => needs[name]?.result !== 'skipped')
    ) {
      throw new Error('Publication verification did not succeed with the full jobs skipped.');
    }
    return 'publication-docs';
  }
  if (output.mode !== 'full') throw new Error('Unknown verification scope.');

  const digest = output['archive-sha256'];
  if (!POSITIVE_INTEGER.test(output['artifact-id']) || !ARCHIVE_SHA.test(digest)) {
    throw new Error('The required build artifact identity is incomplete.');
  }
  for (const name of RUNS) {
    const job = needs[name];
    if (job?.result !== 'success' || job.outputs?.receipt !== [run, sha, digest, name].join(':')) {
      throw new Error(name + ' did not complete with the required build.');
    }
  }
  return 'full';
}

module.exports = { verifyRequiredGate };

if (require.main === module) {
  try {
    console.log('Verified scope: ' + verifyRequiredGate(process.env));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
