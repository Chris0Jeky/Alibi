import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStore,
  freshRun,
  validateSave,
  parseBackup,
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
const make = (storage = memory(), lock = locks()) => createStore({ storage, locks: lock });
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
  const previous = storage.getItem(KEY);
  await s.restore(backup, s.snapshot().revision);
  assert.equal(storage.getItem(RECOVERY_KEY), previous);
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
