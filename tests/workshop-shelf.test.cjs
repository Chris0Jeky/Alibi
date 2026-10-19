'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildShelf, renderShelf } = require('../tools/build-workshop-shelf.cjs');
const { loadCatalogue } = require('../tools/workshop-catalogue.cjs');
const root = path.resolve(__dirname, '..');

test('shelf produces five deterministic files with byte-exact pack downloads', () => {
  const catalogue = loadCatalogue(root),
    first = buildShelf(root),
    second = buildShelf(root);
  assert.deepEqual(first, second);
  assert.equal(first.files.length, 5);
  assert.equal(
    first.bytes,
    first.files.reduce((sum, file) => sum + file.data.length, 0),
  );
  assert.equal(new Set(first.files.map((file) => file.path)).size, first.files.length);
  assert.ok(first.files.some((file) => file.path === 'collections/index.html'));
  for (const file of catalogue.files) {
    const output = first.files.find((item) => item.path === 'assets/workshop/' + file.path);
    assert.deepEqual(output.data, file.data);
  }
  const metadata = first.files.find((file) => /\/catalogue\.[a-f0-9]{64}\.json$/.test(file.path));
  assert.ok(metadata, 'metadata uses a full content-derived filename');
  assert.deepEqual(JSON.parse(metadata.data), catalogue.manifest);
});
test('shelf is script-free, links only to same-origin resources and explains explicit import', () => {
  const { manifest } = loadCatalogue(root);
  const html = renderShelf(manifest, 'collections.0123456789ab.css');
  assert.doesNotMatch(html, /<script\b|<iframe\b|\bon\w+\s*=|https?:\/\//i);
  assert.match(html, /default-src 'none'/);
  assert.match(html, /A download is not an installation/);
  assert.match(html, /Choose a JSON pack/);
  assert.match(html, /connection/);
  assert.match(html, /provisional/i);
  assert.match(html, /contain solutions/);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  for (const entry of manifest.collections) {
    assert.ok(html.includes(`href="../assets/workshop/${entry.download}"`));
    assert.ok(html.includes(`download="${entry.id}.json"`));
  }
});
test('authored titles and descriptions render as text without executable markup', () => {
  const { manifest } = loadCatalogue(root);
  const poison = '<img src=x onerror="alert(1)"> & \'quoted\'';
  manifest.collections[0].title = poison;
  manifest.collections[0].description = '</p><script>alert(2)</script>';
  const before = JSON.stringify(manifest);
  const html = renderShelf(manifest, 'collections.0123456789ab.css');
  assert.doesNotMatch(html, /<img\b|<script\b/i);
  assert.match(html, /&lt;img src=x onerror=&quot;/);
  assert.match(html, /&lt;\/p&gt;&lt;script&gt;/);
  assert.equal(JSON.stringify(manifest), before);
});
test('unsafe or unbound download and stylesheet paths are refused', () => {
  for (const download of [
    '//evil.test/pack.json',
    '../x.json',
    'javascript:alert(1)',
    'other.json',
  ]) {
    const { manifest } = loadCatalogue(root);
    manifest.collections[0].download = download;
    assert.throws(() => renderShelf(manifest, 'collections.0123456789ab.css'), /identity/);
  }
  assert.throws(() => renderShelf(loadCatalogue(root).manifest, '../evil.css'), /stylesheet/);
});
test('rendering reads no puzzle solutions or notebook fields from the public projection', () => {
  const { manifest } = loadCatalogue(root);
  for (const entry of manifest.collections)
    for (const field of ['puzzles', 'solution', 'notes']) {
      Object.defineProperty(entry, field, {
        get() {
          throw Error('private field read');
        },
      });
    }
  assert.ok(renderShelf(manifest, 'collections.0123456789ab.css').includes('Lattice'));
});
test('a broken source refuses shelf generation without touching an existing output', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-shelf-build-'));
  try {
    fs.mkdirSync(path.join(temp, 'content/workshop'), { recursive: true });
    fs.mkdirSync(path.join(temp, 'dist/collections'), { recursive: true });
    fs.writeFileSync(path.join(temp, 'content/workshop/catalogue.json'), '{');
    const previous = path.join(temp, 'dist/collections/index.html');
    fs.writeFileSync(previous, 'previous reviewed page');
    assert.throws(() => buildShelf(temp), /JSON/);
    assert.equal(fs.readFileSync(previous, 'utf8'), 'previous reviewed page');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('entry composition changes only pack-desk copy and fails on unknown source boundaries', () => {
  const { composePackDesk } = require('../tools/workshop-entry.cjs');
  const source = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  const start = source.indexOf('  function packDesk() {');
  const end = source.indexOf('  function authorGuide()', start);
  const compiled = composePackDesk(source);
  assert.equal(compiled.slice(0, start), source.slice(0, start));
  assert.ok(compiled.endsWith(source.slice(end)));
  assert.equal((compiled.match(/Browse optional collections/g) || []).length, 1);
  assert.throws(
    () => composePackDesk(source.replace('  function packDesk() {', '  function changed() {')),
    /boundary/,
  );
  assert.throws(() => composePackDesk(source.replace('Maximum 3 MB', 'Maximum 9 MB')), /copy/);
  assert.throws(() => composePackDesk(compiled), /copy/);
});
