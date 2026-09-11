import { record, replay } from './cascade.mjs';

/** A separate, revision-checked IndexedDB store. Never opens or changes alibi-device. */
export async function openReplayStore() {
  let db = null,
    revision = 0,
    value = record(),
    mode = 'session',
    warning = '',
    protectedSave = false;
  try {
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('alibi-block-studio', 1);
      let settled = false;
      const timer = setTimeout(() => {
        settled = true;
        reject(Error('Replay storage timed out.'));
      }, 2500);
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
    const saved = await new Promise((resolve, reject) => {
      const request = db.transaction('replays', 'readonly').objectStore('replays').get('cascade');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
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
    async commit(next) {
      replay(next);
      if (db) {
        try {
          await new Promise((resolve, reject) => {
            const transaction = db.transaction('replays', 'readwrite'),
              store = transaction.objectStore('replays');
            let reason = null;
            const request = store.get('cascade');
            request.onsuccess = () => {
              if ((request.result?.revision || 0) !== revision) {
                reason = Error(
                  'Another tab changed this Cascade replay. Export your current replay, then reload.',
                );
                reason.name = 'ConflictError';
                protectedSave = true;
                transaction.abort();
                return;
              }
              store.put({ revision: revision + 1, value: copy(next) }, 'cascade');
            };
            transaction.oncomplete = resolve;
            transaction.onabort = () =>
              reject(reason || transaction.error || Error('Replay save failed.'));
            transaction.onerror = () => {};
          });
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
        }
      }
      value = copy(next);
    },
    close() {
      db?.close();
      db = null;
    },
  };
}
