'use strict';
// Dev server must not crash when dist/_headers is missing or has no CSP line:
// each request answers 500 while the server keeps listening.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createHandler } = require('../tools/serve.cjs');

function makeTempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-serve-500-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

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

test('missing _headers yields 500 without throwing', (t) => {
  const dir = makeTempDir(t);
  const handler = createHandler(dir);
  const first = makeStubRes();
  assert.doesNotThrow(() => handler({ url: '/', method: 'GET', headers: {} }, first));
  assert.equal(first.statusCode, 500);
  const second = makeStubRes();
  assert.doesNotThrow(() => handler({ url: '/', method: 'GET', headers: {} }, second));
  assert.equal(second.statusCode, 500);
});

test('CSP-less _headers yields 500 without throwing', (t) => {
  const dir = makeTempDir(t);
  fs.writeFileSync(
    path.join(dir, '_headers'),
    '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n',
  );
  const handler = createHandler(dir);
  const first = makeStubRes();
  assert.doesNotThrow(() => handler({ url: '/', method: 'GET', headers: {} }, first));
  assert.equal(first.statusCode, 500);
  const second = makeStubRes();
  assert.doesNotThrow(() => handler({ url: '/', method: 'GET', headers: {} }, second));
  assert.equal(second.statusCode, 500);
});
