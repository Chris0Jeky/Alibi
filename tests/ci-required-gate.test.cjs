'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { verifyRequiredGate } = require('../tools/ci-required-gate.cjs');

const sha = 'a'.repeat(40);
const head = 'b'.repeat(40);
const base = 'c'.repeat(40);
const digest = 'd'.repeat(64);
const run = '123';
const jobs = ['cabinet', 'origin-1', 'origin-2', 'origin-3', 'origin-4'];

function fixture(mode = 'full') {
  return {
    prepare: {
      result: 'success',
      outputs: {
        mode,
        source: [sha, head, base].join(':'),
        'archive-sha256': mode === 'full' ? digest : '',
        'artifact-id': mode === 'full' ? '456' : '',
        'docs-verified': mode === 'publication-docs' ? 'true' : '',
      },
    },
    ...Object.fromEntries(
      jobs.map((name) => [
        name,
        mode === 'publication-docs'
          ? { result: 'skipped', outputs: {} }
          : { result: 'success', outputs: { receipt: [run, sha, digest, name].join(':') } },
      ]),
    ),
  };
}

function environment(needs, overrides = {}) {
  return {
    ...process.env,
    ALIBI_NEEDS: JSON.stringify(needs),
    GITHUB_RUN_ID: run,
    GITHUB_SHA: sha,
    ALIBI_HEAD_SHA: head,
    ALIBI_BASE_SHA: base,
    ...overrides,
  };
}

test('accepts only the verified full and publication-docs paths', () => {
  assert.equal(verifyRequiredGate(environment(fixture())), 'full');
  assert.equal(verifyRequiredGate(environment(fixture('publication-docs'))), 'publication-docs');
});

test('fails if a full job is skipped, fails, is cancelled, or has no matching proof', () => {
  for (const name of jobs) {
    for (const result of ['failure', 'cancelled', 'skipped', 'timed_out', undefined]) {
      const needs = fixture();
      needs[name].result = result;
      assert.throws(() => verifyRequiredGate(environment(needs)), new RegExp(name));
    }
    for (const receipt of ['', [run, sha, digest, 'another-job'].join(':')]) {
      const needs = fixture();
      needs[name].outputs.receipt = receipt;
      assert.throws(() => verifyRequiredGate(environment(needs)), new RegExp(name));
    }
  }
  const missing = fixture();
  delete missing['origin-4'];
  assert.throws(() => verifyRequiredGate(environment(missing)), /Incomplete required job set/);
});

test('binds proof to the original run, checkout, head, base and build', () => {
  for (const overrides of [
    { GITHUB_RUN_ID: '124' },
    { GITHUB_SHA: 'e'.repeat(40) },
    { ALIBI_HEAD_SHA: 'e'.repeat(40) },
    { ALIBI_BASE_SHA: 'e'.repeat(40) },
  ]) {
    assert.throws(() => verifyRequiredGate(environment(fixture(), overrides)));
  }
  for (const [key, value] of [
    ['archive-sha256', 'e'.repeat(64)],
    ['archive-sha256', ''],
    ['artifact-id', ''],
    ['mode', 'unknown'],
  ]) {
    const needs = fixture();
    needs.prepare.outputs[key] = value;
    assert.throws(() => verifyRequiredGate(environment(needs)));
  }
});

test('fails closed on unverified docs and preparation failure', () => {
  const docs = fixture('publication-docs');
  docs.prepare.outputs['docs-verified'] = '';
  assert.throws(() => verifyRequiredGate(environment(docs)), /Publication verification/);
  const fullJobRan = fixture('publication-docs');
  fullJobRan.cabinet.result = 'success';
  assert.throws(() => verifyRequiredGate(environment(fullJobRan)), /Publication verification/);
  const docsWithBuild = fixture('publication-docs');
  docsWithBuild.prepare.outputs['artifact-id'] = '456';
  assert.throws(() => verifyRequiredGate(environment(docsWithBuild)), /Publication verification/);
  const failedPrepare = fixture();
  failedPrepare.prepare.result = 'failure';
  assert.throws(() => verifyRequiredGate(environment(failedPrepare)), /Preparation/);
});

test('the invoked gate process returns a non-zero status for a missing shard receipt', () => {
  const needs = fixture();
  delete needs['origin-3'].outputs.receipt;
  const script = path.join(__dirname, '../tools/ci-required-gate.cjs');
  const result = spawnSync(process.execPath, [script], {
    env: environment(needs),
    encoding: 'utf8',
  });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /origin-3/);
});

test('the required workflow exposes the existing check and four separately named prerequisites', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/check.yml'), 'utf8');
  const caller = fs.readFileSync(
    path.join(__dirname, '../.github/workflows/browser-origin-ci.yml'),
    'utf8',
  );
  assert.match(workflow, /^name: Verify puzzle cabinet$/m);
  assert.match(workflow, /^  verify:\n    if: \$\{\{ always\(\) \}\}/m);
  assert.match(workflow, /needs: \[prepare, cabinet, origin-1, origin-2, origin-3, origin-4\]/);
  assert.match(workflow, /node tools\/ci-required-gate\.cjs/);
  assert.match(workflow, /ALIBI_NEEDS: \$\{\{ toJSON\(needs\) \}\}/);
  assert.match(
    workflow,
    /name: Fail cancelled verification\n        if: \$\{\{ cancelled\(\) \}\}\n        run: exit 1/,
  );
  assert.doesNotMatch(workflow, /^\s+[A-Z_]+: .*cancelled\(\)/m);
  assert.doesNotMatch(workflow, /continue-on-error:|^    paths(?:-ignore)?:/m);
  assert.doesNotMatch(caller, /continue-on-error:|workflow_dispatch|pull_request/);
  for (const name of jobs.slice(1)) {
    const job = workflow.split('  ' + name + ':\n')[1].split(/\n  [a-z]/)[0];
    assert.match(job, /uses: \.\/\.github\/workflows\/browser-origin-ci\.yml/);
    assert.ok(job.includes("slice: '" + name.slice(-1) + "'"));
  }
  assert.match(caller, /node tools\/ci-browser-origin-shadow\.cjs "\$SLICE"/);
  assert.ok(
    caller.indexOf('bash -e "$RUNNER_TEMP/alibi-origin.sh"') < caller.indexOf('id: receipt'),
  );
});

test('artifact restore uses an exact same-run ID and checks bytes before extraction', () => {
  const restore = fs.readFileSync(
    path.join(__dirname, '../.github/actions/restore-cabinet-build/action.yml'),
    'utf8',
  );
  assert.match(restore, /actions\/download-artifact@[a-f0-9]{40}/);
  assert.match(restore, /artifact-ids: \$\{\{ inputs\.artifact-id \}\}/);
  assert.doesNotMatch(restore, /github-token:|run-id:|repository:|pattern:/);
  assert.match(
    restore,
    /sha256sum --check --strict[\s\S]+tar --no-same-owner --no-same-permissions -xzf[\s\S]+node tools\/check-test-build\.cjs/,
  );
});
