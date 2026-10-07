'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

require('../src/origin-transfer.js');
const transfer = globalThis.AlibiOriginTransfer;
const root = path.join(__dirname, '..');

function sample() {
  return {
    cabinet: {
      format: 'alibi-backup',
      schemaVersion: 1,
      runs: [{ key: 'sudoku-01@1', rev: 2, note: 'kept' }],
      packs: [{ id: 'local-pack' }],
      settings: { theme: 'night' },
      preferences: { seen: ['sudoku'], favorites: ['sudoku-01'] },
    },
    club: {
      schema: 1,
      settings: { assist: 'off', zen: false, pinned: null },
      runs: { archive: { level: 1, log: ['up'], redo: [] } },
      records: [{ id: 'rec-1', type: 'archive', label: 'Room', score: 3, date: '2026-01-01' }],
      stamps: ['zen'],
      visit: 4,
      lastHero: 1,
    },
    quiet: {
      kind: 'alibi-quiet-wing-backup',
      schema: 1,
      state: { schema: 1, revision: 3, scene: { name: 'north-room' } },
    },
    castle: {
      format: 'alibi-castle',
      version: 1,
      scope: 'Wrenmere Chapter I only',
      state: { revision: 4, notes: 'the gatehouse key' },
      mode: 'local',
      record: {
        schema: 1,
        revision: 4,
        state: { revision: 4, notes: 'the gatehouse key' },
      },
    },
    challenges: {
      format: 'alibi-challenges',
      schema: 1,
      runs: [
        {
          id: 'hanoi-01',
          schema: 1,
          revision: 2,
          run: { format: 'alibi-challenge-run', schema: 1, challengeId: 'hanoi-01', log: ['a'] },
        },
      ],
    },
  };
}

function other() {
  const saved = sample();
  saved.cabinet = {
    format: 'alibi-backup',
    schemaVersion: 1,
    runs: [{ key: 'other@1', rev: 1 }],
    packs: [],
    settings: {},
    preferences: { seen: [], favorites: [] },
  };
  saved.club = {
    schema: 1,
    settings: { assist: 'candidates', zen: true, pinned: null },
    runs: {},
    records: [],
    stamps: [],
    visit: 9,
    lastHero: -1,
  };
  saved.quiet = { kind: 'alibi-quiet-wing-backup', schema: 1, state: null };
  saved.castle = {
    format: 'alibi-castle',
    version: 1,
    scope: 'Wrenmere Chapter I only',
    state: { revision: 1, notes: 'local only' },
    mode: 'local',
    record: null,
  };
  saved.challenges = { format: 'alibi-challenges', schema: 1, runs: [] };
  return saved;
}

function memoryPorts(initial, options = {}) {
  const data = structuredClone(initial);
  let recovery = null;
  let writes = 0;
  let failed = false;
  return {
    reads: 0,
    retains: 0,
    writeCount: () => writes,
    recovery: () => recovery,
    async read(name) {
      this.reads += 1;
      return structuredClone(data[name]);
    },
    async write(name, value) {
      writes += 1;
      if (options.failOnWrite === writes && !failed) {
        failed = true;
        throw Error('disk failed');
      }
      assert.ok(recovery, 'a recovery copy exists before any write');
      assert.deepEqual(recovery[name] === undefined ? recovery : recovery, recovery);
      data[name] = structuredClone(value);
    },
    async retain(snapshot) {
      this.retains += 1;
      assert.equal(writes, 0);
      recovery = structuredClone(snapshot);
    },
    async release() {
      recovery = null;
    },
    snapshot() {
      return structuredClone(data);
    },
  };
}

async function fileFor(saves, patch) {
  const exported = await transfer.exportOriginTransfer(saves);
  const next = patch ? patch(exported) : exported;
  return JSON.stringify(next);
}

test('export then confirmed import deep-equals cabinet, Club, Quiet Wing, castle and challenges', async () => {
  const origin = sample();
  const text = await fileFor(origin);
  const ports = memoryPorts(other());
  const validated = await transfer.validateOriginTransfer(text);
  assert.deepEqual(transfer.previewOriginTransfer(validated), [
    'Cabinet: 1 saved puzzle, 1 custom pack',
    'Club: 1 game, 1 record',
    'Quiet Wing: included',
    'Castle: included',
    'Challenges: 1 replay',
  ]);
  await transfer.applyOriginTransfer(validated, ports, { confirmed: true });
  assert.deepEqual(ports.snapshot(), origin);
  assert.equal(ports.recovery(), null);
});

test('flipping any payload byte fails the checksum and does not write', async () => {
  const exported = await transfer.exportOriginTransfer(sample());
  const payload = exported.payload;
  const ports = memoryPorts(other());
  const before = ports.snapshot();
  for (let i = 0; i < Buffer.byteLength(payload); i++) {
    const bytes = Buffer.from(payload);
    bytes[i] = bytes[i] === 0x41 ? 0x42 : 0x41;
    const flipped = { ...exported, payload: bytes.toString('utf8') };
    await assert.rejects(transfer.validateOriginTransfer(JSON.stringify(flipped)), (error) => {
      assert.match(error.message, /checksum/i);
      assert.match(error.message, /Existing saves were not changed/);
      return true;
    });
  }
  assert.deepEqual(ports.snapshot(), before);
  assert.equal(ports.writeCount(), 0);
});

test('corrupt, wrong version, truncated and newer files are rejected without writes', async () => {
  const good = await fileFor(sample());
  const exported = JSON.parse(good);
  const cases = [
    ['{"hello":1}', /corrupt/i],
    [JSON.stringify({ ...exported, version: 0 }), /wrong version/i],
    [good.slice(0, good.length - 12), /truncated/i],
    [JSON.stringify({ ...exported, version: 2 }), /newer version/i],
  ];
  for (const [text, pattern] of cases) {
    const ports = memoryPorts(other());
    const before = ports.snapshot();
    await assert.rejects(transfer.validateOriginTransfer(text), (error) => {
      assert.match(error.message, pattern);
      assert.match(error.message, /Existing saves were not changed/);
      return true;
    });
    assert.deepEqual(ports.snapshot(), before);
    assert.equal(ports.reads, 0);
  }
});

test('a legacy cabinet backup is not accepted as an origin transfer', async () => {
  const legacy = JSON.stringify({
    format: 'alibi-backup',
    schemaVersion: 1,
    runs: [],
    packs: [],
  });
  await assert.rejects(transfer.validateOriginTransfer(legacy), /corrupt/i);
});

test('apply does not run until confirmation and leaves the current saves', async () => {
  const validated = await transfer.validateOriginTransfer(await fileFor(sample()));
  const ports = memoryPorts(other());
  const before = ports.snapshot();
  await assert.rejects(
    transfer.applyOriginTransfer(validated, ports, { confirmed: false }),
    /confirmation/i,
  );
  await assert.rejects(transfer.applyOriginTransfer(validated, ports, {}), /confirmation/i);
  assert.deepEqual(ports.snapshot(), before);
  assert.equal(ports.reads, 0);
  assert.equal(ports.retains, 0);
  assert.equal(ports.writeCount(), 0);
  assert.equal(ports.recovery(), null);
});

test('a failure after the first store write restores every included store from the recovery copy', async () => {
  const validated = await transfer.validateOriginTransfer(await fileFor(sample()));
  const ports = memoryPorts(other(), { failOnWrite: 2 });
  const before = ports.snapshot();
  await assert.rejects(
    transfer.applyOriginTransfer(validated, ports, { confirmed: true }),
    (error) => {
      assert.match(error.message, /Existing saves were not changed/);
      return true;
    },
  );
  assert.deepEqual(ports.snapshot(), before);
  assert.deepEqual(ports.recovery(), before);
});

test('settings has one transfer entry point on the 44px button with an accessible name', () => {
  const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'src/app.css'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'src/origin-transfer.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const settingsAt = app.indexOf('function settingsPage()');
  const privacyAt = app.indexOf('function privacyPage()');
  const marker = app.indexOf('id="origin-transfer"');
  assert.equal((app.match(/id="origin-transfer"/g) || []).length, 1);
  assert.ok(settingsAt !== -1 && marker > settingsAt && marker < privacyAt);
  const section = app.slice(
    marker,
    app.indexOf('<section class="panel"><h2>Cabinet, Club', marker),
  );
  assert.match(section, /B\('Download save transfer', 'origin-export', 'download'\)/);
  assert.match(section, /B\('Import save transfer', 'origin-import', 'upload', 'secondary'\)/);
  assert.match(
    app,
    /const B = \(label, action, ic = '', cls = '', attrs = ''\) =>\s*`<button class="btn /,
  );
  assert.match(css, /\.btn \{[^}]*min-height:\s*44px;/);
  const picker = app.slice(
    app.indexOf("case 'origin-import':"),
    app.indexOf("case 'origin-import-confirm':"),
  );
  const confirm = app.slice(
    app.indexOf("case 'origin-import-confirm':"),
    app.indexOf("case 'all-cabinet':"),
  );
  assert.doesNotMatch(picker, /confirmed:\s*true/);
  assert.match(picker, /validateOriginTransfer/);
  assert.match(picker, /previewOriginTransfer/);
  assert.match(confirm, /confirmed:\s*true/);
  assert.match(confirm, /applyOriginTransfer/);
  assert.equal(/\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(source), false);
  assert.deepEqual(pkg.dependencies ?? {}, {});
  assert.deepEqual(Object.keys(pkg.devDependencies).sort(), [
    '@capacitor/android',
    '@capacitor/cli',
    '@capacitor/core',
    'esbuild',
    'prettier',
    'sharp',
    'three',
    'wrangler',
  ]);
});
