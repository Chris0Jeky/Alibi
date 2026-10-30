'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('reasoning ships once as a bounded hashed chunk in the offline shell, outside startup', () => {
  const assets = fs.readdirSync(path.join(root, 'dist/assets'));
  const chunks = assets.filter((name) => /^insights\.[a-f0-9]{12}\.js$/.test(name));
  assert.equal(chunks.length, 1);
  const chunk = read('dist/assets', chunks[0]);
  assert.equal(
    chunks[0],
    `insights.${crypto.createHash('sha256').update(chunk).digest('hex').slice(0, 12)}.js`,
  );
  const info = JSON.parse(read('build-info.json'));
  assert.equal(info.insightsChunkBytes, Buffer.byteLength(chunk));
  assert.equal(info.insightsChunkGzipBytes, zlib.gzipSync(chunk).length);
  // Alibi file and witness hints (#846) take the reasoning chunk from 6,008 to 6,886 gzip bytes;
  // it still loads only when Hint is pressed. 7 KiB leaves 282 bytes.
  // Third 2026-10-30 composition: the scene hint chain (#860) and technique names (#862) on top
  // of #846 measure 7,180 (12 over 7 KiB). 7 KiB + 256 leaves 244; still hint-time only.
  assert.ok(info.insightsChunkGzipBytes < 7 * 1024 + 256);
  assert.ok(read('dist/sw.js').includes(`"./assets/${chunks[0]}"`));
  assert.ok(!read('dist/index.html').includes(chunks[0]));
  const app = read(
    'dist/assets',
    assets.find((name) => /^alibi\.[a-f0-9]{12}\.js$/.test(name)),
  );
  const config = JSON.parse(app.match(/globalThis\.ALIBI_CONFIG=(\{[^\n]*\});\n/)[1]);
  assert.equal(config.insights, `./assets/${chunks[0]}`);
  assert.match(chunk, /A forced waterline/);
  assert.doesNotMatch(app, /A forced waterline/);
});

test('standalone reasoning remains inline without a chunk URL', () => {
  const html = read('alibi-deluxe-play.html');
  assert.match(
    html,
    /globalThis\.ALIBI_CONFIG=\{[^\n]*"standalone":true,"insights":null,"privacy":null\}/,
  );
  assert.match(html, /A forced waterline/);
  assert.match(html, /C\.loadInsights =/);
});
