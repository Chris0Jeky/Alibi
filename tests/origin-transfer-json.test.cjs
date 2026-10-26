'use strict';
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../src/origin-transfer.js'), 'utf8');
const clone = (value) => JSON.parse(JSON.stringify(value));

function fixture() {
  let digests = 0;
  const context = vm.createContext({
    TextEncoder,
    crypto: {
      subtle: {
        digest(...args) {
          digests++;
          return webcrypto.subtle.digest(...args);
        },
      },
    },
    QWApp: { disposed: false, state: { revision: 1, notes: ['private fallback'] } },
    localStorage: { getItem: () => ' { "private": "exact fallback bytes" }\n' },
  });
  vm.runInContext(source, context);
  return { api: context.AlibiOriginTransfer, context, digests: () => digests };
}

function saves() {
  const state = { revision: 1, notes: ['Castle alias'] };
  return {
    cabinet: { format: 'alibi-backup', schemaVersion: 1, runs: [], packs: [] },
    club: { schema: 1, settings: {}, runs: {}, records: [] },
    quiet: { kind: 'alibi-quiet-wing-backup', schema: 1, state: { revision: 1 } },
    castle: {
      format: 'alibi-castle',
      version: 1,
      scope: 'fixture',
      state,
      record: { schema: 1, revision: 1, state },
    },
    challenges: { format: 'alibi-challenges', schema: 1, runs: [] },
  };
}

const invalid = [
  ['Map', () => new Map([['private', 'keep']])],
  ['Set', () => new Set(['keep'])],
  ['Date', () => new Date(0)],
  ['NaN', () => NaN],
  ['Infinity', () => Infinity],
  ['negative zero', () => -0],
  ['undefined', () => undefined],
  ['BigInt', () => 1n],
  ['function', () => () => 'keep'],
  ['symbol value', () => Symbol('private')],
  ['sparse array', () => [, 1]],
  ['array extra property', () => Object.assign([1], { note: 'keep' })],
  [
    'custom class',
    () =>
      new (class State {
        note = 'keep';
      })(),
  ],
  ['array subclass', () => new (class State extends Array {})(1, 2)],
  ['custom prototype', () => Object.create({ inherited: 'keep' })],
  [
    'forged Object prototype',
    () => Object.create(Object.assign(Object.create(null), { constructor: Object })),
  ],
  ['non-enumerable data', () => Object.defineProperty({}, 'private', { value: 'keep' })],
  ['unrelated symbol key', () => ({ [Symbol('private')]: 'keep' })],
  [
    'cycle',
    () => {
      const value = {};
      value.self = value;
      return value;
    },
  ],
  [
    'toJSON',
    () => ({
      toJSON() {
        return 'lost';
      },
      private: 'keep',
    }),
  ],
];

for (const [label, make] of invalid) {
  test(`ordinary transfer export refuses ${label} before checksum creation`, async () => {
    const f = fixture();
    const value = saves();
    value.quiet.state.future = make();
    await assert.rejects(f.api.exportOriginTransfer(value), /JSON transfer cannot preserve/);
    assert.equal(f.digests(), 0);
    assert.equal(
      value.castle.state,
      value.castle.record.state,
      'validation does not normalize saves',
    );
  });
}

test('ordinary export accepts cross-realm plain data, null prototypes and Castle aliases', async () => {
  const f = fixture();
  const value = vm.runInNewContext('(' + JSON.stringify(saves()) + ')');
  value.castle.record.state = value.castle.state;
  value.quiet.state.future = Object.assign(Object.create(null), {
    text: 'keep ☂',
    values: [null, false, 0, { note: 'unknown JSON data' }],
  });
  const exported = await f.api.exportOriginTransfer(value);
  assert.deepEqual(JSON.parse(exported.payload), clone(value));
  assert.equal(f.digests(), 1);
  assert.equal(value.castle.state, value.castle.record.state);
  assert.deepEqual(JSON.parse(f.api.recoveryJson(value)).pending, clone(value));
});

test('JSON preflight refuses accessors and hidden toJSON without invoking them', async () => {
  for (const hidden of [false, true]) {
    const f = fixture();
    const value = saves();
    let invoked = 0;
    Object.defineProperty(
      value.quiet.state,
      hidden ? 'toJSON' : 'note',
      hidden
        ? {
            value() {
              invoked++;
              return 'lost';
            },
          }
        : {
            enumerable: true,
            get() {
              invoked++;
              return 'lost';
            },
          },
    );
    await assert.rejects(f.api.exportOriginTransfer(value), /JSON transfer cannot preserve/);
    assert.equal(invoked, 0);
    assert.equal(f.digests(), 0);
    assert.throws(() => f.api.recoveryJson(value), /JSON|recovery/i);
    assert.equal(invoked, 0);
  }
});

test('inherited serializers from another realm are refused without invocation', async () => {
  for (const type of ['Object', 'Array']) {
    const f = fixture();
    const foreign = vm.createContext({ invoked: 0 });
    vm.runInContext(
      `Object.defineProperty(${type}.prototype, 'toJSON', {
      get() { invoked++; return () => 'lost'; }
    })`,
      foreign,
    );
    const value = saves();
    value.quiet.state.future = vm.runInContext(
      type === 'Array' ? '["keep"]' : '({private: "keep"})',
      foreign,
    );
    await assert.rejects(f.api.exportOriginTransfer(value), /JSON transfer cannot preserve/);
    assert.throws(() => f.api.recoveryJson(value), /JSON|recovery/i);
    assert.equal(foreign.invoked, 0);
    assert.equal(f.digests(), 0);
  }
});

test('serialization wrappers cannot inherit a serializer from the transfer realm', async () => {
  const f = fixture();
  vm.runInContext('Object.prototype.toJSON = function () { return "lost"; }', f.context);
  const value = saves();
  const exported = await f.api.exportOriginTransfer(value);
  const envelope = JSON.parse(JSON.stringify(exported));
  assert.equal(envelope.format, 'alibi-origin-transfer');
  assert.deepEqual(JSON.parse(envelope.payload), clone(value));
  assert.deepEqual(JSON.parse(f.api.recoveryJson(value)).pending, clone(value));
});

for (const section of ['cabinet', 'club', 'quiet', 'castle', 'challenges']) {
  test(`${section} preimage refuses non-JSON values before recovery admission or domain writes`, async () => {
    for (const [label, make] of invalid) {
      const f = fixture();
      const before = saves();
      before[section].unknown = make();
      const calls = [];
      const ports = {
        read: async (name) => before[name],
        retain: async () => calls.push('retain'),
        write: async () => calls.push('write'),
        release: async () => calls.push('release'),
      };
      await assert.rejects(
        f.api.applyOriginTransfer({ payload: saves() }, ports, { confirmed: true }),
        /JSON recovery copy cannot preserve.*Existing saves were not changed/,
        label,
      );
      assert.deepEqual(calls, [], label);
    }
  });
}

test('known Quiet fallback metadata survives preflight but stays outside public JSON', async () => {
  const f = fixture();
  const before = saves();
  before.quiet = await f.api.createDevicePorts({}).read('quiet');
  const [symbol] = Object.getOwnPropertySymbols(before.quiet);
  assert.equal(typeof symbol, 'symbol');
  const raw = before.quiet[symbol];
  const exported = JSON.parse((await f.api.exportOriginTransfer(before)).payload);
  assert.deepEqual(Object.keys(exported.quiet), ['kind', 'schema', 'state']);
  assert.equal(before.quiet[symbol], raw);
  let retained;
  const writes = [];
  const result = await f.api.applyOriginTransfer(
    { payload: saves() },
    {
      read: async (name) => before[name],
      retain: async (value) => {
        retained = value;
      },
      write: async (name) => writes.push(name),
      release: async () => {},
    },
    { confirmed: true },
  );
  assert.equal(result.committed, true);
  assert.equal(retained.quiet, before.quiet, 'private metadata is not JSON-cloned away');
  assert.equal(retained.quiet[symbol], raw);
  assert.equal(writes.length, 5);
  assert.throws(
    () => f.api.recoveryJson(before),
    /JSON|recovery/i,
    'recovery export has no private-symbol exception',
  );
});

test('private Quiet symbol cannot authorize a different location or an accessor', async () => {
  for (const location of ['nested', 'other-section', 'accessor']) {
    const f = fixture();
    const value = saves();
    value.quiet = await f.api.createDevicePorts({}).read('quiet');
    const [symbol] = Object.getOwnPropertySymbols(value.quiet);
    let invoked = 0;
    if (location === 'accessor')
      Object.defineProperty(value.quiet, symbol, {
        get() {
          invoked++;
          return 'lost';
        },
      });
    else if (location === 'nested') value.quiet.state[symbol] = 'private';
    else value.castle[symbol] = 'private';
    await assert.rejects(f.api.exportOriginTransfer(value), /JSON transfer cannot preserve/);
    assert.equal(invoked, 0);
    assert.equal(f.digests(), 0);
  }
});
