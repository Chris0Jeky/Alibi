'use strict';
const assert = require('node:assert/strict');
const { createHash, webcrypto } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../src/origin-transfer.js'), 'utf8');
function api(indexedDB) {
  const context = { crypto: webcrypto, TextEncoder, indexedDB };
  vm.runInNewContext(source, context);
  return context.AlibiOriginTransfer;
}
function sample(ids) {
  return {
    cabinet: { format: 'alibi-backup', schemaVersion: 1, runs: [], packs: [] },
    club: { schema: 1, settings: {}, runs: {}, records: [] },
    quiet: { kind: 'alibi-quiet-wing-backup', schema: 1, state: null },
    castle: { format: 'alibi-castle', version: 1, scope: 'Wrenmere Chapter I only', state: null },
    challenges: {
      format: 'alibi-challenges',
      schema: 1,
      runs: ids.map((id) => ({
        id,
        schema: 1,
        revision: 1,
        run: { format: 'alibi-challenge-run', schema: 1, challengeId: id, log: [] },
      })),
    },
  };
}
// Build a checksum-valid untrusted file without going through the trusted exporter.
function fileFor(payload) {
  const text = JSON.stringify(payload);
  return JSON.stringify({
    format: 'alibi-origin-transfer',
    version: 1,
    checksum: createHash('sha256').update(text).digest('hex'),
    payload: text,
  });
}

test('reserved Challenge IDs fail preflight before reads, retention or any domain write', async () => {
  const transfer = api();
  for (const id of ['recovery:', 'recovery:hanoi-01', 'recovery:2026-10-19:☂', '']) {
    const payload = sample(['hanoi-01', id]);
    const calls = [];
    const ports = Object.fromEntries(
      ['read', 'retain', 'write', 'release'].map((name) => [
        name,
        async () => {
          calls.push(name);
        },
      ]),
    );
    await assert.rejects(async () => {
      const validated = await transfer.validateOriginTransfer(fileFor(payload));
      await transfer.applyOriginTransfer(validated, ports, { confirmed: true });
    }, /wrong shape.*Existing saves were not changed/);
    assert.deepEqual(calls, [], id);
  }
});

test('export refuses reserved Challenge IDs rather than creating an unsafe transfer', async () => {
  await assert.rejects(
    api().exportOriginTransfer(sample(['recovery:existing-copy'])),
    /wrong shape/,
  );
});

test('duplicate Challenge IDs are refused on export and preflight before any port operation', async () => {
  const transfer = api();
  for (const differentRun of [false, true]) {
    const payload = sample(['hanoi-01', 'another-id', 'hanoi-01']);
    if (differentRun) payload.challenges.runs[2].run.log.push('newer move');
    const before = JSON.stringify(payload),
      incoming = fileFor(payload),
      calls = [];
    const ports = Object.fromEntries(
      ['read', 'retain', 'write', 'release'].map((name) => [name, () => calls.push(name)]),
    );
    await assert.rejects(transfer.exportOriginTransfer(payload), /wrong shape/);
    await assert.rejects(async () => {
      const validated = await transfer.validateOriginTransfer(incoming);
      await transfer.applyOriginTransfer(validated, ports, { confirmed: true });
    }, /wrong shape.*Existing saves were not changed/);
    assert.equal(JSON.stringify(payload), before);
    assert.equal(fileFor(payload), incoming);
    assert.deepEqual(calls, []);
  }
});

test('equal-revision Castle content divergence is refused before mutation', async () => {
  const transfer = api();
  const states = [
    { revision: 4, notes: 'older note', clues: ['a', 'b'] },
    { revision: 4, notes: 'current note', clues: ['b', 'a'] },
    { revision: 4, notes: 'current note', clues: { 0: 'a', 1: 'b' } },
    { revision: 4, notes: 'current note' },
  ];
  for (const stored of states) {
    const payload = sample([]);
    payload.castle.state = { revision: 4, notes: 'current note', clues: ['a', 'b'] };
    payload.castle.record = { schema: 1, revision: 2, state: stored };
    const before = JSON.stringify(payload),
      incoming = fileFor(payload),
      calls = [];
    const ports = Object.fromEntries(
      ['read', 'retain', 'write', 'release'].map((name) => [name, () => calls.push(name)]),
    );
    await assert.rejects(transfer.exportOriginTransfer(payload), /Castle.*not changed/);
    await assert.rejects(async () => {
      const validated = await transfer.validateOriginTransfer(incoming);
      await transfer.applyOriginTransfer(validated, ports, { confirmed: true });
    }, /Castle.*not changed/);
    assert.deepEqual(calls, []);
    assert.equal(JSON.stringify(payload), before);
    assert.equal(fileFor(payload), incoming);
  }
});

test('Castle comparison preserves reordered JSON content and supported empty or state-only sections', async () => {
  const transfer = api();
  const state = { revision: 4, notes: { text: 'kept', flag: null }, clues: ['a', 'b'] };
  const sections = [
    { state: null, record: null },
    { state: null },
    { state, record: null },
    { state },
    {
      state,
      record: {
        schema: 1,
        revision: 2,
        state: { clues: ['a', 'b'], notes: { flag: null, text: 'kept' }, revision: 4 },
      },
    },
  ];
  for (const section of sections) {
    const payload = sample(['hanoi-01']);
    Object.assign(payload.castle, section);
    const exported = await transfer.exportOriginTransfer(payload);
    const validated = await transfer.validateOriginTransfer(JSON.stringify(exported));
    assert.equal(JSON.stringify(validated.payload), JSON.stringify(payload));
  }
});

test('Castle export refuses sparse arrays whose length differs from the notebook state', async () => {
  const payload = sample([]);
  payload.castle.state = { revision: 4, clues: [] };
  payload.castle.record = { schema: 1, revision: 2, state: { revision: 4, clues: Array(1) } };
  const before = JSON.stringify(payload);
  await assert.rejects(api().exportOriginTransfer(payload), /Castle.*not changed/);
  assert.equal(JSON.stringify(payload), before);
  assert.equal(payload.castle.record.state.clues.length, 1);
  assert.equal(Object.hasOwn(payload.castle.record.state.clues, 0), false);
});

test('legitimate IDs preserve their bytes through export, preflight and confirmed apply', async () => {
  const transfer = api();
  const payload = sample([
    'hanoi-01',
    'recovery',
    'recovery-01',
    'xrecovery:note',
    'Recovery:case',
  ]);
  const exported = await transfer.exportOriginTransfer(payload);
  assert.deepEqual(JSON.parse(exported.payload), payload);
  const validated = await transfer.validateOriginTransfer(JSON.stringify(exported));
  const calls = [];
  const ports = {
    async read(name) {
      calls.push(['read', name]);
      return sample([])[name];
    },
    async retain() {
      calls.push(['retain']);
    },
    async write(name, value) {
      calls.push(['write', name, JSON.parse(JSON.stringify(value))]);
    },
    async release() {
      calls.push(['release']);
    },
  };
  await transfer.applyOriginTransfer(validated, ports, { confirmed: true });
  assert.deepEqual(
    calls.map((row) => row[0]),
    [
      'read',
      'read',
      'read',
      'read',
      'read',
      'retain',
      'write',
      'write',
      'write',
      'write',
      'write',
      'release',
    ],
  );
  assert.deepEqual(
    calls.find((row) => row[0] === 'write' && row[1] === 'challenges')[2],
    payload.challenges,
  );
});

function challengeDatabase(entries) {
  const records = new Map(entries);
  const writes = [];
  let closes = 0;
  const indexedDB = {
    async databases() {
      return [{ name: 'alibi-challenges-v1' }];
    },
    open(name, version) {
      assert.equal(name, 'alibi-challenges-v1');
      assert.ok(version === undefined || version === 1);
      const request = {};
      queueMicrotask(() => {
        request.result = {
          objectStoreNames: { contains: (name) => name === 'runs' },
          close() {
            closes++;
          },
          transaction(name, mode) {
            assert.equal(name, 'runs');
            const requests = [];
            const get = (values) => {
              const r = { result: values };
              requests.push(r);
              return r;
            };
            const tx = {
              objectStore: () => ({
                getAll: () => get([...records.values()]),
                getAllKeys: () => get([...records.keys()]),
                delete(key) {
                  assert.equal(mode, 'readwrite');
                  writes.push(['delete', key]);
                  records.delete(key);
                },
                put(value, key) {
                  assert.equal(mode, 'readwrite');
                  writes.push(['put', key]);
                  records.set(key, value);
                },
              }),
            };
            queueMicrotask(() => {
              for (const r of requests) r.onsuccess?.();
              tx.oncomplete();
            });
            return tx;
          },
        };
        request.onsuccess();
      });
      return request;
    },
  };
  return { indexedDB, records, writes, closes: () => closes };
}

test('device Challenge reads and replacement deletes keep the same protected prefix semantics', async () => {
  const recovery = { retained: 'original recovery ☂' };
  const old = { schema: 1, revision: 2, run: { format: 'alibi-challenge-run' } };
  const db = challengeDatabase([
    ['recovery:old', recovery],
    ['recovery:null', null],
    ['recovery:empty', ''],
    ['recovery', old],
    ['Recovery:case', old],
    ['xrecovery:note', old],
    ['hanoi-01', old],
  ]);
  const ports = api(db.indexedDB).createDevicePorts({});
  const section = JSON.parse(JSON.stringify(await ports.read('challenges')));
  assert.deepEqual(
    section.runs.map((row) => row.id),
    ['recovery', 'Recovery:case', 'xrecovery:note', 'hanoi-01'],
  );
  const incoming = sample(['hanoi-02']).challenges;
  await ports.write('challenges', incoming);
  assert.deepEqual(
    [...db.records.keys()],
    ['recovery:old', 'recovery:null', 'recovery:empty', 'hanoi-02'],
  );
  assert.strictEqual(db.records.get('recovery:old'), recovery);
  assert.strictEqual(db.records.get('recovery:null'), null);
  assert.strictEqual(db.records.get('recovery:empty'), '');
  assert.deepEqual(db.writes, [
    ['delete', 'recovery'],
    ['delete', 'Recovery:case'],
    ['delete', 'xrecovery:note'],
    ['delete', 'hanoi-01'],
    ['put', 'hanoi-02'],
  ]);
  assert.equal(db.closes(), 2);
});
