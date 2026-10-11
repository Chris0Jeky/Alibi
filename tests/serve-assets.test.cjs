'use strict';
// Malformed Range answers 416 with Content-Range bytes star/size,
// matching the out-of-bounds branch; valid ranges still answer 200/206.
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { createHandler } = require('../tools/serve-assets.cjs');

const SIZE = 100;

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

function makeStubFs(size = SIZE) {
  return {
    existsSync: () => true,
    statSync: () => ({ isFile: () => true, size }),
    createReadStream: () => {
      const stream = new EventEmitter();
      stream.pipe = () => stream;
      return stream;
    },
  };
}

function handle(range) {
  const handler = createHandler('/stub-gallery-root', makeStubFs());
  const res = makeStubRes();
  const headers = range === undefined ? {} : { range };
  handler({ url: '/docs/foo.txt', method: 'GET', headers }, res);
  return res;
}

test('malformed Range yields 416 with Content-Range bytes star/size', () => {
  const res = handle('bytes=nonsense');
  assert.equal(res.statusCode, 416);
  assert.equal(res.headers['Content-Range'], `bytes */${SIZE}`);
});

test('multi-range yields 416 with Content-Range bytes star/size', () => {
  const res = handle('bytes=0-1,3-4');
  assert.equal(res.statusCode, 416);
  assert.equal(res.headers['Content-Range'], `bytes */${SIZE}`);
});

test('out-of-bounds Range yields 416 with Content-Range bytes star/size', () => {
  const res = handle(`bytes=${SIZE + 100}-`);
  assert.equal(res.statusCode, 416);
  assert.equal(res.headers['Content-Range'], `bytes */${SIZE}`);
});

test('valid ranges are unchanged: 200 without Range, 206 with Range', () => {
  const plain = handle(undefined);
  assert.equal(plain.statusCode, 200);

  const first = handle('bytes=0-9');
  assert.equal(first.statusCode, 206);
  assert.equal(first.headers['Content-Range'], `bytes 0-9/${SIZE}`);

  const suffix = handle('bytes=-10');
  assert.equal(suffix.statusCode, 206);
  assert.equal(
    suffix.headers['Content-Range'],
    `bytes ${SIZE - 10}-${SIZE - 1}/${SIZE}`,
  );
});
