'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const build = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json'), 'utf8'));
if (!/^[a-f0-9]{12}$/.test(build.build)) throw Error('Invalid release build identity');
const output = path.join(root, 'alibi-curation', 'integrated-' + build.build);
if (fs.existsSync(output)) throw Error('This bundle snapshot already exists; preserve it.');
fs.mkdirSync(output, { recursive: true });
for (const [from, to] of [
  ['dist', 'site'],
  ['alibi-deluxe-play.html', 'PLAY.html'],
  ['content', 'source-content'],
  ['assets-source/curation', 'museum-provenance'],
  ['docs/CURATION.md', 'CURATION.md'],
  ['docs/curation', 'curation-evidence'],
  ['test-results/curation', 'local-checks'],
  ['test-results/curation-ui', 'screens'],
]) {
  const source = path.join(root, from);
  if (fs.existsSync(source)) fs.cpSync(source, path.join(output, to), { recursive: true });
}
const files = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const sha = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const manifest = {
  schema: 1,
  createdAt: new Date().toISOString(),
  sourceCommit: sha,
  build,
  status: 'Review candidate; consult the PR for hosted CI and publication status.',
  pullRequest: 'https://github.com/Chris0Jeky/Alibi/pull/19',
  assetBaseline: '3dddb47',
  corePuzzles: 324,
  separateChallenges: 59,
  humanPlaytested: false,
  files: files(output)
    .sort()
    .map((file) => {
      const data = fs.readFileSync(file);
      return {
        path: path.relative(output, file).split(path.sep).join('/'),
        bytes: data.length,
        sha256: crypto.createHash('sha256').update(data).digest('hex'),
      };
    }),
};
fs.writeFileSync(
  path.join(output, 'integration-manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);
fs.writeFileSync(
  path.join(output, 'START-HERE.md'),
  `# Alibi Curation Cabinet — current integration\n\nOpen PLAY.html for the self-contained puzzle/Quiet Wing preview. The complete site/ folder includes the current on-demand asset experience and must be served over HTTP(S). Neither file opening nor this snapshot claims a live deployment.\n\n324 core puzzles and 59 separate challenges; difficulty and timing remain uncalibrated. All original bundle files remain beside this versioned snapshot. integration-manifest.json records source/build identity and actual file hashes.\n\nThe PR is https://github.com/Chris0Jeky/Alibi/pull/19. Human device/playtest checks remain in the repository's HUMAN_TODO.md.\n`,
);
console.log(output);
