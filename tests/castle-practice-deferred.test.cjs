'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { partition } = require('../tools/official-catalogue.cjs');
const { split, serializeDeferred } = require('../tools/build-official-content.cjs');

function fixture() {
  const official = partition(process.cwd(), false);
  const parts = split(official.catalog, official.deferred);
  let runs = [];
  const env = {
    ALIBI_CATALOG: parts.catalog,
    ALIBI_DEFERRED: {
      ready: false,
      keys: parts.keys,
      has(puzzle) {
        return !!puzzle && !this.ready && this.keys.includes(`${puzzle.id}@${puzzle.revision}`);
      },
      ensure() {
        throw Error('Practice display must not introduce a blocking download');
      },
    },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/castle-practice.js'), 'utf8'), env);
  const adapter = env.AlibiCastlePractice.create({
    catalogue: parts.catalog,
    readRuns: async () => runs,
    validateRun(run) {
      if (run.invalid) throw Error('Invalid committed run');
      return run;
    },
    isCurrentCompletion: () => false,
  });
  const puzzle = (type) => parts.definitions.find((entry) => entry.type === type);
  return {
    adapter,
    full: official.catalog,
    puzzle,
    setRuns: (value) => {
      runs = value;
    },
    load: () =>
      vm.runInNewContext(serializeDeferred(parts.keys, parts.positions, parts.definitions), env),
  };
}
function completed(puzzle, extra = {}) {
  return {
    key: `${puzzle.id}@${puzzle.revision}`,
    puzzle,
    firstCompletedAt: '2026-09-20T12:00:00.000Z',
    completedAt: null,
    state: {},
    ...extra,
  };
}

test('saved deferred completions mark only the affected rooms as incomplete', async () => {
  const f = fixture();
  f.setRuns([completed(f.puzzle('binary')), completed(f.puzzle('lightup'))]);
  const snapshot = await f.adapter.snapshot();
  assert.equal(snapshot.available, true, 'committed saves remain available');
  assert.equal(snapshot.rooms.observatory.pending, true);
  assert.equal(snapshot.rooms.orangery.pending, true);
  assert.equal(snapshot.rooms.kitchen.pending, false);
  assert.equal(snapshot.rooms.observatory.completed, 0, 'unverified rules grant no credit');
  assert.equal(snapshot.rooms.orangery.detail, null);
});

test('the actual atomic definition load replaces incomplete flags with exact counts', async () => {
  const f = fixture();
  f.setRuns([completed(f.puzzle('binary')), completed(f.puzzle('lightup'))]);
  await f.adapter.snapshot();
  f.load();
  const snapshot = await f.adapter.snapshot();
  for (const id of ['observatory', 'orangery']) {
    assert.equal(snapshot.rooms[id].pending, false);
    assert.equal(snapshot.rooms[id].completed, 1);
  }
});

test('same listing identity with altered rules never becomes a verified official completion', async () => {
  const f = fixture();
  const altered = structuredClone(f.puzzle('binary'));
  altered.solution[0] ^= 1;
  f.setRuns([completed(altered)]);
  assert.equal((await f.adapter.snapshot()).rooms.observatory.pending, true);
  f.load();
  const room = (await f.adapter.snapshot()).rooms.observatory;
  assert.equal(room.pending, false);
  assert.equal(room.completed, 0);
  assert.equal(room.detail, null);
});

test('unfinished, invalid and unknown runs do not create a pending completion count', async () => {
  const f = fixture();
  const puzzle = f.puzzle('binary');
  f.setRuns([
    completed(puzzle, { firstCompletedAt: null }),
    completed(puzzle, { firstCompletedAt: 'not-a-date' }),
    completed(puzzle, { invalid: true }),
    completed(puzzle, { key: 'missing@1' }),
    completed(puzzle, { key: null }),
    completed(puzzle, { key: 1 }),
    completed(puzzle, {
      key: {
        toString() {
          throw Error('Do not coerce keys');
        },
      },
    }),
    completed(puzzle, { key: `${puzzle.id}@2` }),
  ]);
  const room = (await f.adapter.snapshot()).rooms.observatory;
  assert.equal(room.pending, false);
  assert.equal(room.completed, 0);
});

test('legacy completedAt candidates remain incomplete until their full state can be checked', async () => {
  const f = fixture();
  f.setRuns([
    completed(f.puzzle('binary'), {
      firstCompletedAt: null,
      completedAt: '2026-09-20T12:00:00.000Z',
    }),
  ]);
  assert.equal((await f.adapter.snapshot()).rooms.observatory.pending, true);
  f.load();
  assert.equal(
    (await f.adapter.snapshot()).rooms.observatory.completed,
    0,
    'the completion predicate is still required',
  );
});

test('verified progress and unlocked detail survive alongside an incomplete count', async () => {
  const f = fixture();
  const starters = ['curated-binary-01', 'curated-binary-02', 'curated-binary-05'];
  f.setRuns([
    ...starters.map((id) => completed(f.full.puzzles.find((puzzle) => puzzle.id === id))),
    completed(f.puzzle('binary')),
  ]);
  const room = (await f.adapter.snapshot()).rooms.observatory;
  assert.equal(room.pending, true);
  assert.equal(room.completed, 3);
  assert.match(room.detail, /paper constellation/);
  assert.ok(room.starters.every((puzzle) => puzzle.completed));
});

test('practice panels label verified progress as a lower bound while keeping play controls', async () => {
  const { practicePanel } = await import('../src/castle/practice.mjs');
  const f = fixture();
  f.setRuns([completed(f.puzzle('binary'))]);
  const pending = practicePanel({ id: 'observatory' }, await f.adapter.snapshot());
  assert.match(pending, /At least 0 \/ /);
  assert.match(pending, /Some saved completions await puzzle definitions/);
  assert.match(pending, /data-do="practice"/);
  f.load();
  const ready = practicePanel({ id: 'observatory' }, await f.adapter.snapshot());
  assert.match(ready, /1 \/ /);
  assert.doesNotMatch(ready, /At least|await puzzle definitions/);
});
