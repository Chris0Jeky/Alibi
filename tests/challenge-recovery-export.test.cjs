'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../src/quiet-wing/app.js'), 'utf8');
const body = source.slice(
  source.indexOf('function exportChallenge('),
  source.indexOf('// A classic claims'),
);

function harness() {
  const blobs = [],
    files = [],
    messages = [];
  const exportChallenge = vm.runInNewContext('(' + body + ')', {
    Blob,
    URL: {
      createObjectURL(blob) {
        blobs.push(blob);
        return 'blob:recovery';
      },
      revokeObjectURL() {},
    },
    document: {
      createElement() {
        const link = {
          click() {
            files.push(link.download);
          },
        };
        return link;
      },
    },
    setTimeout: (callback) => callback(),
    toast: (message) => messages.push(message),
  });
  return { exportChallenge, blobs, files, messages };
}
function archive(record) {
  return {
    format: 'alibi-challenge-recovery',
    schema: 1,
    challengeId: 'curated-classic-hanoi-01',
    recovery: { at: 123, record },
  };
}

test('raw recovery downloads retain the envelope and identify a non-playable archive', async () => {
  const h = harness(),
    value = archive({ schema: 2, unknown: { text: '雨', fields: [1, false, null] } });
  h.exportChallenge(value, 'previous');
  assert.deepEqual(JSON.parse(await h.blobs[0].text()), value);
  assert.deepEqual(h.files, ['alibi-raw-previous-curated-classic-hanoi-01.json']);
  assert.match(h.messages[0], /not a playable challenge/);
});

test('ordinary previous replay keeps its existing filename and data', async () => {
  const h = harness(),
    run = { challengeId: 'curated-classic-hanoi-01', log: [] };
  h.exportChallenge(run, 'previous');
  assert.deepEqual(JSON.parse(await h.blobs[0].text()), run);
  assert.deepEqual(h.files, ['alibi-previous-curated-classic-hanoi-01.json']);
  assert.deepEqual(h.messages, []);
});

test('raw export refuses oversized or non-JSON values before allocating a download', () => {
  const cycle = {};
  cycle.self = cycle;
  const namedArray = [1];
  namedArray.note = 'keep this field';
  for (const record of [
    { text: 'x'.repeat(3 * 1024 * 1024) },
    { value: undefined },
    { value: NaN },
    { value: Infinity },
    { value: -0 },
    { value: 1n },
    { value: new Date(0) },
    { value: new Map() },
    { value: namedArray },
    { value: Array(2) },
    cycle,
  ]) {
    const h = harness(),
      value = archive(record);
    assert.throws(() => h.exportChallenge(value, 'previous'));
    assert.equal(h.blobs.length, 0);
    assert.equal(h.files.length, 0);
    assert.equal(value.recovery.record, record);
  }
});
