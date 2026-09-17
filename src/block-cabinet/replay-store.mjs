import { record, replay } from './cascade.mjs';

/** A separate, revision-checked IndexedDB store. Never opens or changes alibi-device. */
export async function openReplayStore({ timeout = 2500 } = {}) {
  timeout = Number.isFinite(timeout) && timeout >= 1 ? Math.min(Math.floor(timeout), 30000) : 2500;
  let db = null,
    revision = 0,
    value = record(),
    mode = 'session',
    warning = '',
    protectedSave = false;
  const transaction = (kind, work, timeoutMessage) =>
    new Promise((resolve, reject) => {
      let tx = null,
        timer = null,
        settled = false,
        result,
        reason = null;
      const finish = (error, next = result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error);
        else resolve(next);
      };
      const abort = (error) => {
        reason = error;
        try {
          tx?.abort();
        } catch {}
        finish(error);
      };
      try {
        tx = db.transaction('replays', kind);
        timer = setTimeout(() => {
          const error = Object.assign(Error(timeoutMessage), { name: 'TimeoutError' });
          abort(error);
        }, timeout);
        tx.oncomplete = () => finish(null);
        tx.onabort = () => finish(reason || tx.error || Error('Replay storage failed.'));
        // IndexedDB reports request failures again through transaction abort. Keep one owner for rejection.
        tx.onerror = () => {};
        work(tx.objectStore('replays'), {
          value(next) {
            result = next;
          },
          abort,
        });
      } catch (error) {
        abort(error);
      }
    });
  try {
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('alibi-block-studio', 1);
      let settled = false;
      const timer = setTimeout(() => {
        settled = true;
        reject(Error('Replay storage timed out.'));
      }, timeout);
      request.onupgradeneeded = () => {
        if (settled) request.transaction.abort();
        else request.result.createObjectStore('replays');
      };
      request.onsuccess = () => {
        clearTimeout(timer);
        if (settled) request.result.close();
        else {
          settled = true;
          resolve(request.result);
        }
      };
      request.onerror = () => {
        clearTimeout(timer);
        settled = true;
        reject(request.error);
      };
      request.onblocked = () => {
        clearTimeout(timer);
        settled = true;
        reject(Error('Replay storage is blocked by another tab.'));
      };
    });
    const saved = await transaction(
      'readonly',
      (store, control) => {
        const request = store.get('cascade');
        request.onsuccess = () => control.value(request.result);
        request.onerror = () =>
          control.abort(request.error || Error('Replay storage could not be read.'));
      },
      'Replay storage read timed out.',
    );
    if (saved) {
      if (!Number.isSafeInteger(saved.revision) || saved.revision < 1)
        throw Error('Unsupported saved revision.');
      replay(saved.value);
      value = saved.value;
      revision = saved.revision;
    }
    mode = 'indexeddb';
    db.onversionchange = () => {
      db.close();
      db = null;
      mode = 'session';
      protectedSave = true;
      warning = 'Storage changed in another tab. Export this session.';
    };
  } catch (error) {
    db?.close();
    db = null;
    mode = 'session';
    protectedSave = true;
    warning =
      'Storage unavailable or an existing replay is protected. Session only; export to keep it.';
  }
  const copy = (x) => JSON.parse(JSON.stringify(x));
  return {
    read: () => copy(value),
    label: () =>
      warning ||
      (mode === 'indexeddb'
        ? 'Cascade saves in its own device-local store. Export separately from the Club backup.'
        : 'Session only. Export this Cascade replay before leaving.'),
    diagnostics: () => ({ mode, revision, protectedSave, warning }),
    canReplace: () => !!db && !protectedSave,
    async commit(next, { persistent = false } = {}) {
      replay(next);
      if (persistent && (!db || protectedSave))
        throw Error('Replay replacement is unavailable while this device save is protected.');
      if (
        db &&
        (!Number.isSafeInteger(revision) || revision < 0 || revision >= Number.MAX_SAFE_INTEGER)
      ) {
        db.close();
        db = null;
        mode = 'session';
        protectedSave = true;
        warning = 'Replay revision limit reached. Export this session before leaving.';
        if (persistent)
          throw Error('Replay replacement could not be saved. Export or reload first.');
        value = copy(next);
        return;
      }
      if (db) {
        try {
          let reason = null;
          await transaction(
            'readwrite',
            (store, control) => {
              const request = store.get('cascade');
              request.onerror = () =>
                control.abort(request.error || Error('Replay storage could not be read.'));
              request.onsuccess = () => {
                if ((request.result?.revision || 0) !== revision) {
                  reason = Error(
                    'Another tab changed this Cascade replay. Export your current replay, then reload.',
                  );
                  reason.name = 'ConflictError';
                  protectedSave = true;
                  control.abort(reason);
                  return;
                }
                try {
                  store.put({ revision: revision + 1, value: copy(next) }, 'cascade');
                } catch (error) {
                  control.abort(error);
                }
              };
            },
            'Replay storage save timed out.',
          );
          revision++;
        } catch (error) {
          if (error.name === 'ConflictError') {
            warning = error.message;
            throw error;
          }
          db.close();
          db = null;
          mode = 'session';
          protectedSave = true;
          warning =
            'The device could not save. Current play is session-only; export before leaving.';
          if (persistent)
            throw Error('Replay replacement could not be saved. Export or reload first.');
        }
      }
      if (persistent && (!db || protectedSave))
        throw Error('Replay replacement could not be saved. Export or reload first.');
      value = copy(next);
    },
    close() {
      db?.close();
      db = null;
    },
  };
}
