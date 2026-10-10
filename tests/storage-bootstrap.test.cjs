'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'dist/assets');
const names = fs.readdirSync(directory);
const artifact = (prefix) => {
  const matches = names.filter((name) => new RegExp(`^${prefix}\\.[a-f0-9]{12}\\.js$`).test(name));
  assert.equal(matches.length, 1, `one ${prefix} artifact`);
  return fs.readFileSync(path.join(directory, matches[0]), 'utf8');
};
const boot = artifact('boot');
const app = artifact('alibi');
function context() {
  let reads = 0;
  const c = {
    URL,
    setTimeout: () => 1,
    clearTimeout() {},
    addEventListener() {},
    location: { hash: '', pathname: '/', search: '' },
    history: { state: null },
    document: { getElementById: () => null },
  };
  Object.defineProperty(c, 'localStorage', {
    get() {
      reads++;
      throw Error('storage denied');
    },
  });
  vm.runInNewContext(boot, c);
  return { c, reads: () => reads };
}

test('the bootstrap defines storage exactly once and the application does not duplicate it', () => {
  assert.equal((boot.match(/\.AlibiStorage=/g) || []).length, 1);
  assert.equal((app.match(/\.AlibiStorage=/g) || []).length, 0);
});
test('storage bootstrap has no persistence or core dependency before application initialization', () => {
  const { c, reads } = context();
  assert.equal(typeof c.AlibiStorage?.Store, 'function');
  assert.equal(c.AlibiCore, undefined);
  assert.equal(reads(), 0, 'merely defining the save owner must not read storage');
});
test('the emitted storage owner uses the real core and preserves session CAS and input ownership', async () => {
  const { c, reads } = context();
  vm.runInNewContext(fs.readFileSync(path.join(root, 'src/core.js'), 'utf8'), c);
  const store = new c.AlibiStorage.Store();
  store.mode = 'session';
  const record = { schemaVersion: 1, key: 'bootstrap@1', rev: 0, note: 'first' };
  const saved = await store.saveRun(record, 0);
  assert.equal(saved.rev, 1);
  assert.equal(record.rev, 0);
  await assert.rejects(store.saveRun(record, 0), { name: 'ConflictError' });
  const exported = await store.export();
  assert.equal(exported.runs[0].note, 'first');
  assert.equal(reads(), 0, 'session writes never access denied local storage');
});
test('startup accounting includes the complete storage-bearing bootstrap once', () => {
  const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json'), 'utf8'));
  assert.equal(info.bootGzipBytes, zlib.gzipSync(boot).length);
  const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="\.\/([^\"]+)" defer><\/script>/g)]
    .map((match) => match[1])
    .filter((name) => !/^assets\/pulseboard\./.test(name));
  assert.equal(scripts.length, 6, 'no additional startup request');
  assert.equal(
    info.initialCodeAndContentGzipBytes,
    scripts.reduce(
      (sum, name) => sum + zlib.gzipSync(fs.readFileSync(path.join(root, 'dist', name))).length,
      0,
    ),
  );
});
test('standalone delivery also defines the storage owner once', () => {
  const standalone = fs.readFileSync(path.join(root, 'alibi-deluxe-play.html'), 'utf8');
  assert.equal((standalone.match(/\.AlibiStorage\s*=/g) || []).length, 1);
});

test('the emitted owner refuses local run writes before accessing denied persistence', async () => {
  const { c } = context();
  vm.runInNewContext(fs.readFileSync(path.join(root, 'src/core.js'), 'utf8'), c);
  const store = new c.AlibiStorage.Store();
  store.mode = 'local';
  const record = { schemaVersion: 1, key: 'legacy@1', rev: 7, note: 'old' };
  const before = JSON.stringify(record);
  // The denied accessor is deliberately left in place: refusal must precede access.
  await assert.rejects(store.saveRun(record, 7), /read-only/);
  await assert.rejects(store.put('runs', record.key, record), /read-only/);
  assert.equal(JSON.stringify(record), before);
});
