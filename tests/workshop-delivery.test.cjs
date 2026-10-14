'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { buildShelf } = require('../tools/build-workshop-shelf.cjs');
const { payloadDigest, readIdentity } = require('../tools/platform-identity.cjs');
const root = path.resolve(__dirname, '..'),
  dist = path.join(root, 'dist');
const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json')));
const expected = buildShelf(root);
const names = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory() ? names(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
    );

test('all optional shelf files are emitted byte-for-byte and excluded from core precache', () => {
  const sw = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
  const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const actual = [
    ...names(path.join(dist, 'assets/workshop')),
    ...names(path.join(dist, 'collections')),
  ].map((file) => path.relative(dist, file).split(path.sep).join('/'));
  assert.deepEqual(actual.sort(), expected.files.map((file) => file.path).sort());
  for (const file of expected.files) {
    assert.deepEqual(fs.readFileSync(path.join(dist, file.path)), file.data);
    assert.ok(!sw.includes('./' + file.path), 'shelf files are not core precache assets');
    assert.ok(!index.includes(file.path), 'nothing in the shelf is a startup dependency');
  }
});
test('optional bytes are counted once in delivery and never hidden from totals', () => {
  const actualTotal = names(dist).reduce((sum, file) => sum + fs.statSync(file).size, 0);
  assert.equal(info.uncompressedBytes, actualTotal);
  assert.equal(info.workshopCollectionBytes, expected.bytes);
  const separate = [
    'quietWingBytes',
    'castleBytes',
    'experienceBytes',
    'enhancementBytes',
    'ambienceBytes',
    'observatoryBytes',
    'discoveryStorageBytes',
    'blockMotionBytes',
    'houseBytes',
    'workshopCollectionBytes',
  ];
  assert.equal(
    info.coreOfflineBytes,
    actualTotal - separate.reduce((sum, key) => sum + info[key], 0),
  );
  assert.equal(info.puzzles, 510, 'the official registry is not enlarged');
});
test('optional data and stylesheet bytes belong to the complete runtime payload identity', () => {
  assert.equal(readIdentity(dist).identity.payloadSha256, payloadDigest(dist));
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-shelf-identity-'));
  try {
    const file = expected.files.find(
      (entry) => entry.path.endsWith('.json') && entry.path.includes('afterlight'),
    );
    const target = path.join(temp, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.data);
    const before = payloadDigest(temp);
    const changed = Buffer.from(file.data);
    changed[12] ^= 1;
    fs.writeFileSync(target, changed);
    assert.notEqual(payloadDigest(temp), before);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
test('pack desk links only supported browser targets and retains the same importer', () => {
  const app = require('../tools/workshop-entry.cjs').composePackDesk(
    fs.readFileSync(path.join(root, 'src/app.js'), 'utf8'),
  );
  const source = app.slice(
    app.indexOf('  function packDesk()'),
    app.indexOf('  function authorGuide()'),
  );
  for (const target of [undefined, 'standalone', 'android', 'future-native']) {
    const context = vm.createContext({
      ALIBI_BUILD_TARGET: target,
      icon: () => '',
      B: (label, action) => `<button data-action="${action}">${label}</button>`,
      C: { TYPES: [] },
      packs: [{}],
      all: () => [],
      starter: { puzzles: [] },
    });
    vm.runInContext(source + '\nthis.html=packDesk();', context);
    assert.match(context.html, /data-action="import-pack"/);
    if (target === undefined) {
      assert.match(context.html, /href="\.\/collections\/index\.html"/);
      assert.match(context.html, /target="_blank" rel="noopener"/);
    } else assert.doesNotMatch(context.html, /collections\/index\.html/);
  }
});

test('Android payload indexes preserve every optional file even while native discovery is hidden', () => {
  const android = path.join(root, 'dist-android');
  const manifest = JSON.parse(fs.readFileSync(path.join(android, 'android-assets.json')));
  const digest = (data) => require('node:crypto').createHash('sha256').update(data).digest('hex');
  for (const file of expected.files) {
    const entry = manifest.files.find((item) => item.path === file.path);
    assert.ok(entry, `Android index must account for ${file.path}`);
    assert.equal(entry.bytes, file.data.length);
    assert.equal(entry.sha256, digest(file.data));
    assert.deepEqual(fs.readFileSync(path.join(android, file.path)), file.data);
  }
  assert.equal(readIdentity(android).identity.payloadSha256, payloadDigest(android));
});
