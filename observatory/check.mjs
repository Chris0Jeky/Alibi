import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const ENDPOINT = 'https://pulseboard-observatory.commit-atlas.workers.dev/v1/collect/alibi';
const COLLECTOR_ORIGIN = new URL(ENDPOINT).origin;
const lock = JSON.parse(readFileSync(new URL('observatory.lock.json', root), 'utf8'));
// The lock is keyed by target since Pulseboard#15; the original single-entry shape still reads.
const installs = lock.installs ?? { [lock.target]: { project: lock.project, sha256: lock.sha256 } };
const [target, entry] = Object.entries(installs)[0] ?? [];
assert.ok(target, 'The lock records no installed artifact');
const code = readFileSync(new URL(target, root), 'utf8');
assert.equal(createHash('sha256').update(code).digest('hex'), entry.sha256, target);
assert.ok(!/MAX_BYTES|MAX_BATCH/.test(code), 'Server-only constants must not be published');
// Collection is active: the artifact carries the registered collector endpoint, exactly once.
assert.equal(code.split(`"endpoint":"${ENDPOINT}"`).length - 1, 1, 'Expected exactly one registered collect endpoint');
// Without a document origin the artifact still mounts nothing, endpoint or not.
let context = { document: { readyState: 'complete' } };
vm.runInNewContext(code, context);
assert.equal(context.PulseboardUsage, null);
// On the real public origin a standalone export stays silent; the public flag is the gate.
context = { URL, document: { readyState: 'complete' }, navigator: {}, location: { origin: 'https://alibi-after-hours-preview.commit-atlas.workers.dev', protocol: 'https:', pathname: '/' }, ALIBI_CONFIG: { standalone: true } };
vm.runInNewContext(code, context);
assert.equal(context.PulseboardUsage, null);
// The shipped policy must actually permit the collector, or consent would produce blocked requests.
let headers;
try {
  headers = readFileSync(new URL('dist/_headers', root), 'utf8');
} catch {
  assert.fail('Run `npm run build` before this check: dist/_headers is missing');
}
const policy = headers.match(/Content-Security-Policy: (.+)/)?.[1] ?? '';
const connectSrc = policy.match(/connect-src ([^;]+)/)?.[1] ?? '';
assert.ok(connectSrc.split(/\s+/).includes(COLLECTOR_ORIGIN), `connect-src must list ${COLLECTOR_ORIGIN}; saw: ${connectSrc}`);
const html = readFileSync(new URL('dist/index.html', root), 'utf8');
const meta = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] ?? '';
assert.ok((meta.match(/connect-src ([^;]+)/)?.[1] ?? '').split(/\s+/).includes(COLLECTOR_ORIGIN), 'The index.html CSP meta tag must list the collector origin');
console.log('Hash, endpoint, inactive runtime, public-origin standalone rejection and built CSP passed. Full build QA remains required.');
