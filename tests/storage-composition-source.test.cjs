'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const build = fs.readFileSync(path.join(root, 'tools/build.cjs'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'src/storage.js'), 'utf8');

// Execute the actual bootstrap composition expression with a recording compiler.
// This is source wiring, not a substitute for pinned emitted-artifact tests.
test('the counted bootstrap sends both owners to the existing pinned compiler', () => {
  const start = build.indexOf('    boot = ');
  const end = build.indexOf('    bootURL = ', start);
  assert.ok(start >= 0 && end > start);
  const expression = build.slice(start + '    boot = '.length, end).trim().replace(/,$/, '');
  const calls = [];
  const output = vm.runInNewContext(expression, {
    SRC: path.join(root, 'src'),
    path,
    read: (file) => fs.readFileSync(file, 'utf8'),
    require(name) {
      assert.equal(name, 'esbuild');
      return {
        transformSync(code, options) {
          calls.push({ code, options });
          return { code: 'synthetic compiled bootstrap' };
        },
      };
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].code,
    fs.readFileSync(path.join(root, 'src/boot.js'), 'utf8') + '\n' + storage,
  );
  assert.equal(calls[0].options.minify, true);
  assert.equal(calls[0].options.target, 'es2022');
  assert.equal(output, 'synthetic compiled bootstrap');
});
test('application composition no longer duplicates the storage owner', () => {
  const base = build.slice(build.indexOf('  const base = ['), build.indexOf('  const targetGuard'));
  assert.ok(base.includes("read(path.join(SRC, 'updates.js'))"));
  assert.ok(!base.includes("read(path.join(SRC, 'storage.js'))"));
});
