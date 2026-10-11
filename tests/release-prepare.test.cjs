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

test('findPulseboard returns PULSEBOARD_REPO when the git probe fails', (t) => {
  const childProcess = require('node:child_process');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const modulePath = require.resolve('../tools/release-prepare.cjs');
  const originalSpawn = childProcess.spawnSync;
  const previousEnv = process.env.PULSEBOARD_REPO;
  const checkout = fs.mkdtempSync(path.join(os.tmpdir(), 'pulseboard-'));
  fs.mkdirSync(path.join(checkout, '.git'));
  // release-prepare.cjs destructures spawnSync at load time, so stub first, then reload.
  childProcess.spawnSync = () => ({
    status: 128,
    stdout: '',
    stderr: 'fatal: not a git repository',
  });
  delete require.cache[modulePath];
  t.after(() => {
    childProcess.spawnSync = originalSpawn;
    delete require.cache[modulePath];
    if (previousEnv === undefined) delete process.env.PULSEBOARD_REPO;
    else process.env.PULSEBOARD_REPO = previousEnv;
    fs.rmSync(checkout, { recursive: true, force: true });
  });
  process.env.PULSEBOARD_REPO = checkout;
  const { findPulseboard } = require('../tools/release-prepare.cjs');
  assert.equal(findPulseboard(undefined), path.resolve(checkout));
});

test('findPulseboard without a checkout still throws not-found when the git probe fails', (t) => {
  const childProcess = require('node:child_process');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const modulePath = require.resolve('../tools/release-prepare.cjs');
  const originalSpawn = childProcess.spawnSync;
  const originalExists = fs.existsSync;
  const previousEnv = process.env.PULSEBOARD_REPO;
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'pulseboard-missing-'));
  childProcess.spawnSync = () => ({
    status: 128,
    stdout: '',
    stderr: 'fatal: not a git repository',
  });
  // Force every candidate to miss so a failing probe must degrade to the not-found error.
  fs.existsSync = () => false;
  delete require.cache[modulePath];
  t.after(() => {
    childProcess.spawnSync = originalSpawn;
    fs.existsSync = originalExists;
    delete require.cache[modulePath];
    if (previousEnv === undefined) delete process.env.PULSEBOARD_REPO;
    else process.env.PULSEBOARD_REPO = previousEnv;
    fs.rmSync(empty, { recursive: true, force: true });
  });
  process.env.PULSEBOARD_REPO = empty;
  const { findPulseboard } = require('../tools/release-prepare.cjs');
  assert.throws(() => findPulseboard(undefined), /Pulseboard checkout not found/);
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
