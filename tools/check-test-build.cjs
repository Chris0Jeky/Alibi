'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { payloadDigest, readIdentity, sourceIdentity } = require('./platform-identity.cjs');

/** Fail before artifact-dependent suites, without rebuilding or changing the checkout. */
function inspectTestBuild(root) {
  const errors = [];
  let source;
  let version;
  try {
    source = sourceIdentity(root);
    version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  } catch {
    return ['Cannot identify this Git checkout and package version.'];
  }
  if (source.sourceDirty) errors.push('The working tree differs from the committed build source.');
  for (const [name, target] of [
    ['dist', 'web'],
    ['dist-android', 'android'],
  ]) {
    try {
      const directory = path.join(root, name);
      const { identity } = readIdentity(directory);
      if (identity.sourceSha !== source.sourceSha || identity.sourceDirty !== false)
        errors.push(`${name}: built from a different or dirty source commit.`);
      if (identity.target !== target || identity.appVersion !== version)
        errors.push(`${name}: platform or package version does not match.`);
      if (identity.payloadSha256 !== payloadDigest(directory))
        errors.push(`${name}: runtime payload differs from its build identity.`);
    } catch {
      errors.push(`${name}: missing or unreadable build identity/runtime payload.`);
    }
  }
  try {
    const web = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json'), 'utf8'));
    const android = JSON.parse(
      fs.readFileSync(path.join(root, 'dist-android/android-build-identity.json'), 'utf8'),
    );
    if (
      !/^[0-9a-f]{12}$/.test(web.build) ||
      android.webBuild !== web.build ||
      android.sourceSha !== source.sourceSha ||
      android.sourceDirty !== false ||
      web.version !== version ||
      android.appVersion !== version
    )
      errors.push('Web/Android build receipts do not describe the same current source.');
  } catch {
    errors.push('Web/Android build receipts are missing or unreadable.');
  }
  return errors;
}

if (require.main === module) {
  const errors = inspectTestBuild(process.cwd());
  if (errors.length) {
    console.error(
      'Alibi needs fresh web and Android artifacts before npm test.\n' +
        errors.map((error) => `- ${error}`).join('\n') +
        '\nCommit or stash source edits, then run npm run build:android and npm test ' +
        '(or npm run verify).\n' +
        'For a source-only edit/test loop, run node --test tests/<name>.test.cjs on a suite ' +
        'that does not read build artifacts.',
    );
    process.exitCode = 1;
  }
}

module.exports = { inspectTestBuild };
