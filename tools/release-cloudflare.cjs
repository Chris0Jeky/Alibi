'use strict';
// Release the primary Cloudflare site with a recorded identity. Usage:
//   npm run cloudflare:release              build + wrangler dry run only (publishes nothing)
//   npm run cloudflare:release -- --deploy  also deploy exactly that dist/, then probe the origin
// Refuses a dirty tree, a detached HEAD and (with --deploy) a commit that is not on origin/main.
// Writes release-receipt.json (git-ignored) with the SHA, branch, build-info, a sha256 per dist/
// file, the Worker version id, a status and the probe result. A dry run writes
// release-receipt.dry-run.json instead, so it never overwrites the last real release's receipt.
// --deploy first copies that receipt to release-receipt.previous.json (the known-good version).
// Rollback: `wrangler rollback <version id>`.
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readIdentity } = require('./platform-identity.cjs');
const { probe, primaryOrigin } = require('./probe-origin.cjs');

const REPO = path.resolve(__dirname, '..');

function git(root, ...args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '').trim() };
}

/** Problems that forbid a release from this checkout; empty means clear. */
function preflight(root, { deploy = false } = {}) {
  const sha = git(root, 'rev-parse', 'HEAD');
  if (sha.code !== 0 || !/^[0-9a-f]{40}$/.test(sha.out))
    return ['Cannot resolve a full Git SHA for HEAD.'];
  const problems = [];
  const status = git(root, 'status', '--porcelain', '--untracked-files=all');
  if (status.code !== 0 || status.out) problems.push('The working tree is dirty or unreadable.');
  if (git(root, 'symbolic-ref', '--short', '-q', 'HEAD').code !== 0)
    problems.push('HEAD is detached; release from a named branch.');
  if (deploy && git(root, 'merge-base', '--is-ancestor', 'HEAD', 'origin/main').code !== 0)
    problems.push('HEAD is not contained in origin/main (fetch first); only merged source ships.');
  return problems;
}

function run(root, label, args, env = {}) {
  console.log(`> ${label}`);
  const r = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) {
    process.stderr.write(`${r.stdout || ''}${r.stderr || ''}`);
    throw new Error(`${label} failed (exit ${r.status}).`);
  }
  return `${r.stdout}${r.stderr}`;
}

function hashes(dir, rel = '') {
  return fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((e) => {
    const name = rel ? `${rel}/${e.name}` : e.name;
    return e.isDirectory()
      ? hashes(dir, name)
      : [
          [
            name,
            crypto
              .createHash('sha256')
              .update(fs.readFileSync(path.join(dir, name)))
              .digest('hex'),
          ],
        ];
  });
}

async function release(root, { deploy = false } = {}) {
  const problems = preflight(root, { deploy });
  if (problems.length) {
    console.error(`Refusing to release:\n- ${problems.join('\n- ')}`);
    return 1;
  }
  const origin = primaryOrigin(root);
  const sha = git(root, 'rev-parse', 'HEAD').out;
  const branch = git(root, 'symbolic-ref', '--short', 'HEAD').out;

  run(root, 'node tools/build.cjs', [path.join(root, 'tools/build.cjs')]);
  const dist = path.join(root, 'dist');
  const { identity } = readIdentity(dist);
  if (identity.sourceSha !== sha || identity.sourceDirty !== false || preflight(root).length)
    throw new Error('dist/ does not carry this clean commit; the build changed the tree.');

  const wrangler = [path.join(root, 'node_modules/wrangler/bin/wrangler.js')];
  const config = ['--config', 'wrangler.jsonc'];
  run(root, 'wrangler deploy --dry-run', [...wrangler, 'deploy', '--dry-run', ...config]);

  const receipt = {
    schema: 1,
    createdAt: new Date().toISOString(),
    mode: deploy ? 'deploy' : 'dry-run',
    status: deploy ? 'deploying' : 'dry-run',
    sourceSha: sha,
    branch,
    origin,
    buildInfo: JSON.parse(fs.readFileSync(path.join(root, 'build-info.json'), 'utf8')),
    identity,
    distFiles: Object.fromEntries(hashes(dist).sort(([a], [b]) => (a < b ? -1 : 1))),
    workerVersionId: null,
    probe: null,
  };
  const receiptPath = path.join(
    root,
    deploy ? 'release-receipt.json' : 'release-receipt.dry-run.json',
  );
  const write = () => fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  if (deploy && fs.existsSync(receiptPath))
    fs.copyFileSync(receiptPath, path.join(root, 'release-receipt.previous.json'));
  write();
  if (!deploy) {
    console.log('Dry run only: nothing published. Add --deploy to publish and probe the origin.');
    console.log(`Receipt: ${receiptPath}`);
    return 0;
  }

  const outFile = path.join(os.tmpdir(), `alibi-wrangler-${process.pid}.ndjson`);
  let output;
  try {
    output = run(root, 'wrangler deploy', [...wrangler, 'deploy', ...config], {
      WRANGLER_OUTPUT_FILE_PATH: outFile,
    });
  } catch (error) {
    receipt.status = 'failed';
    write();
    throw error;
  }
  let structured = '';
  try {
    structured = fs.readFileSync(outFile, 'utf8');
    fs.rmSync(outFile);
  } catch {}
  receipt.workerVersionId =
    (/"version_id":"([0-9a-f-]{36})"/.exec(structured) ||
      /Version ID:\s*([0-9a-f-]{36})/i.exec(output) ||
      [])[1] || null;
  receipt.status = 'deployed';
  write();
  if (!receipt.workerVersionId)
    console.error('Warning: wrangler printed no version id; none recorded.');

  receipt.probe = await probe(origin, dist);
  write();
  console.log(receipt.probe.lines.join('\n'));
  console.log(`Receipt: ${receiptPath} (version ${receipt.workerVersionId})`);
  return receipt.probe.ok ? 0 : 1;
}

async function main(argv) {
  const rootAt = argv.indexOf('--root');
  const root = rootAt >= 0 ? path.resolve(argv[rootAt + 1]) : REPO;
  const known = new Set(['--deploy', '--root', root, argv[rootAt + 1]]);
  if (argv.some((a) => !known.has(a))) {
    console.error('Usage: node tools/release-cloudflare.cjs [--deploy]');
    return 2;
  }
  try {
    return await release(root, { deploy: argv.includes('--deploy') });
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

if (require.main === module) main(process.argv.slice(2)).then((code) => process.exit(code));
module.exports = { preflight, release };
