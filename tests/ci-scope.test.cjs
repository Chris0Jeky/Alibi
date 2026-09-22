'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  classifyPaths,
  isPublicationPath,
  normalizePath,
  resolveComparison,
  verifyDocuments,
} = require('../tools/ci-scope.cjs');

const sha = 'a'.repeat(40);
const head = 'b'.repeat(40);

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-ci-scope-'));
  for (const [relative, content] of Object.entries(files)) {
    const filename = path.join(root, relative);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, content);
  }
  return root;
}

function ownedFixture(files, prefix = 'alibi-ci-scope-') {
  const parent = path.join(__dirname, '..', 'test-results', 'ci-scope');
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, prefix));
  for (const [relative, content] of Object.entries(files)) {
    const filename = path.join(root, relative);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, content);
  }
  return root;
}

test('only exact publication and provenance paths use the fast path', () => {
  const result = classifyPaths([
    'docs/RELEASE-0.11.3.md',
    'docs/STATE.md',
    'docs/curation/expert-families.md',
  ]);
  assert.equal(result.mode, 'publication-docs');
  assert.equal(result.paths.length, 3);
  assert.equal(isPublicationPath('docs/RELEASE-1.2.30.md'), true);
  assert.equal(isPublicationPath('docs/curation/nested/file.md'), false);
});

test('product, automation, policy and runbook changes force full verification', () => {
  for (const filename of [
    'src/app.js',
    '.github/workflows/check.yml',
    'tools/build.cjs',
    'tests/ui.test.cjs',
    'AGENTS.md',
    'HUMAN_TODO.md',
    'README.md',
    'docs/DEPLOYMENT.md',
    'docs/capacitor/CI-CD-AND-RELEASE.md',
  ]) {
    assert.equal(classifyPaths(['docs/STATE.md', filename]).mode, 'full', filename);
  }
});

test('manual, unknown-base, empty and malformed comparisons stay full', () => {
  assert.equal(classifyPaths(['docs/STATE.md'], { eventName: 'workflow_dispatch' }).mode, 'full');
  assert.equal(classifyPaths(['docs/STATE.md'], { baseKnown: false }).mode, 'full');
  assert.equal(classifyPaths([]).mode, 'full');
  assert.equal(classifyPaths(['../docs/STATE.md']).mode, 'full');
  assert.equal(normalizePath('/docs/STATE.md'), null);
});

test('literal backslashes never alias allowlisted Git paths', () => {
  assert.equal(normalizePath('docs\\STATE.md'), null);
  assert.equal(classifyPaths(['docs\\STATE.md']).mode, 'full');
});

test('publication verification validates reference-style link definitions', () => {
  const valid = fixture({
    'docs/STATE.md': '# State\nSee [release][details].\n\n[details]: RELEASE-0.11.3.md\n',
    'docs/RELEASE-0.11.3.md': '# Release\n',
  });
  assert.deepEqual(verifyDocuments(valid, ['docs/STATE.md']), []);

  const broken = fixture({
    'docs/STATE.md': '# State\nSee [receipt][missing].\n\n[missing]: missing.md\n',
  });
  assert.match(verifyDocuments(broken, ['docs/STATE.md']).join('\n'), /missing local target/);
});

test('publication verification validates continued reference definitions', () => {
  const root = fixture({
    'docs/STATE.md': '# State\nSee [receipt][details].\n\n[details]:\n  missing.md\n',
  });
  assert.match(verifyDocuments(root, ['docs/STATE.md']).join('\n'), /missing local target/);
});

test('comparison environment accepts real non-zero SHAs only', () => {
  assert.equal(resolveComparison({ ALIBI_BASE_SHA: sha, ALIBI_HEAD_SHA: head }).baseKnown, true);
  assert.equal(
    resolveComparison({ ALIBI_BASE_SHA: '0'.repeat(40), ALIBI_HEAD_SHA: head }).baseKnown,
    false,
  );
  assert.equal(
    resolveComparison({ ALIBI_BASE_SHA: 'short', ALIBI_HEAD_SHA: head }).baseKnown,
    false,
  );
});

test('publication document checks local links and published claim shape', () => {
  const root = fixture({
    'HUMAN_TODO.md': '# Human gates\n',
    'docs/STATE.md': '# State\nSee [release](RELEASE-0.11.3.md).\n',
    'docs/RELEASE-0.11.3.md': `# 0.11.3\n\nPublished from ${sha}, build \`01501bb6797b\`.\nSee [human gates](../HUMAN_TODO.md).\n`,
    'docs/curation/expert-families.md': '# Expert families\nSee [state](../STATE.md).\n',
  });
  assert.deepEqual(
    verifyDocuments(root, [
      'docs/RELEASE-0.11.3.md',
      'docs/STATE.md',
      'docs/curation/expert-families.md',
    ]),
    [],
  );
});

test('publication verification rejects missing files, links and evidence-shaped claims', () => {
  const root = fixture({
    'docs/RELEASE-1.0.0.md': '# Release\nPublished now. See [missing](missing.md).\n',
  });
  const errors = verifyDocuments(root, ['docs/RELEASE-1.0.0.md', 'docs/STATE.md']);
  assert.match(errors.join('\n'), /full source SHA/);
  assert.match(errors.join('\n'), /build ID/);
  assert.match(errors.join('\n'), /missing local target/);
  assert.match(errors.join('\n'), /document is missing/);
});

test('publication verification rejects unsupported schemes and deleted allowlisted documents', () => {
  const root = fixture({
    'docs/STATE.md': '# State\n[unsafe](http://example.com)\n[local](file:///tmp/evidence)\n',
  });
  const errors = verifyDocuments(root, ['docs/STATE.md', 'docs/curation/deleted.md']);
  assert.match(errors.join('\n'), /non-HTTPS or unsupported link: http:/);
  assert.match(errors.join('\n'), /non-HTTPS or unsupported link: file:/);
  assert.match(errors.join('\n'), /document is missing/);
});

test('rejects linked allowlisted documents', () => {
  if (process.platform === 'win32') {
    // A parent junction keeps the final document a regular file while proving realpath containment.
    const root = ownedFixture({}, 'alibi-ci-scope-repository-');
    const outside = ownedFixture({ 'STATE.md': '# Outside\n' }, 'alibi-ci-scope-target-');
    try {
      fs.symlinkSync(outside, path.join(root, 'docs'), 'junction');
      const filename = path.join(root, 'docs', 'STATE.md');
      assert.equal(fs.lstatSync(filename).isFile(), true);
      assert.match(verifyDocuments(root, ['docs/STATE.md']).join('\n'), /escapes the repository/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
    return;
  }

  // POSIX retains direct file-symlink coverage; Windows file symlink creation is permission-sensitive.
  const root = fixture({ 'outside.md': '# Outside\n' });
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.symlinkSync(path.join(root, 'outside.md'), path.join(root, 'docs/STATE.md'));
  assert.match(verifyDocuments(root, ['docs/STATE.md']).join('\n'), /must be a regular file/);
});

test('publication verification rejects directory allowlisted documents', () => {
  const root = ownedFixture({}, 'alibi-ci-scope-directory-');
  try {
    fs.mkdirSync(path.join(root, 'docs', 'STATE.md'), { recursive: true });
    assert.match(verifyDocuments(root, ['docs/STATE.md']).join('\n'), /must be a regular file/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
