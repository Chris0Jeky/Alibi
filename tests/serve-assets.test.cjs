'use strict';
// Malformed Range on the asset gallery must answer 416 with
// `Content-Range: bytes */size` (RFC 9110), matching the
// unsatisfiable-range path and tools/serve.cjs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const { createHandler } = require('../tools/serve-assets.cjs');

test('malformed Range yields 416 with Content-Range bytes star/size', async (t) => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-assets-'));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(rootDir, 'docs'), { recursive: true });
  const body = 'hello gallery range';
  fs.writeFileSync(path.join(rootDir, 'docs', 'sample.txt'), body);
  const size = Buffer.byteLength(body);

  const server = http.createServer(createHandler(rootDir));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const response = await fetch(`http://127.0.0.1:${server.address().port}/docs/sample.txt`, {
    headers: { Range: 'bytes=nonsense' },
  });
  try {
    assert.equal(response.status, 416);
    assert.equal(response.headers.get('content-range'), `bytes */${size}`);
  } finally {
    await response.arrayBuffer();
  }
});
