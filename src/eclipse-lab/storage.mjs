import { validatePuzzle } from './model.mjs';

export const KEY = 'alibi.eclipse.v1';
export const RECOVERY_KEY = 'alibi.eclipse.recovery.v1';
const MAX_BYTES = 768 * 1024;
const MAX_RETAINED = 2 * 1024 * 1024;
const MAX_RUNS = 64;
const clone = (value) => JSON.parse(JSON.stringify(value));
const plain = (value) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const fail = (message) => {
  throw new Error(message);
};
const exact = (value, fields) =>
  plain(value) &&
  Object.keys(value).length === fields.length &&
  fields.every((key) => Object.hasOwn(value, key));
const keyFor = (puzzle) => `${puzzle.id}@${puzzle.revision}`;
const empty = () => ({ kind: 'alibi-eclipse-save', schema: 1, revision: 0, runs: {} });

function board(puzzle, cells) {
  return (
    Array.isArray(cells) &&
    cells.length === puzzle.givens.length &&
    Array.from(cells).every(
      (value, i) =>
        Number.isInteger(value) &&
        value >= -1 &&
        value <= 1 &&
        (puzzle.givens[i] === -1 || value === puzzle.givens[i]),
    )
  );
}
function validateRun(run) {
  if (
    !exact(run, [
      'puzzle',
      'cells',
      'undo',
      'redo',
      'rating',
      'difficulty',
      'feedback',
      'updatedAt',
    ])
  )
    fail('Invalid experiment record.');
  validatePuzzle(run.puzzle);
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(run.puzzle.id)) fail('Invalid experiment identity.');
  if (!board(run.puzzle, run.cells)) fail('Invalid board or changed fixed clue.');
  for (const history of [run.undo, run.redo])
    if (
      !Array.isArray(history) ||
      history.length > 40 ||
      !Array.from(history).every((cells) => board(run.puzzle, cells))
    )
      fail('Invalid experiment history.');
  if (!(
    run.rating === null ||
    (Number.isInteger(run.rating) && run.rating >= 1 && run.rating <= 5)
  ))
    fail('Rating must be from 1 to 5.');
  if (![null, 'gentle', 'just-right', 'tough'].includes(run.difficulty))
    fail('Invalid difficulty impression.');
  if (typeof run.feedback !== 'string' || run.feedback.length > 2000)
    fail('Feedback is limited to 2,000 characters.');
  if (
    typeof run.updatedAt !== 'string' ||
    run.updatedAt.length > 35 ||
    !Number.isFinite(Date.parse(run.updatedAt))
  )
    fail('Invalid experiment date.');
  return run;
}
export function freshRun(puzzle) {
  validatePuzzle(puzzle);
  return {
    puzzle: clone(puzzle),
    cells: puzzle.givens.slice(),
    undo: [],
    redo: [],
    rating: null,
    difficulty: null,
    feedback: '',
    updatedAt: new Date().toISOString(),
  };
}
export function validateSave(save) {
  const fields = ['kind', 'schema', 'revision', 'runs'];
  if (plain(save) && Object.hasOwn(save, 'retainedRaw')) fields.push('retainedRaw');
  if (
    !exact(save, fields) ||
    save.kind !== 'alibi-eclipse-save' ||
    save.schema !== 1 ||
    !Number.isSafeInteger(save.revision) ||
    save.revision < 0 ||
    save.revision >= Number.MAX_SAFE_INTEGER ||
    !plain(save.runs)
  )
    fail('Unknown or invalid experiment save.');
  const runs = Object.entries(save.runs);
  if (runs.length > MAX_RUNS) fail('This lab keeps at most 64 experiment runs.');
  for (const [key, run] of runs) {
    validateRun(run);
    if (key !== keyFor(run.puzzle)) fail('Experiment identity does not match its record.');
  }
  const { retainedRaw, ...active } = save;
  if (
    retainedRaw !== undefined &&
    (typeof retainedRaw !== 'string' || retainedRaw.length > MAX_RETAINED)
  )
    fail('Protected recovery data exceeds its limit. Keep the original backup.');
  if (JSON.stringify(active).length > MAX_BYTES) fail('Experiment save exceeds its size limit.');
  return save;
}
function parseSave(raw) {
  if (typeof raw !== 'string' || raw.length > 6 * 1024 * 1024)
    fail('Experiment save exceeds its size limit.');
  return validateSave(JSON.parse(raw));
}
export function parseBackup(raw) {
  if (typeof raw !== 'string' || raw.length > 6 * 1024 * 1024)
    fail('Choose a lab backup smaller than 6 MB.');
  const value = JSON.parse(raw);
  if (
    !plain(value) ||
    value.kind !== 'alibi-eclipse-backup' ||
    value.schema !== 1 ||
    !Object.hasOwn(value, 'save')
  )
    fail('This is not an Eclipse Lab backup.');
  if (Object.keys(value).some((key) => !['kind', 'schema', 'save', 'recovery'].includes(key)))
    fail('This backup has unknown fields.');
  if (
    value.recovery !== undefined &&
    (!exact(value.recovery, ['raw']) || typeof value.recovery.raw !== 'string')
  )
    fail('Invalid recovery bytes.');
  const save = clone(validateSave(value.save));
  if (value.recovery) {
    if (save.retainedRaw !== undefined && save.retainedRaw !== value.recovery.raw)
      fail(
        'This backup has two protected records. Keep the original file; automatic restore is unavailable.',
      );
    save.retainedRaw = value.recovery.raw;
  }
  return validateSave(save);
}

// LocalStorage is used only while an exclusive Web Lock is held. Without locks,
// play remains available in memory; no compare/write is advertised as atomic.
export function createStore(options = {}) {
  let storage,
    locks,
    raw = null,
    originalRaw = null,
    value = empty(),
    mode = 'saved',
    message = '',
    dirty = false,
    exported = -1,
    readable = true;
  let queue = Promise.resolve();
  try {
    storage = Object.hasOwn(options, 'storage') ? options.storage : globalThis.localStorage;
    locks = Object.hasOwn(options, 'locks') ? options.locks : globalThis.navigator?.locks;
    if (!storage?.getItem || !storage?.setItem) throw Error('Unavailable storage');
    raw = storage.getItem(KEY);
  } catch {
    readable = false;
    mode = 'session';
    message = 'Storage is unavailable. Export your lab session to keep it.';
  }
  if (readable && raw !== null) {
    try {
      value = parseSave(raw);
    } catch {
      originalRaw = raw;
      mode = 'protected';
      message =
        'Existing lab data cannot be read safely. It is preserved; new play stays in this session.';
    }
  }
  if (mode === 'saved' && !locks?.request) {
    mode = 'session';
    message = 'Safe shared saving is unavailable. Export your lab session to keep it.';
  }
  const serial = (action) => {
    const next = queue.then(action);
    queue = next.catch(() => {});
    return next;
  };
  const status = () => ({
    mode,
    message,
    dirty,
    protected: mode === 'protected' || mode === 'conflict',
  });
  const conflict = () => {
    mode = 'conflict';
    message =
      'Another tab changed this lab save. Its data is preserved. Export this session, then reload to read the newer save.';
    return Error(message);
  };
  async function write(next, recovery = false) {
    if (mode === 'protected' || mode === 'conflict' || !readable || !locks?.request) {
      if (recovery) fail('Lab data is protected or read-only. Export this session first.');
      return false;
    }
    try {
      return await locks.request(
        KEY,
        { mode: 'exclusive', signal: AbortSignal.timeout(2000) },
        async () => {
          if (storage.getItem(KEY) !== raw) throw conflict();
          if (recovery) {
            const previousRecovery = storage.getItem(RECOVERY_KEY);
            if (previousRecovery !== null) {
              try {
                parseSave(previousRecovery);
              } catch {
                fail('An unknown recovery copy already exists. It has been preserved.');
              }
            }
            storage.setItem(RECOVERY_KEY, raw ?? JSON.stringify(empty()));
          }
          const encoded = JSON.stringify(validateSave(next));
          storage.setItem(KEY, encoded);
          raw = encoded;
          mode = 'saved';
          message = '';
          dirty = false;
          return true;
        },
      );
    } catch (error) {
      if (mode !== 'conflict') {
        mode = 'session';
        message = recovery
          ? error.message
          : 'The lab could not save on this device. Your edit is still here; export it to keep it.';
      }
      if (recovery) throw error;
      return false;
    }
  }
  return {
    status,
    snapshot: () => clone(value),
    getRun(puzzle) {
      validatePuzzle(puzzle);
      return value.runs[keyFor(puzzle)] ? clone(value.runs[keyFor(puzzle)]) : freshRun(puzzle);
    },
    saveRun(run) {
      // Capture the caller's values now, before a later UI edit can mutate them.
      let captured;
      try {
        captured = clone(validateRun(run));
      } catch (error) {
        return Promise.reject(error);
      }
      return serial(async () => {
        let next = clone(value);
        next.runs[keyFor(captured.puzzle)] = captured;
        next.revision += 1;
        try {
          validateSave(next);
        } catch (error) {
          // A full imported shelf or exhausted revision must not make accepted
          // edits disappear. Preserve the prior shelf intact and start a bounded
          // session beside it, without writing over the persistent record.
          const retained =
            originalRaw === null
              ? JSON.stringify(value)
              : JSON.stringify({ priorRaw: originalRaw, save: value });
          if (retained.length > MAX_RETAINED) throw error;
          originalRaw = retained;
          next = empty();
          next.runs[keyFor(captured.puzzle)] = captured;
          next.revision = 1;
          validateSave(next);
          mode = 'protected';
          message =
            'The previous lab shelf reached its limit and is preserved in your export. New play stays in this session.';
        }
        value = next;
        dirty = true;
        return write(next);
      });
    },
    exportData() {
      return JSON.stringify({
        kind: 'alibi-eclipse-backup',
        schema: 1,
        save: value,
        ...(originalRaw !== null ? { recovery: { raw: originalRaw } } : {}),
      });
    },
    markExported() {
      exported = value.revision;
    },
    async flush() {
      await queue;
      if (dirty && exported !== value.revision)
        fail('Export your Eclipse Lab session before updating.');
    },
    restore(backup, expectedRevision = value.revision) {
      let imported;
      try {
        imported = parseBackup(backup);
      } catch (error) {
        return Promise.reject(error);
      }
      return serial(async () => {
        if (value.revision !== expectedRevision)
          fail('This lab changed after the restore preview. Review the backup again.');
        if (mode === 'protected' || mode === 'conflict' || !readable || !locks?.request)
          fail('Lab data is protected or read-only. Export this session first.');
        if (dirty && exported !== value.revision)
          fail('Export the unsaved lab session before restoring.');
        const next = { ...imported, revision: value.revision + 1 };
        validateSave(next);
        await write(next, true);
        value = next;
        dirty = false;
        exported = -1;
      });
    },
    recoveryData() {
      if (!readable) fail('Recovery storage is unavailable.');
      const previous = storage.getItem(RECOVERY_KEY);
      if (previous === null) return null;
      return JSON.stringify({ kind: 'alibi-eclipse-backup', schema: 1, save: parseSave(previous) });
    },
  };
}
