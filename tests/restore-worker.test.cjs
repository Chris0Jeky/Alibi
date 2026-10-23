'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function worker() {
  const file = fs
    .readdirSync('dist/assets')
    .find((name) => /^validator\.[a-f0-9]+\.js$/.test(name));
  assert.ok(file, 'build the validator first');
  let response;
  const context = vm.createContext({ TextEncoder });
  context.self = context;
  context.postMessage = (value) => (response = value);
  vm.runInContext(fs.readFileSync(`dist/assets/${file}`, 'utf8'), context);
  return (message) => {
    // Worker structured cloning creates objects in the worker's own realm.
    context.onmessage({ data: vm.runInContext(`(${JSON.stringify(message)})`, context) });
    return JSON.parse(JSON.stringify(response));
  };
}

function challengeRun() {
  const catalogue = require('../tools/challenge-catalogue.cjs');
  const registry = require('../src/challenges.js').create(catalogue.runtime(catalogue.load()), {
    quiet: require('../src/quiet-wing/engine.js'),
    club: require('../src/club-engines.js'),
  });
  return registry.begin('curated-classic-hanoi-01');
}

test('built worker validates imported and existing challenge replays and classifies corrupt records', () => {
  const send = worker(),
    run = challengeRun();
  run.log = Array.from({ length: 5000 }, (_, i) =>
    i % 2 ? { from: 2, to: 1 } : { from: 1, to: 2 },
  );
  const message = {
    type: 'challenge-restore',
    text: JSON.stringify(run),
    record: { schema: 1, revision: 1, run },
  };
  const result = send(message);
  assert.equal(result.ok, true, result.error);
  assert.deepEqual(result.value, { run, existingValid: true });
  for (const record of [
    null,
    { schema: 2, revision: 1, run },
    { schema: 1, revision: Number.MAX_SAFE_INTEGER + 1, run },
    { schema: 1, revision: 1, run: { ...run, log: [{ from: 0, to: 0 }] } },
    { schema: 1, revision: 1, run: { ...run, challengeId: 'unknown' } },
  ]) {
    const checked = send({ ...message, record });
    assert.equal(checked.ok, true, checked.error);
    assert.equal(checked.value.existingValid, false);
  }
  const invalid = send({ ...message, text: JSON.stringify({ ...run, log: [{ from: 0, to: 0 }] }) });
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /Choose two different pegs/);
});

test('built worker prepares castle merges and refuses invalid imports, disk records and oversized merges', async () => {
  const { initial } = await import('../src/castle/engine.mjs');
  const { backup, prepareRestore } = await import('../src/castle/backup.mjs');
  const send = worker(),
    current = initial(),
    incoming = backup(initial());
  incoming.state.notes = 'Imported note.';
  const message = {
    type: 'castle-restore',
    text: JSON.stringify(incoming),
    current,
    replace: false,
  };
  const result = send(message);
  assert.equal(result.ok, true, result.error);
  assert.deepEqual(result.value, prepareRestore(incoming, current, false));
  const replaced = send({ ...message, replace: true });
  assert.equal(replaced.ok, true, replaced.error);
  assert.equal(replaced.value.notes, 'Imported note.');
  const invalid = structuredClone(incoming);
  invalid.state.drafts.hanoi = [[0, 0]];
  assert.equal(send({ ...message, text: JSON.stringify(invalid) }).ok, false);
  assert.equal(send({ ...message, record: { schema: 2, revision: 1, state: current } }).ok, false);
  const oversized = send({ ...message, current: { ...current, notes: 'a'.repeat(12000) } });
  assert.equal(oversized.ok, false);
  assert.match(oversized.error, /exceed/);
});

for (const [type, limit] of [
  ['challenge-restore', 3 * 1024 * 1024],
  ['castle-restore', 512 * 1024],
]) {
  test(`${type} retains the worker's byte cap`, () => {
    const result = worker()({ type, text: 'x'.repeat(limit + 1) });
    assert.equal(result.ok, false);
    assert.match(result.error, /import limit/);
  });
}
