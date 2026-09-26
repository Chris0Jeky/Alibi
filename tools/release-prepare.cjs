'use strict';
// Prepare an Alibi release candidate: validate its release record, set the package version,
// register the release label with the Pulseboard collector contract and regenerate the pinned
// Observatory adapter. Usage:
//   npm run release:prepare -- <version> [--pulseboard <checkout>] [--publish]
// Pulseboard is found via --pulseboard, PULSEBOARD_REPO, or a sibling `Pulseboard` checkout.
// Its checkout is never modified: the sync runs in a temporary worktree from origin/main.
// `node observatory/check.mjs` still needs a build and runs in CI.
// --publish commits, pushes and opens the Pulseboard pull request. Merging it and deploying the
// collector (`npm run deploy` in Pulseboard/observatory) stay separate, reviewed steps.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function compareVersions(a, b) {
  const x = a.split('.').map(Number),
    y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

// Returns a list of problems with the release record for `version`; empty means ready.
function releaseRecordProblems(releases, version) {
  if (!Array.isArray(releases)) return ['content/releases.json must be an array.'];
  const matches = releases.filter((r) => r && r.version === version);
  if (matches.length !== 1)
    return [
      `content/releases.json needs exactly one record for ${version} (found ${matches.length}).`,
    ];
  const record = matches[0],
    problems = [];
  if (releases[0] !== record) problems.push(`The ${version} record must be first (newest).`);
  const newestOther = releases
    .filter((r) => r && r !== record && SEMVER.test(r.version))
    .sort((a, b) => compareVersions(b.version, a.version))[0];
  if (newestOther && compareVersions(version, newestOther.version) <= 0)
    problems.push(`${version} must be newer than ${newestOther.version}.`);
  if (record.tag !== `v${version}`) problems.push(`tag must be v${version}.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date || '')) problems.push('date must be YYYY-MM-DD.');
  if (typeof record.title !== 'string' || !record.title.trim()) problems.push('title is required.');
  if (record.receipt !== `docs/RELEASE-${version}.md`)
    problems.push(`receipt must be docs/RELEASE-${version}.md.`);
  if (
    !Array.isArray(record.changes) ||
    !record.changes.length ||
    record.changes.some((c) => typeof c !== 'string' || !c.trim())
  )
    problems.push('changes must list at least one player-facing sentence.');
  return problems;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32' && /^(npm|npx)$/.test(command),
    ...options,
  });
  if (result.status !== 0)
    throw Error(
      `${command} ${args.join(' ')} failed (${result.status}):\n${result.stderr || result.stdout}`,
    );
  return result.stdout.trim();
}

// A failed run is tolerated only on Windows when every failing test is a symlink test and the
// output shows the host refusing symlink creation (EPERM). Elsewhere symlink tests must pass.
function onlyHostSymlinkFailures(output, platform = process.platform) {
  const summary = output.split(/^✖ failing tests:$/m)[1];
  if (platform !== 'win32' || !summary) return false;
  const failed = [...new Set(summary.match(/^✖ .*$/gm) || [])];
  return (
    failed.length > 0 &&
    failed.every((line) => /symlink/i.test(line)) &&
    /EPERM: operation not permitted, symlink/.test(output)
  );
}

function findPulseboard(explicit) {
  const candidates = [
    explicit,
    process.env.PULSEBOARD_REPO,
    path.join(path.dirname(ROOT), 'Pulseboard'),
    // A linked worktree lives below the main checkout; look beside that checkout too.
    path.join(
      path.dirname(
        run('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: ROOT }),
      ),
      '..',
      'Pulseboard',
    ),
  ].filter(Boolean);
  // Only origin/main is used, so a stale working tree is fine; it just has to be a Git checkout.
  const found = candidates.find((c) => fs.existsSync(path.join(c, '.git')));
  if (!found)
    throw Error('Pulseboard checkout not found. Pass --pulseboard <path> or set PULSEBOARD_REPO.');
  return path.resolve(found);
}

function main(argv) {
  const version = argv.find((a) => !a.startsWith('--'));
  const flag = (name) => argv.includes(name);
  const option = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  if (!version || !SEMVER.test(version))
    throw Error('Usage: npm run release:prepare -- <x.y.z> [--pulseboard <path>] [--publish]');

  const releases = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/releases.json'), 'utf8'));
  const problems = releaseRecordProblems(releases, version);
  if (problems.length) throw Error(`Release record is not ready:\n- ${problems.join('\n- ')}`);

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (pkg.version !== version) {
    run('npm', ['version', version, '--no-git-tag-version'], { cwd: ROOT });
    console.log(`package.json: ${pkg.version} -> ${version}`);
  }

  const pulseboard = findPulseboard(option('--pulseboard'));
  run('git', ['fetch', '-q', 'origin'], { cwd: pulseboard });
  run('git', ['cat-file', '-e', 'origin/main:observatory/adapters/sync-alibi.mjs'], {
    cwd: pulseboard,
  });
  const branch = `chore/admit-alibi-${version}`;
  const worktree = fs.mkdtempSync(path.join(os.tmpdir(), 'pulseboard-release-'));
  run('git', ['worktree', 'add', '-q', '--detach', worktree, 'origin/main'], { cwd: pulseboard });
  let keepWorktree = true;
  try {
    const observatory = path.join(worktree, 'observatory');
    const report = JSON.parse(
      run('node', ['adapters/sync-alibi.mjs', '--write', '--json', ROOT], { cwd: observatory }),
    );
    if (!report.ok) throw Error(`Pulseboard sync failed: ${report.error?.message}`);
    console.log(`Pulseboard sync: ${report.status}; releases ${report.releases.join(', ')}`);
    const check = JSON.parse(
      run('node', ['adapters/sync-alibi.mjs', '--check', '--json', ROOT], { cwd: observatory }),
    );
    if (!check.ok || check.status !== 'in-sync') throw Error('Alibi adapter is not in sync.');
    console.log(
      'Alibi adapter matches the registered releases (run observatory/check.mjs after a build).',
    );

    const changed = run('git', ['status', '--porcelain'], { cwd: worktree });
    if (!changed) {
      keepWorktree = false;
      console.log(`Pulseboard already admits ${version}; no Pulseboard change needed.`);
      return;
    }
    // Only a real registration needs a branch; refuse to duplicate an existing one.
    for (const ref of [`refs/heads/${branch}`, `refs/remotes/origin/${branch}`])
      if (
        spawnSync('git', ['rev-parse', '-q', '--verify', ref], { cwd: pulseboard }).status === 0
      ) {
        // Nothing of value is lost: the regenerated files are reproducible from origin/main.
        run('git', ['checkout', '--', '.'], { cwd: worktree });
        keepWorktree = false;
        throw Error(
          `Pulseboard already has ${branch}; an admission PR may already be open (delete a stale local branch to retry).`,
        );
      }
    run('git', ['switch', '-q', '-c', branch], { cwd: worktree });
    if (!fs.existsSync(path.join(observatory, 'node_modules')))
      run('npm', ['ci', '--no-audit', '--no-fund'], { cwd: observatory });
    // Force the spec reporter: Node 22 defaults to TAP when output is not a terminal.
    const tests = spawnSync(
      process.execPath,
      ['--test', '--test-reporter=spec', 'tests/alibi-sync.test.mjs', 'tests/installer.test.mjs'],
      { cwd: observatory, encoding: 'utf8' },
    );
    if (tests.status !== 0 && !onlyHostSymlinkFailures(tests.stdout))
      throw Error(`Pulseboard tests failed:\n${tests.stdout.slice(-4000)}`);
    console.log(
      tests.status === 0
        ? 'Pulseboard release tests passed.'
        : 'Pulseboard release tests passed except symlink tests this host cannot run (EPERM); CI runs them.',
    );

    run('git', ['commit', '-qam', `chore(observatory): admit Alibi ${version} release`], {
      cwd: worktree,
    });
    if (!flag('--publish')) {
      console.log(
        `Committed on ${branch} in ${worktree}. Push it and open the PR yourself, or delete the branch and worktree and re-run with --publish.`,
      );
      return;
    }
    run('git', ['push', '-q', '-u', 'origin', branch], { cwd: worktree });
    const url = run(
      'gh',
      [
        'pr',
        'create',
        '--title',
        `chore(observatory): admit Alibi ${version} release`,
        '--body',
        `Generated by Alibi \`npm run release:prepare -- ${version}\`: registers the ${version} release label and regenerates the pinned Alibi adapter. After merge, deploy the collector (\`npm run deploy\` in observatory/) so ${version} counts are admitted.`,
      ],
      { cwd: worktree },
    );
    console.log(`Pulseboard PR: ${url}`);
    keepWorktree = false;
  } finally {
    // Failures and unpublished commits keep the temporary worktree for inspection.
    if (keepWorktree) console.log(`Pulseboard worktree kept: ${worktree}`);
    else run('git', ['worktree', 'remove', worktree], { cwd: pulseboard });
    console.log(
      'This Alibi checkout may now carry a new package version and regenerated observatory files: commit them with the release, or restore them.',
    );
  }
}

if (require.main === module)
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
module.exports = { releaseRecordProblems, compareVersions, onlyHostSymlinkFailures };
