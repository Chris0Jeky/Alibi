'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const buildFile = path.join(root, 'tools/build-quiet-pack.cjs');
const fromBuild = createRequire(buildFile);
const town = { 'quiet-town': './town-fixture.webp' };
const inlineTown = { 'quiet-town': 'data:image/webp;base64,' };
const experience = () => ({ manifest: { editorial: [] }, bytes: 0 });

function loadBuild(overrides) {
  const module = { exports: {} };
  const sources = [];
  vm.runInNewContext(fs.readFileSync(buildFile, 'utf8'), {
    module,
    Buffer,
    require(name) {
      if (name === 'esbuild')
        return {
          buildSync: () => ({ outputFiles: [{ text: '/* GPU fixture */' }] }),
          transformSync(source, options) {
            sources.push({ source, options });
            return { code: source };
          },
        };
      if (name === 'node:fs')
        return {
          ...fs,
          readFileSync(file, ...rest) {
            const key = String(file);
            if (key.endsWith(`${path.sep}city-models.json`) && overrides.city !== undefined)
              return overrides.city;
            if (key.endsWith(`${path.sep}library-models.json`) && overrides.library !== undefined)
              return overrides.library;
            if (key === path.join(root, 'node_modules/three/LICENSE'))
              return Buffer.from('Synthetic dependency license for the build wiring test.');
            return fs.readFileSync(file, ...rest);
          },
        };
      return fromBuild(name);
    },
  });
  return { build: module.exports, sources };
}

function withDist(fn) {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-quiet-json-'));
  fs.mkdirSync(path.join(dist, 'assets'));
  try {
    fn(dist);
  } finally {
    fs.rmSync(dist, { recursive: true, force: true });
  }
}

test('Quiet Wing build rejects invalid model JSON instead of embedding it raw', () => {
  for (const [file, key] of [
    ['city-models.json', 'city'],
    ['library-models.json', 'library'],
  ]) {
    const { build } = loadBuild({ [key]: '{oops, not json {{{' });
    withDist((dist) => {
      assert.throws(
        () => build(root, dist, town, inlineTown, experience()),
        new RegExp(`Invalid JSON in quiet-wing assets/${file}`),
        `${file} must throw on invalid JSON`,
      );
    });
  }
});

test('Quiet Wing embeds hostile model JSON as stringified data without executing it', () => {
  const hostile = {
    hall: '</script><script>globalThis.QW_HOSTILE_EXECUTED=true</script>',
    probe: 'QW-HOSTILE-PROBE-7f3a',
  };
  const raw = `{\n  "hall": ${JSON.stringify(hostile.hall)},\n  "probe": ${JSON.stringify(hostile.probe)}\n}`;
  const { build, sources } = loadBuild({ city: raw });
  withDist((dist) => {
    build(root, dist, town, inlineTown, experience());
    const bundled = sources.find((entry) => entry.source.includes('globalThis.QWCityModels='));
    assert.ok(bundled, 'expected the quiet bundle source to be captured');
    assert.ok(
      bundled.source.includes(`globalThis.QWCityModels=${JSON.stringify(hostile)};`),
      'city models reach the bundle through JSON.stringify, not raw file bytes',
    );
    const header = bundled.source
      .split('\n')
      .filter((line) => line.startsWith('globalThis.QW'))
      .join('\n');
    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(header, sandbox);
    assert.equal(JSON.stringify(sandbox.QWCityModels), JSON.stringify(hostile));
    assert.equal(sandbox.QW_HOSTILE_EXECUTED, undefined, 'embedded payload must stay data');
  });
});
