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
  sha256,
  sourceIdentity,
  writeIdentity,
} = require('../tools/platform-identity.cjs');
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const read = (name) => fs.readFileSync(path.join(DIST, name), 'utf8');
const deferred = [
  ...read('index.html').matchAll(/<script src="\.\/([^"]+)" defer><\/script>/g),
].map((match) => match[1]);
// The online-only Pulseboard SDK loads last and is neither startup code nor offline shell.
const sdk = deferred.filter((name) => /^assets\/pulseboard\.[0-9a-f]{12}\.js$/.test(name));
const scripts = deferred.filter((name) => !sdk.includes(name));

test('generated web startup injects a verified immutable browser facade before the app', () => {
  assert.equal(scripts.length, 6);
  assert.deepEqual(sdk, deferred.slice(-1), 'the Pulseboard SDK is the last deferred script');
  assert.ok(!read('sw.js').includes('./' + sdk[0]), 'the Pulseboard SDK is not cached offline');
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

test('house source preview installs the facade and fingerprints its emitted inline payload', () => {
  const parent = path.join(ROOT, 'test-results', 'platform-build');
  fs.mkdirSync(parent, { recursive: true });
  const filename = path.join(parent, 'house-source.html');
  require('../tools/preview-house.cjs').preview(filename);
  const html = fs.readFileSync(filename, 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const firstLine = script.indexOf('\n');
  const context = vm.createContext({
    TextEncoder,
    AbortSignal,
    AbortController,
    setTimeout,
    clearTimeout,
  });
  // Execute the real globals and platform bundle before the first application code.
  const applicationStart = script.indexOf('\nif (!location.hash)');
  assert.ok(applicationStart > firstLine);
  vm.runInContext(script.slice(0, applicationStart), context);
  const identity = context.AlibiPlatform.build;
  assert.equal(identity.target, 'web');
  assert.equal(context.ALIBI_BUILD_TARGET, 'standalone');
  assert.equal(identity.sourceSha, sourceIdentity(ROOT).sourceSha);
  assert.equal(identity.sourceDirty, sourceIdentity(ROOT).sourceDirty);
  assert.equal(identity.appVersion, context.ALIBI_CONFIG.version);
  assert.equal(identity.contentManifestRevision, sha256(JSON.stringify(context.ALIBI_CATALOG)));
  assert.equal(
    identity.payloadSha256,
    sha256('script\0' + script.slice(firstLine + 1) + '\0style\0' + css + '\0'),
  );
  assert.equal(context.AlibiPlatform.capabilities().nativeHost, false);
  assert.equal(Object.getOwnPropertyDescriptor(context, 'AlibiPlatform').writable, false);
  assert.match(html, /SOURCE PREVIEW/);
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
