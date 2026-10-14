'use strict';
// Issue #516: CLI coverage for tools/validate-pack.cjs. A valid pack exits 0
// with a JSON summary, malformed input exits non-zero with a message, and
// packs over 3 MB are refused before parsing.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');

function runValidatePack(args) {
  return spawnSync(process.execPath, ['tools/validate-pack.cjs', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

function writeFixture(name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-validate-pack-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return { dir, file };
}

test('a valid pack exits 0 with a JSON summary', () => {
  const result = runValidatePack(['examples/twelve-families.json']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.valid, true);
  assert.equal(summary.id, 'example-twelve-families');
  assert.equal(summary.puzzles, 12);
  assert.ok(Array.isArray(summary.types) && summary.types.length > 0);
});

test('malformed JSON exits non-zero with a message', () => {
  const { dir, file } = writeFixture('malformed.json', '{not valid json');
  try {
    const result = runValidatePack([file]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid pack: That file is not valid JSON\./);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a structurally invalid pack exits non-zero with a message', () => {
  const { dir, file } = writeFixture('invalid-pack.json', '{}');
  try {
    const result = runValidatePack([file]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid pack: /);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a pack over 3 MB is refused before parsing', () => {
  const { dir, file } = writeFixture('oversize.json', 'x'.repeat(3 * 1024 * 1024 + 1));
  try {
    const result = runValidatePack([file]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid pack: Pack exceeds 3 MB\./);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
