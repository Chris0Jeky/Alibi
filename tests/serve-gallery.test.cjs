'use strict';
// Gallery guards: the serve-assets allowlist is tested against the resolved
// repo-relative path (no `/docs/../...` escape), only GET/HEAD are answered,
// and suffix byte ranges are honoured.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

// Raw path request: unlike fetch()/URL, node:http sends dot segments as-is,
// so `/docs/../package.json` reaches the server without client normalisation.
function get(port, rawPath) {
  return new Promise((resolve, reject) => {
    const options = { host: '127.0.0.1', port, path: rawPath, method: 'GET' };
    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.once('error', reject);
    req.end();
  });
}

test('gallery allowlist blocks resolved-path traversal', async (t) => {
  const port = await freePort();
  const server = spawn(
    process.execPath,
    [path.join(__dirname, '..', 'tools', 'serve-assets.cjs')],
    {
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'inherit'],
    },
  );
  t.after(() => server.kill());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.stdout.on('data', (chunk) => {
      if (String(chunk).includes('Asset gallery:')) resolve();
    });
  });

  // NOTE: `new URL(...).pathname` in the server normalises bare `..`
  // segments, so the literal form below arrives as `/package.json`. The
  // `%2f` form keeps the dots intact through URL parsing and exercises the
  // resolver directly (old code answers 200; fixed code answers 403).
  const traversal = await get(port, '/docs/../package.json');
  assert.equal(traversal.status, 403, '/docs/../package.json status');

  const encoded = await get(port, '/docs%2f..%2fpackage.json');
  assert.equal(encoded.status, 403, '/docs%2f..%2fpackage.json status');

  const direct = await get(port, '/package.json');
  assert.equal(direct.status, 403, '/package.json status');

  const index = await get(port, '/');
  assert.equal(index.status, 200, '/ status');
  assert.match(index.headers['content-type'] || '', /^text\/html/, '/ content-type');
  assert.match(index.body, /ARTIST'S CABINET/, '/ gallery index body');
});

async function startGallery(t) {
  const port = await freePort();
  const gallery = path.join(__dirname, '..', 'tools', 'serve-assets.cjs');
  const server = spawn(process.execPath, [gallery], {
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  t.after(() => server.kill());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.stdout.on('data', (chunk) => String(chunk).includes('Asset gallery:') && resolve());
  });
  return `http://127.0.0.1:${port}`;
}

test('gallery rejects non-GET/HEAD methods with 405', async (t) => {
  const base = await startGallery(t);
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const response = await fetch(base + '/', { method });
    assert.equal(response.status, 405, `${method} status`);
    await response.arrayBuffer();
  }
});

test('gallery serves suffix ranges with 206 and keeps 416 for unsatisfiable ranges', async (t) => {
  const base = await startGallery(t);
  const file = path.join(__dirname, '..', 'src', 'app.js');
  const bytes = fs.readFileSync(file);
  assert.ok(bytes.length > 10);
  const suffix = await fetch(base + '/src/app.js', { headers: { Range: 'bytes=-10' } });
  assert.equal(suffix.status, 206);
  const expected = `bytes ${bytes.length - 10}-${bytes.length - 1}/${bytes.length}`;
  assert.equal(suffix.headers.get('content-range'), expected);
  assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), bytes.subarray(-10));
  const pastEnd = await fetch(base + '/src/app.js', {
    headers: { Range: `bytes=${bytes.length + 100}-` },
  });
  assert.equal(pastEnd.status, 416);
  await pastEnd.arrayBuffer();
});
