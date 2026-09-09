'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  ORIGIN_SCENARIOS,
  isCompleteOriginReport,
  newPackageDirectory,
  nodeSuites,
} = require('../tools/package.cjs');

test('package runner includes every declared Node suite', () => {
  const suites = nodeSuites();
  assert.ok(suites.tests.some((file) => file.endsWith('rooms.test.mjs')));
  assert.deepEqual(suites.scripts, [
    'tests/quiet-wing/engines.cjs',
    'tests/quiet-wing/contracts.cjs',
  ]);
});

test('only a complete origin scenario receipt is package eligible', () => {
  const valid = {
    passed: true,
    fullSuite: true,
    scenarioSet: [...ORIGIN_SCENARIOS],
    runtime: { build: 'build-1' },
  };
  assert.equal(isCompleteOriginReport(valid, 'build-1'), true);
  assert.equal(
    isCompleteOriginReport({ ...valid, fullSuite: false, scenarioSet: ['offline'] }, 'build-1'),
    false,
  );
  assert.equal(isCompleteOriginReport({ ...valid, runtime: { build: 'old' } }, 'build-1'), false);
});

test('each package run receives a fresh directory with no prior files', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-package-'));
  try {
    const info = { version: '0.7.0', build: 'build-1' },
      first = newPackageDirectory(fixture, info);
    fs.writeFileSync(path.join(first, 'stale-report.json'), 'stale');
    const second = newPackageDirectory(fixture, info);
    assert.notEqual(second, first);
    assert.equal(fs.existsSync(path.join(second, 'stale-report.json')), false);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
