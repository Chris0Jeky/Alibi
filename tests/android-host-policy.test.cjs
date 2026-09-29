'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkPublicPayload } = require('../tools/sync-android.cjs');

const approved = JSON.parse(fs.readFileSync(path.join(__dirname, '../capacitor.config.json')));
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-host-policy-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  const assets = path.join(root, 'assets');
  const target = path.join(assets, 'public');
  fs.mkdirSync(source);
  fs.mkdirSync(target, { recursive: true });
  for (const dir of [source, target]) fs.writeFileSync(path.join(dir, 'index.html'), 'preview');
  for (const name of ['cordova.js', 'cordova_plugins.js']) fs.writeFileSync(path.join(target, name), '');
  const config = (value) => fs.writeFileSync(path.join(assets, 'capacitor.config.json'), JSON.stringify(value));
  config(approved);
  fs.writeFileSync(path.join(assets, 'capacitor.plugins.json'), '[]');
  return { root, source, target, assets, config, check: () => checkPublicPayload({ source, target }) };
}

test('the pinned plugin-free preview has an exact valid sync closure', (t) => {
  const f = fixture(t);
  assert.deepEqual(f.check(), []);
  f.config(Object.fromEntries(Object.entries(approved).reverse()));
  assert.deepEqual(f.check(), [], 'JSON key order is not an executable policy change');
});

for (const [name, mutate] of [
  ['remote URL', (c) => { c.server.url = 'https://example.invalid'; }],
  ['remote navigation', (c) => { c.server.allowNavigation = ['*']; }],
  ['changed origin', (c) => { c.server.hostname = 'other.localhost'; }],
  ['cleartext', (c) => { c.server.cleartext = true; }],
  ['mixed content', (c) => { c.android.allowMixedContent = true; }],
  ['debugging', (c) => { c.android.webContentsDebuggingEnabled = true; }],
  ['HTTP bridge', (c) => { c.plugins.CapacitorHttp = { enabled: true }; }],
  ['unexpected native field', (c) => { c.android.overrideUserAgent = 'unreviewed'; }],
  ['production identity', (c) => { c.appId = 'com.example.production'; }],
  ['changed WebView floor', (c) => { c.android.minWebViewVersion = 100; }],
  ['missing inset handling', (c) => { delete c.plugins.SystemBars; }],
]) {
  test(`sync refuses ${name} in generated config`, (t) => {
    const f = fixture(t);
    const config = structuredClone(approved);
    mutate(config);
    f.config(config);
    assert.match(f.check().join('\n'), /config|policy/i);
  });
}

for (const value of ['null', '{}', '{', '[{"pkg":"unexpected","classpath":"native.Example"}]']) {
  test(`sync refuses plugin registry ${value}`, (t) => {
    const f = fixture(t);
    fs.writeFileSync(path.join(f.assets, 'capacitor.plugins.json'), value);
    assert.match(f.check().join('\n'), /plugins|registry/i);
  });
}

for (const name of ['cordova.js', 'cordova_plugins.js']) {
  test(`sync refuses unexpected executable bytes in ${name}`, (t) => {
    const f = fixture(t);
    fs.writeFileSync(path.join(f.target, name), 'globalThis.unreviewed = true;');
    assert.match(f.check().join('\n'), /cordova|empty/i);
  });
}

test('missing and empty source trees cannot produce successful receipts', (t) => {
  const f = fixture(t);
  fs.rmSync(path.join(f.target, 'index.html'));
  fs.rmSync(f.source, { recursive: true });
  assert.ok(f.check().length > 0, 'missing source is not an empty valid payload');
  fs.mkdirSync(f.source);
  assert.ok(f.check().length > 0, 'empty source is not a valid payload');
});

test('malformed generated configuration returns diagnostics, never success', (t) => {
  const f = fixture(t);
  for (const text of ['null', '[]', '{']) {
    fs.writeFileSync(path.join(f.assets, 'capacitor.config.json'), text);
    assert.match(f.check().join('\n'), /config/i);
  }
});

test('missing, extra and changed copied files remain detectable', (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.target, 'index.html'), 'stale');
  assert.match(f.check().join('\n'), /differs for index.html/);
  fs.writeFileSync(path.join(f.target, 'index.html'), 'preview');
  fs.writeFileSync(path.join(f.target, 'unexpected.js'), 'stale');
  assert.match(f.check().join('\n'), /file set differs/);
  fs.rmSync(path.join(f.target, 'unexpected.js'));
  fs.rmSync(path.join(f.target, 'index.html'));
  assert.match(f.check().join('\n'), /file set differs/);
});

for (const kind of ['copied-file', 'source-file', 'metadata', 'directory', 'source-root']) {
  test(`sync rejects a ${kind} symlink rather than reading through it`, { skip: process.platform === 'win32' }, (t) => {
    const f = fixture(t);
    if (kind === 'metadata') {
      const filename = path.join(f.assets, 'capacitor.config.json');
      const real = path.join(f.root, 'config.json');
      fs.renameSync(filename, real);
      fs.symlinkSync(real, filename);
    } else if (kind === 'source-root') {
      const real = path.join(f.root, 'real-source');
      fs.renameSync(f.source, real);
      fs.symlinkSync(real, f.source, 'dir');
    } else if (kind === 'directory') {
      fs.symlinkSync(f.source, path.join(f.target, 'alias'), 'dir');
    } else {
      const dir = kind === 'source-file' ? f.source : f.target;
      const real = path.join(f.root, 'real-index.html');
      fs.writeFileSync(real, 'preview');
      fs.rmSync(path.join(dir, 'index.html'));
      fs.symlinkSync(real, path.join(dir, 'index.html'));
    }
    assert.match(f.check().join('\n'), /symlink|regular|directory/i);
  });
}
