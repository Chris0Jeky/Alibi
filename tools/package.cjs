/* Build a portable release folder. Publication is a separate, reviewed action. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { build } = require('./build.cjs');
const ROOT = path.resolve(__dirname, '..');
function pack() {
  build();
  const tests = fs
    .readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => f.endsWith('.test.cjs'))
    .map((f) => path.join(ROOT, 'tests', f));
  execFileSync(process.execPath, ['--test', ...tests], { cwd: ROOT, stdio: 'inherit' });
  const info = JSON.parse(fs.readFileSync(path.join(ROOT, 'build-info.json'), 'utf8'));
  const output = path.join(ROOT, 'release', `alibi-${info.version}-${info.build}`);
  fs.mkdirSync(output, { recursive: true });
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
    if (result.passed && result.runtime?.build === info.build)
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
        note: 'Packaging does not prove deployment. Browser reports are included only when their build identity matches.',
      },
      null,
      2,
    ),
  );
  console.log(output);
  return output;
}
if (require.main === module) pack();
module.exports = { pack };
