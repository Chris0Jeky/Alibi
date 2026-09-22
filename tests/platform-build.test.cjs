'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');
const {
  payloadDigest,
  readIdentity,
  sourceIdentity,
  writeIdentity,
} = require('../tools/platform-identity.cjs');
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const read = (name) => fs.readFileSync(path.join(DIST, name), 'utf8');
const scripts = [...read('index.html').matchAll(/<script src="\.\/([^"]+)" defer><\/script>/g)].map(
  (match) => match[1],
);

test('generated web startup injects a verified immutable browser facade before the app', () => {
  assert.equal(scripts.length, 6);
  const names = [
    'boot',
    'alibi-platform-identity',
    'alibi-platform',
    'official-content',
    'alibi',
    'block-motion-loader',
  ];
  names.forEach((name, index) =>
    assert.match(scripts[index], new RegExp(`^assets/${name}\\.[0-9a-f]{12}\\.js$`)),
  );
  const { identity, path: identityPath } = readIdentity(DIST);
  assert.equal(identityPath, scripts[1]);
  assert.equal(identity.target, 'web');
  assert.equal(identity.payloadSha256, payloadDigest(DIST));
  assert.equal(typeof identity.sourceDirty, 'boolean');
  assert.deepEqual(identity.rulesCompatibility, {});
  const context = vm.createContext({
    TextEncoder,
    AbortSignal,
    AbortController,
    setTimeout,
    clearTimeout,
  });
  vm.runInContext(read(scripts[1]) + read(scripts[2]), context);
  assert.equal(context.AlibiPlatform.build.sourceSha, identity.sourceSha);
  assert.equal(context.AlibiPlatform.capabilities().nativeHost, false);
  assert.equal(context.AlibiPlatform.capabilities().userDocuments, false);
  assert.equal(Object.getOwnPropertyDescriptor(context, 'AlibiPlatform').writable, false);
  for (const name of scripts)
    assert.ok(read('sw.js').includes('./' + name), `${name} is cached offline`);
});

test('startup delivery accounting includes every required emitted script', () => {
  const info = JSON.parse(fs.readFileSync(path.join(ROOT, 'build-info.json'), 'utf8'));
  const gzip = (name) => zlib.gzipSync(fs.readFileSync(path.join(DIST, name))).length;
  assert.equal(
    info.initialCodeAndContentGzipBytes,
    scripts.reduce((sum, name) => sum + gzip(name), 0),
  );
  assert.equal(info.platformGzipBytes, gzip(scripts[1]) + gzip(scripts[2]));
  assert.ok(info.platformGzipBytes < 6 * 1024, 'Platform startup stays below 6 KiB gzip');
});

test('runtime graph excludes self-reference but includes optional code and installed icons', () => {
  const parent = path.join(ROOT, 'test-results', 'platform-build');
  fs.mkdirSync(parent, { recursive: true });
  const directory = fs.mkdtempSync(path.join(parent, 'graph-'));
  try {
    fs.mkdirSync(path.join(directory, 'assets'));
    fs.mkdirSync(path.join(directory, 'icons'));
    fs.writeFileSync(path.join(directory, 'assets', 'optional.js'), 'run();');
    fs.writeFileSync(path.join(directory, 'icons', 'icon.png'), 'icon');
    const before = payloadDigest(directory);
    const identity = { target: 'web', payloadSha256: before };
    const written = writeIdentity(directory, identity);
    fs.writeFileSync(
      path.join(directory, 'index.html'),
      `<script src="./${written.path}"></script>`,
    );
    assert.equal(
      payloadDigest(directory),
      before,
      'identity and referencing HTML cannot form a digest cycle',
    );
    assert.deepEqual(readIdentity(directory).identity, identity);
    const replacement = writeIdentity(
      directory,
      { ...identity, target: 'android' },
      { replace: true },
    );
    assert.equal(payloadDigest(directory), before);
    assert.equal(
      fs.existsSync(path.join(directory, written.path)),
      false,
      'web identity is removed',
    );
    assert.ok(
      fs.readFileSync(path.join(directory, 'index.html'), 'utf8').includes(replacement.path),
    );
    fs.appendFileSync(path.join(directory, 'assets', 'optional.js'), 'changed();');
    assert.notEqual(payloadDigest(directory), before);
    fs.writeFileSync(
      path.join(directory, replacement.path),
      'globalThis.ALIBI_PLATFORM_BUILD={};\n',
    );
    assert.throws(() => readIdentity(directory), /filename hash/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('web provenance distinguishes a real commit anchor from uncommitted source', () => {
  const parent = path.join(ROOT, 'test-results', 'platform-build');
  fs.mkdirSync(parent, { recursive: true });
  const directory = fs.mkdtempSync(path.join(parent, 'source-'));
  const git = (args) =>
    execFileSync('git', args, {
      cwd: directory,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  try {
    git(['init']);
    fs.writeFileSync(path.join(directory, 'app.js'), 'one');
    git(['add', 'app.js']);
    git([
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '-m',
      'Create fixture',
    ]);
    const clean = sourceIdentity(directory);
    assert.match(clean.sourceSha, /^[0-9a-f]{40}$/);
    assert.equal(clean.sourceDirty, false);
    fs.appendFileSync(path.join(directory, 'app.js'), 'two');
    assert.deepEqual(sourceIdentity(directory), { ...clean, sourceDirty: true });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
