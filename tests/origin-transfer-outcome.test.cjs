'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const context = {};
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, '../src/origin-transfer.js'), 'utf8'),
  context,
);
const api = context.AlibiOriginTransfer;
const sections = Array.from(api.SECTIONS);
const copy = (value) => JSON.parse(JSON.stringify(value));

function fixture(cleanup) {
  const before = Object.fromEntries(sections.map((name) => [name, { label: 'old ' + name }]));
  const incoming = Object.fromEntries(sections.map((name) => [name, { label: 'new ' + name }]));
  const state = copy(before);
  const writes = [];
  let recovery = null;
  let releases = 0;
  const ports = {
    async read(name) {
      return copy(state[name]);
    },
    async retain(value) {
      recovery = copy(value);
    },
    async write(name, value) {
      writes.push(name);
      state[name] = copy(value);
    },
    release() {
      releases += 1;
      if (cleanup === 'throw') throw Error('cleanup transaction could not open');
      if (cleanup === 'reject') return Promise.reject(Error('cleanup transaction aborted'));
      recovery = null;
      return Promise.resolve();
    },
  };
  return {
    before,
    incoming,
    state,
    writes,
    ports,
    recovery: () => recovery,
    releases: () => releases,
    validated: { payload: incoming },
  };
}

for (const cleanup of ['reject', 'throw']) {
  test(`committed import remains committed when recovery cleanup ${cleanup}s`, async () => {
    const f = fixture(cleanup);
    const result = await api.applyOriginTransfer(f.validated, f.ports, {
      confirmed: true,
    });
    assert.deepEqual(copy(result), { committed: true, recoveryPending: true });
    assert.deepEqual(f.state, f.incoming);
    assert.deepEqual(f.writes, sections, 'cleanup failure never starts rollback');
    assert.deepEqual(f.recovery(), f.before);
    assert.equal(f.releases(), 1);
    assert.deepEqual(f.validated, { payload: f.incoming });
  });
}

test('committed import explicitly reports successful recovery cleanup', async () => {
  const f = fixture();
  const result = await api.applyOriginTransfer(f.validated, f.ports, {
    confirmed: true,
  });
  assert.deepEqual(copy(result), { committed: true, recoveryPending: false });
  assert.deepEqual(f.state, f.incoming);
  assert.equal(f.recovery(), null);
  assert.equal(f.releases(), 1);
});

// Execute the shipped confirmation handler with the real coordinator. Synthetic
// ports isolate cleanup failure; these are not five-domain browser acceptance.
const app = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
const start = app.indexOf("case 'origin-import-confirm':");
const end = app.indexOf("case 'all-cabinet':", start);
assert.ok(start >= 0 && end > start, 'the real confirmation handler is present');
function confirm(f) {
  const notices = [];
  let reloads = 0;
  const ctx = {
    pendingOrigin: { serial: 7, validated: f.validated },
    routeSerial: 7,
    AlibiOriginTransfer: api,
    originPorts: () => f.ports,
    closeDialog() {},
    toast: (message, error = false) => notices.push({ message, error }),
    location: {
      reload: () => {
        reloads += 1;
      },
    },
  };
  const run = vm.runInNewContext(
    `(async () => { switch ('origin-import-confirm') { ${app.slice(start, end)} } })`,
    ctx,
  );
  return { run, notices, reloads: () => reloads, ctx };
}

test('real confirm handler reports committed cleanup warning and reloads stale in-memory writers', async () => {
  const f = fixture('reject');
  const ui = confirm(f);
  await ui.run();
  assert.deepEqual(f.state, f.incoming);
  assert.deepEqual(f.recovery(), f.before);
  assert.equal(ui.reloads(), 1);
  assert.equal(ui.notices.length, 1);
  assert.equal(ui.notices[0].error, false);
  assert.match(ui.notices[0].message, /Saves imported/i);
  assert.match(ui.notices[0].message, /recovery cleanup.*pending/i);
  assert.equal(ui.ctx.pendingOrigin, null);
});

test('real confirm handler reloads a clean import and does not invent a cleanup warning', async () => {
  const f = fixture();
  const ui = confirm(f);
  await ui.run();
  assert.equal(ui.reloads(), 1);
  assert.equal(ui.notices[0].error, false);
  assert.match(ui.notices[0].message, /Saves imported/i);
  assert.doesNotMatch(ui.notices[0].message, /pending/i);
});

test('real confirm handler keeps an unsuccessful import on its error path without reload', async () => {
  const f = fixture();
  f.ports.retain = async () => {
    throw Error('an earlier recovery copy is pending');
  };
  const ui = confirm(f);
  await ui.run();
  assert.equal(ui.reloads(), 0);
  assert.equal(ui.notices.length, 1);
  assert.equal(ui.notices[0].error, true);
  assert.match(ui.notices[0].message, /Existing saves were not changed/);
  assert.deepEqual(f.state, f.before);
  assert.deepEqual(f.writes, []);
  assert.equal(f.releases(), 0);
});
