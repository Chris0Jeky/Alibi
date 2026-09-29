'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('native manifest explicitly denies cleartext rather than relying on SDK defaults', () => {
  assert.match(
    read('android/app/src/main/AndroidManifest.xml'),
    /android:usesCleartextTraffic="false"/,
  );
});

test('native CI is read-only, exact-head, SHA-pinned and never writes source or signing state', () => {
  const workflow = read('.github/workflows/android-native.yml');
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /ref: \$\{\{ github.event.pull_request.head.sha \|\| github.sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  for (const match of workflow.matchAll(/uses:\s*([^\s]+)/g))
    assert.match(match[1], /^[\w-]+\/[\w-]+@[0-9a-f]{40}$/);
  assert.doesNotMatch(
    workflow,
    /pull_request_target|secrets\.|contents: write|continue-on-error|--write-locks|--write-verification-metadata|git push/,
  );
  assert.match(workflow, /native:sync/);
  assert.match(workflow, /lintDebug/);
  assert.match(workflow, /assembleDebug/);
  assert.match(workflow, /assembleCapacitorPreview/);
  assert.match(workflow, /check-android-package\.py/);
  assert.match(workflow, /run-android-smoke\.sh/);
});

test('native CI validates the committed Gradle wrapper before invoking it', () => {
  const workflow = read('.github/workflows/android-native.yml');
  const digest = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(root, 'android/gradle/wrapper/gradle-wrapper.jar')))
    .digest('hex');
  assert.ok(workflow.includes(digest));
  assert.ok(workflow.indexOf(digest) < workflow.indexOf('./gradlew'));
  assert.match(
    read('android/gradle/wrapper/gradle-wrapper.properties'),
    /distributionSha256Sum=[0-9a-f]{64}/,
  );
});

test('native smoke uses actual instrumentation and fails instead of falling back to browser simulation', () => {
  const smoke = read('tools/run-android-smoke.sh');
  assert.match(smoke, /connectedDebugAndroidTest/);
  assert.match(smoke, /airplane_mode_on/);
  assert.match(smoke, /svc wifi disable/);
  assert.match(smoke, /dumpsys webviewupdate/);
  assert.match(smoke, /nativeHostBootsAndNavigatesOffline/);
  assert.doesNotMatch(smoke, /browser_android_payload|playwright|continue-on-error/);
});

test('Gradle wrapper is executable on Unix checkouts', { skip: process.platform === 'win32' }, () => {
  assert.notEqual(fs.statSync(path.join(root, 'android/gradlew')).mode & 0o111, 0);
});
