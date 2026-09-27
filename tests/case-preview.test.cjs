'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const target = path.join(__dirname, '../tools/case-preview.cjs');
const P = fs.existsSync(target) ? require(target) : {};
const file = path.join(__dirname, '../content/cases/reading-room-blackout.json');
test('preview builder exists and binds the original source receipt', () => {
  assert.equal(typeof P.buildPreview, 'function');
  const { html, receipt } = P.buildPreview(file);
  assert.match(html, /Content-Security-Policy/);
  assert.equal(receipt.sourceSha256, crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
});
test('all executable scripts and styles match hash-only CSP, with no external assets', () => {
  const { html } = P.buildPreview(file);
  for (const match of html.matchAll(/<(script|style)(?: [^>]*)?>([\s\S]*?)<\/\1>/g)) {
    const hash = crypto.createHash('sha256').update(match[2]).digest('base64');
    assert.ok(html.includes(`'sha256-${hash}'`));
  }
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(html, /<(?:script|link|img)[^>]+(?:src|href)=/i);
  assert.doesNotMatch(html, /unsafe-inline|unsafe-eval|localStorage|indexedDB/);
});
test('hostile authored text cannot terminate the embedded data block', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-case-html-'));
  try {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    d.title = '</script><script>globalThis.compromised=true</script>';
    const source = path.join(dir, 'source.json'); fs.writeFileSync(source, JSON.stringify(d));
    const { html } = P.buildPreview(source);
    assert.equal((html.match(/<script(?: |\>)/g) || []).length, 3);
    const embedded = html.match(/<script id="case-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
    assert.equal(JSON.parse(embedded).definition.title, d.title);
    assert.ok(!embedded.includes('<'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('CLI refuses existing outputs and malformed source without overwriting input', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-case-cli-preview-'));
  try {
    const output = path.join(dir, 'preview.html');
    const run = (...args) => spawnSync(process.execPath, [target, ...args], { encoding: 'utf8' });
    assert.equal(run(file, output).status, 0);
    const before = fs.readFileSync(output);
    assert.equal(run(file, output).status, 1);
    assert.ok(fs.readFileSync(output).equals(before));
    assert.equal(run(file, file).status, 1);
    const bad = path.join(dir, 'bad.json'); fs.writeFileSync(bad, '{');
    assert.equal(run(bad, path.join(dir, 'bad.html')).status, 1);
    assert.ok(!fs.existsSync(path.join(dir, 'bad.html')));
    assert.equal(run().status, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
