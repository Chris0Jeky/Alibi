'use strict';
// Probe a published Alibi origin and compare what it serves with a local build. Usage:
//   node tools/probe-origin.cjs [origin-url] [--expect <dist dir>] [--timeout <ms>]
// The origin defaults to the primary one in docs/DEPLOYMENT.md; --expect defaults to ./dist.
// dist/ does not ship build-info.json, so the served identity is the content-hashed platform
// identity script (source SHA, version, payload and content digests) plus sw.js (build hash).
// Every asset index.html references must answer 200 with the bytes the local build holds.
// Exit 0 only when everything matches; 1 on any mismatch or fetch failure; 2 on bad usage.
const fs = require('node:fs');
const path = require('node:path');
const { IDENTITY_ASSET, readIdentity, sha256 } = require('./platform-identity.cjs');

const ROOT = path.resolve(__dirname, '..');
const PREFIX = 'globalThis.ALIBI_PLATFORM_BUILD=';
const FIELDS = ['target', 'sourceSha', 'sourceDirty', 'appVersion', 'payloadSha256'];

/** The primary origin as recorded in docs/DEPLOYMENT.md, cross-checked with the Worker name. */
function primaryOrigin(root = ROOT) {
  const doc = fs.readFileSync(path.join(root, 'docs/DEPLOYMENT.md'), 'utf8');
  const origin = (/^- Primary: \*\*(https:\/\/[^*\s]+?)\/?\*\*/m.exec(doc) || [])[1];
  const name = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8')).name;
  if (!origin || new URL(origin).hostname.split('.')[0] !== name)
    throw new Error(`No primary origin in docs/DEPLOYMENT.md matching Worker "${name}".`);
  return origin;
}

// The minified worker opens with `const h="<build>"`; the readable form uses BUILD="<build>".
const swBuild = (bytes) => (/(?:const h|BUILD)="([0-9a-f]{12})"/.exec(bytes.toString()) || [])[1];
const refs = (html) => [
  ...new Set([...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g)].map((m) => m[1])),
];

async function get(base, rel, timeoutMs) {
  const res = await fetch(new URL(rel, base), {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'cache-control': 'no-cache' },
  });
  return { status: res.status, bytes: Buffer.from(await res.arrayBuffer()) };
}

/** Returns { ok, lines }; never throws for network trouble. */
async function probe(origin, distDir, { timeoutMs = 15000 } = {}) {
  const lines = [];
  const problems = [];
  const base = origin.endsWith('/') ? origin : `${origin}/`;
  const local = (rel) => fs.readFileSync(path.join(distDir, rel));
  const fetched = new Map();
  const fetchOnce = async (rel) => {
    try {
      const got = await get(base, rel, timeoutMs);
      fetched.set(rel, got);
      if (got.status !== 200) problems.push(`${rel}: HTTP ${got.status}`);
      return got.status === 200 ? got.bytes : null;
    } catch (error) {
      const why =
        error.name === 'TimeoutError'
          ? `timed out after ${timeoutMs} ms`
          : error.cause?.code || error.message;
      problems.push(`${rel}: ${why}`);
      return null;
    }
  };

  const html = await fetchOnce('index.html');
  const localHtml = local('index.html').toString('utf8');
  if (html) {
    const served = refs(html.toString('utf8'));
    const expected = refs(localHtml);
    const missing = expected.filter((r) => !served.includes(r));
    const extra = served.filter((r) => !expected.includes(r));
    lines.push(`index.html: ${served.length} asset references (expected ${expected.length})`);
    if (missing.length || extra.length)
      problems.push(
        `index.html references differ: expected-only [${missing}] served-only [${extra}]`,
      );
    else if (sha256(html) !== sha256(localHtml))
      problems.push('index.html bytes differ from the local build');
  }

  const sw = await fetchOnce('sw.js');
  const localBuild = swBuild(local('sw.js'));
  if (sw && !sw.equals(local('sw.js')))
    problems.push(`sw.js differs from the local build (served ${swBuild(sw)} local ${localBuild})`);
  lines.push(`sw.js build: ${sw ? swBuild(sw) : '?'} (local ${localBuild})`);

  const localIdentity = readIdentity(distDir);
  const identityRel = refs(localHtml).find((r) => IDENTITY_ASSET.test(r));
  // Follow the identity script the served page names, so a different release is reported by field.
  const servedRel =
    (html && refs(html.toString('utf8')).find((r) => IDENTITY_ASSET.test(r))) || identityRel;
  const servedIdentity = await fetchOnce(servedRel);
  if (servedIdentity) {
    const text = servedIdentity.toString('utf8');
    let identity = {};
    try {
      identity = JSON.parse(text.slice(PREFIX.length, text.lastIndexOf(';')));
    } catch {
      problems.push('served platform identity is unreadable');
    }
    for (const field of FIELDS)
      if (identity[field] !== localIdentity.identity[field])
        problems.push(
          `identity ${field}: served ${identity[field]} local ${localIdentity.identity[field]}`,
        );
    // Fields alone miss changes elsewhere in the script, so compare its bytes as well.
    if (identityRel && !servedIdentity.equals(local(identityRel)))
      problems.push('platform identity script bytes differ from the local build');
    lines.push(
      `identity: served ${String(identity.sourceSha).slice(0, 12)} v${identity.appVersion}; ` +
        `local ${localIdentity.identity.sourceSha.slice(0, 12)} v${localIdentity.identity.appVersion}`,
    );
  }

  const info = path.join(distDir, '..', 'build-info.json');
  if (fs.existsSync(info)) {
    const { build: expectedBuild, version } = JSON.parse(fs.readFileSync(info, 'utf8'));
    if (expectedBuild !== localBuild)
      problems.push(`build-info.json build ${expectedBuild} is not the one dist/ carries`);
    if (version !== localIdentity.identity.appVersion)
      problems.push(`build-info.json version ${version} differs from dist/`);
  }

  let assets = 0;
  for (const rel of refs(localHtml)) {
    if (rel === identityRel) continue;
    const bytes = await fetchOnce(rel);
    assets++;
    if (bytes && !bytes.equals(local(rel)))
      problems.push(`${rel}: bytes differ from the local build`);
  }
  lines.push(`assets: ${assets} fetched and compared byte for byte`);
  for (const p of problems) lines.push(`MISMATCH ${p}`);
  lines.push(
    problems.length
      ? `FAIL ${origin}: ${problems.length} problem(s)`
      : `OK ${origin} serves this build`,
  );
  return { ok: problems.length === 0, lines };
}

async function main(argv) {
  const args = [];
  const option = (name, fallback) => {
    const i = argv.indexOf(name);
    if (i < 0) return fallback;
    const value = argv[i + 1];
    argv.splice(i, 2);
    return value;
  };
  const expect = path.resolve(option('--expect', path.join(ROOT, 'dist')));
  const timeoutMs = Number(option('--timeout', 15000));
  args.push(...argv);
  if (args.length > 1 || !(timeoutMs > 0) || args.some((a) => a.startsWith('--'))) {
    console.error(
      'Usage: node tools/probe-origin.cjs [origin-url] [--expect <dist dir>] [--timeout <ms>]',
    );
    return 2;
  }
  const origin = args[0] || primaryOrigin();
  const result = await probe(origin, expect, { timeoutMs });
  console.log(result.lines.join('\n'));
  return result.ok ? 0 : 1;
}

if (require.main === module) main(process.argv.slice(2)).then((code) => process.exit(code));
module.exports = { probe, primaryOrigin };
