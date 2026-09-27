'use strict';
// The local server mirrors the primary host's `not_found_handling: "404-page"`, so browser
// suites see the same styled 404 a visitor does (0.14.1 audit M4).
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
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

test('unknown local addresses answer the static 404 page with a 404 status', async (t) => {
  const port = await freePort();
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'tools', 'serve.cjs')], {
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  t.after(() => server.kill());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.stdout.on('data', (chunk) => String(chunk).includes('Alibi:') && resolve());
  });
  const base = `http://127.0.0.1:${port}`;
  for (const pathname of ['/a/b/x.html', '/a/b/', '/missing']) {
    const response = await fetch(base + pathname);
    assert.equal(response.status, 404, `${pathname} status`);
    assert.match(response.headers.get('content-type'), /^text\/html/);
    assert.match(await response.text(), /This clue leads nowhere/, `${pathname} body`);
  }
  const shell = await fetch(base + '/');
  assert.equal(shell.status, 200, 'the shell still answers the root');
  const alias = await fetch(base + '/privacy');
  assert.equal(alias.status, 200, 'shared path aliases still resolve');
});
