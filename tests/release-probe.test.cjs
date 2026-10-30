'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const test = require('node:test');
const { payloadDigest, writeIdentity } = require('../tools/platform-identity.cjs');
const { probe, primaryOrigin } = require('../tools/probe-origin.cjs');
const { preflight } = require('../tools/release-cloudflare.cjs');

const tmp = (t, prefix) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};

/** A small but structurally real dist/: hashed assets, identity script, index.html, sw.js. */
function makeDist(dir, { sha = 'a'.repeat(40), build = '123456abcdef', script = 'app()' } = {}) {
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'assets/app.111111111111.js'), script);
  fs.writeFileSync(path.join(dir, 'assets/app.222222222222.css'), 'body{}');
  const { path: identity } = writeIdentity(dir, {
    target: 'web',
    sourceSha: sha,
    sourceDirty: false,
    appVersion: '1.2.3',
    payloadSha256: payloadDigest(dir),
  });
  fs.writeFileSync(
    path.join(dir, 'index.html'),
    `<script src="./${identity}" defer></script><script src="./assets/app.111111111111.js" defer></script>` +
      '<link rel="stylesheet" href="./assets/app.222222222222.css">',
  );
  fs.writeFileSync(path.join(dir, 'sw.js'), `(()=>{const h="${build}"})()`);
  return dir;
}

/** Serve `dir` over HTTP; paths listed in `hang` never answer. Resolves to the origin URL. */
async function serve(t, dir, { hang = [] } = {}) {
  const server = http.createServer((req, res) => {
    const rel = new URL(req.url, 'http://x').pathname.replace(/^\/$/, '/index.html');
    if (hang.includes(rel)) return;
    const file = path.join(dir, rel);
    if (!fs.existsSync(file)) return res.writeHead(404).end('missing');
    res.writeHead(200).end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.closeAllConnections() || server.close());
  return `http://127.0.0.1:${server.address().port}`;
}

test('probe passes when the origin serves exactly the local build', async (t) => {
  const local = makeDist(tmp(t, 'alibi-probe-local-'));
  const result = await probe(await serve(t, local), local);
  assert.equal(result.ok, true, result.lines.join('\n'));
  assert.match(result.lines.join('\n'), /^OK /m);
});

test('probe reports a different release by field, not just "differs"', async (t) => {
  const local = makeDist(tmp(t, 'alibi-probe-local-'));
  const served = makeDist(tmp(t, 'alibi-probe-served-'), {
    sha: 'b'.repeat(40),
    build: 'fedcba654321',
    script: 'other()',
  });
  const result = await probe(await serve(t, served), local);
  const text = result.lines.join('\n');
  assert.equal(result.ok, false);
  assert.match(text, /identity sourceSha: served b{40} local a{40}/);
  assert.match(text, /sw\.js differs/);
  assert.match(text, /^FAIL /m);
});

test('probe fails when the identity script differs outside its compared fields', async (t) => {
  const local = makeDist(tmp(t, 'alibi-probe-local-'));
  const served = makeDist(tmp(t, 'alibi-probe-served-'));
  const html = fs.readFileSync(path.join(served, 'index.html'), 'utf8');
  const rel = html
    .split('src="./')
    .find((part) => part.includes('identity'))
    .split('"')[0];
  const file = path.join(served, rel);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('{', '{"extra":1,'));
  const result = await probe(await serve(t, served), local);
  assert.equal(result.ok, false, result.lines.join('\n'));
  assert.match(result.lines.join('\n'), /platform identity script bytes differ/);
});

test('probe fails on a missing asset (404) and an unreachable origin', async (t) => {
  const local = makeDist(tmp(t, 'alibi-probe-local-'));
  const served = makeDist(tmp(t, 'alibi-probe-served-'));
  fs.rmSync(path.join(served, 'assets/app.222222222222.css'));
  const missing = await probe(await serve(t, served), local);
  assert.equal(missing.ok, false);
  assert.match(missing.lines.join('\n'), /app\.222222222222\.css: HTTP 404/);

  const refused = await probe('http://127.0.0.1:1', local, { timeoutMs: 2000 });
  assert.equal(refused.ok, false);
  assert.match(refused.lines.join('\n'), /index\.html: /);
});

test('probe times out instead of hanging on a stalled response', async (t) => {
  const local = makeDist(tmp(t, 'alibi-probe-local-'));
  const origin = await serve(t, local, { hang: ['/sw.js'] });
  const started = Date.now();
  const result = await probe(origin, local, { timeoutMs: 300 });
  assert.ok(Date.now() - started < 5000, 'probe must not wait for the stalled path');
  assert.equal(result.ok, false);
  assert.match(result.lines.join('\n'), /sw\.js: timed out after 300 ms/);
});

test('the primary origin is read from the docs and matches the Worker name', () => {
  const origin = primaryOrigin(path.resolve(__dirname, '..'));
  const name = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../wrangler.jsonc'), 'utf8'),
  ).name;
  assert.match(origin, /^https:\/\//);
  assert.equal(new URL(origin).hostname.split('.')[0], name);
});

function repo(t) {
  const root = tmp(t, 'alibi-release-');
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Synthetic fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  fs.writeFileSync(path.join(root, 'file.txt'), 'one\n');
  git('add', '.');
  git('commit', '-qm', 'one');
  return { root, git };
}

test('release preflight refuses dirty trees, detached HEAD and unmerged deploys', (t) => {
  const { root, git } = repo(t);
  assert.deepEqual(preflight(root), []);

  fs.writeFileSync(path.join(root, 'untracked.txt'), 'x');
  assert.match(preflight(root).join(), /dirty/);
  fs.rmSync(path.join(root, 'untracked.txt'));
  fs.appendFileSync(path.join(root, 'file.txt'), 'two\n');
  assert.match(preflight(root).join(), /dirty/);
  git('checkout', '--', 'file.txt');

  assert.match(preflight(root, { deploy: true }).join(), /not contained in origin\/main/);
  git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  assert.deepEqual(preflight(root, { deploy: true }), []);

  git('checkout', '-q', '--detach');
  assert.match(preflight(root).join(), /detached/);
});

test('release script exits non-zero on a dirty tree before building anything', (t) => {
  const { root } = repo(t);
  fs.writeFileSync(path.join(root, 'file.txt'), 'changed\n');
  const run = spawnSync(
    process.execPath,
    [path.resolve(__dirname, '../tools/release-cloudflare.cjs'), '--root', root],
    { encoding: 'utf8' },
  );
  assert.equal(run.status, 1);
  assert.match(run.stderr, /Refusing to release[\s\S]*dirty/);
  assert.equal(fs.existsSync(path.join(root, 'dist')), false);
  assert.equal(fs.existsSync(path.join(root, 'release-receipt.json')), false);
});
