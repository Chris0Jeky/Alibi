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

const STALE_SEVEN_SCENARIOS = [
  'durability',
  'backup_restore',
  'cross_tab',
  'keyboard',
  'offline',
  'malformed_draft',
  'newer_database',
];
const STALE_NINE_SCENARIOS = [
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

function browserOriginScenarios() {
  const source = fs.readFileSync(path.join(__dirname, 'browser_origin.py'), 'utf8');
  const declaration = /^[ \t]*scenarios[ \t]*=[ \t]*\[\r?\n/m.exec(source);
  assert.ok(declaration, 'browser_origin.py declares its full scenario list');
  const bodyStart = declaration.index + declaration[0].length;
  const end = /^[ \t]*\][ \t]*$/m.exec(source.slice(bodyStart));
  assert.ok(end, 'browser_origin.py scenario list is closed');
  const lines = source
    .slice(bodyStart, bodyStart + end.index)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const scenarios = lines.map((line) => {
    const match = /^scenario_([a-z][a-z0-9_]*),?$/.exec(line);
    assert.ok(match, `recognized browser-origin scenario declaration: ${line}`);
    return match[1];
  });
  assert.ok(scenarios.length, 'browser_origin.py declares at least one scenario');
  assert.equal(new Set(scenarios).size, scenarios.length, 'scenario declarations are unique');
  return scenarios;
}

test('package runner includes every declared Node suite', () => {
  const suites = nodeSuites();
  assert.ok(suites.tests.some((file) => file.endsWith('rooms.test.mjs')));
  assert.deepEqual(suites.scripts, [
    'tests/quiet-wing/engines.cjs',
    'tests/quiet-wing/contracts.cjs',
  ]);
});

test('the package origin contract follows the actual browser-origin scenario declaration', () => {
  assert.deepEqual(ORIGIN_SCENARIOS, browserOriginScenarios());
});

test('only a complete current origin scenario receipt is package eligible', () => {
  const scenarios = browserOriginScenarios();
  const valid = {
    passed: true,
    fullSuite: true,
    scenarioSet: [...scenarios],
    runtime: { build: 'build-1' },
  };
  assert.equal(isCompleteOriginReport(valid, 'build-1'), true);
  assert.equal(
    isCompleteOriginReport({ ...valid, scenarioSet: [...STALE_NINE_SCENARIOS] }, 'build-1'),
    false,
  );
  assert.equal(
    isCompleteOriginReport({ ...valid, scenarioSet: [...STALE_SEVEN_SCENARIOS] }, 'build-1'),
    false,
  );
  assert.equal(
    isCompleteOriginReport({ ...valid, scenarioSet: scenarios.slice(0, -1) }, 'build-1'),
    false,
  );
  assert.equal(
    isCompleteOriginReport(
      { ...valid, scenarioSet: [...scenarios.slice(0, -1), scenarios[0]] },
      'build-1',
    ),
    false,
  );
  assert.equal(
    isCompleteOriginReport({ ...valid, scenarioSet: [...scenarios].reverse() }, 'build-1'),
    false,
  );
  assert.equal(isCompleteOriginReport({ ...valid, fullSuite: false }, 'build-1'), false);
  assert.equal(
    isCompleteOriginReport(
      { ...valid, scenarioSet: [...scenarios.slice(0, -1), 'shared_paths'] },
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
