'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const file = path.join(__dirname, '../tools/escape-preview.cjs');
const api = fs.existsSync(file) ? require(file) : {};
const { fixture } = require('./fixtures/escape-room.cjs');
const rooms = ['tidekeeper-workshop', 'printmaker-cabinet'].map(n => path.join(__dirname, '../content/escape-rooms', n + '.json'));
test('builder emits deterministic bounded anthology with exact source receipts', () => {
  assert.equal(typeof api.build, 'function');
  const a = api.build(rooms), b = api.build(rooms);
  assert.equal(a.html, b.html);
  assert.equal(a.receipts.length, 2);
  rooms.forEach((p, i) => assert.equal(a.receipts[i].sourceSha256, crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')));
});
test('each inline script/style matches hash-only CSP and requests are forbidden', () => {
  const { html } = api.build(rooms);
  for (const match of html.matchAll(/<(script|style)(?: [^>]*)?>([\s\S]*?)<\/\1>/g)) {
    assert.ok(html.includes("'sha256-" + crypto.createHash('sha256').update(match[2]).digest('base64') + "'"));
  }
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(html, /unsafe-inline|unsafe-eval|localStorage|indexedDB/);
  assert.doesNotMatch(html, /<(?:script|link|img)[^>]+(?:src|href)=/i);
});
test('duplicate room IDs, absent rooms and excessive counts are refused', () => {
  assert.throws(() => api.build([]), /rooms/);
  assert.throws(() => api.build(null), /rooms/);
  assert.throws(() => api.build(Array(13).fill(rooms[0])), /rooms/);
  assert.throws(() => api.build([rooms[0], rooms[0]]), /duplicate/);
});
test('author text cannot break out of embedded data; unsafe room is refused', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'escape-preview-'));
  try {
    const f = path.join(dir, 'room.json'), d = fixture();
    d.title = '</script><script>globalThis.intrusion=true</script>';
    fs.writeFileSync(f, JSON.stringify(d));
    const { html } = api.build([f]);
    const data = html.match(/<script id="room-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
    assert.ok(!data.includes('<'));
    assert.equal(JSON.parse(data)[0].definition.title, d.title);
    d.actions.push({ ...structuredClone(d.actions[0]), id: 'lose-key', check: {}, set: { key: 'lost' } });
    fs.writeFileSync(f, JSON.stringify(d));
    assert.throws(() => api.build([f]), /recoverable/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('CLI creates only a new file and refuses overwrites and malformed input', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'escape-cli-'));
  const run = (...args) => spawnSync(process.execPath, [file, ...args], { encoding: 'utf8' });
  try {
    const output = path.join(dir, 'play.html');
    const first = run(output, ...rooms);
    assert.equal(first.status, 0, first.stderr);
    const before = fs.readFileSync(output);
    assert.equal(run(output, ...rooms).status, 1);
    assert.ok(fs.readFileSync(output).equals(before));
    assert.equal(run(rooms[0], ...rooms).status, 1);
    assert.equal(run().status, 1);
    const bad = path.join(dir, 'bad.json'), absent = path.join(dir, 'absent.html');
    fs.writeFileSync(bad, '{');
    assert.equal(run(absent, bad).status, 1);
    assert.ok(!fs.existsSync(absent));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('sparse room path lists are rejected rather than compiling null room entries', () => {
  assert.throws(() => api.build(new Array(1)), /source paths/);
});
