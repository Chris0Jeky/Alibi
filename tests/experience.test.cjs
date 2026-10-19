'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
test('Optional field-notes exports stay outside the core shell and retain a bounded independent pack', () => {
  const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json')));
  assert.equal(
    info.uncompressedBytes,
    info.coreOfflineBytes +
      info.quietWingBytes +
      info.castleBytes +
      info.experienceBytes +
      info.ambienceBytes +
      info.enhancementBytes +
      info.observatoryBytes +
      info.discoveryStorageBytes +
      info.blockMotionBytes +
      info.houseBytes +
      info.workshopCollectionBytes,
  );
  assert.ok(info.experienceBytes < 30 * 1024 * 1024);
  assert.ok(info.experienceOfflineBytes < 9 * 1024 * 1024);
  const sw = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
  assert.ok(!sw.includes('./assets/folio-'), 'No folio downloads at service-worker installation');
  const files = fs.readdirSync(path.join(dist, 'assets'));
  assert.equal(files.filter((f) => /^folio-.*\.glb$/.test(f)).length, 46);
  assert.equal(files.filter((f) => /^folio-.*\.mp4$/.test(f)).length, 8);
  assert.equal(files.filter((f) => /^folio-.*\.ogg$/.test(f)).length, 24);
  assert.ok(
    files.every((f) => !/\.(blend|wav|py)$/.test(f)),
    'No production masters in the distribution',
  );
  const js = fs.readFileSync(
    path.join(
      dist,
      'assets',
      files.find((f) => /^alibi\..*\.js$/.test(f)),
    ),
    'utf8',
  );
  const assignment = js.match(/globalThis\.ALIBI_QUIET_CONFIG=(.*);\n/);
  assert.ok(assignment, 'A static Quiet Wing configuration is emitted');
  const quiet = JSON.parse(assignment[1]);
  assert.equal(
    quiet.files.filter((f) => /folio-.*-room\./.test(f)).length,
    4,
    'Room headings accompany the regular offline wing',
  );
  assert.ok(
    quiet.files.every((f) => !/\.(mp4|ogg|glb)$/.test(f) || /quiet-pet-/.test(f)),
    'Larger field notes remain a deliberate download',
  );
});
test('Authored companions emit their named states', () => {
  const files = fs.readdirSync(path.join(dist, 'assets'));
  const activity = fs.readFileSync(
    path.join(
      dist,
      'assets',
      files.find((f) => /^quiet-activity\..*\.js$/.test(f)),
    ),
    'utf8',
  );
  const marker = 'globalThis.QWExperience=';
  const at = activity.indexOf(marker);
  assert.ok(at >= 0, 'Quiet activity emits the experience manifest');
  let end = at + marker.length;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (; end < activity.length; end++) {
    const c = activity[end];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        end++;
        break;
      }
    }
  }
  const manifest = activity.slice(at + marker.length, end);
  assert.equal(depth, 0, 'Quiet activity emits the experience manifest');
  // Pinned from emitted SVG names, not catalogue metadata.
  const states = (id) => {
    const idAt = manifest.indexOf(`id:"${id}"`);
    if (idAt < 0) return [];
    const statesAt = manifest.indexOf('states:{', idAt);
    const nextId = manifest.indexOf('id:"', idAt + 1);
    if (statesAt < 0 || (nextId >= 0 && statesAt > nextId)) return [];
    const body = manifest.slice(statesAt + 'states:{'.length, manifest.indexOf('}', statesAt));
    return [...body.matchAll(/(?:"([A-Za-z]+)"|([A-Za-z]+))\s*:/g)].map(
      (match) => match[1] || match[2],
    );
  };
  assert.deepEqual(
    states('cat'),
    ['idle', 'look', 'attention', 'happy', 'sleepy', 'pet', 'feed', 'celebrate'],
    'cat',
  );
  assert.deepEqual(
    states('fox'),
    ['idle', 'look', 'attention', 'happy', 'sleepy', 'pet', 'feed', 'celebrate'],
    'fox',
  );
  assert.deepEqual(
    states('owl'),
    ['idle', 'look', 'attention', 'happy', 'sleepy', 'pet', 'feed', 'celebrate'],
    'owl',
  );
  assert.deepEqual(
    states('dragon'),
    ['idle', 'look', 'attention', 'happy', 'sleepy', 'pet', 'feed', 'celebrate'],
    'dragon',
  );
});
