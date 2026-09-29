'use strict';
// The local server must survive a missing or CSP-less dist/_headers file,
// serving without a Content-Security-Policy instead of crashing the request.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { readSecurityPolicy } = require('../tools/serve.cjs');

function makeTempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-serve-headers-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('readSecurityPolicy returns null when _headers is missing', (t) => {
  const dir = makeTempDir(t);
  assert.equal(typeof readSecurityPolicy, 'function');
  assert.equal(readSecurityPolicy(dir), null);
});

test('readSecurityPolicy returns null when _headers has no CSP line', (t) => {
  const dir = makeTempDir(t);
  fs.writeFileSync(
    path.join(dir, '_headers'),
    '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n',
  );
  assert.equal(readSecurityPolicy(dir), null);
});

test('readSecurityPolicy returns the policy for a valid _headers file', (t) => {
  const dir = makeTempDir(t);
  const policy = "default-src 'self'; frame-ancestors 'none'";
  fs.writeFileSync(
    path.join(dir, '_headers'),
    `/*\n  X-Content-Type-Options: nosniff\n  Content-Security-Policy: ${policy}\n/\n  Cache-Control: no-cache\n`,
  );
  assert.equal(readSecurityPolicy(dir), policy);
});
