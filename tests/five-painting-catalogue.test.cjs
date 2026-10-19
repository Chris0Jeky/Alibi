'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

test('the actual catalogue assembler registers the five selected painting fallbacks', () => {
  const file = path.resolve(__dirname, '../tools/assets/catalogue.cjs');
  const realRequire = createRequire(file);
  const output = new Map();
  const context = {
    __dirname: path.dirname(file),
    module: { exports: {} },
    require: (id) =>
      id === 'node:fs'
        ? { ...fs, writeFileSync: (name, bytes) => output.set(name, bytes) }
        : realRequire(id),
    console: { log() {} },
  };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  context.module.exports.main();
  const catalogue = JSON.parse(
    output.get(path.resolve(__dirname, '../assets-source/library/catalogue.json')),
  );
  for (const id of [
    'tic-tac-toe',
    'lantern-gardens',
    'block-cabinet',
    'archive-heist',
    'living-atlas',
  ]) {
    const asset = catalogue.assets.find((a) => a.id === 'painted-' + id);
    const svg = 'assets-source/library/painted-club/fallbacks/' + id + '.svg';
    assert.equal(asset.status, 'current', id);
    assert.ok(asset.derivatives.includes(svg), id);
    assert.ok(
      asset.files.some((f) => f.path === svg && f.bytes > 0),
      id,
    );
    assert.match(asset.integration, /optional enhancement/);
  }
  for (const id of ['saved-bookmarks', 'winter-post-office'])
    assert.equal(catalogue.assets.find((a) => a.id === 'painted-' + id).status, 'proposed');
});
