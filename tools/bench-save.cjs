'use strict';

// Run alone: node --expose-gc tools/bench-save.cjs > tests/save-bench-results.json
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const { performance } = require('node:perf_hooks');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { load } = require('./official-catalogue.cjs');
require('../src/backup-validation.js');

const root = path.resolve(__dirname, '..');
const C = globalThis.AlibiCore;
const catalog = load(root, false);
const validator = globalThis.AlibiBackupValidation(C, catalog, () => ({}), 4);
const date = '2026-10-16T00:00:00.000Z';
const source = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const enqueue = source.slice(
  source.indexOf('  function enqueueSave() {'),
  source.indexOf('  function savePreferences() {'),
);
const ackLine = /acked\.set\(snapshot\.key, (?:C\.clone|JSON\.stringify)\(saved\)\);/;
assert.match(enqueue, ackLine, 'update the benchmark if the save path changes');
const strategies = {
  base: null,
  json: C.clone,
  structured: structuredClone,
  serialized: JSON.stringify,
};
const profiles = {
  fresh: { loaded: 1, undo: 10, redo: 0, note: 0 },
  heavy: { loaded: 100, undo: 100, redo: 0, note: 1000 },
  ceiling: { loaded: 3000, undo: 100, redo: 100, note: 5000 },
};

function denseState(puzzle) {
  const state = C.registry[puzzle.type].initial(puzzle);
  if (['sudoku', 'futoshiki'].includes(puzzle.type)) {
    for (let cell = 0; cell < puzzle.size ** 2; cell++)
      if (!puzzle.givens[cell])
        state.notes[cell] = Array.from({ length: puzzle.size }, (_, i) => i + 1);
  }
  C.validateState(puzzle, state);
  return state;
}

function makeRun(puzzle, { undo, redo, note }, dense) {
  let state = dense ? denseState(puzzle) : C.registry[puzzle.type].initial(puzzle);
  const history = [];
  // Real reducer edits, with independent history rows (not aliased copies).
  const cell = puzzle.givens.findIndex((value) => value === 0);
  for (let i = 0; i < undo + redo; i++) {
    history.push(C.clone(state));
    state = C.registry[puzzle.type].reduce(puzzle, state, {
      type: 'set',
      cell,
      value: 1,
      pencil: true,
    });
  }
  const run = {
    schemaVersion: 1,
    key: `${puzzle.id}@${puzzle.revision}`,
    rev: 0,
    puzzle: C.clone(puzzle),
    state: redo ? C.clone(history[undo]) : state,
    undo: history.slice(0, undo),
    redo: history.slice(undo).reverse(),
    moves: undo + redo,
    hints: 0,
    elapsed: 3600,
    completedAt: null,
    firstCompletedAt: null,
    updatedAt: date,
    note: 'A'.repeat(note),
  };
  validator.validateRun(run);
  return run;
}

function fixture(name) {
  const profile = profiles[name];
  const small = catalog.puzzles.find((p) => p.type === 'sudoku' && p.size === 4);
  // Largest dense candidate state among the published number-note puzzles.
  const large = catalog.puzzles
    .filter((p) => ['sudoku', 'futoshiki'].includes(p.type))
    .sort((a, b) => JSON.stringify(denseState(b)).length - JSON.stringify(denseState(a)).length)[0];
  const active = makeRun(name === 'fresh' ? small : large, profile, name !== 'fresh');
  const dormant = name === 'ceiling' ? makeRun(small, profiles.fresh, false) : active;
  return { profile, active, dormant };
}

function harness(active, strategy) {
  const context = {
    AlibiCore: C,
    C,
    Date: class extends Date {
      constructor() {
        super(date);
      }
    },
    current: C.clone(active),
    storageFatal: false,
    saveError: null,
    sessionSeconds: active.elapsed,
    pendingSaves: 0,
    queue: Promise.resolve(),
    revs: new Map([[active.key, 0]]),
    records: new Map(),
    acked: new Map(),
    channel: null,
    $: () => null,
    setSaveLabel() {},
    render() {},
    toast(message) {
      throw Error(message);
    },
    acknowledge: strategies[strategy],
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/storage.js'), 'utf8'), context);
  context.store = new context.AlibiStorage.Store();
  context.store.validateRun = validator.validateRun;
  context.records.set(active.key, context.current);
  vm.runInContext(
    enqueue.replace(
      ackLine,
      strategy === 'base' ? '' : 'acked.set(snapshot.key, acknowledge(saved));',
    ),
    context,
  );
  return context;
}

function stats(samples) {
  const sorted = samples.toSorted((a, b) => a - b);
  const percentile = (p) => sorted[Math.ceil(p * sorted.length) - 1];
  return {
    p50Ms:
      (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2,
    p95Ms: percentile(0.95),
    maxMs: sorted.at(-1),
    over16_67Ms: samples.filter((n) => n > 1000 / 60).length,
    over50Ms: samples.filter((n) => n > 50).length,
  };
}

assert.equal(stats([1, 2, 3, 4]).p50Ms, 2.5);
assert.equal(stats([1, 2, 3, 4]).p95Ms, 4);

async function worker(name, strategy) {
  assert.equal(typeof global.gc, 'function', 'run with --expose-gc');
  const { profile, active, dormant } = fixture(name);
  const ctx = harness(active, strategy);
  for (let i = 1; i < profile.loaded; i++) {
    const row = C.clone(dormant);
    row.puzzle.id = `bench-${i}`;
    row.key = `${row.puzzle.id}@${row.puzzle.revision}`;
    ctx.records.set(row.key, row);
  }
  // Retained ack heap is isolated from fixture construction and transient garbage.
  global.gc();
  const before = process.memoryUsage().heapUsed;
  if (strategies[strategy])
    for (const [key, row] of ctx.records) ctx.acked.set(key, strategies[strategy](row));
  global.gc();
  const retainedAckBytes = process.memoryUsage().heapUsed - before;

  // Independent byte oracle: the unchanged Store and deterministic clock.
  const oracle = harness(active, 'base');
  await oracle.enqueueSave();
  await ctx.enqueueSave();
  assert.equal(
    JSON.stringify(ctx.store.memory.runs[active.key]),
    JSON.stringify(oracle.store.memory.runs[active.key]),
    'persisted bytes must be identical',
  );
  if (strategy !== 'base') {
    const ack = ctx.acked.get(active.key);
    assert.equal(
      strategy === 'serialized' ? ack : JSON.stringify(ack),
      JSON.stringify(ctx.store.memory.runs[active.key]),
      'ack must retain the complete saved row',
    );
    ctx.current.state.notes.changed = [1];
    assert.equal(
      strategy === 'serialized' ? ack : JSON.stringify(ack),
      JSON.stringify(ctx.store.memory.runs[active.key]),
      'later player edits cannot mutate the acknowledgement',
    );
    delete ctx.current.state.notes.changed;
  }
  for (let i = 0; i < 50; i++) await ctx.enqueueSave();
  global.gc();
  const heapAtStart = process.memoryUsage().heapUsed;
  let peakHeapBytes = heapAtStart;
  const completion = [];
  for (let i = 0; i < 500; i++) {
    const start = performance.now();
    await ctx.enqueueSave();
    completion.push(performance.now() - start);
    peakHeapBytes = Math.max(peakHeapBytes, process.memoryUsage().heapUsed);
    await new Promise(setImmediate);
  }
  assert.equal(ctx.saveError, null);
  assert.equal(ctx.pendingSaves, 0);
  const saved = ctx.store.memory.runs[active.key];
  const ack = [];
  // Separately time only the added allocation, not validation or either earlier clone.
  if (strategies[strategy]) {
    for (let i = 0; i < 500; i++) {
      const start = performance.now();
      ctx.acked.set(active.key, strategies[strategy](saved));
      ack.push(performance.now() - start);
    }
  }
  return {
    profile: name,
    strategy,
    loaded: profile.loaded,
    undo: active.undo.length,
    redo: active.redo.length,
    puzzle: active.puzzle.id,
    activeJsonBytes: Buffer.byteLength(JSON.stringify(active)),
    loadedJsonBytes: [...ctx.records.values()].reduce(
      (sum, row) => sum + Buffer.byteLength(JSON.stringify(row)),
      0,
    ),
    retainedAckBytes,
    heapAtStart,
    peakHeapBytes,
    completion: stats(completion),
    ack: ack.length ? stats(ack) : null,
  };
}

async function main() {
  if (process.argv[2] === '--worker') {
    console.log(JSON.stringify(await worker(process.argv[3], process.argv[4])));
    return;
  }
  const results = [];
  for (const profile of Object.keys(profiles))
    for (const strategy of Object.keys(strategies)) {
      const child = spawnSync(
        process.execPath,
        ['--expose-gc', __filename, '--worker', profile, strategy],
        { encoding: 'utf8', timeout: 120000 },
      );
      assert.equal(child.status, 0, child.stderr || child.error?.message);
      results.push(JSON.parse(child.stdout));
      console.error(`${profile}/${strategy} complete`);
    }
  console.log(
    JSON.stringify(
      {
        node: process.version,
        platform: `${process.platform}/${process.arch}`,
        cpu: os.cpus()[0].model,
        appSha256: createHash('sha256').update(source).digest('hex'),
        samples: 500,
        warmup: 50,
        lowEndSlowdownAssumption: 6,
        frameBudgetMs: 1000 / 60,
        ackBudgetMsAtLowEnd: 1000 / 60 / 10,
        results,
      },
      null,
      2,
    ),
  );
}

if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
