import test from 'node:test';
import assert from 'node:assert/strict';
import { CastleStore } from '../src/castle/storage.mjs';
import { initial, clone, complete } from '../src/castle/engine.mjs';
import { backup, validateBackup, mergeStates } from '../src/castle/backup.mjs';

function note(text) {
  const s = initial();
  s.notes = text;
  return s;
}
function disk() {
  const records = new Map();
  let tail = Promise.resolve(),
    failed = false;
  return {
    records,
    failNextPut() {
      failed = true;
    },
    attach(store) {
      store.mode = 'local';
      store.transaction = (mode, operation) => {
        const task = tail.then(
          () =>
            new Promise((resolve, reject) => {
              const staged = new Map();
              let result, failure;
              operation(
                {
                  get(key) {
                    const request = {};
                    queueMicrotask(() => {
                      request.result = clone(records.get(key) ?? null) ?? undefined;
                      if (request.result === null) request.result = undefined;
                      request.onsuccess();
                      if (failure) {
                        reject(failure);
                        return;
                      }
                      for (const [k, v] of staged) records.set(k, clone(v));
                      resolve(result);
                    });
                    return request;
                  },
                  put(value, key) {
                    assert.equal(mode, 'readwrite');
                    if (failed) {
                      failed = false;
                      throw Object.assign(Error('Disk full'), { name: 'QuotaExceededError' });
                    }
                    staged.set(key, clone(value));
                  },
                },
                (value) => {
                  result = value;
                },
                (error) => {
                  failure = error;
                },
              );
            }),
        );
        tail = task.catch(() => {});
        return task;
      };
    },
  };
}

test('castle backup validates known exports and refuses future, unknown and unbounded records', () => {
  const file = backup(note('Keep this.'));
  assert.deepEqual(validateBackup(file).state, note('Keep this.'));
  for (const change of [
    (f) => {
      f.version = 2;
    },
    (f) => {
      f.state.future = true;
    },
    (f) => {
      f.state.completed.inference = { answer: 'possible-not-proven', guided: false };
    },
    (f) => {
      f.state.notes = 'a'.repeat(12001);
    },
    (f) => {
      f.hidden = 'unknown';
    },
    (f) => {
      f.state.drafts.hanoi = [
        [0, 2],
        [0, 2],
      ];
    },
  ]) {
    const invalid = clone(file);
    change(invalid);
    assert.throws(() => validateBackup(invalid));
  }
});

test('merge adds distinct discoveries, keeps local settings and drafts, and never truncates notes', () => {
  let current = note('My note.');
  current.drafts.gate = [2, 3, 4];
  current.preferences.sound = true;
  const incoming = complete(note('Imported note.'), 'gate', [1, 3, 5], true).state;
  const merged = mergeStates(current, incoming);
  assert.equal(merged.preferences.sound, true);
  assert.equal(merged.completed.gate.guided, true);
  assert.equal(merged.drafts.gate, undefined);
  assert.equal(
    merged.notes,
    'My note.\n\n--- Imported notebook ---\nImported note.\n--- End imported notebook ---',
  );
  assert.deepEqual(mergeStates(merged, incoming), merged);
  const appended = clone(merged);
  appended.notes += '\n\nA local thought after the import.';
  assert.deepEqual(
    mergeStates(appended, incoming),
    appended,
    'repeat import survives later local prose',
  );
  const ordinaryLocal = note('Imported note. is ordinary local prose, not a labelled import.');
  assert.match(mergeStates(ordinaryLocal, incoming).notes, /--- Imported notebook ---/);
  const revised = note('Imported note, revised.');
  const multiple = mergeStates(mergeStates(appended, revised), note('A third field note.'));
  assert.equal((multiple.notes.match(/--- Imported notebook ---/g) || []).length, 3);
  assert.deepEqual(
    mergeStates(multiple, revised),
    multiple,
    'each exact labelled section deduplicates',
  );
  const legacySuffix = note('My note.\n\n--- Imported notebook ---\nImported note.');
  assert.equal(
    mergeStates(legacySuffix, incoming).notes,
    legacySuffix.notes,
    'a pre-delimiter legacy imported suffix still deduplicates',
  );
  const ambiguousLegacy = note(
    'My note.\n\n--- Imported notebook ---\nImported note.\n\nA later local thought.',
  );
  const retainedAmbiguous = mergeStates(ambiguousLegacy, incoming);
  assert.match(
    retainedAmbiguous.notes,
    /A later local thought\.\n\n--- Imported notebook ---\nImported note\.\n--- End imported notebook ---/,
    'an ambiguous legacy middle section is retained and imports a new bounded section',
  );
  assert.throws(() => mergeStates(note('a'.repeat(12000)), incoming), /exceed/);
});

test('restore commits recovery and replacement atomically, and leaves unrelated records alone', async () => {
  const d = disk(),
    store = new CastleStore(null);
  d.attach(store);
  d.records.set('future-other-chapter', { version: 100 });
  const s = note('Before restore.');
  s.revision = 1;
  await store.save(s);
  const next = await store.restore(backup(note('After restore.')), {
    replace: true,
    expectedRevision: 1,
  });
  assert.equal(next.notes, 'After restore.');
  assert.equal(next.revision, 2);
  assert.equal(d.records.get('chapter-one').revision, 2);
  assert.equal((await store.recovery()).state.notes, 'Before restore.');
  assert.deepEqual(d.records.get('future-other-chapter'), { version: 100 });
  const before = clone([...d.records]);
  d.failNextPut();
  await assert.rejects(
    store.restore(backup(note('Must not commit.')), { replace: true }),
    /Disk full/,
  );
  assert.deepEqual([...d.records], before);
  assert.equal(store.state.notes, 'After restore.');
  const beforeMergeFailure = clone([...d.records]);
  await assert.rejects(
    store.restore(backup(note('b'.repeat(12000))), { replace: false }),
    /exceed/,
  );
  assert.deepEqual(
    [...d.records],
    beforeMergeFailure,
    'failed note merge preserves state and recovery',
  );
  assert.equal(store.state.notes, 'After restore.');
});

test('stale and unknown current records cannot be overwritten by restore', async () => {
  const d = disk(),
    first = new CastleStore(null),
    stale = new CastleStore(null);
  d.attach(first);
  d.attach(stale);
  await first.restore(backup(note('First writer.')), { replace: true });
  await assert.rejects(
    stale.restore(backup(note('Stale writer.')), { replace: true }),
    /Another tab/,
  );
  assert.equal(d.records.get('chapter-one').state.notes, 'First writer.');
  const future = { schema: 7, revision: 2, state: { unknown: true } };
  d.records.set('chapter-one', future);
  await assert.rejects(first.restore(backup(note('Do not replace.')), { replace: true }), /newer/);
  assert.deepEqual(d.records.get('chapter-one'), future);
});

test('session acknowledgement is explicit, tied to exact exported content and never enables restore', async () => {
  const store = await new CastleStore(null).init();
  const first = note('Session one.');
  first.revision = 1;
  await store.save(first);
  assert.throws(() => store.acknowledgeExport(), /Export/);
  store.export();
  await assert.rejects(store.flush()); // a download request or cancellation is not confirmation
  store.acknowledgeExport();
  await store.flush();
  await assert.rejects(store.restore(backup(initial())), /IndexedDB/);
  const second = note('Session two.');
  second.revision = 2;
  await store.save(second);
  await assert.rejects(store.flush());
  assert.throws(() => store.acknowledgeExport(), /changed/);
});

test('restore review rejects a changed notebook and serializes concurrent operations', async () => {
  const d = disk(),
    store = new CastleStore(null);
  d.attach(store);
  const first = note('Local edit.');
  first.revision = 1;
  await store.save(first);
  await assert.rejects(store.restore(backup(initial()), { expectedRevision: 0 }), /changed/);
  const restoring = store.restore(backup(note('Restored.')), { replace: true });
  assert.throws(() => store.save({ ...note('Racing edit.'), revision: 2 }), /Wait/);
  await assert.rejects(store.restore(backup(initial())), /already/);
  await restoring;
  assert.equal(store.state.notes, 'Restored.');
  assert.equal(store.restoring, false);
});
