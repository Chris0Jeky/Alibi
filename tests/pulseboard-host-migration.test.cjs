'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const hostSource = fs.readFileSync(path.join(root, 'src/pulseboard-host.js'), 'utf8');

const OLD = 'pulseboard:statistics:v1:alibi';
const V3 = 'pulseboard:consent:v3:alibi';

function fakeStorage({ setThrows = false } = {}) {
  const map = new Map([[OLD, '{"allow":false}']]);
  const removed = [];
  return {
    map,
    removed,
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (setThrows) throw new Error('QuotaExceededError');
      map.set(k, String(v));
    },
    removeItem: (k) => {
      removed.push(k);
      map.delete(k);
    },
  };
}

function runHost({ setThrows }) {
  const local = fakeStorage({ setThrows });
  const setCalls = [];
  const context = {
    ALIBI_CONFIG: { standalone: false },
    document: {
      readyState: 'complete',
      documentElement: { dataset: {} },
      querySelector: () => null,
      getElementById: () => null,
      addEventListener: () => {},
    },
    localStorage: local,
    Pulseboard: {
      track() {},
      count() {},
      consent: {
        get: () => ({ counts: false, diagnostics: false, journeys: false }),
        set: (choice) => setCalls.push(choice),
      },
    },
    addEventListener: () => {},
    location: { hash: '' },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(hostSource, context, { filename: 'pulseboard-host.js' });
  return { local, setCalls };
}

test('a failing v3 write keeps the player opted out via the SDK and keeps the legacy key', () => {
  const { local, setCalls } = runHost({ setThrows: true });
  assert.equal(setCalls.length, 1, 'consent.set records the all-off choice in memory');
  // The call object comes from the vm realm; compare its JSON so prototypes do not matter.
  assert.deepEqual(JSON.parse(JSON.stringify(setCalls[0])), {
    counts: false,
    diagnostics: false,
    journeys: false,
  });
  assert.equal(local.map.get(OLD), '{"allow":false}', 'the legacy opt-out is not deleted');
  assert.equal(local.map.get(V3) ?? null, null, 'no v3 record exists');
});

test('a successful v3 write migrates the opt-out and never touches the SDK', () => {
  const { local, setCalls } = runHost({ setThrows: false });
  const record = JSON.parse(local.map.get(V3));
  assert.equal(record.counts, false);
  assert.equal(record.diagnostics, false);
  assert.equal(record.journeys, false);
  assert.equal(local.map.has(OLD), false, 'the legacy key is removed after a successful write');
  assert.equal(setCalls.length, 0, 'consent.set is not called when storage worked');
});
