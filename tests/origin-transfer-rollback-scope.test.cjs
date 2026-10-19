'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { test } = require('node:test');

// Exercise the real transfer coordinator. The ports below model independent
// domain writers, not native IndexedDB durability or cross-tab transactions.
const context = { crypto: webcrypto, TextEncoder };
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, '../src/origin-transfer.js'), 'utf8'),
  context,
);
const api = context.AlibiOriginTransfer;
const sections = Array.from(api.SECTIONS);
const copy = (value) => JSON.parse(JSON.stringify(value));
function snapshot(label) {
  return {
    cabinet: {
      format: 'alibi-backup',
      schemaVersion: 1,
      runs: [],
      packs: [],
      settings: { label },
      preferences: {},
    },
    club: { schema: 1, settings: { label }, runs: {}, records: [] },
    quiet: { kind: 'alibi-quiet-wing-backup', schema: 1, state: { label } },
    castle: {
      format: 'alibi-castle',
      version: 1,
      scope: 'Synthetic coordinator fixture',
      state: { label },
      record: null,
    },
    challenges: {
      format: 'alibi-challenges',
      schema: 1,
      runs: [
        {
          id: 'synthetic@1',
          schema: 1,
          revision: 1,
          run: { format: 'alibi-challenge-run', label },
        },
      ],
    },
  };
}
async function fixture() {
  const before = snapshot('before');
  const incoming = snapshot('imported');
  const validated = await api.validateOriginTransfer(
    JSON.stringify(await api.exportOriginTransfer(incoming)),
  );
  const state = copy(before);
  const writes = [];
  const recovery = { value: null, releases: 0 };
  const ports = {
    async read(name) {
      return copy(state[name]);
    },
    async write(name, value) {
      writes.push(name);
      state[name] = copy(value);
    },
    async retain(value) {
      recovery.value = copy(value);
    },
    async release() {
      recovery.releases += 1;
      recovery.value = null;
    },
  };
  return { before, incoming, validated, state, writes, recovery, ports };
}
for (const [index, failedSection] of sections.entries()) {
  test(`interrupted ${failedSection} write restores attempted domains only`, async () => {
    const f = await fixture();
    const concurrent = snapshot('independent progress while import is pending');
    const originalWrite = f.ports.write;
    let failed = false;
    f.ports.write = async (name, value) => {
      await originalWrite(name, value);
      if (!failed && name === failedSection) {
        failed = true;
        for (const later of sections.slice(index + 1)) f.state[later] = copy(concurrent[later]);
        throw Error('injected interruption after a partial write');
      }
    };
    await assert.rejects(
      api.applyOriginTransfer(f.validated, f.ports, { confirmed: true }),
      /injected interruption/,
    );
    const attempted = sections.slice(0, index + 1);
    for (const name of attempted) assert.deepEqual(f.state[name], f.before[name]);
    for (const name of sections.slice(index + 1))
      assert.deepEqual(f.state[name], concurrent[name], `${name} was never an import target`);
    assert.deepEqual(f.writes, [...attempted, ...attempted]);
    assert.deepEqual(f.recovery.value, f.before);
    assert.equal(f.recovery.releases, 0);
    assert.deepEqual(copy(f.validated.payload), f.incoming, 'import payload remains unchanged');
  });
}
test('successful import writes all domains once and releases recovery', async () => {
  const f = await fixture();
  assert.equal(
    await api.applyOriginTransfer(f.validated, f.ports, { confirmed: true }),
    f.validated,
  );
  assert.deepEqual(f.state, f.incoming);
  assert.deepEqual(f.writes, sections);
  assert.equal(f.recovery.releases, 1);
  assert.equal(f.recovery.value, null);
});
test('unconfirmed import performs no port operations', async () => {
  const f = await fixture();
  const calls = [];
  for (const name of ['read', 'write', 'retain', 'release'])
    f.ports[name] = async () => calls.push(name);
  await assert.rejects(api.applyOriginTransfer(f.validated, f.ports), /explicit confirmation/);
  assert.deepEqual(calls, []);
});
for (const operation of ['read', 'retain']) {
  test(`failed ${operation} before mutation never rolls back untouched domains`, async () => {
    const f = await fixture();
    f.ports[operation] = async () => {
      throw Error(`injected ${operation} failure`);
    };
    await assert.rejects(
      api.applyOriginTransfer(f.validated, f.ports, { confirmed: true }),
      new RegExp(`injected ${operation} failure`),
    );
    assert.deepEqual(f.writes, []);
    assert.deepEqual(f.state, f.before);
    assert.equal(f.recovery.releases, 0);
  });
}
test('failed rollback retains recovery and reports incomplete restoration', async () => {
  const f = await fixture();
  f.ports.write = async () => {
    throw Error('storage remains unavailable');
  };
  await assert.rejects(
    api.applyOriginTransfer(f.validated, f.ports, { confirmed: true }),
    /Import failed and the recovery copy was kept/,
  );
  assert.deepEqual(f.recovery.value, f.before);
  assert.equal(f.recovery.releases, 0);
});
