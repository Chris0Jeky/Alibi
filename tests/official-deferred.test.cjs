'use strict';
// Registry-deferred official definitions: listing entries at startup, one precached chunk later.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'dist/assets');
const names = fs.readdirSync(assets);
const one = (pattern) => {
  const found = names.filter((name) => pattern.test(name));
  assert.equal(found.length, 1, `exactly one ${pattern} asset`);
  return fs.readFileSync(path.join(assets, found[0]), 'utf8');
};
const initial = one(/^official-content\.[a-f0-9]{12}\.js$/);
const deferred = one(/^official-deferred\.[a-f0-9]{12}\.js$/);
const registry = JSON.parse(fs.readFileSync(path.join(root, 'content/official-packs.json')));
const { load, partition } = require('../tools/official-catalogue.cjs');
const content = require('../tools/build-official-content.cjs');

function startup(extra = {}) {
  const context = { ...extra };
  vm.runInNewContext(initial, context, { timeout: 2000 });
  return context;
}

test('registry defers exactly the four Vault packs, all of which stay registered', () => {
  assert.deepEqual(registry.deferred, [
    'extra/vault-binary.json',
    'extra/vault-sudoku.json',
    'extra/vault-lightup.json',
    'extra/vault-futoshiki.json',
  ]);
  for (const file of registry.deferred) assert.ok(registry.packs.includes(file));
  const { catalog, deferred: keys } = partition(root, false);
  assert.equal(keys.size, 80);
  assert.equal(JSON.stringify(catalog), JSON.stringify(load(root, false)));
});

test('a deferred path outside the registered packs fails the build', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-deferred-'));
  try {
    fs.mkdirSync(path.join(temp, 'content'));
    for (const deferredList of [['extra/not-registered.json'], ['catalog.json', 'catalog.json']]) {
      fs.writeFileSync(
        path.join(temp, 'content/official-packs.json'),
        JSON.stringify({ schemaVersion: 1, packs: ['catalog.json'], deferred: deferredList }),
      );
      assert.throws(() => partition(temp), /Deferred official packs/);
      assert.throws(() => load(temp), /Deferred official packs/);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('startup carries listing entries only and reads no definition fields', () => {
  const context = startup();
  const marker = context.ALIBI_DEFERRED;
  assert.equal(marker.ready, false);
  assert.match(marker.url, /^\.\/assets\/official-deferred\.[a-f0-9]{12}\.js$/);
  assert.equal(marker.keys.length, 80);
  const listed = context.ALIBI_CATALOG.puzzles.filter((p) => marker.has(p));
  assert.equal(listed.length, 80);
  for (const entry of listed) {
    assert.deepEqual(
      Object.keys(entry).filter((key) => !content.LISTING_FIELDS.includes(key)),
      [],
      `${entry.id} is a listing entry`,
    );
    for (const key of ['id', 'revision', 'type', 'title', 'subtitle', 'difficulty', 'size'])
      assert.ok(entry[key] !== undefined, `${entry.id} keeps ${key}`);
  }
});

test('initial plus deferred scripts reproduce the full official catalogue exactly', () => {
  const context = startup();
  const listed = context.ALIBI_CATALOG.puzzles.filter((p) => context.ALIBI_DEFERRED.has(p));
  vm.runInNewContext(deferred, context, { timeout: 2000 });
  assert.equal(context.ALIBI_DEFERRED.ready, true);
  assert.equal(JSON.stringify(context.ALIBI_CATALOG), JSON.stringify(load(root, false)));
  // In-place swap: references held before the chunk arrived now see full definitions.
  for (const entry of listed) {
    assert.ok(Array.isArray(entry.solution), `${entry.id} gained its definition`);
    assert.equal(context.ALIBI_DEFERRED.has(entry), false);
  }
  const snapshot = JSON.stringify(context.ALIBI_CATALOG);
  vm.runInNewContext(deferred, context, { timeout: 2000 });
  assert.equal(JSON.stringify(context.ALIBI_CATALOG), snapshot, 'a second load is a no-op');
});

test('a tampered listing entry fails closed and swaps nothing', () => {
  for (const tamper of [
    (p) => (p.find((x) => x.id === 'vault-futoshiki-20').title = 'Forged'),
    (p) => (p.find((x) => x.id === 'vault-binary-01').revision = 2),
    (p) => (p.find((x) => x.id === 'vault-lightup-07').extra = 1),
    (p) => delete p.find((x) => x.id === 'vault-sudoku-11').subtitle,
    (p) =>
      p.splice(
        p.findIndex((x) => x.id === 'vault-sudoku-05'),
        1,
      ),
    (p) => {
      const i = p.findIndex((x) => x.id === 'vault-binary-02');
      [p[i], p[i + 1]] = [p[i + 1], p[i]];
    },
  ]) {
    const context = startup();
    tamper(context.ALIBI_CATALOG.puzzles);
    const before = JSON.stringify(context.ALIBI_CATALOG);
    assert.throws(
      () => vm.runInNewContext(deferred, context, { timeout: 2000 }),
      /do(es)? not match/,
    );
    assert.equal(context.ALIBI_DEFERRED.ready, false);
    assert.equal(JSON.stringify(context.ALIBI_CATALOG), before, 'no partial swap');
  }
  const context = startup();
  context.ALIBI_DEFERRED.keys.pop();
  assert.throws(() => vm.runInNewContext(deferred, context), /do(es)? not match/);
});

test('ensure() injects the same-origin chunk once, rejects on failure and can retry', async () => {
  const appended = [];
  let loadHandler = null;
  const document = {
    createElement: () => ({
      remove() {
        this.removed = true;
      },
    }),
    head: { append: (node) => appended.push(node) },
  };
  const context = startup({
    document,
    addEventListener: (type, fn) => type === 'load' && (loadHandler = fn),
    setTimeout: (fn) => fn(),
  });
  const marker = context.ALIBI_DEFERRED;
  assert.equal(typeof loadHandler, 'function', 'an idle kick is scheduled after load');
  const first = marker.ensure();
  assert.equal(marker.ensure(), first, 'concurrent callers share one request');
  assert.equal(appended.length, 1);
  assert.equal(appended[0].src, marker.url);
  appended[0].onerror();
  await assert.rejects(first, /did not load/);
  assert.equal(appended[0].removed, true);
  const second = marker.ensure();
  assert.equal(appended.length, 2, 'a retry injects a fresh element');
  vm.runInNewContext(deferred, context);
  appended[1].onload();
  await second;
  assert.equal(marker.ready, true);
  await marker.ensure();
  assert.equal(appended.length, 2, 'ready content is never fetched again');
  // A chunk that loads but does not validate is still a failure.
  const tampered = startup({ document, addEventListener() {} });
  tampered.ALIBI_CATALOG.puzzles.find((p) => p.id === 'vault-sudoku-01').title = 'Forged';
  const failed = tampered.ALIBI_DEFERRED.ensure();
  assert.throws(() => vm.runInNewContext(deferred, tampered), /do(es)? not match/);
  appended.at(-1).onload();
  await assert.rejects(failed, /did not load/);
});

test('standalone file inlines the deferred chunk after the content and before the app', () => {
  const html = fs.readFileSync(path.join(root, 'alibi-deluxe-play.html'), 'utf8');
  const contentAt = html.indexOf(initial.trim()),
    deferredAt = html.indexOf(deferred.trim()),
    appAt = html.indexOf('globalThis.ALIBI_CONFIG={');
  assert.ok(contentAt > 0, 'initial content is inlined');
  assert.ok(deferredAt > contentAt, 'deferred chunk follows the listing');
  assert.ok(appAt > deferredAt, 'the swap happens before the application starts');
});

test('the application refuses to create a run from a listing entry', () => {
  const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  const start = app.indexOf('  function getRun(p) {'),
    end = app.indexOf('  function saveLabel()', start);
  assert.ok(start > 0 && end > start);
  const records = new Map(),
    revs = new Map();
  const context = startup({ records, revs, E: { sudoku: { initial: () => ({}) } } });
  context.C = { clone: (v) => JSON.parse(JSON.stringify(v)) };
  context.keyFor = (p) => p.id + '@' + p.revision;
  context.deferred = context.ALIBI_DEFERRED;
  vm.runInContext(app.slice(start, end), context);
  const entry = context.ALIBI_CATALOG.puzzles.find((p) => p.id === 'vault-sudoku-01');
  assert.throws(() => context.getRun(entry), /not loaded/);
  assert.equal(records.size, 0, 'no save is created');
  vm.runInContext(deferred, context);
  assert.equal(context.getRun(entry).puzzle.solution.length, 81);
  assert.equal(records.size, 1);
  // Play waits for the chunk only when no saved copy is pinned, and never runs on a listing.
  assert.match(app, /if \(!pinned && deferred\?\.has\(catalog\)\) \{\s+await deferred\.ensure\(\)/);
  assert.match(app, /catalog && !late &&/);
});
