'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const productionScript = path.join(
  root,
  'assets-source/library/painted-club/build-derivatives.cjs',
);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const specs = [
  { base: 'club-welcome', width: 280, color: { r: 184, g: 91, b: 54, alpha: 1 } },
  { base: 'lantern-duel', width: 320, color: { r: 43, g: 112, b: 149, alpha: 1 } },
];

async function makeFixture() {
  const fixture = fs.mkdtempSync(path.join(root, '.tmp-painted-derivative-repair-'));
  const shelf = path.join(fixture, 'shelf');
  fs.mkdirSync(shelf);
  fs.copyFileSync(productionScript, path.join(shelf, 'build-derivatives.cjs'));

  const sources = [];
  const outputs = [];
  for (const spec of specs) {
    const sourceFile = spec.base + '.webp';
    const sourcePath = path.join(shelf, sourceFile);
    const sourceBytes = await sharp({
      create: { width: 80, height: 60, channels: 4, background: spec.color },
    })
      .webp({ lossless: true })
      .toBuffer();
    fs.writeFileSync(sourcePath, sourceBytes);
    sources.push({
      file: sourceFile,
      wave: '01',
      kind: 'source-webp',
      bytes: sourceBytes.length,
      sha256: sha256(sourceBytes),
    });

    const outputFile = `${spec.base}-${spec.width}.webp`;
    const outputBytes = await sharp(sourceBytes)
      .resize({ width: spec.width, fastShrinkOnLoad: false })
      .webp({ quality: 85, alphaQuality: 95, effort: 6 })
      .toBuffer();
    outputs.push({
      file: outputFile,
      wave: '01',
      kind: 'runtime',
      bytes: outputBytes.length,
      sha256: sha256(outputBytes),
      expected: outputBytes,
    });
  }

  const manifest = {
    assets: [...sources, ...outputs.map(({ expected, ...entry }) => entry)],
    processing: { presetsByWave: { '01': { fastShrinkOnLoad: false } } },
  };
  const manifestPath = path.join(shelf, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  for (const output of outputs) fs.writeFileSync(path.join(shelf, output.file), output.expected);

  return { fixture, shelf, manifestPath, sources, outputs };
}

function runGenerator(fixture, checkOnly = false) {
  const script = path.join(fixture, 'shelf', 'build-derivatives.cjs');
  return spawnSync(process.execPath, checkOnly ? [script, '--check'] : [script], {
    cwd: fixture,
    encoding: 'utf8',
  });
}

function withFixture(run) {
  return makeFixture().then(async (fixtureData) => {
    try {
      return await run(fixtureData);
    } finally {
      const resolvedRoot = path.resolve(root);
      const resolvedFixture = path.resolve(fixtureData.fixture);
      const relative = path.relative(resolvedRoot, resolvedFixture);
      assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
      const shelfPath = path.join(resolvedFixture, 'shelf');
      assert.equal(fs.lstatSync(resolvedFixture).isDirectory(), true);
      assert.equal(fs.lstatSync(shelfPath).isDirectory(), true);
      for (const entry of fs.readdirSync(shelfPath, { withFileTypes: true })) {
        assert.ok(
          entry.isFile() || entry.isSymbolicLink(),
          `Unexpected fixture entry: ${entry.name}`,
        );
        fs.unlinkSync(path.join(shelfPath, entry.name));
      }
      fs.rmdirSync(shelfPath);
      for (const entry of fs.readdirSync(resolvedFixture, { withFileTypes: true })) {
        assert.ok(
          entry.isFile() || entry.isSymbolicLink(),
          `Unexpected fixture entry: ${entry.name}`,
        );
        fs.unlinkSync(path.join(resolvedFixture, entry.name));
      }
      fs.rmdirSync(resolvedFixture);
    }
  });
}

function captureFiles(shelf, entries) {
  return entries.map((entry) => {
    const file = path.join(shelf, entry.file);
    return {
      bytes: fs.readFileSync(file),
      mtimeNs: fs.statSync(file, { bigint: true }).mtimeNs,
    };
  });
}

test('normal mode restores a missing derivative from a verified master', () =>
  withFixture(({ fixture, shelf, outputs }) => {
    const missing = outputs[0];
    const untouched = outputs[1];
    const untouchedBefore = captureFiles(shelf, [untouched])[0];
    fs.unlinkSync(path.join(shelf, missing.file));

    const result = runGenerator(fixture);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /restored 1 derivative/i);
    assert.deepEqual(fs.readFileSync(path.join(shelf, missing.file)), missing.expected);
    assert.deepEqual(captureFiles(shelf, [untouched])[0], untouchedBefore);
  }));

test('normal mode restores a corrupt derivative only when it reproduces the manifest', () =>
  withFixture(({ fixture, shelf, outputs }) => {
    const damaged = outputs[0];
    const untouched = outputs[1];
    const untouchedBefore = captureFiles(shelf, [untouched])[0];
    fs.writeFileSync(path.join(shelf, damaged.file), Buffer.from('corrupt derivative'));

    const result = runGenerator(fixture);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /restored 1 derivative/i);
    assert.deepEqual(fs.readFileSync(path.join(shelf, damaged.file)), damaged.expected);
    assert.deepEqual(captureFiles(shelf, [untouched])[0], untouchedBefore);
  }));

test('normal mode refuses a derivative restore when manifest size or hash differs', async () => {
  for (const mismatch of ['bytes', 'sha256']) {
    await withFixture(({ fixture, shelf, manifestPath, outputs }) => {
      const missing = outputs[0];
      const valid = outputs[1];
      const validBefore = captureFiles(shelf, [valid])[0];
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const entry = manifest.assets.find((asset) => asset.file === missing.file);
      if (mismatch === 'bytes') entry.bytes += 1;
      else entry.sha256 = '0'.repeat(64);
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      const manifestBefore = fs.readFileSync(manifestPath);
      fs.unlinkSync(path.join(shelf, missing.file));

      const result = runGenerator(fixture);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, new RegExp(`Non-reproducible derivative: ${missing.file}`));
      assert.equal(fs.existsSync(path.join(shelf, missing.file)), false);
      assert.deepEqual(captureFiles(shelf, [valid])[0], validBefore);
      assert.deepEqual(fs.readFileSync(manifestPath), manifestBefore);
    });
  }
});

test('--check rejects missing and corrupt derivatives without changing either case', () =>
  withFixture(({ fixture, shelf, outputs }) => {
    const missing = outputs[0];
    fs.unlinkSync(path.join(shelf, missing.file));
    const missingResult = runGenerator(fixture, true);
    assert.notEqual(missingResult.status, 0);
    assert.match(
      missingResult.stderr,
      new RegExp(`Changed input: ${missing.file}|ENOENT.*${missing.file}`),
    );
    assert.equal(fs.existsSync(path.join(shelf, missing.file)), false);

    const corrupt = outputs[1];
    fs.writeFileSync(path.join(shelf, missing.file), missing.expected);
    const corruptBytes = Buffer.from('damaged derivative');
    fs.writeFileSync(path.join(shelf, corrupt.file), corruptBytes);
    const corruptResult = runGenerator(fixture, true);
    assert.notEqual(corruptResult.status, 0);
    assert.match(corruptResult.stderr, new RegExp(`Changed input: ${corrupt.file}`));
    assert.deepEqual(fs.readFileSync(path.join(shelf, corrupt.file)), corruptBytes);
  }));

test('normal mode preflights every master before repairing any derivative', async () => {
  for (const masterFailure of ['missing', 'damaged']) {
    await withFixture(({ fixture, shelf, sources, outputs }) => {
      const damagedOutput = outputs[0];
      const laterMaster = sources[1];
      const damagedBytes = Buffer.from('damaged derivative');
      fs.writeFileSync(path.join(shelf, damagedOutput.file), damagedBytes);
      const laterMasterPath = path.join(shelf, laterMaster.file);
      if (masterFailure === 'missing') fs.unlinkSync(laterMasterPath);
      else fs.writeFileSync(laterMasterPath, Buffer.from('damaged master'));

      const result = runGenerator(fixture);
      assert.notEqual(result.status, 0);
      assert.match(
        result.stderr,
        new RegExp(`Changed input: ${laterMaster.file}|ENOENT.*${laterMaster.file}`),
      );
      assert.deepEqual(fs.readFileSync(path.join(shelf, damagedOutput.file)), damagedBytes);
    });
  }
});

test('valid outputs are left byte-for-byte and timestamp unchanged in normal mode', () =>
  withFixture(({ fixture, shelf, manifestPath, sources, outputs }) => {
    const entries = [...sources, ...outputs];
    const before = captureFiles(shelf, entries);
    const manifestBefore = fs.readFileSync(manifestPath);
    const oldTime = new Date('2020-01-02T03:04:05.000Z');
    for (const output of outputs) fs.utimesSync(path.join(shelf, output.file), oldTime, oldTime);
    const outputTimesBefore = captureFiles(shelf, outputs).map((file) => file.mtimeNs);

    const result = runGenerator(fixture);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /restored 0 derivatives/i);
    assert.deepEqual(captureFiles(shelf, sources), before.slice(0, sources.length));
    assert.deepEqual(
      captureFiles(shelf, outputs).map((file) => file.bytes),
      outputs.map((entry) => entry.expected),
    );
    assert.deepEqual(
      captureFiles(shelf, outputs).map((file) => file.mtimeNs),
      outputTimesBefore,
    );
    assert.deepEqual(fs.readFileSync(manifestPath), manifestBefore);
  }));

test('normal mode refuses a derivative symlink without writing through it', () =>
  withFixture(({ fixture, shelf, outputs }) => {
    const output = outputs[0];
    const outputPath = path.join(shelf, output.file);
    fs.unlinkSync(outputPath);
    const sentinelPath = path.join(fixture, 'unrelated-sentinel.webp');
    fs.writeFileSync(sentinelPath, output.expected);
    const sentinelBefore = fs.readFileSync(sentinelPath);
    const sentinelTime = fs.statSync(sentinelPath, { bigint: true }).mtimeNs;
    fs.symlinkSync(sentinelPath, outputPath, 'file');

    const result = runGenerator(fixture);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`Unsafe derivative output: ${output.file}`));
    assert.deepEqual(fs.readFileSync(sentinelPath), sentinelBefore);
    assert.equal(fs.statSync(sentinelPath, { bigint: true }).mtimeNs, sentinelTime);
    assert.equal(fs.lstatSync(outputPath).isSymbolicLink(), true);
  }));

test('normal mode replaces a corrupt hard-linked derivative without changing its alias', () =>
  withFixture(({ fixture, shelf, outputs }) => {
    const output = outputs[0];
    const outputPath = path.join(shelf, output.file);
    fs.unlinkSync(outputPath);
    const sentinelPath = path.join(fixture, 'unrelated-hardlink-sentinel.webp');
    const damagedBytes = Buffer.from('damaged hard-linked derivative');
    fs.writeFileSync(sentinelPath, damagedBytes);
    fs.linkSync(sentinelPath, outputPath);
    const sentinelTime = fs.statSync(sentinelPath, { bigint: true }).mtimeNs;

    const result = runGenerator(fixture);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /restored 1 derivative/i);
    assert.deepEqual(fs.readFileSync(outputPath), output.expected);
    assert.deepEqual(fs.readFileSync(sentinelPath), damagedBytes);
    assert.equal(fs.statSync(sentinelPath, { bigint: true }).mtimeNs, sentinelTime);
    assert.equal(fs.statSync(outputPath, { bigint: true }).nlink, 1n);
  }));
