'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
// Release fixture file handles before Windows removes their temporary directories.
require('sharp').cache({ files: 0 });

const root = path.resolve(__dirname, '..');
const paintedDir = path.join(root, 'assets-source/library/painted-club');
const scriptPath = path.join(paintedDir, 'build-derivatives.cjs');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');
const realManifest = JSON.parse(fs.readFileSync(path.join(paintedDir, 'manifest.json'), 'utf8'));

const masterEntry = realManifest.assets.find((entry) => entry.file === 'saved-bookmarks.webp');
const runtimeEntries = realManifest.assets.filter(
  (entry) => entry.kind === 'runtime' && entry.file.startsWith('saved-bookmarks-'),
);

function reviewedBytes(file) {
  return fs.readFileSync(path.join(paintedDir, file));
}

function makeFixture() {
  assert.ok(masterEntry, 'fixture master exists in manifest');
  assert.equal(runtimeEntries.length, 2, 'fixture master has two derivatives');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-painted-'));
  const manifest = {
    assets: [masterEntry, ...runtimeEntries],
    processing: realManifest.processing,
  };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  fs.copyFileSync(path.join(paintedDir, masterEntry.file), path.join(dir, masterEntry.file));
  for (const entry of runtimeEntries) {
    fs.copyFileSync(path.join(paintedDir, entry.file), path.join(dir, entry.file));
  }
  return dir;
}

async function runScript(dir, args) {
  const requireFromScript = createRequire(scriptPath);
  const logs = [];
  const errors = [];
  const fakeProcess = { argv: ['node', 'build-derivatives.cjs', ...args], exitCode: 0 };
  const sandbox = {
    __dirname: dir,
    __filename: path.join(dir, 'build-derivatives.cjs'),
    require: (id) => requireFromScript(id),
    process: fakeProcess,
    console: {
      log: (...parts) => logs.push(parts.join(' ')),
      error: (...parts) => errors.push(parts.join(' ')),
    },
  };
  vm.createContext(sandbox);
  await vm.runInContext(scriptCode, sandbox, { filename: 'build-derivatives.cjs' });
  return { exitCode: fakeProcess.exitCode, logs, errors };
}

function assertReviewedDerivatives(dir) {
  for (const entry of runtimeEntries) {
    assert.deepEqual(fs.readFileSync(path.join(dir, entry.file)), reviewedBytes(entry.file));
  }
}

test('write mode recreates a missing derivative to reviewed bytes', async () => {
  const dir = makeFixture();
  try {
    fs.rmSync(path.join(dir, runtimeEntries[0].file));
    const result = await runScript(dir, []);
    assert.equal(result.exitCode, 0);
    assertReviewedDerivatives(dir);
    assert.deepEqual(
      fs.readFileSync(path.join(dir, masterEntry.file)),
      reviewedBytes(masterEntry.file),
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('write mode replaces a corrupt derivative with reviewed bytes', async () => {
  const dir = makeFixture();
  try {
    fs.writeFileSync(path.join(dir, runtimeEntries[0].file), Buffer.from('corrupt-derivative'));
    const result = await runScript(dir, []);
    assert.equal(result.exitCode, 0);
    assertReviewedDerivatives(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('--check rejects missing and corrupt derivatives without writing', async () => {
  let dir = makeFixture();
  try {
    const intact = fs.readFileSync(path.join(dir, runtimeEntries[1].file));
    fs.rmSync(path.join(dir, runtimeEntries[0].file));
    const result = await runScript(dir, ['--check']);
    assert.equal(result.exitCode, 1);
    assert.ok(!fs.existsSync(path.join(dir, runtimeEntries[0].file)));
    assert.deepEqual(fs.readFileSync(path.join(dir, runtimeEntries[1].file)), intact);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  dir = makeFixture();
  try {
    const intact = fs.readFileSync(path.join(dir, runtimeEntries[1].file));
    fs.writeFileSync(path.join(dir, runtimeEntries[0].file), Buffer.from('corrupt-derivative'));
    const result = await runScript(dir, ['--check']);
    assert.equal(result.exitCode, 1);
    assert.match(result.errors.join('\n'), /Changed input/);
    assert.deepEqual(fs.readFileSync(path.join(dir, runtimeEntries[1].file)), intact);
    assert.notDeepEqual(
      fs.readFileSync(path.join(dir, runtimeEntries[0].file)),
      reviewedBytes(runtimeEntries[0].file),
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a corrupt master fails before any derivative changes', async () => {
  const dir = makeFixture();
  try {
    const before = runtimeEntries.map((entry) => fs.readFileSync(path.join(dir, entry.file)));
    fs.writeFileSync(path.join(dir, masterEntry.file), Buffer.from('corrupt-master'));
    const result = await runScript(dir, []);
    assert.equal(result.exitCode, 1);
    assert.match(result.errors.join('\n'), /Changed input: saved-bookmarks\.webp/);
    runtimeEntries.forEach((entry, index) => {
      assert.deepEqual(fs.readFileSync(path.join(dir, entry.file)), before[index]);
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a hardlinked derivative is refused and aliased bytes are preserved', async () => {
  const dir = makeFixture();
  try {
    const sentinel = Buffer.from('painted-club-external-sentinel');
    const external = path.join(dir, 'external.bin');
    fs.writeFileSync(external, sentinel);
    fs.rmSync(path.join(dir, runtimeEntries[0].file));
    fs.linkSync(external, path.join(dir, runtimeEntries[0].file));
    assert.equal(fs.lstatSync(path.join(dir, runtimeEntries[0].file)).nlink, 2);
    const result = await runScript(dir, []);
    assert.equal(result.exitCode, 1);
    assert.match(result.errors.join('\n'), /Unsafe output/);
    assert.deepEqual(fs.readFileSync(external), sentinel);
    assert.deepEqual(fs.readFileSync(path.join(dir, runtimeEntries[0].file)), sentinel);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
