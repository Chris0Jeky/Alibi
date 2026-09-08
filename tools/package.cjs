/* Package the exact built files, source and evidence. Never deploys or accesses accounts. */
'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { zip, files, build } = require('./build.cjs'),
  { renderGuide } = require('./render-guide.cjs');
const R = path.resolve(__dirname, '..');
function pack() {
  build();
  renderGuide();
  const allowed = [
      'src',
      'content',
      'docs',
      'examples',
      'schemas',
      'tools',
      'tests',
      '.github',
      'dist',
    ],
    rootFiles = [
      'README.md',
      'AGENTS.md',
      'CHANGELOG.md',
      'NOTICE.md',
      'package.json',
      'wrangler.jsonc',
      '.gitignore',
      'build-info.json',
    ];
  const selected = [
    ...allowed.flatMap((d) => files(path.join(R, d))),
    ...rootFiles.map((f) => path.join(R, f)),
  ].filter(
    (p) =>
      !p.endsWith('.log') &&
      !p.endsWith('.pid') &&
      !p.includes('__pycache__') &&
      !p.endsWith('desktop-home-initial.png'),
  );
  zip(
    selected.map((p) => [
      'alibi/' + path.relative(R, p).split(path.sep).join('/'),
      fs.readFileSync(p),
    ]),
    path.join(R, 'alibi-deluxe-source.zip'),
  );
  const items = [
    ['START-HERE.html', fs.readFileSync(path.join(R, 'alibi-deluxe-guide.html'))],
    ...[
      'alibi-deluxe-play.html',
      'alibi-deluxe-cloudflare.zip',
      'alibi-deluxe-source.zip',
      'build-info.json',
    ].map((f) => [f, fs.readFileSync(path.join(R, f))]),
    ...['core', 'browser', 'storage', 'sw'].map((n) => [
      'verification/' + n + '-results.json',
      fs.readFileSync(path.join(R, 'tests/' + n + '-results.json')),
    ]),
    ['verification/TEST-REPORT.md', fs.readFileSync(path.join(R, 'docs/TEST-REPORT.md'))],
  ];
  const hashes =
    items
      .map(([f, b]) => crypto.createHash('sha256').update(b).digest('hex') + '  ' + f)
      .join('\n') + '\n';
  items.push(['SHA256SUMS', Buffer.from(hashes)]);
  const info = JSON.parse(fs.readFileSync(path.join(R, 'build-info.json')));
  items.push([
    'RELEASE-MANIFEST.json',
    Buffer.from(
      JSON.stringify(
        {
          application: 'Alibi',
          version: info.version,
          build: info.build,
          hosted: false,
          androidVerified: false,
          entry: 'START-HERE.html',
          upload: 'alibi-deluxe-cloudflare.zip',
          source: 'alibi-deluxe-source.zip',
          important:
            'Upload only the deployment ZIP to the hosting root. The other files are documentation, source and evidence.',
        },
        null,
        2,
      ),
    ),
  ]);
  zip(items, path.join(R, 'alibi-deluxe-publish-bundle.zip'));
  console.log('Created source and publishing bundles.');
}
if (require.main === module) pack();
module.exports = { pack };
