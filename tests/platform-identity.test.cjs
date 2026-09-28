'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { identitySource, sha256, writeIdentity } = require('../tools/platform-identity.cjs');

function setupArtifact() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-identity-'));
  fs.mkdirSync(path.join(directory, 'assets'), { recursive: true });
  const oldIdentity = { target: 'android', payloadSha256: '0'.repeat(64) };
  const written = writeIdentity(directory, oldIdentity);
  const html = `<!doctype html><html><body><script src="./${written.path}"></script></body></html>`;
  fs.writeFileSync(path.join(directory, 'index.html'), html);
  return { directory, oldIdentity, oldPath: written.path, html };
}

function identityName(identity) {
  return `assets/alibi-platform-identity.${sha256(identitySource(identity)).slice(0, 12)}.js`;
}

function cleanup(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
}

test('happy-path replace points index at the new asset', () => {
  const { directory, oldPath } = setupArtifact();
  try {
    const runtimeIdentity = { target: 'android', payloadSha256: '1'.repeat(64) };
    const replacement = writeIdentity(directory, runtimeIdentity, { replace: true });
    assert.notEqual(replacement.path, oldPath);
    const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
    assert.ok(html.includes(`src="./${replacement.path}"`));
    assert.ok(!html.includes(`src="./${oldPath}"`));
    assert.ok(fs.existsSync(path.join(directory, replacement.path)));
    assert.equal(fs.existsSync(path.join(directory, oldPath)), false);
  } finally {
    cleanup(directory);
  }
});

test('EACCES on the new-asset write leaves index and old asset untouched', () => {
  const { directory, oldPath, html: htmlBefore } = setupArtifact();
  const oldContent = fs.readFileSync(path.join(directory, oldPath), 'utf8');
  const runtimeIdentity = { target: 'android', payloadSha256: '2'.repeat(64) };
  const newName = identityName(runtimeIdentity);
  assert.notEqual(newName, oldPath);
  const originalWrite = fs.writeFileSync;
  fs.writeFileSync = (file, ...args) => {
    if (file === path.join(directory, newName)) {
      const failure = new Error(`EACCES: permission denied, open '${file}'`);
      failure.code = 'EACCES';
      throw failure;
    }
    return originalWrite.call(fs, file, ...args);
  };
  try {
    assert.throws(
      () => writeIdentity(directory, runtimeIdentity, { replace: true }),
      (error) => error && error.code === 'EACCES',
    );
    assert.equal(fs.readFileSync(path.join(directory, 'index.html'), 'utf8'), htmlBefore);
    assert.equal(fs.readFileSync(path.join(directory, oldPath), 'utf8'), oldContent);
    assert.equal(fs.existsSync(path.join(directory, newName)), false);
  } finally {
    fs.writeFileSync = originalWrite;
    cleanup(directory);
  }
});

test('index.html write failure keeps the old reference with no stray new file', () => {
  const { directory, oldPath, html: htmlBefore } = setupArtifact();
  const oldContent = fs.readFileSync(path.join(directory, oldPath), 'utf8');
  const runtimeIdentity = { target: 'android', payloadSha256: '3'.repeat(64) };
  const newName = identityName(runtimeIdentity);
  assert.notEqual(newName, oldPath);
  const originalWrite = fs.writeFileSync;
  fs.writeFileSync = (file, ...args) => {
    if (file === path.join(directory, 'index.html')) throw new Error('index write failed');
    return originalWrite.call(fs, file, ...args);
  };
  try {
    assert.throws(
      () => writeIdentity(directory, runtimeIdentity, { replace: true }),
      /index write failed/,
    );
    assert.equal(fs.readFileSync(path.join(directory, 'index.html'), 'utf8'), htmlBefore);
    assert.ok(fs.readFileSync(path.join(directory, 'index.html'), 'utf8').includes(oldPath));
    assert.equal(fs.readFileSync(path.join(directory, oldPath), 'utf8'), oldContent);
    assert.equal(fs.existsSync(path.join(directory, newName)), false);
  } finally {
    fs.writeFileSync = originalWrite;
    cleanup(directory);
  }
});
