import test from 'node:test';
import assert from 'node:assert/strict';
import { mount, flushDrafts } from '../src/timeline-lab/player.mjs';
import { createStore, freshRun, KEY } from '../src/timeline-lab/storage.mjs';
import { PUZZLES } from '../src/timeline-lab/puzzles.mjs';

test('a restore waiting for the lock keeps newer drafts and prevents stale board writes', async (t) => {
  const puzzle = PUZZLES[0];
  const id = puzzle.id + '@' + puzzle.revision;
  const save = (run) => ({
    kind: 'alibi-timeline-save',
    schema: 1,
    revision: 1,
    runs: { [id]: run },
  });
  const initial = freshRun(puzzle);
  initial.feedback = 'Prior saved note';
  initial.rating = 2;
  initial.difficulty = 'gentle';
  const imported = freshRun(puzzle);
  imported.marks[0] = 2;
  imported.feedback = 'Imported note';
  imported.rating = 5;
  imported.difficulty = 'tough';
  const storage = new Map([[KEY, JSON.stringify(save(initial))]]);
  let unlock;
  const gate = new Promise((resolve) => {
    unlock = resolve;
  });
  let requestCount = 0;
  const store = createStore({
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    locks: {
      async request(_key, _options, callback) {
        if (++requestCount === 1) await gate;
        return callback();
      },
    },
  });
  const events = new Map();
  const root = {
    activeElement: null,
    host: { dataset: {} },
    innerHTML: '',
    querySelector: () => null,
    addEventListener: (event, handler) => events.set(event, handler),
    removeEventListener: (event) => events.delete(event),
  };
  const previousLocation = globalThis.location;
  globalThis.location = { hash: '#/quiet/timeline/' + puzzle.id };
  const app = mount({ root, css: '', store });
  const click = (selector, data) =>
    events.get('click')({
      target: { closest: (query) => (query === selector ? { dataset: data } : null) },
    });
  t.after(async () => {
    unlock();
    await click('[data-action]', { action: 'discard-feedback' });
    app.dispose();
    if (previousLocation === undefined) delete globalThis.location;
    else globalThis.location = previousLocation;
  });
  await app.route();
  const raw = JSON.stringify({ kind: 'alibi-timeline-backup', schema: 1, save: save(imported) });
  await events.get('change')({
    target: {
      matches: (selector) => selector === '[data-file]',
      files: [{ size: Buffer.byteLength(raw), text: async () => raw }],
    },
  });
  const restoring = click('[data-action]', { action: 'restore' });
  await Promise.resolve();
  assert.equal(requestCount, 1, 'restore is waiting inside the storage lock request');
  events.get('input')({
    target: {
      value: 'New note while restore waits',
      matches: (selector) => selector === '[data-feedback]',
    },
  });
  const staleMark = click('[data-cell]', { cell: '1' });
  const staleWrite = assert.rejects(store.saveRun(initial), /restore/i);
  const nextRoot = {
    ...root,
    innerHTML: '',
    addEventListener() {},
    removeEventListener() {},
  };
  const nextMount = mount({ root: nextRoot, css: '', store });
  t.after(() => nextMount.dispose());
  const nextRoute = nextMount.route();
  await Promise.resolve();
  assert.equal(nextRoot.innerHTML, '', 'a remount waits for the pending store restore');
  unlock();
  await Promise.all([restoring, staleMark, staleWrite, nextRoute]);

  assert.equal(requestCount, 1, 'neither stale edit attempted a persistent write');
  assert.deepEqual(store.getRun(puzzle).marks, imported.marks);
  assert.equal(store.getRun(puzzle).feedback, 'Imported note');
  assert.match(root.innerHTML, /New note while restore waits/);
  assert.match(nextRoot.innerHTML, /value="5" checked/);
  assert.match(nextRoot.innerHTML, /New note while restore waits/);
  assert.throws(flushDrafts, /draft/);
  await click('[data-action]', { action: 'save-feedback' });
  assert.equal(store.getRun(puzzle).feedback, 'New note while restore waits');
  assert.equal(store.getRun(puzzle).rating, 5);
  assert.equal(store.getRun(puzzle).difficulty, 'tough');
  assert.doesNotThrow(flushDrafts);
});
