'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

test('Block Cabinet is an independently bounded optional pack, not hidden initial weight', () => {
  const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json')));
  const names = fs.readdirSync(path.join(dist, 'assets'));
  const packs = names.filter((name) => /^(block-motion\.|block-atelier\.)/.test(name));
  assert.equal(packs.length, 3);
  const bytes = packs.reduce((n, name) => n + fs.statSync(path.join(dist, 'assets', name)).size, 0);
  assert.equal(info.blockMotionBytes, bytes);
  assert.ok(bytes < 64 * 1024, 'Game surface, CSS and art stay below 64 KiB uncompressed');
  const loaderName = names.find((name) => name.startsWith('block-motion-loader.'));
  const loader = fs.readFileSync(path.join(dist, 'assets', loaderName), 'utf8');
  assert.equal(info.blockMotionLoaderGzipBytes, zlib.gzipSync(loader).length);
  assert.ok(info.blockMotionLoaderGzipBytes < 2 * 1024);
  const sw = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
  assert.ok(sw.includes(loaderName), 'Small loader belongs to the coherent offline shell');
  for (const name of packs)
    assert.ok(!sw.includes(name), 'Optional pack does not precache on install');
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  assert.ok(html.includes(loaderName));
  const context = {
    document: { body: {}, querySelector: () => null },
    MutationObserver: class {
      observe() {}
    },
  };
  vm.runInNewContext(loader, context);
  assert.equal(context.ALIBI_BLOCK_MOTION.files.length, 3);
  for (const url of context.ALIBI_BLOCK_MOTION.files) {
    assert.ok(url.startsWith('./assets/'));
    assert.ok(fs.existsSync(path.join(dist, url)));
  }
  const main = names.find((name) => /^alibi\..*\.js$/.test(name));
  const content = names.find((name) => /^official-content\..*\.js$/.test(name));
  assert.equal(
    info.initialCodeAndContentGzipBytes,
    zlib.gzipSync(fs.readFileSync(path.join(dist, 'assets', main))).length +
      zlib.gzipSync(fs.readFileSync(path.join(dist, 'assets', content))).length +
      info.blockMotionLoaderGzipBytes,
  );
});
