/* Build a portable release folder. Publication is a separate, reviewed action. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { build } = require('./build.cjs');
const ROOT = path.resolve(__dirname, '..');
const ORIGIN_SCENARIOS = [
  'durability',
  'backup_restore',
  'cross_tab',
  'keyboard',
  'offline',
  'malformed_draft',
  'newer_database',
];

function nodeSuites(root = ROOT) {
  const testDir = path.join(root, 'tests');
  return {
    tests: fs
      .readdirSync(testDir)
      .filter((f) => /\.test\.[cm]js$/.test(f))
      .sort()
      .map((f) => path.join(testDir, f)),
    scripts: ['tests/quiet-wing/engines.cjs', 'tests/quiet-wing/contracts.cjs'],
  };
}

function isCompleteOriginReport(result, build) {
  return (
    result?.passed === true &&
    result.fullSuite === true &&
    result.runtime?.build === build &&
    JSON.stringify(result.scenarioSet) === JSON.stringify(ORIGIN_SCENARIOS)
  );
}

function newPackageDirectory(root, info) {
  const releaseRoot = path.join(root, 'release');
  fs.mkdirSync(releaseRoot, { recursive: true });
  return fs.mkdtempSync(path.join(releaseRoot, `alibi-${info.version}-${info.build}-`));
}

function pack() {
  build();
  const suites = nodeSuites();
  execFileSync(process.execPath, ['--test', ...suites.tests], { cwd: ROOT, stdio: 'inherit' });
  for (const script of suites.scripts)
    execFileSync(process.execPath, [path.join(ROOT, script)], { cwd: ROOT, stdio: 'inherit' });
  const info = JSON.parse(fs.readFileSync(path.join(ROOT, 'build-info.json'), 'utf8'));
  const output = newPackageDirectory(ROOT, info);
  const selected = ['alibi-deluxe-cloudflare.zip', 'alibi-deluxe-play.html', 'build-info.json'];
  const reports = [
    'tests/core-results.json',
    'tests/storage-results.json',
    'tests/sw-results.json',
  ];
  const ui = path.join(ROOT, 'tests/browser-results.json');
  if (fs.existsSync(ui) && JSON.parse(fs.readFileSync(ui, 'utf8')).build === info.build)
    reports.push('tests/browser-results.json');
  const origin = path.join(ROOT, 'test-results/browser-origin/browser-origin.json');
  if (fs.existsSync(origin)) {
    const result = JSON.parse(fs.readFileSync(origin, 'utf8'));
    if (isCompleteOriginReport(result, info.build))
      reports.push('test-results/browser-origin/browser-origin.json');
  }
  const update = path.join(ROOT, 'test-results/browser-update/results.json');
  if (fs.existsSync(update)) {
    const result = JSON.parse(fs.readFileSync(update, 'utf8'));
    if (result.passed && result.release_a?.build === info.build)
      reports.push('test-results/browser-update/results.json');
  }
  const entries = [...selected, ...reports];
  for (const file of entries)
    fs.copyFileSync(path.join(ROOT, file), path.join(output, path.basename(file)));
  const sums =
    entries
      .map(
        (file) =>
          crypto
            .createHash('sha256')
            .update(fs.readFileSync(path.join(ROOT, file)))
            .digest('hex') +
          '  ' +
          path.basename(file),
      )
      .join('\n') + '\n';
  fs.writeFileSync(path.join(output, 'SHA256SUMS'), sums);
  fs.writeFileSync(
    path.join(output, 'RELEASE-MANIFEST.json'),
    JSON.stringify(
      {
        application: 'Alibi',
        ...info,
        source: 'https://github.com/Chris0Jeky/Alibi',
        androidVerified: false,
        reports: reports.map((p) => path.basename(p)),
        files: [...entries.map((p) => path.basename(p)), 'SHA256SUMS', 'RELEASE-MANIFEST.json'],
        note: 'Packaging does not prove deployment. Browser reports are included only when their build identity matches.',
      },
      null,
      2,
    ),
  );
  const declared = JSON.parse(
    fs.readFileSync(path.join(output, 'RELEASE-MANIFEST.json'), 'utf8'),
  ).files.sort();
  const actual = fs
    .readdirSync(output, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  if (JSON.stringify(actual) !== JSON.stringify(declared))
    throw Error('Release manifest does not match the fresh package directory.');
  console.log(output);
  return output;
}
if (require.main === module) pack();
module.exports = {
  ORIGIN_SCENARIOS,
  isCompleteOriginReport,
  newPackageDirectory,
  nodeSuites,
  pack,
};
