/* Version-1 challenge records. This store never clears sibling/unknown records. */
(function (G) {
  'use strict';
  const NAME = 'alibi-challenges-v1',
    STORE = 'runs',
    copy = (x) => JSON.parse(JSON.stringify(x));
  function create(registry) {
    let db = null,
      mode = 'session',
      revision = 0,
      session = new Map(),
      protectedMode = false,
      queue = Promise.resolve();
    const revisions = new Map();
    const protectedIds = new Set();
    function validateRecord(record, id) {
      try {
        if (record.schema !== 1 || !Number.isInteger(record.revision) || record.revision < 1)
          throw Error('Unsupported record');
        const run = registry.validateRun(record.run);
        if (run.challengeId !== id) throw Error('Record key mismatch');
        return run;
      } catch {
        protectedIds.add(id);
        throw Error(
          'Saved challenge record is unsupported and was preserved. Export or reload before writing.',
        );
      }
    }
    const request = (kind, work) =>
      new Promise((resolve, reject) => {
        let tx,
          timer = setTimeout(() => {
            try {
              tx?.abort();
            } catch {}
            reject(Error('Challenge storage timed out.'));
          }, 2200);
        try {
          tx = db.transaction(STORE, kind);
          let value;
          tx.oncomplete = () => {
            clearTimeout(timer);
            resolve(value);
          };
          tx.onerror = tx.onabort = () => {
            clearTimeout(timer);
            reject(tx.error || Error('Challenge storage failed.'));
          };
          work(tx.objectStore(STORE), (v) => {
            value = v;
          });
        } catch (error) {
          clearTimeout(timer);
          reject(error);
        }
      });
    async function open() {
      if (db || protectedMode) return info();
      if (!G.indexedDB) {
        mode = 'session';
        return info();
      }
      try {
        db = await new Promise((resolve, reject) => {
          const r = G.indexedDB.open(NAME, 1),
            timer = setTimeout(() => reject(Error('Challenge storage timed out.')), 2200);
          r.onupgradeneeded = () => {
            if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE);
          };
          r.onsuccess = () => {
            clearTimeout(timer);
            resolve(r.result);
          };
          r.onerror = r.onblocked = () => {
            clearTimeout(timer);
            reject(r.error || Error('Challenge storage unavailable.'));
          };
        });
        db.onversionchange = () => {
          db.close();
          protectedMode = true;
        };
        mode = 'indexeddb';
      } catch {
        protectedMode = true;
        mode = 'session';
      }
      return info();
    }
    async function read(id) {
      // A refused write must not prevent reading/exporting the last committed run.
      await queue.catch(() => {});
      const record =
        mode === 'indexeddb'
          ? await request('readonly', (s, done) => {
              s.get(id).onsuccess = (e) => done(e.target.result);
            })
          : session.get(id);
      if (!record) return null;
      const run = validateRecord(record, id);
      revision = record.revision;
      revisions.set(id, record.revision);
      return run;
    }
    function write(run, restoring = false) {
      const checked = registry.validateRun(run);
      queue = queue
        .catch(() => {})
        .then(async () => {
          if (protectedMode)
            throw Error('Challenge storage is protected. Export or reload before writing.');
          const id = checked.challengeId,
            expected = revisions.get(id) || 0,
            record = { schema: 1, revision: expected + 1, run: checked };
          if (protectedIds.has(id))
            throw Error('This challenge save is protected and was preserved.');
          if (mode === 'indexeddb') await cas(id, record, expected, restoring);
          else {
            if (restoring) throw Error('Restore requires transactional challenge storage.');
            const current = session.get(id);
            if ((current?.revision || 0) !== expected)
              throw Error('Another tab changed this challenge save.');
            session.set(id, copy(record));
          }
          revision = record.revision;
          revisions.set(id, record.revision);
          return copy(checked);
        });
      return queue;
    }
    function cas(id, record, expected, restoring) {
      return new Promise((resolve, reject) => {
        let conflict = false,
          protectedError = null,
          tx;
        try {
          tx = db.transaction(STORE, 'readwrite');
          const timer = setTimeout(() => {
            try {
              tx.abort();
            } catch {}
            reject(Error('Challenge storage timed out.'));
          }, 2200);
          tx.oncomplete = () => {
            clearTimeout(timer);
            resolve();
          };
          tx.onerror = () => {
            clearTimeout(timer);
            reject(tx.error || Error('Challenge storage failed.'));
          };
          tx.onabort = () => {
            clearTimeout(timer);
            reject(
              protectedError ||
                (conflict
                  ? Error('Another tab changed this challenge save.')
                  : tx.error || Error('Challenge storage failed.')),
            );
          };
          const read = tx.objectStore(STORE).get(id);
          read.onsuccess = () => {
            if (read.result !== undefined) {
              try {
                validateRecord(read.result, id);
              } catch (error) {
                protectedError = error;
                tx.abort();
                return;
              }
            }
            if ((read.result?.revision || 0) !== expected) {
              conflict = true;
              tx.abort();
              return;
            }
            const store = tx.objectStore(STORE);
            if (restoring && read.result)
              store.put({ at: Date.now(), record: read.result }, 'recovery:' + id);
            store.put(record, id);
          };
        } catch (error) {
          reject(error);
        }
      });
    }
    async function recovery(id) {
      const value =
        mode === 'indexeddb'
          ? await request('readonly', (s, done) => {
              s.get('recovery:' + id).onsuccess = (e) => done(e.target.result);
            })
          : null;
      if (!value?.record) return null;
      return registry.validateRun(value.record.run);
    }
    function info() {
      return { mode, protected: protectedMode, revision };
    }
    return {
      open,
      read,
      write,
      restore: (run) => write(run, true),
      recovery,
      flush: () => queue,
      info,
    };
  }
  G.AlibiChallengeStore = { create };
  if (typeof module !== 'undefined') module.exports = G.AlibiChallengeStore;
})(globalThis);
