'use strict';
// The local server must survive a missing or CSP-less dist/_headers file,
// serving without a Content-Security-Policy instead of crashing the request.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { EventEmitter } = require('node:events');

const { readSecurityPolicy, createHandler } = require('../tools/serve.cjs');

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

test('readSecurityPolicy returns null when _headers is unreadable', (t) => {
  const dir = makeTempDir(t);
  fs.mkdirSync(path.join(dir, '_headers'));
  assert.equal(readSecurityPolicy(dir), null);
});

function makeStubRes() {
  const res = {
    statusCode: 200,
    headers: {},
    headersSent: false,
    destroyed: false,
    setHeader(name, value) {
      res.headers[name] = value;
    },
    writeHead(status, extra) {
      res.statusCode = status;
      res.headersSent = true;
      if (extra) Object.assign(res.headers, extra);
      return res;
    },
    end() {
      return res;
    },
    destroy() {
      res.destroyed = true;
      return res;
    },
  };
  return res;
}

test('createHandler answers 500 when statSync throws', () => {
  const stubFs = {
    existsSync: () => true,
    statSync: () => {
      throw Object.assign(new Error('gone'), { code: 'ENOENT' });
    },
    createReadStream: () => {
      throw new Error('unreachable');
    },
  };
  // Platform-native absolute root: the containment check compares the
  // resolved file against this string verbatim.
  const handler = createHandler(path.resolve('stub-root'), stubFs);
  const res = makeStubRes();
  assert.doesNotThrow(() => handler({ url: '/', method: 'GET', headers: {} }, res));
  assert.equal(res.statusCode, 500);
});

test('createHandler destroys res on stream error without throwing', (t) => {
  const dir = makeTempDir(t);
  fs.writeFileSync(
    path.join(dir, '_headers'),
    "/*\n  Content-Security-Policy: default-src 'self'\n",
  );
  const stream = new EventEmitter();
  stream.pipe = () => stream;
  const stubFs = {
    existsSync: () => true,
    statSync: () => ({ isFile: () => true, size: 100 }),
    createReadStream: () => stream,
  };
  const handler = createHandler(dir, stubFs);
  const res = makeStubRes();
  assert.doesNotThrow(() => handler({ url: '/app.js', method: 'GET', headers: {} }, res));
  assert.doesNotThrow(() => stream.emit('error', new Error('mid-stream failure')));
  assert.equal(res.destroyed, true);
});
