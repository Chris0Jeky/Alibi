import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { CastleStore } from '../src/castle/storage.mjs';
import { initial, clone, complete } from '../src/castle/engine.mjs';
import { backup, validateBackup, mergeStates } from '../src/castle/backup.mjs';
import * as castleValidation from '../src/castle/backup.mjs';

function validateImport(message) {
  return Promise.resolve().then(() => {
    let result;
    const context = vm.createContext({
      JSON,
      TextEncoder,
      AlibiCastleValidation: castleValidation,
    });
    context.self = context;
    context.postMessage = (value) => (result = value);
    vm.runInContext(fs.readFileSync('src/validator-worker.js', 'utf8'), context);
    context.onmessage({ data: structuredClone(message) });
    if (!result.ok) throw Error(result.error);
    return structuredClone(result.value);
  });
}

let previousValidator;
beforeEach(() => {
  previousValidator = globalThis.AlibiValidateImport;
  globalThis.AlibiValidateImport = validateImport;
});
afterEach(() => {
  if (previousValidator === undefined) delete globalThis.AlibiValidateImport;
  else globalThis.AlibiValidateImport = previousValidator;
});

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

test('restore preparation and merging keep caller-owned nested state detached', () => {
  const current = note('Local note.'),
    incoming = complete(note('Imported note.'), 'gate', [1, 3, 5], true).state;
  current.drafts.gate = [2, 3, 4];
  incoming.drafts.hanoi = [[0, 2]];
  const originalCurrent = clone(current),
    originalIncoming = clone(incoming),
    file = backup(incoming);
  for (const result of [
    mergeStates(current, incoming),
    castleValidation.prepareRestore(file, current, false),
    castleValidation.prepareRestore(file, current, true),
  ]) {
    result.completed.gate.answer[0] = 99;
    result.drafts.hanoi[0][0] = 99;
    result.preferences.sound = !result.preferences.sound;
    result.notes = 'Changed result.';
    assert.deepEqual(current, originalCurrent);
    assert.deepEqual(incoming, originalIncoming);
    assert.deepEqual(file.state, originalIncoming);
  }
});

test('merge adds distinct discoveries, keeps local settings and drafts, and never truncates notes', () => {
  const incoming = complete(note('Imported note.'), 'gate', [1, 3, 5], true).state;
  const firstImported = mergeStates(note(''), incoming);
  assert.equal(
    firstImported.notes,
    '--- Imported notebook ---\nImported note.\n--- End imported notebook ---',
    'first import records bounded provenance',
  );
  assert.deepEqual(
    mergeStates(firstImported, incoming),
    firstImported,
    'immediate repeat deduplicates',
  );
  const firstImportedWithLocalThought = clone(firstImported);
  firstImportedWithLocalThought.notes += '\n\nA local thought after the first import.';
  assert.deepEqual(
    mergeStates(firstImportedWithLocalThought, incoming),
    firstImportedWithLocalThought,
    'repeat import survives later local prose after an empty notebook import',
  );
  let current = note('My note.');
  current.drafts.gate = [2, 3, 4];
  current.preferences.sound = true;
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
  const nearLimit = note('a'.repeat(12000));
  assert.throws(() => mergeStates(nearLimit, incoming), /exceed/);
  assert.equal(
    nearLimit.notes.length,
    12000,
    'refusing an over-limit merge never truncates local notes',
  );
  const emptyBeforeNearLimitImport = note('');
  assert.throws(() => mergeStates(emptyBeforeNearLimitImport, note('b'.repeat(12000))), /exceed/);
  assert.equal(
    emptyBeforeNearLimitImport.notes,
    '',
    'provenance overhead refuses a max-length first import without altering the existing notebook',
  );
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

test('castle restore delegates replay and merge validation and snapshots the input', async () => {
  const d = disk(),
    store = new CastleStore(null);
  d.attach(store);
  const incoming = backup(initial());
  incoming.state.drafts.hanoi = [
    [0, 1],
    [1, 0],
  ];
  let mainReplays = 0,
    workerCalls = 0;
  const log = incoming.state.drafts.hanoi;
  log[Symbol.iterator] = function* () {
    mainReplays++;
    yield* Array.prototype.values.call(this);
  };
  globalThis.AlibiValidateImport = async (message) => {
    workerCalls++;
    assert.equal(message.type, 'castle-restore');
    assert.equal(d.records.size, 0, 'no write before the worker accepts the plan');
    return validateImport(message);
  };
  const restoring = store.restore(incoming);
  assert.equal(mainReplays, 0, 'restore does not synchronously replay the input');
  incoming.state.drafts.hanoi[0] = [0, 0];
  const result = await restoring;
  assert.equal(mainReplays, 0);
  assert.equal(workerCalls, 1);
  assert.deepEqual(result.drafts.hanoi, [
    [0, 1],
    [1, 0],
  ]);
});

test('castle restore refuses invalid input and worker failure without writing', async () => {
  const d = disk(),
    store = new CastleStore(null);
  d.attach(store);
  const invalid = backup(initial());
  invalid.state.drafts.hanoi = [[0, 0]];
  await assert.rejects(store.restore(invalid), /Invalid unfinished board/);
  assert.equal(d.records.size, 0);
  globalThis.AlibiValidateImport = () => Promise.reject(Error('worker deadline'));
  await assert.rejects(store.restore(backup(initial())), /worker deadline/);
  assert.equal(d.records.size, 0);
  assert.equal(store.restoring, false);
});

test('castle restore refuses disk changes during worker validation', async () => {
  const d = disk(),
    store = new CastleStore(null);
  d.attach(store);
  const raced = { schema: 1, revision: 1, state: note('Another tab.') };
  globalThis.AlibiValidateImport = async (message) => {
    const next = await validateImport(message);
    d.records.set('chapter-one', raced);
    return next;
  };
  await assert.rejects(store.restore(backup(initial())), /Another tab/);
  assert.deepEqual(d.records.get('chapter-one'), raced);
  assert.equal(d.records.has('pre-restore-chapter-one'), false);
});
