'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workflowsDir = path.join(root, '.github/workflows');
const testsDir = path.join(root, 'tests');

const workflowText = fs
  .readdirSync(workflowsDir)
  .filter((name) => name.endsWith('.yml'))
  .map((name) => fs.readFileSync(path.join(workflowsDir, name), 'utf8'))
  .join('\n');

const suites = fs.readdirSync(testsDir).filter((name) => /^browser_.*\.py$/.test(name));
assert.ok(suites.length > 0, 'browser suites exist');

test('every browser suite is wired into CI or header-marked MANUAL-ONLY', () => {
  const unwired = suites.filter((name) => {
    if (workflowText.includes(name)) return false;
    const header = fs
      .readFileSync(path.join(testsDir, name), 'utf8')
      .split('\n')
      .slice(0, 10)
      .join('\n');
    return !header.includes('MANUAL-ONLY');
  });
  assert.deepEqual(unwired, [], `unwired browser suites: ${unwired.join(', ')}`);
});

test('every wired browser suite file exists', () => {
  const missing = [];
  for (const match of workflowText.matchAll(/tests\/(browser_[a-z_]+\.py)/g)) {
    if (!fs.existsSync(path.join(testsDir, match[1]))) missing.push(match[1]);
  }
  assert.deepEqual(missing, [], `workflows reference missing suites: ${missing.join(', ')}`);
});
