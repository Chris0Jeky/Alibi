import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Regression cover for the src/app.js save settle protocol: readCommittedRuns must
// only hand out committed runs once the enqueueSave queue has drained. The helpers
// are sliced verbatim out of src/app.js so that swallowing the unsettled check in
// the source fails these tests.
const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const readStart = app.indexOf('  async function readCommittedRuns()');
const readEnd = app.indexOf('  function openPractice(');
const enqueueStart = app.indexOf('  function enqueueSave()');
const enqueueEnd = app.indexOf('  function savePreferences()');
assert.ok(readStart > 0 && readEnd > readStart);
assert.ok(enqueueStart > readEnd && enqueueEnd > enqueueStart);
const readSrc = app.slice(readStart, readEnd);
const enqueueSrc = app.slice(enqueueStart, enqueueEnd);
assert.ok(readSrc.includes('Saved progress is unavailable.'));
assert.ok(readSrc.includes('Saved progress is not settled.'));
assert.ok(enqueueSrc.includes('pendingSaves--'));

const clone = (value) => JSON.parse(JSON.stringify(value));

function mockStore(overrides = {}) {
  const runs = new Map();
  const calls = [];
  return {
    calls,
    runs,
    mode: 'device',
    async getAll(kind) {
      calls.push(['getAll', kind]);
      return [...runs.values()].map(clone);
    },
    async saveRun(snapshot, rev) {
      calls.push(['saveRun', snapshot.key, rev]);
      const saved = { ...clone(snapshot), rev: rev + 1, updatedAt: '2026-01-02T00:00:00.000Z' };
      runs.set(saved.key, saved);
      return saved;
    },
    ...overrides,
  };
}

function mockChannel() {
  const messages = [];
  return {
    messages,
    postMessage(message) {
      messages.push(message);
    },
  };
}

const factorySrc =
  '(function makeSaveHarness(deps) {' +
  'let current=deps.current??null,storageFatal=deps.storageFatal??"",saveError=deps.saveError??"",pendingSaves=deps.pendingSaves??0,queue=deps.queue??Promise.resolve(),sessionSeconds=0;' +
  'const revs=new Map(deps.revs??[]),records=new Map(deps.records??[]),store=deps.store,channel=deps.channel??null,C=deps.C;' +
  'function render(){}function toast(){}function setSaveLabel(){}function $(s){return null;}' +
  enqueueSrc +
  readSrc +
  'return{readCommittedRuns,enqueueSave,' +
  'get pendingSaves(){return pendingSaves;},' +
  'get queue(){return queue;},' +
  'get saveError(){return saveError;},' +
  'setCurrent(v){current=v;},setStorageFatal(v){storageFatal=v;},setSaveError(v){saveError=v;}};})';
const makeSaveHarness = vm.runInNewContext(factorySrc, {});

function harness(deps = {}) {
  return makeSaveHarness({ C: { clone }, store: mockStore(), channel: null, ...deps });
}

test('readCommittedRuns rejects /not settled/ while a save is still counted as pending', async () => {
  const store = mockStore();
  const fixture = harness({ store, pendingSaves: 1 });
  await assert.rejects(fixture.readCommittedRuns(), /not settled/);
  assert.deepEqual(store.calls, []);
});

test('readCommittedRuns returns clones of the committed runs after the queue settles', async () => {
  const store = mockStore();
  store.runs.set('a@1', { key: 'a@1', rev: 3, moves: 5 });
  const fixture = harness({ store });
  const runs = await fixture.readCommittedRuns();
  assert.deepEqual(runs, [{ key: 'a@1', rev: 3, moves: 5 }]);
  runs[0].rev = 999;
  runs.push({ key: 'evil@1', rev: 0 });
  const again = await fixture.readCommittedRuns();
  assert.deepEqual(again, [{ key: 'a@1', rev: 3, moves: 5 }]);
  assert.deepEqual(
    store.calls.filter((call) => call[0] === 'getAll'),
    [
      ['getAll', 'runs'],
      ['getAll', 'runs'],
    ],
  );
});

test('enqueueSave settles the queue so a later read sees the committed run', async () => {
  const store = mockStore();
  const channel = mockChannel();
  const fixture = harness({ store, channel });
  fixture.setCurrent({ key: 'a@1', rev: 0, moves: 2 });
  await fixture.enqueueSave();
  assert.equal(fixture.pendingSaves, 0);
  assert.equal(fixture.saveError, '');
  assert.deepEqual(channel.messages, [{ type: 'saved', key: 'a@1', rev: 1 }]);
  fixture.setCurrent(null);
  const runs = await fixture.readCommittedRuns();
  assert.deepEqual(
    runs.map((run) => [run.key, run.rev]),
    [['a@1', 1]],
  );
});

test('session mode, fatal storage and save errors throw Saved progress is unavailable', async () => {
  const sessionStore = mockStore({ mode: 'session' });
  await assert.rejects(
    harness({ store: sessionStore }).readCommittedRuns(),
    /Saved progress is unavailable/,
  );
  assert.deepEqual(sessionStore.calls, []);
  const fatal = harness({ store: mockStore() });
  fatal.setStorageFatal('disk gone');
  await assert.rejects(fatal.readCommittedRuns(), /Saved progress is unavailable/);
  const broken = harness({ store: mockStore() });
  broken.setSaveError('quota exceeded');
  await assert.rejects(broken.readCommittedRuns(), /Saved progress is unavailable/);
});

test('a save failure during the drain rejects the read as not settled', async () => {
  const store = mockStore({
    saveRun: async () => {
      throw Error('quota exceeded');
    },
  });
  const fixture = harness({ store, channel: mockChannel() });
  fixture.setCurrent({ key: 'a@1', rev: 0, moves: 1 });
  await assert.rejects(fixture.readCommittedRuns(), /not settled/);
  assert.equal(fixture.saveError, 'quota exceeded');
  assert.equal(fixture.pendingSaves, 0);
});
