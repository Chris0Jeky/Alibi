'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { session, fresh } = require('./helpers/club-session.cjs');
const KEY = 'alibi-afterhours-v1';
function failure(name, asyncFailure = false) {
  return {
    open() {
      const e = Object.assign(Error(name), { name });
      if (!asyncFailure) throw e;
      const r = {};
      queueMicrotask(() => {
        r.error = e;
        r.onerror();
      });
      return r;
    },
  };
}
function stale() {
  const data = fresh();
  data.visit = 37;
  return JSON.stringify({ rev: 7, data });
}
for (const name of [
  'UnknownError',
  'AbortError',
  'QuotaExceededError',
  'InvalidStateError',
  'VersionError',
  'BlockedError',
]) {
  test(`${name} opening IndexedDB protects the old fallback and exports only the temporary session`, async () => {
    const raw = stale(),
      t = await session(fresh(), raw, {
        context: { indexedDB: failure(name, true), AlibiAssets: { badge: () => '' } },
      });
    const d = t.club.diagnostics();
    assert.equal(d.storageMode, 'session');
    assert.match(d.saveError, /untouched/i);
    assert.match(d.saveError, /temporary/i);
    assert.match(d.saveError, /export/i);
    assert.notEqual(d.state.visit, 38);
    assert.equal(t.storage.get(KEY), raw);
    assert.match(t.club.profile(), /club-warning[\s\S]*temporary/);
    await t.club.save();
    await t.club.action({ dataset: { action: 'club-export' } });
    assert.equal(t.storage.get(KEY), raw);
    assert.equal(t.blobs.length, 1);
    const exported = JSON.parse(await t.blobs[0].text());
    assert.equal(exported.visit, d.state.visit);
  });
}
for (const [name, indexedDB] of [
  ['absent', undefined],
  ['missing API', {}],
  ['security', failure('SecurityError')],
  ['unsupported', failure('NotSupportedError', true)],
]) {
  test(`${name} IndexedDB permits the existing local fallback`, async () => {
    const raw = stale(),
      t = await session(fresh(), raw, { context: { indexedDB } });
    const d = t.club.diagnostics();
    assert.equal(d.storageMode, 'local');
    assert.equal(d.state.visit, 38);
    assert.equal(JSON.parse(t.storage.get(KEY)).rev, 8);
  });
}
test('a synchronous unknown open failure also leaves the old local save untouched', async () => {
  const raw = stale(),
    t = await session(fresh(), raw, { context: { indexedDB: failure('UnknownError') } });
  assert.equal(t.club.diagnostics().storageMode, 'session');
  assert.equal(t.storage.get(KEY), raw);
  await t.club.save();
  assert.equal(t.storage.get(KEY), raw);
});
