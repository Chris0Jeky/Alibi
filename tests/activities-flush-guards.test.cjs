'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const source = fs.readFileSync(require.resolve('../src/activities.js'), 'utf8');

function loadActivities(overrides = {}) {
  const sandbox = { ...overrides };
  vm.runInNewContext(source, sandbox);
  return sandbox;
}

function challengeStore(info) {
  return { flush: async () => {}, info };
}

test('flush rejects when the challenge store is session-only', async () => {
  let flushed = 0;
  const env = loadActivities({
    QWApp: {
      challengeStore: {
        flush: async () => {
          flushed += 1;
        },
        info: () => ({ mode: 'session', protected: false }),
      },
    },
  });
  await assert.rejects(env.AlibiActivities.flush(), /Return to Challenges/);
  assert.equal(flushed, 1);
});

test('flush rejects when the challenge store is protected', async () => {
  const env = loadActivities({
    QWApp: {
      challengeStore: challengeStore(() => ({ mode: 'local', protected: true })),
    },
  });
  await assert.rejects(env.AlibiActivities.flush(), /Return to Challenges/);
});

test('flush rejects when retained Quiet Wing state is dirty outside the wing', async () => {
  const env = loadActivities({ QWRetainedDirty: true });
  await assert.rejects(env.AlibiActivities.flush(), /unsaved session/);
});

test('flush rejects when the Quiet Wing store is session-only', async () => {
  const env = loadActivities({
    QWApp: {},
    QWStore: { info: () => ({ mode: 'session', blocked: false }) },
  });
  await assert.rejects(env.AlibiActivities.flush(), /session-only/);
});

test('flush rejects when Quiet Wing recovery is blocked', async () => {
  const env = loadActivities({
    QWStore: { info: () => ({ mode: 'local', blocked: true }) },
  });
  await assert.rejects(env.AlibiActivities.flush(), /recovery/);
});

test('flush resolves when every store guard is clean', async () => {
  const env = loadActivities({
    QWApp: {
      challengeStore: challengeStore(() => ({ mode: 'local', protected: false })),
    },
    QWStore: { info: () => ({ mode: 'local', blocked: false }) },
  });
  await env.AlibiActivities.flush();
});
