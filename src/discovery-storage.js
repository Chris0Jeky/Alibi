// Atomic persistence for the unwired discovery-entitlement state.
// Emitted as a deferred, non-precache asset until a presenter owns loading.
/* The build emits this as a hashed distribution asset; the initial cabinet never evaluates or precaches it. */
(function (root) {
  'use strict';
  class GenerationConflictError extends Error {
    constructor() {
      super('This metadata changed in another tab. Reload its latest state before writing.');
      this.name = 'GenerationConflictError';
    }
  }
  class ProtectedRecordError extends Error {
    constructor() {
      super(
        'Stored metadata is from an unsupported or damaged version. Preserve it unchanged and reopen the latest app.',
      );
      this.name = 'ProtectedRecordError';
    }
  }
  const aborted = () => Error('Metadata transaction aborted.');

  async function compareAndSwapMeta(store, key, expectedGeneration, value) {
    if (typeof key !== 'string' || !key || key.length > 200)
      throw Error('Metadata key must be a non-empty string of at most 200 characters.');
    if (
      !Number.isSafeInteger(expectedGeneration) ||
      expectedGeneration < 0 ||
      expectedGeneration === Number.MAX_SAFE_INTEGER
    )
      throw Error('Metadata generation limit.');
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw Error('Metadata value must be an object.');
    if (!Number.isSafeInteger(value.schema) || value.schema < 1)
      throw Error('Metadata schema must be a positive safe integer.');
    if (!Number.isSafeInteger(value.generation) || value.generation !== expectedGeneration + 1)
      throw Error('Metadata next generation must advance exactly once.');

    // Clone before any asynchronous work so later caller mutation cannot alter the commit.
    const next = root.AlibiCore.clone(value);
    if (!store?.db)
      throw Error(
        'Compare-and-swap metadata requires IndexedDB. This browser cannot safely coordinate another tab.',
      );

    return new Promise((resolve, reject) => {
      let failure = null;
      const tx = store.db.transaction('meta', 'readwrite'),
        objectStore = tx.objectStore('meta'),
        request = objectStore.get(key),
        stop = (error) => {
          failure = error;
          tx.abort();
        };
      store.watch(tx, reject);
      request.onsuccess = () => {
        const record = request.result;
        if (!record) {
          if (expectedGeneration !== 0) {
            stop(new GenerationConflictError());
            return;
          }
          objectStore.put({ key, value: next });
          return;
        }

        const current = record.value;
        if (
          !current ||
          typeof current !== 'object' ||
          Array.isArray(current) ||
          !Number.isSafeInteger(current.schema) ||
          current.schema < 1 ||
          !Number.isSafeInteger(current.generation) ||
          current.generation < 1 ||
          current.schema !== next.schema
        ) {
          stop(new ProtectedRecordError());
          return;
        }
        if (current.generation !== expectedGeneration) {
          stop(new GenerationConflictError());
          return;
        }
        objectStore.put({ key, value: next });
      };
      request.onerror = () => {
        failure = request.error;
      };
      tx.oncomplete = () => resolve(root.AlibiCore.clone(next));
      tx.onerror = () => reject(failure || tx.error);
      tx.onabort = () => reject(failure || tx.error || aborted());
    });
  }

  root.AlibiDiscoveryStorage = Object.freeze({
    compareAndSwapMeta,
    GenerationConflictError,
    ProtectedRecordError,
  });
})(globalThis);