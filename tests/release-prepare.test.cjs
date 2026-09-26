'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  releaseRecordProblems,
  compareVersions,
  onlyHostSymlinkFailures,
} = require('../tools/release-prepare.cjs');

const record = (version, extra = {}) => ({
  version,
  date: '2026-09-26',
  title: 'A release',
  tag: `v${version}`,
  receipt: `docs/RELEASE-${version}.md`,
  changes: ['Play something new.'],
  ...extra,
});

test('a complete newest release record is ready', () => {
  assert.deepEqual(releaseRecordProblems([record('0.13.0'), record('0.12.0')], '0.13.0'), []);
});

test('missing, duplicate, stale or incomplete records are refused', () => {
  assert.match(releaseRecordProblems([record('0.12.0')], '0.13.0')[0], /exactly one/);
  assert.match(releaseRecordProblems([record('0.13.0'), record('0.13.0')], '0.13.0')[0], /found 2/);
  assert.ok(
    releaseRecordProblems([record('0.12.0'), record('0.11.0')], '0.11.0').some((p) =>
      /first/.test(p),
    ),
  );
  assert.ok(
    releaseRecordProblems([record('0.12.0'), record('0.12.1')], '0.12.0').some((p) =>
      /newer/.test(p),
    ),
  );
  const incomplete = releaseRecordProblems(
    [record('0.13.0', { tag: '0.13.0', changes: [], receipt: 'x.md', date: 'today', title: ' ' })],
    '0.13.0',
  );
  for (const pattern of [/tag/, /changes/, /receipt/, /date/, /title/])
    assert.ok(
      incomplete.some((p) => pattern.test(p)),
      String(pattern),
    );
});

test('the candidate must be newer than every recorded release, not only the next one', () => {
  assert.ok(
    releaseRecordProblems([record('0.13.0'), record('0.12.0'), record('1.0.0')], '0.13.0').some(
      (p) => /newer than 1.0.0/.test(p),
    ),
  );
});

test('versions compare numerically', () => {
  assert.ok(compareVersions('0.10.0', '0.9.9') > 0);
  assert.equal(compareVersions('1.2.3', '1.2.3'), 0);
});

test('only Windows symlink EPERM failures are tolerated', () => {
  const eperm = 'Error: EPERM: operation not permitted, symlink a -> b\n';
  const summary = (...names) =>
    `✖ failing tests:\n\n${names.map((n) => `✖ ${n} (1ms)`).join('\n')}\n`;
  const symlinkOnly = eperm + summary('installer refuses symlink escape');
  assert.equal(onlyHostSymlinkFailures(symlinkOnly, 'win32'), true);
  assert.equal(onlyHostSymlinkFailures(symlinkOnly, 'linux'), false);
  assert.equal(
    onlyHostSymlinkFailures(
      eperm + summary('installer refuses symlink escape', 'sync rolls back'),
      'win32',
    ),
    false,
  );
  assert.equal(
    onlyHostSymlinkFailures(summary('installer refuses symlink escape'), 'win32'),
    false,
  );
  assert.equal(onlyHostSymlinkFailures('not ok 1 - sync rolls back\n', 'win32'), false);
});
