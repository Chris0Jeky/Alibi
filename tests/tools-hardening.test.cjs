'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');

const { mergeDetails } = require('../tools/assets/catalogue.cjs');
const { inline } = require('../tools/render-guide.cjs');

function validDetail() {
  return {
    assets: [{ id: 'detail-1', derivatives: ['a.glb'] }],
    master: { derivatives: ['b.glb'] },
  };
}

test('mergeDetails merges master derivatives into the first asset', () => {
  const detail = validDetail();
  const merged = mergeDetails(detail.assets, detail, 'details');
  assert.equal(merged, detail.assets);
  assert.deepEqual(detail.assets[0].derivatives, ['a.glb', 'b.glb']);
});

test('mergeDetails rejects malformed details catalogues', () => {
  assert.throws(
    () => mergeDetails([], { master: { derivatives: [] } }, 'empty'),
    /Invalid details catalogue/,
  );
  assert.throws(
    () => mergeDetails([{}], { master: { derivatives: [] } }, 'no-derivatives'),
    /Invalid details catalogue/,
  );
  assert.throws(
    () => mergeDetails([{ derivatives: [] }], {}, 'no-master'),
    /Invalid details catalogue/,
  );
  assert.throws(
    () => mergeDetails([{ derivatives: [] }], { master: {} }, 'master-no-derivatives'),
    /Invalid details catalogue/,
  );
});

test('requiring the curation snapshotter creates no bundle directory', () => {
  const curation = path.join(ROOT, 'alibi-curation');
  const before = new Set(fs.existsSync(curation) ? fs.readdirSync(curation) : []);
  const snapshotter = path.join(ROOT, 'tools', 'update-curation-bundle.cjs');
  delete require.cache[snapshotter];
  try {
    assert.doesNotThrow(() => require(snapshotter));
    const after = fs.existsSync(curation) ? fs.readdirSync(curation) : [];
    assert.deepEqual(
      after.filter((name) => name.startsWith('integrated-') && !before.has(name)),
      [],
    );
  } finally {
    if (fs.existsSync(curation))
      for (const name of fs.readdirSync(curation))
        if (name.startsWith('integrated-') && !before.has(name))
          fs.rmSync(path.join(curation, name), { recursive: true, force: true });
  }
});

test('required snapshotter copy tolerates a missing build-info.json', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-snapshotter-'));
  try {
    const toolDir = path.join(fixture, 'tools');
    fs.mkdirSync(toolDir, { recursive: true });
    const copy = path.join(toolDir, 'update-curation-bundle.cjs');
    fs.copyFileSync(path.join(ROOT, 'tools', 'update-curation-bundle.cjs'), copy);
    assert.doesNotThrow(() => require(copy));
    const curated = path.join(fixture, 'alibi-curation');
    assert.equal(fs.existsSync(curated), false);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('guide links keep relative, anchor, root and http(s) URLs', () => {
  assert.equal(
    inline('[x](https://example.com/guide)'),
    '<a href="https://example.com/guide">x</a>',
  );
  assert.equal(inline('[x](http://example.com/guide)'), '<a href="http://example.com/guide">x</a>');
  assert.equal(inline('[x](/docs/guide.html)'), '<a href="/docs/guide.html">x</a>');
  assert.equal(inline('[x](#section)'), '<a href="#section">x</a>');
  assert.equal(inline('[x](guide/page.html)'), '<a href="guide/page.html">x</a>');
});

test('guide links reject unsafe URL schemes', () => {
  // Exact-output pin uses a paren-free URL: the link regex predates this
  // filter and leaves a trailing ')' visible for URLs containing parens
  // (old code emitted the same stray paren after its anchor).
  assert.equal(inline('[x](javascript:alert)'), 'x');
  assert.ok(!inline('[x](javascript:alert(1))').includes('href'));
  assert.ok(!inline('[x](data:text/html,hi)').includes('href'));
  assert.ok(!inline('[x](vbscript:msgbox(1))').includes('href'));
});
