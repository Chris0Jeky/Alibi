'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { buildShelf } = require('../tools/build-workshop-shelf.cjs');
const root = path.resolve(__dirname, '..');
const metadata = (shelf) => shelf.files.find((file) => /\/catalogue[.]/.test(file.path));
const downloads = (shelf) =>
  shelf.files.filter((file) => /\/(afterlight|lattice)[.]/.test(file.path));

function temporarySource(run) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-catalogue-cache-'));
  try {
    fs.cpSync(path.join(root, 'content'), path.join(temp, 'content'), { recursive: true });
    fs.mkdirSync(path.join(temp, 'src'));
    fs.copyFileSync(
      path.join(root, 'src/workshop-collections.css'),
      path.join(temp, 'src/workshop-collections.css'),
    );
    return run(temp);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

test('immutable catalogue URL binds all emitted metadata bytes, not a stable alias', () => {
  const shelf = buildShelf(root);
  const file = metadata(shelf);
  assert.ok(file);
  const digest = createHash('sha256').update(file.data).digest('hex');
  assert.equal(file.path, `assets/workshop/catalogue.${digest}.json`);
  assert.ok(!shelf.files.some((entry) => entry.path === 'assets/workshop/catalogue.json'));
  assert.deepEqual(metadata(buildShelf(root)), file, 'unchanged bytes keep the exact URL');
  assert.equal(shelf.files.length, 5, 'no stale alias or extra download is emitted');
  assert.equal(
    shelf.bytes,
    shelf.files.reduce((sum, entry) => sum + entry.data.length, 0),
  );
});

test('a description-only release changes catalogue identity without rewriting accepted packs', () => {
  temporarySource((temp) => {
    const first = buildShelf(temp);
    const source = path.join(temp, 'content/workshop/catalogue.json');
    const policy = JSON.parse(fs.readFileSync(source, 'utf8'));
    policy.collections[0].description += ' A new editorial description.';
    fs.writeFileSync(source, JSON.stringify(policy));
    const second = buildShelf(temp);
    assert.notDeepEqual(metadata(first).data, metadata(second).data);
    assert.notEqual(
      metadata(first).path,
      metadata(second).path,
      'old immutable bytes get no new role',
    );
    assert.deepEqual(
      downloads(second),
      downloads(first),
      'pack filenames and bytes stay unchanged',
    );
  });
});

test('stylesheet changes do not spuriously invalidate unchanged catalogue metadata', () => {
  temporarySource((temp) => {
    const first = buildShelf(temp);
    fs.appendFileSync(path.join(temp, 'src/workshop-collections.css'), '\nbody{padding:7px}\n');
    const second = buildShelf(temp);
    assert.deepEqual(metadata(second), metadata(first));
    assert.notEqual(
      first.files.find((file) => file.path.endsWith('.css')).path,
      second.files.find((file) => file.path.endsWith('.css')).path,
    );
    assert.deepEqual(downloads(second), downloads(first));
  });
});
