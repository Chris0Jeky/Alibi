'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');

test('built Quiet Wing CSS is the exact parser-compacted source and retains its content hash', () => {
  const raw = ['style.css', 'folio.css']
    .map((name) => fs.readFileSync(path.join(root, 'src/quiet-wing', name), 'utf8'))
    .join('\n');
  const expected = require('esbuild').transformSync(raw, {
    loader: 'css',
    minifyWhitespace: true,
  }).code;
  const assets = path.join(root, 'dist/assets');
  const matches = fs
    .readdirSync(assets)
    .filter((name) => /^quiet-style\.[a-f0-9]{12}\.css$/.test(name));
  assert.equal(matches.length, 1);
  const actual = fs.readFileSync(path.join(assets, matches[0]), 'utf8');
  assert.equal(actual, expected, 'no handwritten CSS transformation or declaration removal');
  assert.ok(Buffer.byteLength(actual) < Buffer.byteLength(raw));
  const digest = crypto.createHash('sha256').update(actual).digest('hex').slice(0, 12);
  assert.equal(matches[0], `quiet-style.${digest}.css`);
});
