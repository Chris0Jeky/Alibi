import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStore,
  freshRun,
  validateSave,
  parseBackup,
  prepareRestore,
  KEY,
  RECOVERY_KEY,
} from '../src/timeline-lab/storage.mjs';
import { PUZZLES } from '../src/timeline-lab/puzzles.mjs';
import { emptyMarks } from '../src/timeline-lab/model.mjs';

const puzzle = () => ({ ...structuredClone(PUZZLES[0]), id: 'test-desk', title: 'Test desk' });
function memory() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
  };
}
function locks() {
  let tail = Promise.resolve();
  return {
    request(name, options, action) {
      assert.equal(name, KEY);
      assert.equal(options.mode, 'exclusive');
      const run = tail.then(action);
      tail = run.catch(() => {});
      return run;
    },
  };
}
const make = (storage = memory(), lock = locks()) => {
  const store = createStore({ storage, locks: lock, validateBackup: parseBackup, prepareRestore });
  return {
    ...store,
    restore: async (raw, revision) => (await store.reviewBackup(raw, revision)).restore(),
  };
};
const edited = () => {
  const run = freshRun(puzzle());
  run.marks[1] = 1;
  return run;
};

test('a committed board, history and explicit feedback survive reopening', async () => {
  const storage = memory(),
    lock = locks(),
    a = make(storage, lock),
    run = edited();
  run.undo = [emptyMarks(puzzle())];
  run.rating = 4;
  run.difficulty = 'just-right';
  run.feedback = 'The clues felt fair.';
  assert.equal(await a.saveRun(run), true);
  const b = make(storage, lock);
  assert.deepEqual(b.getRun(puzzle()), run);
  assert.equal(b.status().mode, 'saved');
  assert.equal(parseBackup(a.exportData()).runs['test-desk@1'].feedback, run.feedback);
});
test('future, malformed and oversized existing records are preserved while session play works', async () => {
  for (const raw of ['{"schema":99}', 'null', '[1]', '{bad', 'x'.repeat(800000)]) {
    const storage = memory();
    storage.setItem(KEY, raw);
    const s = make(storage);
    assert.equal(s.status().mode, 'protected');
    assert.equal(await s.saveRun(edited()), false);
    assert.equal(storage.getItem(KEY), raw);
    const backup = JSON.parse(s.exportData());
    assert.equal(backup.recovery.raw, raw);
    assert.equal(backup.save.runs['test-desk@1'].marks[1], 1);
    await assert.rejects(s.restore(s.exportData()), /protected|read-only/i);
  }
});
test('stale writers preserve both the committed record and their own exportable edit', async () => {
  const storage = memory(),
    lock = locks(),
    a = make(storage, lock),
    b = make(storage, lock);
  const first = edited(),
    second = edited();
  second.marks[2] = 2;
  assert.equal(await a.saveRun(first), true);
  const committed = storage.getItem(KEY);
  assert.equal(await b.saveRun(second), false);
  assert.equal(b.status().mode, 'conflict');
  assert.equal(storage.getItem(KEY), committed);
  assert.equal(parseBackup(b.exportData()).runs['test-desk@1'].marks[2], 2);
});
test('lack of Web Locks or denied writes never reports a persistent save', async () => {
  for (const blocked of ['locks', 'quota', 'read']) {
    const storage = memory();
    if (blocked === 'quota')
      storage.setItem = () => {
        throw Error('QuotaExceededError');
      };
    if (blocked === 'read')
      storage.getItem = () => {
        throw Error('SecurityError');
      };
    const s = make(storage, blocked === 'locks' ? null : locks());
    assert.equal(await s.saveRun(edited()), false);
    assert.equal(s.status().mode, 'session');
    assert.equal(s.status().dirty, true);
    await assert.rejects(s.flush(), /export/i);
    s.markExported();
    await s.flush();
  }
});
test('invalid marks, histories, feedback and hostile run keys are rejected before writing', async () => {
  for (const mutate of [
    (r) => (r.marks[0] = 3),
    (r) => (r.marks = r.marks.slice(1)),
    (r) => (r.marks[0] = r.marks[1] = 2),
    (r) => (r.undo = [Array(25).fill(2)]),
    (r) => (r.undo = Array(41).fill(emptyMarks(puzzle()))),
    (r) => (r.feedback = 'x'.repeat(2001)),
    (r) => (r.rating = 6),
    (r) => (r.difficulty = 'unknown'),
  ]) {
    const storage = memory(),
      s = make(storage),
      run = edited();
    mutate(run);
    await assert.rejects(s.saveRun(run));
    assert.equal(storage.getItem(KEY), null);
  }
  const s = make();
  await s.saveRun(edited());
  const save = JSON.parse(s.exportData()).save;
  save.runs = JSON.parse('{"__proto__":{}}');
  assert.throws(() => validateSave(save));
});
test('restore is explicit, checks the preview generation and retains a recovery snapshot', async () => {
  const storage = memory(),
    s = make(storage),
    run = edited();
  await s.saveRun(run);
  const backup = s.exportData(),
    generation = s.snapshot().revision;
  run.marks[2] = 1;
  await s.saveRun(run);
  await assert.rejects(s.restore(backup, generation), /changed/i);
  const previous = s.snapshot();
  await s.restore(backup, s.snapshot().revision);
  assert.deepEqual(parseBackup(s.recoveryData()), previous);
  assert.equal(s.getRun(puzzle()).marks[2], 0);
});
test('restore refuses unknown recovery data and foreign-tab changes without overwriting either', async () => {
  const storage = memory(),
    lock = locks(),
    s = make(storage, lock);
  await s.saveRun(edited());
  const backup = s.exportData(),
    before = storage.getItem(KEY);
  storage.setItem(RECOVERY_KEY, 'future bytes');
  await assert.rejects(s.restore(backup), /recovery/i);
  assert.equal(storage.getItem(KEY), before);
  assert.equal(storage.getItem(RECOVERY_KEY), 'future bytes');
  const other = make(storage, lock),
    run = edited();
  run.marks[3] = 1;
  await other.saveRun(run);
  await assert.rejects(s.restore(backup), /changed|conflict/i);
  assert.equal(s.getRun(puzzle()).marks[3], 0);
});
test('a run retains its pinned definition when the catalogue supplies a changed revision', async () => {
  const s = make(),
    run = edited();
  await s.saveRun(run);
  const changed = { ...puzzle(), title: 'Different title' };
  assert.equal(s.getRun(changed).puzzle.title, 'Test desk');
  const save = s.snapshot();
  save.extra = 'future';
  assert.throws(() => validateSave(save));
});

test('a full restored shelf preserves its records and keeps new play in an exportable protected session', async () => {
  const storage = memory();
  const save = make().snapshot();
  for (let i = 0; i < 64; i++) {
    const p = { ...puzzle(), id: `prior-${i}` };
    save.runs[`${p.id}@1`] = freshRun(p);
  }
  storage.setItem(KEY, JSON.stringify(save));
  const s = make(storage),
    run = edited();
  run.feedback = 'New session work';
  assert.equal(await s.saveRun(run), false);
  assert.equal(s.status().mode, 'protected');
  assert.equal(s.status().dirty, true);
  const backup = JSON.parse(s.exportData());
  assert.equal(backup.save.runs['test-desk@1'].feedback, 'New session work');
  assert.equal(Object.keys(JSON.parse(backup.recovery.raw).runs).length, 64);
  assert.equal(storage.getItem(KEY), JSON.stringify(save));
  await assert.rejects(s.flush(), /export/i);
});

test('a protected backup retains the original unknown bytes through restore and re-export', async () => {
  const source = memory();
  source.setItem(KEY, '{"schema":99,"future":"keep me"}');
  const a = make(source);
  await a.saveRun(edited());
  const target = memory(),
    b = make(target);
  await b.restore(a.exportData());
  const reopened = make(target);
  assert.ok(reopened.exportData().includes('keep me'));
  assert.equal(parseBackup(reopened.exportData()).runs['test-desk@1'].marks[1], 1);
});

test('a refused active write leaves both saves available after reopening without rollback', async () => {
  const storage = memory();
  const s = make(storage);
  const previous = edited();
  previous.feedback = 'Older recovery';
  await s.saveRun(previous);
  const older = storage.getItem(KEY);
  storage.setItem(RECOVERY_KEY, older);
  const imported = s.exportData();

  const current = edited();
  current.feedback = 'Current run';
  await s.saveRun(current);
  const active = storage.getItem(KEY);
  const writes = [];
  const faulting = {
    ...storage,
    setItem(key, value) {
      writes.push(key);
      if (key === KEY || writes.length > 2)
        throw new DOMException('No storage writes are available', 'QuotaExceededError');
      storage.setItem(key, value);
    },
  };

  await assert.rejects(make(faulting).restore(imported), { name: 'QuotaExceededError' });
  assert.deepEqual(writes, [KEY]);
  assert.equal(storage.getItem(KEY), active);
  assert.equal(storage.getItem(RECOVERY_KEY), older);
  const reopened = make(storage);
  assert.equal(reopened.getRun(puzzle()).feedback, 'Current run');
  assert.equal(parseBackup(reopened.recoveryData()).runs['test-desk@1'].feedback, 'Older recovery');
  await reopened.restore(imported);
  const restored = make(storage);
  assert.equal(restored.getRun(puzzle()).feedback, 'Older recovery');
  assert.equal(parseBackup(restored.recoveryData()).runs['test-desk@1'].feedback, 'Current run');
  assert.equal(storage.getItem(RECOVERY_KEY), older);
  await restored.saveRun(edited());
  assert.equal(
    parseBackup(make(storage).recoveryData()).runs['test-desk@1'].feedback,
    'Current run',
  );
});

test('repeated restores keep incoming retained bytes and recover the previous shelf after reload', async () => {
  const storage = memory();
  const old = make(storage);
  await old.saveRun(edited());
  const withRetained = (raw) => {
    const save = old.snapshot();
    save.retainedRaw = raw;
    return save;
  };
  const legacy = JSON.stringify(withRetained('legacy recovery bytes'));
  storage.setItem(RECOVERY_KEY, legacy);
  storage.setItem(KEY, JSON.stringify(withRetained('pre-restore bytes')));
  const store = make(storage),
    stale = make(storage);
  const backup = (save, recovery) =>
    JSON.stringify({ kind: 'alibi-timeline-backup', schema: 1, save, recovery });
  await store.restore(backup(old.snapshot(), { raw: 'first import bytes' }));
  const reopened = make(storage);
  assert.equal(parseBackup(reopened.exportData()).retainedRaw, 'first import bytes');
  assert.equal(parseBackup(reopened.recoveryData()).retainedRaw, 'pre-restore bytes');

  const first = storage.getItem(KEY);
  assert.equal(await stale.saveRun(edited()), false);
  assert.equal(stale.status().mode, 'conflict');
  assert.equal(storage.getItem(KEY), first);
  assert.equal(parseBackup(stale.recoveryData()).retainedRaw, 'pre-restore bytes');
  await assert.rejects(
    reopened.restore(backup(withRetained('mismatched bytes'), { raw: 'different bytes' })),
    /two protected records/,
  );
  assert.equal(storage.getItem(KEY), first);

  const second = backup(withRetained('second import bytes'), { raw: 'second import bytes' });
  const failWrite = make({
    ...storage,
    setItem() {
      throw new DOMException('Full', 'QuotaExceededError');
    },
  });
  await assert.rejects(failWrite.restore(second), { name: 'QuotaExceededError' });
  assert.equal(storage.getItem(KEY), first);
  assert.equal(parseBackup(make(storage).recoveryData()).retainedRaw, 'pre-restore bytes');
  await reopened.restore(second);
  const again = make(storage);
  assert.equal(parseBackup(again.exportData()).retainedRaw, 'second import bytes');
  assert.equal(parseBackup(again.recoveryData()).retainedRaw, 'first import bytes');
  assert.equal(storage.getItem(RECOVERY_KEY), legacy);
});

test('restore rejects an oversized combined record before either durable copy changes', async () => {
  const storage = memory();
  const active = make(storage).snapshot();
  active.retainedRaw = '\x01'.repeat(600_000);
  const raw = JSON.stringify(active);
  storage.setItem(KEY, raw);
  storage.setItem(RECOVERY_KEY, JSON.stringify(make().snapshot()));
  const legacy = storage.getItem(RECOVERY_KEY);
  const backup = JSON.stringify({ kind: 'alibi-timeline-backup', schema: 1, save: active });
  const attempts = [];
  const store = make({
    ...storage,
    setItem(key, value) {
      attempts.push(key);
      storage.setItem(key, value);
    },
  });
  assert.equal(store.status().mode, 'saved');
  await assert.rejects(store.restore(backup), /save and recovery exceed/);
  assert.deepEqual(attempts, []);
  assert.equal(storage.getItem(KEY), raw);
  assert.equal(storage.getItem(RECOVERY_KEY), legacy);
});

test('a same-tab save during worker validation invalidates the staged restore', async () => {
  const storage = memory();
  let finish;
  const store = createStore({
    storage,
    locks: locks(),
    validateBackup: (raw, revision) =>
      new Promise((resolve) => {
        finish = () => resolve(parseBackup(raw, revision));
      }),
  });
  const pending = store.reviewBackup(store.exportData());
  const newer = freshRun(puzzle());
  newer.feedback = 'Saved while validating';
  await store.saveRun(newer);
  finish();
  const preview = await pending;
  await assert.rejects(preview.restore(), /changed after the restore preview/);
  assert.equal(make(storage).getRun(puzzle()).feedback, newer.feedback);
  assert.equal(store.recoveryData(), null);
});
