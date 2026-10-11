'use strict';
// Gallery-prefix escapes: `..` smuggled past URL parsing via encoded
// separators must not resolve into served files.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
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
// so `/assets-source/library/../...` reaches the server without client
// normalisation.
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

test('gallery rejects .. escapes of the gallery prefix', async (t) => {
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

  const traversal = await get(port, '/assets-source/library/../package.json');
  assert.equal(traversal.status, 403, '/assets-source/library/../package.json status');

  const encoded = await get(port, '/assets-source/library%2f..%2fpackage.json');
  assert.equal(encoded.status, 403, 'encoded library-prefix escape status');

  // Escapes that resolve onto an allowlisted file: old code answers 200.
  const crossPrefix = await get(
    port,
    '/assets-source/library%2f..%2f..%2fsrc%2fapp.js',
  );
  assert.equal(crossPrefix.status, 403, 'cross-prefix escape to src/app.js status');

  const direct = await get(port, '/package.json');
  assert.equal(direct.status, 403, '/package.json status');

  const asset = await get(port, '/assets-source/library/index.html');
  assert.equal(asset.status, 200, 'legit library asset status');

  const index = await get(port, '/');
  assert.equal(index.status, 200, '/ status');
});
