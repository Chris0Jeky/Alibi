'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { isCompleteOriginReport, newPackageDirectory, nodeSuites } = require('../tools/package.cjs');

const LEGACY_PACKAGE_SCENARIOS = [
  'durability',
  'backup_restore',
  'cross_tab',
  'keyboard',
  'offline',
  'malformed_draft',
  'newer_database',
];
const CURRENT_BROWSER_ORIGIN_SCENARIOS = [
  'durability',
  'backup_restore',
  'cross_tab',
  'keyboard',
  'offline',
  'shared_paths',
  'malformed_draft',
  'malformed_persisted',
  'newer_database',
];

test('package runner includes every declared Node suite', () => {
  const suites = nodeSuites();
  assert.ok(suites.tests.some((file) => file.endsWith('rooms.test.mjs')));
  assert.deepEqual(suites.scripts, [
    'tests/quiet-wing/engines.cjs',
    'tests/quiet-wing/contracts.cjs',
  ]);
});

test('only a complete current origin scenario receipt is package eligible', () => {
  const valid = {
    passed: true,
    fullSuite: true,
    scenarioSet: [...CURRENT_BROWSER_ORIGIN_SCENARIOS],
    runtime: { build: 'build-1' },
  };
  assert.equal(isCompleteOriginReport(valid, 'build-1'), true);
  assert.equal(
    isCompleteOriginReport({ ...valid, scenarioSet: [...LEGACY_PACKAGE_SCENARIOS] }, 'build-1'),
    false,
  );
  assert.equal(
    isCompleteOriginReport({ ...valid, scenarioSet: valid.scenarioSet.slice(0, -1) }, 'build-1'),
    false,
  );
  assert.equal(
    isCompleteOriginReport(
      { ...valid, scenarioSet: [...valid.scenarioSet.slice(0, -1), 'shared_paths'] },
      'build-1',
    ),
    false,
  );
  assert.equal(
    isCompleteOriginReport(
      { ...valid, fullSuite: false, scenarioSet: ['shared_paths'] },
      'build-1',
    ),
    false,
  );
  assert.equal(isCompleteOriginReport({ ...valid, passed: false }, 'build-1'), false);
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
