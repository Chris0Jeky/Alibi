'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { load } = require('../tools/official-catalogue.cjs');

function practiceApi() {
  const env = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/castle-practice.js'), 'utf8'), env);
  return env.AlibiCastlePractice;
}

function runFor(puzzle, fields = {}) {
  return {
    schemaVersion: 1,
    key: `${puzzle.id}@${puzzle.revision}`,
    puzzle,
    state: {},
    firstCompletedAt: null,
    completedAt: null,
    hints: 0,
    ...fields,
  };
}

test('the catalogue exposes every family through one stable Castle room and three real starters', async () => {
  const api = practiceApi(),
    catalogue = load(process.cwd()),
    adapter = api.create({ catalogue, readRuns: async () => [] }),
    snapshot = await adapter.snapshot();
  assert.equal(api.ROOM_BINDINGS.length, 13);
  assert.equal(Object.keys(snapshot.rooms).length, 13);
  for (const binding of api.ROOM_BINDINGS) {
    assert.equal(binding.starters.length, 3);
    assert.equal(snapshot.rooms[binding.roomId].family, binding.family);
    assert.equal(snapshot.rooms[binding.roomId].total > 0, true);
    for (const key of binding.starters) {
      const [id, revision] = key.split('@'),
        puzzle = catalogue.puzzles.find((candidate) => candidate.id === id);
      assert.ok(puzzle, `missing starter ${key}`);
      assert.equal(puzzle.revision, Number(revision));
      assert.equal(puzzle.type, binding.family);
    }
  }
});

test('only exact official definitions count, with historical first completion and one record per revision', async () => {
  const api = practiceApi(),
    catalogue = load(process.cwd()),
    puzzle = catalogue.puzzles.find((candidate) => candidate.id === 'curated-aquarium-01'),
    key = `${puzzle.id}@${puzzle.revision}`,
    records = [
      runFor(puzzle, { firstCompletedAt: '2026-09-01T10:00:00.000Z', hints: 14 }),
      runFor(puzzle, { completedAt: '2026-09-02T10:00:00.000Z' }),
      runFor(
        { ...puzzle, revision: 2 },
        { key: `${puzzle.id}@2`, firstCompletedAt: '2026-09-03T10:00:00.000Z' },
      ),
      runFor(
        { ...puzzle, title: 'Changed definition' },
        { key, firstCompletedAt: '2026-09-04T10:00:00.000Z' },
      ),
      runFor(
        { ...puzzle, id: 'imported-aquarium-01' },
        { key: 'imported-aquarium-01@1', firstCompletedAt: '2026-09-05T10:00:00.000Z' },
      ),
      runFor(puzzle, { key: 'unknown-official@1', firstCompletedAt: '2026-09-06T10:00:00.000Z' }),
    ],
    adapter = api.create({
      catalogue,
      readRuns: async () => records,
      validateRun: (run) => {
        if (run?.malformed) throw Error('malformed');
        return run;
      },
      isCurrentCompletion: () => false,
    }),
    snapshot = await adapter.snapshot();
  assert.equal(snapshot.available, true);
  assert.equal(snapshot.rooms.kitchen.completed, 1);
  assert.equal(
    snapshot.rooms.kitchen.starters.find((starter) => starter.id === puzzle.id).completed,
    true,
  );
  assert.equal(snapshot.rooms.kitchen.detail, null);
});

test('three distinct first official solves reveal optional room detail without creating evidence or rewards', async () => {
  const api = practiceApi(),
    catalogue = load(process.cwd()),
    puzzles = ['curated-binary-01', 'curated-binary-02', 'curated-binary-05'].map((id) =>
      catalogue.puzzles.find((puzzle) => puzzle.id === id),
    ),
    adapter = api.create({
      catalogue,
      readRuns: async () =>
        puzzles.map((puzzle, index) =>
          runFor(puzzle, {
            firstCompletedAt: `2026-09-0${index + 1}T10:00:00.000Z`,
            hints: 99,
          }),
        ),
      isCurrentCompletion: () => false,
    }),
    snapshot = await adapter.snapshot();
  assert.equal(snapshot.rooms.observatory.completed, 3);
  assert.match(snapshot.rooms.observatory.detail, /paper constellation/);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot.rooms.observatory, 'points'), false);
});

test('a malformed committed read makes the adapter unavailable and open accepts any bound official puzzle', async () => {
  const api = practiceApi(),
    catalogue = load(process.cwd()),
    puzzle = catalogue.puzzles.find((candidate) => candidate.id === 'curated-binary-16'),
    opened = [],
    adapter = api.create({
      catalogue,
      readRuns: async () => {
        throw Error('store unavailable');
      },
      onOpen: async (...args) => {
        opened.push(args);
        return true;
      },
    });
  assert.equal((await adapter.snapshot()).available, false);
  assert.equal(await adapter.open(puzzle.id, 'observatory'), true);
  assert.deepEqual(opened, [[puzzle.id, 'observatory']]);
  assert.equal(await adapter.open('curated-binary-16@2', 'observatory'), false);
  assert.equal(await adapter.open(puzzle.id, 'kitchen'), false);
});

test('the Castle panel emits bound practice controls and escapes catalogue labels', async () => {
  const { practicePanel } = await import('../src/castle/practice.mjs');
  const html = practicePanel(
    { id: 'observatory', name: 'The Observatory', implemented: true },
    {
      available: true,
      rooms: {
        observatory: {
          label: 'The <Instrument> Room',
          completed: 3,
          total: 24,
          detail: 'Optional detail <kept> separate.',
          starters: [
            {
              id: 'curated-binary-01',
              title: 'A <balanced> watch',
              difficulty: 'Gentle',
              completed: true,
            },
          ],
        },
      },
    },
  );
  assert.match(html, /data-do="practice"/);
  assert.match(html, /data-value="curated-binary-01"/);
  assert.match(html, /data-room="observatory"/);
  assert.match(html, /A &lt;balanced&gt; watch/);
  assert.match(html, /Optional detail &lt;kept&gt; separate\./);
  assert.doesNotMatch(html, /https?:/);
});
