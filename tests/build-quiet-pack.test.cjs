'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const buildFile = path.join(root, 'tools/build-quiet-pack.cjs');
const fromBuild = createRequire(buildFile);

function loadBuildQuiet(counts) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(buildFile, 'utf8'), {
    module,
    Buffer,
    require(name) {
      if (name === 'esbuild')
        return {
          buildSync: () => ({ outputFiles: [{ text: '/* GPU fixture */' }] }),
          transformSync: () => ({ code: '/* fixture */' }),
        };
      if (name === 'node:fs')
        return {
          ...fs,
          statSync(...args) {
            counts.statSync += 1;
            return fs.statSync(...args);
          },
          writeFileSync(...args) {
            counts.writeFileSync += 1;
            return fs.writeFileSync(...args);
          },
        };
      return fromBuild(name);
    },
  });
  return module.exports;
}

function runBuild(town, inlineTown) {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-quiet-media-'));
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  const counts = { statSync: 0, writeFileSync: 0 };
  const buildQuiet = loadBuildQuiet(counts);
  const experience = { manifest: { editorial: [] }, bytes: 123 };
  let error = null;
  try {
    buildQuiet(root, dist, { 'quiet-town': town }, { 'quiet-town': inlineTown }, experience);
  } catch (err) {
    error = err;
  } finally {
    fs.rmSync(dist, { recursive: true, force: true });
  }
  return { error, experience, counts };
}

test('missing baseMedia quiet-town throws before touching files or bytes', () => {
  const { error, experience, counts } = runBuild(undefined, 'data:image/webp;base64,');
  assert.match(String(error && error.message), /missing quiet-town media/);
  assert.equal(error && error.code, 'MISSING_QUIET_TOWN_MEDIA');
  assert.equal(experience.bytes, 123);
  assert.equal(counts.statSync, 0);
});

test('missing inlineBase quiet-town throws before touching files or bytes', () => {
  const { error, experience, counts } = runBuild('./town-fixture.webp', '');
  assert.match(String(error && error.message), /missing quiet-town media/);
  assert.equal(error && error.code, 'MISSING_QUIET_TOWN_MEDIA');
  assert.equal(experience.bytes, 123);
  assert.equal(counts.statSync, 0);
});
