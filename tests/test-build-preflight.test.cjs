'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const test = require('node:test');
const { payloadDigest, writeIdentity } = require('../tools/platform-identity.cjs');
const script = path.resolve(__dirname, '../tools/check-test-build.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-test-build-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('config', 'user.name', 'Synthetic fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  fs.writeFileSync(path.join(root, '.gitignore'), 'dist/\ndist-android/\nbuild-info.json\n');
  fs.writeFileSync(path.join(root, 'package.json'), '{"version":"0.0.1"}\n');
  fs.writeFileSync(path.join(root, 'source.js'), 'const fixture = 1;\n');
  git('add', '.');
  git('commit', '-qm', 'Synthetic fixture');
  const sourceSha = git('rev-parse', 'HEAD');
  for (const [name, target] of [
    ['dist', 'web'],
    ['dist-android', 'android'],
  ]) {
    const directory = path.join(root, name);
    fs.mkdirSync(path.join(directory, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'assets/app.js'), '/* fixture */');
    writeIdentity(directory, {
      target,
      sourceSha,
      sourceDirty: false,
      appVersion: '0.0.1',
      payloadSha256: payloadDigest(directory),
    });
  }
  const build = '123456abcdef';
  fs.writeFileSync(path.join(root, 'build-info.json'), JSON.stringify({ build, version: '0.0.1' }));
  fs.writeFileSync(
    path.join(root, 'dist-android/android-build-identity.json'),
    JSON.stringify({ sourceSha, sourceDirty: false, appVersion: '0.0.1', webBuild: build }),
  );
  return { root, git, sourceSha };
}

function inspect(root) {
  assert.ok(
    fs.existsSync(script),
    'npm test needs a build preflight rather than misleading suite failures',
  );
  return require(script).inspectTestBuild(root);
}

test('fresh web and Android artifacts pass without modifying files', (t) => {
  const { root, git } = fixture(t);
  assert.deepEqual(inspect(root), []);
  assert.equal(git('status', '--porcelain'), '');
});

test('missing web and Android builds fail with an actionable rebuild command', (t) => {
  const { root } = fixture(t);
  fs.rmSync(path.join(root, 'dist'), { recursive: true });
  fs.rmSync(path.join(root, 'dist-android'), { recursive: true });
  assert.ok(inspect(root).length > 0);
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /npm run build:android/);
  assert.match(result.stderr, /before.*test/i);
});

test('committed source changes invalidate previously built artifacts', (t) => {
  const { root, git } = fixture(t);
  fs.writeFileSync(path.join(root, 'source.js'), 'const fixture = 2;\n');
  git('add', '.');
  git('commit', '-qm', 'Changed source');
  assert.match(inspect(root).join('\n'), /source commit/i);
});

test('uncommitted tracked and untracked changes are not fresh source', (t) => {
  const { root } = fixture(t);
  fs.writeFileSync(path.join(root, 'source.js'), 'const fixture = 2;\n');
  assert.match(inspect(root).join('\n'), /working tree/i);
  fs.writeFileSync(path.join(root, 'source.js'), 'const fixture = 1;\n');
  fs.writeFileSync(path.join(root, 'new-source.js'), '/* new */');
  assert.match(inspect(root).join('\n'), /working tree/i);
});

test('missing or modified runtime payloads fail before artifact suites', (t) => {
  const { root } = fixture(t);
  fs.writeFileSync(path.join(root, 'dist/assets/app.js'), '/* modified */');
  fs.rmSync(path.join(root, 'dist-android/assets/app.js'));
  const errors = inspect(root).join('\n');
  assert.match(errors, /dist.*payload/i);
  assert.match(errors, /dist-android/);
});

test('mismatched web and Android build receipts fail', (t) => {
  const { root } = fixture(t);
  fs.writeFileSync(
    path.join(root, 'build-info.json'),
    '{"build":"abcdef123456","version":"0.0.1"}',
  );
  assert.match(inspect(root).join('\n'), /receipt/i);
});

test('malformed identities and receipts produce bounded diagnostics, not a stack trace', (t) => {
  const { root } = fixture(t);
  fs.writeFileSync(path.join(root, 'build-info.json'), '{broken');
  const names = fs.readdirSync(path.join(root, 'dist/assets'));
  const identity = names.find((name) => name.startsWith('alibi-platform'));
  fs.writeFileSync(path.join(root, 'dist/assets', identity), 'broken');
  assert.ok(inspect(root).length >= 2);
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stderr, /at (?:Object|Module)\./);
});

test('pretest invokes the guard without making verify build twice', () => {
  const scripts = require('../package.json').scripts;
  assert.equal(scripts.pretest, 'node tools/check-test-build.cjs');
  assert.equal((scripts.verify.match(/build:android/g) || []).length, 1);
});
