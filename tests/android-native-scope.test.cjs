'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const script = path.resolve(__dirname, '../tools/android-native-scope.cjs');
test('native scope uses real git commits and refuses uncertain or non-handoff changes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'native-scope-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  const commit = () => {
    git('add', '-A');
    git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '-qm',
      'fixture',
    );
    return git('rev-parse', 'HEAD');
  };
  const classify = (base, head, event = 'pull_request') => {
    const result = spawnSync(process.execPath, [script], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        ALIBI_BASE_SHA: base,
        ALIBI_HEAD_SHA: head,
        ALIBI_EVENT_NAME: event,
        GITHUB_OUTPUT: '',
      },
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout).mode;
  };
  try {
    git('init', '-q');
    fs.mkdirSync(path.join(dir, 'docs/state'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'docs/state/a.md'), 'a');
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'src/app.js'), 'a');
    const base = commit();
    fs.writeFileSync(path.join(dir, 'docs/state/a.md'), 'b');
    const doc = commit();
    assert.equal(classify(base, doc), 'docs-only');
    assert.equal(classify(base, doc, 'push'), 'full');
    assert.equal(classify(base, doc, 'workflow_dispatch'), 'full');
    assert.equal(classify(base, doc, 'schedule'), 'full');
    assert.equal(classify('f'.repeat(40), doc), 'full');
    assert.equal(classify(doc, doc), 'full');
    fs.writeFileSync(path.join(dir, 'src/app.js'), 'dirty');
    assert.equal(classify(base, doc), 'full');
    fs.writeFileSync(path.join(dir, 'src/app.js'), 'a');
    fs.writeFileSync(path.join(dir, 'src/app.js'), 'b');
    const mixed = commit();
    assert.equal(classify(base, mixed), 'full');
    git('rm', '-q', 'docs/state/a.md');
    fs.mkdirSync(path.join(dir, 'docs/state'), { recursive: true });
    fs.symlinkSync('../../src/app.js', path.join(dir, 'docs/state/a.md'));
    const link = commit();
    assert.equal(classify(mixed, link), 'full');
    fs.unlinkSync(path.join(dir, 'docs/state/a.md'));
    fs.renameSync(path.join(dir, 'src/app.js'), path.join(dir, 'docs/state/renamed.md'));
    const moved = commit();
    assert.equal(classify(link, moved), 'full');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test('native workflow keeps a stable job and fails closed on incomplete selected work', () => {
  const workflow = fs.readFileSync(
    path.resolve(__dirname, '../.github/workflows/android-native.yml'),
    'utf8',
  );
  assert.match(workflow, /\n  android-native:\n/);
  assert.match(workflow, /persist-credentials: false/);
  const chunks = workflow.split(/(?=^      - )/m);
  const required = [
    'actions/setup-java@',
    'actions/setup-python@',
    'Verify wrapper and record exact source',
    'run: npm ci',
    'Exercise fail-closed source and package contracts',
    'Prepare Android tools',
    'Build and verify the actual native payload',
    'Compile, lint and assemble',
    'Inspect actual APKs',
    'Prepare emulator after package validation',
    'Boot the installed debug host offline',
    'Confirm source and dependency locks stayed unchanged',
  ];
  for (const item of required) {
    const chunk = chunks.find((part) => part.includes(item));
    assert.ok(chunk, item);
    assert.match(chunk, /if: steps\.scope\.outputs\.mode == 'full'/, item);
  }
  const final = chunks.find((part) => part.includes('name: Require selected native result'));
  assert.match(final, /if: always\(\)/);
  const script = final
    .split('        run: |\n')[1]
    .split('\n')
    .map((line) => line.replace(/^          /, ''))
    .join('\n');
  const result = (scope, scopeResult, testResult, fullResult) =>
    spawnSync('bash', ['-e', '-c', script], {
      env: {
        ...process.env,
        SCOPE: scope,
        SCOPE_RESULT: scopeResult,
        TEST_RESULT: testResult,
        FULL_RESULT: fullResult,
      },
    }).status;
  assert.equal(result('docs-only', 'success', 'success', 'skipped'), 0);
  assert.equal(result('full', 'success', 'success', 'success'), 0);
  for (const bad of [
    ['full', 'success', 'success', 'skipped'],
    ['docs-only', 'failure', 'success', 'skipped'],
    ['', 'success', 'success', 'skipped'],
    ['docs-only', 'success', 'failure', 'skipped'],
    ['docs-only', 'success', 'success', 'success'],
  ])
    assert.notEqual(result(...bad), 0, JSON.stringify(bad));
});

test('workflow wrapper uses trusted base classifier and defaults to full on missing or invalid base code', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'native-wrapper-'));
  const runner = fs.mkdtempSync(path.join(os.tmpdir(), 'native-wrapper-runner-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  const commit = () => {
    git('add', '-A');
    git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '-qm',
      'fixture',
    );
    return git('rev-parse', 'HEAD');
  };
  const workflow = fs.readFileSync(
    path.resolve(__dirname, '../.github/workflows/android-native.yml'),
    'utf8',
  );
  const chunk = workflow
    .split(/(?=^      - )/m)
    .find((part) => part.includes('name: Classify native scope from trusted base'));
  const shell = chunk
    .split('        run: |\n')[1]
    .split('\n')
    .map((line) => line.replace(/^          /, ''))
    .join('\n');
  const run = (base, head) => {
    const output = path.join(runner, 'scope-output');
    fs.writeFileSync(output, '');
    const result = spawnSync('bash', ['-e', '-c', shell], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        ALIBI_EVENT_NAME: 'pull_request',
        ALIBI_BASE_SHA: base,
        ALIBI_HEAD_SHA: head,
        RUNNER_TEMP: runner,
        GITHUB_OUTPUT: output,
      },
    });
    assert.equal(result.status, 0, result.stderr);
    return fs.readFileSync(output, 'utf8').trim();
  };
  try {
    git('init', '-q');
    fs.mkdirSync(path.join(dir, 'docs/state'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'docs/state/a.md'), 'a');
    const missing = commit();
    fs.writeFileSync(path.join(dir, 'docs/state/a.md'), 'b');
    const head1 = commit();
    assert.equal(run(missing, head1), 'mode=full');
    fs.mkdirSync(path.join(dir, 'tools'));
    fs.copyFileSync(script, path.join(dir, 'tools/android-native-scope.cjs'));
    const trusted = commit();
    fs.writeFileSync(path.join(dir, 'docs/state/a.md'), 'c');
    const head2 = commit();
    assert.equal(run(trusted, head2), 'mode=docs-only');
    assert.equal(run(trusted, head1), 'mode=full');
    const originalBranch = git('branch', '--show-current');
    git('checkout', '-qb', 'fork');
    fs.writeFileSync(path.join(dir, 'docs/state/a.md'), 'fork');
    const fork = commit();
    git('checkout', '-qb', 'advanced-base', trusted);
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'src/app.js'), 'runtime');
    const advanced = commit();
    git('checkout', '-q', 'fork');
    assert.equal(run(advanced, fork), 'mode=full');
    git('checkout', '-q', originalBranch);
    fs.writeFileSync(path.join(dir, 'tools/android-native-scope.cjs'), "console.log('not json')\n");
    const malformed = commit();
    fs.writeFileSync(path.join(dir, 'docs/state/a.md'), 'd');
    const head3 = commit();
    assert.equal(run(malformed, head3), 'mode=full');
    fs.writeFileSync(path.join(dir, 'tools/android-native-scope.cjs'), "throw Error('failed')\n");
    const failed = commit();
    fs.writeFileSync(path.join(dir, 'docs/state/a.md'), 'e');
    const head4 = commit();
    assert.equal(run(failed, head4), 'mode=full');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(runner, { recursive: true, force: true });
  }
});
