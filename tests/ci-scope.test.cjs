'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const {
  classifyPaths,
  classifyQualifiedChangeSet,
  isPublicationPath,
  normalizePath,
  resolveComparison,
  validateReadmePublication,
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

const receiptSha = 'c'.repeat(40);
const currentVersion = '0.15.2';
const previousVersion = '0.15.1';

function publicationReadme(version, suffix = '') {
  return `# Alibi\n\nSource package **${version}**. Check the [release record](docs/RELEASE-${version}.md) and [project state](docs/STATE.md) for source/build evidence, publication status, and same-origin save/update receipts. Commits after a publication receipt are not automatically deployed. The Sites address is the retiring fallback; see [Status](#status-and-roadmap). A Capacitor Android preview exists in the tree. There is no Play Store release and no completed physical-device acceptance.\n\n## Status and roadmap\n\n**Shipped in source at ${version}.** Thirteen families, 570 registry puzzles, five casebooks, the Games Room, Quiet Wing, the workshop, offline install of the core, the beta/feedback client, optional Desk and Games Room paintings, and navigation/family pictograms. Source/build, Cloudflare publication, public-file, and same-origin save/update receipts are tracked in the [${version} release record](docs/RELEASE-${version}.md) and [project state](docs/STATE.md).\n\n**Sites.** Owner decision 2026-09-27: retire the fallback.\n\n## Links\n\n- [${version} release record](docs/RELEASE-${version}.md)\n- [Live handoff](docs/STATE.md) and [owner decisions](HUMAN_TODO.md)\n${suffix}`;
}

function publicationReceipt(version, overrides = {}) {
  return `# ${version}: Published release\n\n## Published: 14 October 2026\n\nThe primary release uses source ${receiptSha}, build \`ae20e9724548\`.\n\n[Public release](https://github.com/Chris0Jeky/Alibi/releases/tag/v${version}) and [human gates](../HUMAN_TODO.md).\n${overrides.body || ''}`;
}

function readmeQualification({
  baseReadme = publicationReadme(previousVersion),
  headReadme = publicationReadme(currentVersion),
  basePackageVersion = currentVersion,
  headPackageVersion = currentVersion,
  releasePathVersion = currentVersion,
  receipt = publicationReceipt(currentVersion),
} = {}) {
  const packageText = (version) => JSON.stringify({ name: 'fixture', version }) + '\n';
  const root = fixture({
    'README.md': headReadme,
    'package.json': packageText(headPackageVersion),
    'docs/STATE.md': '# State\n',
    'HUMAN_TODO.md': '# Owner gates\n',
    [`docs/RELEASE-${releasePathVersion}.md`]: receipt,
  });
  const result = validateReadmePublication(root, {
    baseReadme,
    headReadme,
    basePackage: packageText(basePackageVersion),
    headPackage: packageText(headPackageVersion),
    headReceipt: receipt,
  });
  const input = {
    baseReadme,
    headReadme,
    basePackage: packageText(basePackageVersion),
    headPackage: packageText(headPackageVersion),
    headReceipt: receipt,
  };
  return { root, result, input };
}

test('the real CLI qualifies exact Git status edits and refuses mixed, stale and unknown inputs', () => {
  const root = fixture({
    'README.md': publicationReadme(previousVersion),
    'package.json': JSON.stringify({ name: 'fixture', version: currentVersion }) + '\n',
    'docs/STATE.md': '# State\n',
    'HUMAN_TODO.md': '# Owner gates\n',
    [`docs/RELEASE-${currentVersion}.md`]: publicationReceipt(currentVersion),
  });
  const git = (...args) =>
    execFileSync(
      'git',
      [
        '-c',
        'user.name=CI scope fixture',
        '-c',
        'user.email=ci-scope@example.invalid',
        '-c',
        'commit.gpgsign=false',
        '-c',
        'core.autocrlf=false',
        ...args,
      ],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim();
  const commit = () => {
    git('add', '.');
    git('commit', '-qm', 'Synthetic scope fixture');
    return git('rev-parse', 'HEAD');
  };
  const script = path.join(__dirname, '../tools/ci-scope.cjs');
  const run = (base, head, event = 'pull_request', verify = false) =>
    spawnSync(process.execPath, [script, ...(verify ? ['--verify-docs'] : [])], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        ALIBI_BASE_SHA: base,
        ALIBI_HEAD_SHA: head,
        ALIBI_EVENT_NAME: event,
        GITHUB_OUTPUT: '',
        GITHUB_STEP_SUMMARY: '',
      },
    });
  const mode = (result) => {
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout).mode;
  };
  try {
    git('init', '-q');
    const base = commit();
    fs.writeFileSync(path.join(root, 'README.md'), publicationReadme(currentVersion));
    const statusHead = commit();
    assert.equal(mode(run(base, statusHead)), 'publication-docs');
    assert.equal(mode(run(base, statusHead, 'pull_request', true)), 'publication-docs');
    assert.equal(mode(run(base, statusHead, 'push')), 'publication-docs');
    assert.equal(mode(run(base, statusHead, 'workflow_dispatch')), 'full');
    assert.notEqual(run(base, statusHead, 'workflow_dispatch', true).status, 0);
    assert.equal(mode(run('d'.repeat(40), statusHead)), 'full');
    assert.notEqual(run('d'.repeat(40), statusHead, 'pull_request', true).status, 0);
    fs.appendFileSync(path.join(root, 'README.md'), '\nUncommitted publication claim.\n');
    assert.equal(mode(run(base, statusHead)), 'full');
    assert.notEqual(run(base, statusHead, 'pull_request', true).status, 0);
    fs.writeFileSync(path.join(root, 'README.md'), publicationReadme(currentVersion));
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src/app.js'), '// synthetic runtime change\n');
    const mixedHead = commit();
    assert.equal(mode(run(base, mixedHead)), 'full');
    assert.notEqual(run(base, mixedHead, 'pull_request', true).status, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('README publication status fields qualify only against the matching source release receipt', () => {
  const { result } = readmeQualification();
  assert.deepEqual(result.errors, []);
  assert.equal(result.version, currentVersion);
  const classification = classifyQualifiedChangeSet(
    ['README.md'],
    { eventName: 'pull_request', baseKnown: true, base: sha, head },
    result,
  );
  assert.equal(classification.mode, 'publication-docs');
});

test('README status qualification never covers mixed, manual, or unknown-base changes', () => {
  const { result } = readmeQualification();
  const known = { eventName: 'pull_request', baseKnown: true, base: sha, head };
  const mixed = classifyQualifiedChangeSet(['README.md', 'src/app.js'], known, result);
  assert.equal(mixed.mode, 'full');

  const unknown = classifyQualifiedChangeSet(['README.md'], { ...known, baseKnown: false }, result);
  assert.equal(unknown.mode, 'full');

  const manual = classifyQualifiedChangeSet(
    ['README.md'],
    { ...known, eventName: 'workflow_dispatch' },
    result,
  );
  assert.equal(manual.mode, 'full');

  const unknownEvent = classifyQualifiedChangeSet(
    ['README.md'],
    { ...known, eventName: 'schedule' },
    result,
  );
  assert.equal(unknownEvent.mode, 'full');
});

test('README publication qualification rejects changes to non-status wording and install instructions', () => {
  const prior = publicationReadme(previousVersion);
  const bodyText = 'There is no Play Store release and no completed physical-device acceptance.';
  const alteredCaveat = publicationReadme(currentVersion).replace(
    bodyText,
    'Physical-device acceptance is complete.',
  );
  const bodyChanged = readmeQualification({ baseReadme: prior, headReadme: alteredCaveat });
  assert.match(bodyChanged.result.errors.join('\n'), /outside recognized publication/);
  assert.equal(
    classifyQualifiedChangeSet(
      ['README.md'],
      { eventName: 'pull_request', baseKnown: true, base: sha, head },
      bodyChanged.result,
    ).mode,
    'full',
  );

  const installBase = `${prior}\n## Quickstart\n\n\`\`\`sh\nnpm ci\n\`\`\`\n`;
  const installHead = `${publicationReadme(currentVersion)}\n## Quickstart\n\n\`\`\`sh\nnpm install\n\`\`\`\n`;
  const installChanged = readmeQualification({ baseReadme: installBase, headReadme: installHead });
  assert.match(installChanged.result.errors.join('\n'), /outside recognized publication/);
});

test('README publication qualification rejects altered headings, publication claims and owner-gate wording', () => {
  const cases = [
    publicationReadme(currentVersion).replace('## Status and roadmap', '## Status & roadmap'),
    publicationReadme(currentVersion).replace('Shipped in source at', 'Fully accepted at'),
    publicationReadme(currentVersion).replace(
      'no completed physical-device acceptance',
      'completed physical-device acceptance',
    ),
    publicationReadme(currentVersion).replace('no Play Store release', 'a Play Store release'),
  ];
  for (const headReadme of cases) {
    const { result } = readmeQualification({ headReadme });
    assert.notDeepEqual(result.errors, [], headReadme);
  }
});

test('README publication qualification rejects ambiguous or malformed status blocks', () => {
  const duplicated = `${publicationReadme(currentVersion)}\n${publicationReadme(currentVersion).split('\n')[2]}\n`;
  const missingStatus = publicationReadme(currentVersion).replace(
    '**Shipped in source at 0.15.2.**',
    '**Shipped in source.**',
  );
  for (const headReadme of [duplicated, missingStatus]) {
    const { result } = readmeQualification({ headReadme });
    assert.notDeepEqual(result.errors, [], headReadme);
  }
});

test('README publication qualification requires one consistent package and receipt version', () => {
  const packageMismatch = readmeQualification({ headPackageVersion: '0.15.3' });
  assert.match(packageMismatch.result.errors.join('\n'), /package version/);

  const linkMismatch = readmeQualification({
    headReadme: publicationReadme(currentVersion).replace(
      `docs/RELEASE-${currentVersion}.md) and [project state]`,
      `docs/RELEASE-${previousVersion}.md) and [project state]`,
    ),
  });
  assert.match(linkMismatch.result.errors.join('\n'), /version|outside recognized publication/i);

  const receiptMismatch = readmeQualification({ receipt: publicationReceipt(previousVersion) });
  assert.match(receiptMismatch.result.errors.join('\n'), /release record|version/i);
});

test('README publication qualification retains published receipt SHA, build and public release-link checks', () => {
  const cases = [
    publicationReceipt(currentVersion).replace(receiptSha, ''),
    publicationReceipt(currentVersion).replace(receiptSha, '0'.repeat(40)),
    publicationReceipt(currentVersion).replace('ae20e9724548', 'short'),
    publicationReceipt(currentVersion).replace(`tag/v${currentVersion}`, `tag/v${previousVersion}`),
    publicationReceipt(currentVersion).replace('## Published: 14 October 2026', '## Draft'),
  ];
  for (const receipt of cases) {
    const { result } = readmeQualification({ receipt });
    assert.notDeepEqual(result.errors, [], receipt);
  }
});

test('README publication qualification validates its local links and regular-file boundaries', () => {
  const badLink = readmeQualification({
    headReadme: publicationReadme(currentVersion).replace(
      '[project state](docs/STATE.md)',
      '[project state](docs/MISSING.md)',
    ),
  });
  assert.match(
    badLink.result.errors.join('\n'),
    /outside recognized publication|missing local target/,
  );

  const { root, input } = readmeQualification();
  if (process.platform !== 'win32') {
    const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-ci-scope-readme-'));
    try {
      const outside = path.join(outsideRoot, 'README.md');
      fs.writeFileSync(outside, input.headReadme);
      fs.unlinkSync(path.join(root, 'README.md'));
      fs.symlinkSync(outside, path.join(root, 'README.md'));
      assert.match(
        validateReadmePublication(root, input).errors.join('\n'),
        /README.*regular file/,
      );
    } finally {
      fs.rmSync(outsideRoot, { recursive: true, force: true });
    }
  }
});

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
  assert.equal(isPublicationPath('README.md'), false);
  assert.equal(classifyPaths(['README.md']).mode, 'full');
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
