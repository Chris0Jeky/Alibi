'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadWorker() {
  const file = fs
    .readdirSync('dist/assets')
    .find((name) => /^validator\.[a-f0-9]+\.js$/.test(name));
  assert.ok(file, 'built validation worker exists');
  const results = [];
  const context = { console, setTimeout, clearTimeout, TextEncoder, TextDecoder, URL };
  context.self = context;
  context.postMessage = (value) => results.push(value);
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('dist/assets/' + file, 'utf8'), context, { timeout: 5000 });
  return { context, results };
}

function send(context, results, message) {
  context.onmessage({ data: message });
  return results.at(-1);
}

// Values built inside the vm realm carry that realm's prototypes, which
// deepStrictEqual rejects. Normalize through JSON before comparing.
function norm(value) {
  return JSON.parse(JSON.stringify(value));
}

function cabinetBackup(overrides = {}) {
  return {
    format: 'alibi-backup',
    schemaVersion: 1,
    runs: [],
    packs: [],
    settings: {},
    preferences: { seen: [], favorites: [] },
    ...overrides,
  };
}

function clubSave(overrides = {}) {
  return {
    schema: 1,
    settings: { assist: 'off', zen: false, pinned: null },
    visit: 0,
    lastHero: -1,
    runs: {},
    records: [],
    stamps: [],
    ...overrides,
  };
}

function combinedBackup({ cabinet, club } = {}) {
  return {
    format: 'alibi-all-saves',
    schema: 1,
    manifest: ['cabinet', 'club'],
    sections: {
      cabinet: cabinet ?? cabinetBackup(),
      club: club ?? clubSave(),
    },
    warnings: ['Quiet Wing was not included: export it separately when available.'],
  };
}

test('combined backup returns sanitized sections with unknown keys stripped', () => {
  const { context, results } = loadWorker();
  const cabinet = cabinetBackup({
    settings: { timer: true, theme: 'light', unknownKey: true },
    preferences: { seen: ['scene', 'bogus-seen'], favorites: [] },
  });
  const combined = combinedBackup({ cabinet });
  const result = send(context, results, {
    type: 'combined-backup',
    text: JSON.stringify(combined),
  });
  assert.equal(result.ok, true, result.error);
  assert.equal(result.value.sections.cabinet.settings.unknownKey, undefined);
  assert.deepEqual(norm(result.value.sections.cabinet.settings), { timer: true, theme: 'light' });
  assert.deepEqual(norm(result.value.sections.cabinet.preferences.seen), ['scene']);
});

test('combined backup accepts the same sections in any manifest order', () => {
  const { context, results } = loadWorker();
  const combined = combinedBackup();
  combined.manifest = ['club', 'cabinet'];
  combined.sections = { club: combined.sections.club, cabinet: combined.sections.cabinet };
  const result = send(context, results, {
    type: 'combined-backup',
    text: JSON.stringify(combined),
  });
  assert.equal(result.ok, true, result.error);
  assert.deepEqual(norm(result.value.manifest), ['club', 'cabinet']);
});

test('combined backup rejects unknown manifest keys', () => {
  const { context, results } = loadWorker();
  const unknownManifest = combinedBackup();
  unknownManifest.manifest = ['cabinet', 'club', 'bogus'];
  unknownManifest.sections.bogus = {};
  const manifestResult = send(context, results, {
    type: 'combined-backup',
    text: JSON.stringify(unknownManifest),
  });
  assert.equal(manifestResult.ok, false);
  assert.equal(
    manifestResult.error,
    'Unknown combined backup. The file and all device saves are unchanged.',
  );

  const extraSection = combinedBackup();
  extraSection.sections.bogus = {};
  const sectionResult = send(context, results, {
    type: 'combined-backup',
    text: JSON.stringify(extraSection),
  });
  assert.equal(sectionResult.ok, false);
  assert.equal(
    sectionResult.error,
    'Unknown combined backup. The file and all device saves are unchanged.',
  );
});

test('cabinet text over 16 MB is rejected with the safety-limit message', () => {
  const { context, results } = loadWorker();
  const text = JSON.stringify(cabinetBackup()) + ' '.repeat(16 * 1024 * 1024 + 1);
  assert.ok(text.length > 16 * 1024 * 1024);
  const result = send(context, results, { type: 'cabinet-backup', text });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'Backup exceeds the 16 MB safety limit.');
});

test('club text over 1 MB is rejected with the club-limit message', () => {
  const { context, results } = loadWorker();
  const text = JSON.stringify(clubSave()) + ' '.repeat(1024 * 1024 + 1);
  assert.ok(text.length > 1024 * 1024);
  const result = send(context, results, { type: 'club-backup', text });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'Club backup exceeds the import limit.');
});

test('valid combined, cabinet and club inputs return unchanged values', () => {
  const { context, results } = loadWorker();
  const combined = combinedBackup();
  const combinedResult = send(context, results, {
    type: 'combined-backup',
    text: JSON.stringify(combined),
  });
  assert.equal(combinedResult.ok, true, combinedResult.error);
  assert.deepEqual(norm(combinedResult.value), combined);
  assert.deepEqual(norm(combinedResult.value.manifest), combined.manifest);
  assert.deepEqual(norm(combinedResult.value.warnings), combined.warnings);

  const cabinet = cabinetBackup();
  const cabinetResult = send(context, results, {
    type: 'cabinet-backup',
    text: JSON.stringify(cabinet),
  });
  assert.equal(cabinetResult.ok, true, cabinetResult.error);
  assert.deepEqual(norm(cabinetResult.value), cabinet);

  const club = clubSave();
  const clubResult = send(context, results, { type: 'club-backup', text: JSON.stringify(club) });
  assert.equal(clubResult.ok, true, clubResult.error);
  assert.deepEqual(norm(clubResult.value), club);
});

function officialWorkerFixture() {
  const source = require('../tools/official-catalogue.cjs').load(process.cwd(), false);
  const baseline = require('../content/curation/editorial/interlock-baseline.json');
  const previous = baseline.packs.flatMap(
    (file) => JSON.parse(fs.readFileSync('content/' + file)).puzzles,
  );
  return { source, previous };
}

test('compiled worker preserves every official ID in source order', () => {
  const { context } = loadWorker();
  const { source, previous } = officialWorkerFixture();
  assert.deepEqual(norm(context.ALIBI_CATALOG), {
    puzzles: source.puzzles.map((puzzle) => ({ id: puzzle.id })),
  });
  assert.equal(previous.length, 510);
  assert.deepEqual(
    norm(context.ALIBI_CATALOG.puzzles.slice(0, previous.length)),
    previous.map((puzzle) => ({ id: puzzle.id })),
  );
});

for (const type of ['cabinet-backup', 'combined-backup']) {
  test(`${type} rejects old, initial and deferred official-ID collisions`, () => {
    const { context, results } = loadWorker();
    const { source } = officialWorkerFixture();
    const ids = [
      source.puzzles[0].id,
      require('../content/extra/interlock-gardens.json').puzzles[0].id,
      require('../content/extra/interlock-routes.json').puzzles[0].id,
    ];
    const sendPack = (id) => {
      const puzzle = { ...source.puzzles[0], id };
      const cabinet = cabinetBackup({
        packs: [
          {
            schemaVersion: 1,
            version: 1,
            id: 'worker-contract-pack',
            title: 'Worker contract',
            puzzles: [puzzle],
          },
        ],
      });
      const value = type === 'cabinet-backup' ? cabinet : combinedBackup({ cabinet });
      return send(context, results, { type, text: JSON.stringify(value) });
    };
    const valid = sendPack('worker-contract-custom');
    assert.equal(valid.ok, true, valid.error);
    for (const id of ids) {
      const result = sendPack(id);
      assert.equal(result.ok, false, id);
      assert.equal(result.error, 'A custom pack collides with the starter catalogue.', id);
    }
  });
}
