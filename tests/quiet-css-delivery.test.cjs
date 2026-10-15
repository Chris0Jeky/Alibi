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
const raw = ['style.css', 'folio.css']
  .map((name) => fs.readFileSync(path.join(root, 'src/quiet-wing', name), 'utf8'))
  .join('\n');

test('Quiet Wing emits whitespace-compacted CSS without rewriting standalone source', () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-quiet-css-'));
  fs.mkdirSync(path.join(dist, 'assets'));
  const calls = [];
  const module = { exports: {} };
  const cssOutput = '/* transformer output fixture, not a measured release */';
  try {
    vm.runInNewContext(fs.readFileSync(buildFile, 'utf8'), {
      module,
      Buffer,
      require(name) {
        if (name === 'esbuild')
          return {
            buildSync: () => ({ outputFiles: [{ text: '/* GPU fixture */' }] }),
            transformSync(source, options) {
              calls.push({ source, options });
              return { code: options.loader === 'css' ? cssOutput : '/* JS fixture */' };
            },
          };
        if (name === 'node:fs')
          return {
            ...fs,
            readFileSync(file, ...rest) {
              if (file === path.join(root, 'node_modules/three/LICENSE'))
                return Buffer.from('Synthetic dependency license for the build wiring test.');
              return fs.readFileSync(file, ...rest);
            },
          };
        return fromBuild(name);
      },
    });
    const result = module.exports(
      root,
      dist,
      { 'quiet-town': './town-fixture.webp' },
      { 'quiet-town': 'data:image/webp;base64,' },
      { manifest: { editorial: [] }, bytes: 0 },
    );
    const css = calls.filter((c) => c.options.loader === 'css');
    assert.equal(css.length, 1, 'the CSS parser, not a string replacement, owns compaction');
    assert.equal(css[0].source, raw);
    assert.equal(css[0].options.minifyWhitespace, true);
    assert.ok(!css[0].options.minifySyntax && !css[0].options.minify, 'no syntax optimizations');
    assert.equal(fs.readFileSync(path.join(dist, result.config.css), 'utf8'), cssOutput);
    assert.equal(result.standalone.cssSource, raw, 'source-based standalone remains unchanged');
    assert.ok(result.config.files.includes(result.config.css));
  } finally {
    fs.rmSync(dist, { recursive: true, force: true });
  }
});
