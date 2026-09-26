'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { dirtyPaths, sourceIdentity } = require('../tools/platform-identity.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-dirty-paths-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.name', 'Synthetic fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'core.longpaths', 'true');
  fs.writeFileSync(path.join(root, 'source.js'), 'const fixture = 1;\n');
  git('add', '.');
  git('commit', '-qm', 'Synthetic fixture');
  return { root, git };
}

test(
  'dirty paths preserve unicode and literal rename-like characters',
  { skip: process.platform === 'win32' },
  (t) => {
    const { root, git } = fixture(t);
    const name = 'café -> records.txt';
    fs.writeFileSync(path.join(root, name), 'untracked');
    const before = git('status', '--porcelain=v1', '-z');
    assert.deepEqual(dirtyPaths(root), { shown: [JSON.stringify(name)], total: 1 });
    assert.equal(git('status', '--porcelain=v1', '-z'), before);
    assert.equal(sourceIdentity(root).sourceDirty, true);
  },
);

test('a staged rename counts as one destination, not two files', (t) => {
  const { root, git } = fixture(t);
  const destination = 'renamed source.js';
  git('mv', 'source.js', destination);
  assert.deepEqual(dirtyPaths(root), { shown: [JSON.stringify(destination)], total: 1 });
});

test('long paths remain counted while only their display is truncated', (t) => {
  const { root } = fixture(t);
  const relative = ['a'.repeat(90), 'b'.repeat(90), 'c'.repeat(90), 'scratch.txt'].join('/');
  fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  fs.writeFileSync(path.join(root, relative), 'untracked');
  for (let i = 0; i < 6; i++) fs.writeFileSync(path.join(root, `scratch-${i}.txt`), 'untracked');
  const result = dirtyPaths(root);
  assert.equal(result.total, 7);
  assert.equal(result.shown.length, 5);
  assert.ok(result.shown.every((entry) => entry.length <= 240));
  assert.ok(
    result.shown.some((entry) => entry.startsWith('"' + 'a'.repeat(90)) && entry.endsWith('...')),
  );
  assert.equal(sourceIdentity(root).sourceDirty, true);
});

test(
  'path diagnostics escape control characters into a single line',
  { skip: process.platform === 'win32' },
  (t) => {
    const { root } = fixture(t);
    const name = 'scratch\n\t\u001b[31m.txt';
    fs.writeFileSync(path.join(root, name), 'untracked');
    const result = dirtyPaths(root);
    assert.deepEqual(result, { shown: [JSON.stringify(name)], total: 1 });
    assert.doesNotMatch(result.shown.join(''), /[\u0000-\u001f\u007f]/);
  },
);

test('clean repositories and bounded sample limits retain accurate totals', (t) => {
  const { root } = fixture(t);
  assert.deepEqual(dirtyPaths(root), { shown: [], total: 0 });
  for (let i = 0; i < 8; i++) fs.writeFileSync(path.join(root, `scratch-${i}.txt`), 'untracked');
  assert.equal(dirtyPaths(root, 2).shown.length, 2);
  assert.deepEqual(dirtyPaths(root, 0), { shown: [], total: 8 });
  assert.equal(dirtyPaths(root, 100).shown.length, 5);
  assert.equal(dirtyPaths(root, Infinity).shown.length, 5);
  assert.equal(dirtyPaths(root, -1).shown.length, 0);
  assert.equal(sourceIdentity(root).sourceDirty, true);
});

test('missing checkout returns no sample without throwing', (t) => {
  const { root } = fixture(t);
  assert.deepEqual(dirtyPaths(path.join(root, 'missing')), { shown: [], total: 0 });
});

test(
  'non-UTF-8 filename bytes remain distinct from each other and replacement text',
  { skip: process.platform === 'win32' },
  (t) => {
    const { root } = fixture(t);
    for (const byte of [0xfe, 0xff]) {
      const filename = Buffer.concat([
        Buffer.from(root + '/bad-'),
        Buffer.from([byte]),
        Buffer.from('.txt'),
      ]);
      fs.writeFileSync(filename, 'untracked');
    }
    fs.writeFileSync(path.join(root, 'bad-\ufffd.txt'), 'untracked');
    const result = dirtyPaths(root);
    assert.equal(result.total, 3);
    assert.equal(new Set(result.shown).size, 3);
    assert.ok(result.shown.includes('"bad-\\xfe.txt"'));
    assert.ok(result.shown.includes('"bad-\\xff.txt"'));
    assert.ok(result.shown.includes(JSON.stringify('bad-\ufffd.txt')));
    assert.equal(sourceIdentity(root).sourceDirty, true);
  },
);
