/* Isolated version-1 save store. Every wait is bounded; timed-out transactions are aborted.
 * IndexedDB CAS is transactional. localStorage fallback is explicitly single-tab only. */
(function (G) {
  'use strict';
  let db = null,
    mode = 'session',
    revision = 0,
    queue = Promise.resolve(),
    blocked = false,
    onstatus = () => {};
  const NAME = 'alibi-quiet-wing-v1',
    KEY = 'state',
    FALLBACK = NAME + ':fallback',
    DEADLINE = 2200;
  function connect(version = 1) {
    return new Promise((resolve, reject) => {
      let settled = false,
        r,
        t = setTimeout(() => finish(Error('Storage open timed out.')), DEADLINE);
      function finish(err, value) {
        if (settled) {
          value?.close();
          return;
        }
        settled = true;
        clearTimeout(t);
        err ? reject(err) : resolve(value);
      }
      try {
        r = version === null ? indexedDB.open(NAME) : indexedDB.open(NAME, version);
      } catch (e) {
        finish(e);
        return;
      }
      r.onupgradeneeded = () => {
        if (settled || version === null) {
          r.transaction.abort();
          return;
        }
        if (!r.result.objectStoreNames.contains('saves')) r.result.createObjectStore('saves');
      };
      r.onsuccess = () => finish(null, r.result);
      r.onerror = () => finish(r.error || Error('Storage could not open.'));
      r.onblocked = () =>
        finish(Object.assign(Error('Another tab is blocking storage.'), { name: 'BlockedError' }));
    });
  }
  function transact(kind, work) {
    return new Promise((resolve, reject) => {
      let tx,
        result,
        done = false,
        timer;
      function end(e) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        e ? reject(e) : resolve(result);
      }
      try {
        tx = db.transaction('saves', kind);
        timer = setTimeout(() => {
          blocked = true;
          try {
            tx.abort();
          } catch {}
          end(Error('Storage timed out. This tab is read-only; export and reload.'));
        }, DEADLINE);
        tx.oncomplete = () => end();
        tx.onerror = () => end(tx.error || Error('Storage transaction failed.'));
        tx.onabort = () =>
          end(
            Error(
              blocked
                ? 'A newer or stalled save was detected. Export, then reload.'
                : 'Storage transaction aborted.',
            ),
          );
        work(
          tx.objectStore('saves'),
          (value) => {
            result = value;
          },
          tx,
        );
      } catch (e) {
        try {
          tx?.abort();
        } catch {}
        end(e);
      }
    });
  }
  async function open() {
    if (db) db.close();
    blocked = false;
    revision = 0;
    try {
      db = await connect();
      db.onversionchange = () => {
        db.close();
        blocked = true;
        onstatus('Storage changed in another tab. Export, then reload.', 'error');
      };
      mode = 'indexeddb';
    } catch (e) {
      if (e.name === 'VersionError' || e.name === 'BlockedError') {
        blocked = true;
        mode = 'protected';
        onstatus('A newer or blocked database was preserved. Export raw recovery.', 'error');
        return { saved: null, mode, blocked };
      }
      try {
        localStorage.setItem(FALLBACK + ':probe', '1');
        localStorage.removeItem(FALLBACK + ':probe');
        mode = 'local';
      } catch {
        mode = 'session';
      }
    }
    let saved = null;
    try {
      const raw =
        mode === 'indexeddb'
          ? await transact('readonly', (s, set) => {
              s.get(KEY).onsuccess = (e) => set(e.target.result);
            })
          : mode === 'local'
            ? JSON.parse(localStorage.getItem(FALLBACK) || 'null')
            : null;
      if (raw) {
        saved = validate(raw);
        revision = saved.revision;
      }
    } catch (e) {
      blocked = true;
      onstatus(
        'Unreadable or stalled save preserved. Export this session before recovery.',
        'error',
      );
    }
    return { saved, mode, blocked };
  }
  // Never normalize an unrecognized record into a writable older schema.
  function validate(raw) {
    const value = G.QWEngine.validateState(raw);
    function known(source, target) {
      if (!source || typeof source !== 'object') return;
      for (const key of Object.keys(source)) {
        if (!Object.hasOwn(target || {}, key))
          throw Error(
            'Unknown save fields preserved. Export raw recovery before using a newer app.',
          );
        known(source[key], target[key]);
      }
    }
    known(raw, value);
    return value;
  }
  async function raw() {
    if (mode === 'protected') {
      const future = await connect(null);
      try {
        const stores = {};
        for (const name of future.objectStoreNames) {
          stores[name] = await new Promise((resolve, reject) => {
            const tx = future.transaction(name, 'readonly'),
              rows = [];
            const timer = setTimeout(() => {
              try {
                tx.abort();
              } catch {}
              reject(Error('Raw recovery timed out. Stored data is unchanged.'));
            }, DEADLINE);
            tx.oncomplete = () => {
              clearTimeout(timer);
              resolve(rows);
            };
            tx.onabort = tx.onerror = () => {
              clearTimeout(timer);
              reject(tx.error || Error('Raw recovery failed.'));
            };
            tx.objectStore(name).openCursor().onsuccess = (e) => {
              const cursor = e.target.result;
              if (cursor) {
                rows.push({ key: cursor.key, value: cursor.value });
                cursor.continue();
              }
            };
          });
        }
        return {
          format: 'alibi-quiet-wing-raw',
          schema: 1,
          mode,
          databaseVersion: future.version,
          stores,
        };
      } finally {
        future.close();
      }
    }
    if (mode === 'indexeddb')
      return transact('readonly', (s, set) => {
        const rows = [];
        s.openCursor().onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor) return set({ format: 'alibi-quiet-wing-raw', schema: 1, mode, rows });
          rows.push({ key: cursor.key, value: cursor.value });
          cursor.continue();
        };
      });
    return {
      format: 'alibi-quiet-wing-raw',
      schema: 1,
      mode,
      fallback: mode === 'local' ? localStorage.getItem(FALLBACK) : null,
      recovery: mode === 'local' ? localStorage.getItem(FALLBACK + ':recovery') : null,
    };
  }
  async function recovery() {
    if (mode !== 'indexeddb') throw Error('Recovery requires device storage. Export this session.');
    return transact('readonly', (s, set) => {
      s.get('recovery').onsuccess = (e) => set(e.target.result);
    });
  }
  function enqueue(state, recovery) {
    const data = G.QWEngine.clone(state);
    queue = queue
      .catch(() => {})
      .then(async () => {
        if (blocked) throw Error('This tab is read-only to protect a newer or unreadable save.');
        if (mode === 'session') {
          onstatus('Session only · export to keep your work', 'warning');
          return;
        }
        onstatus('Saving…', 'saving');
        data.revision = revision + 1;
        data.savedAt = Date.now();
        if (mode === 'indexeddb') {
          await transact('readwrite', (s, set, tx) => {
            const read = s.get(KEY);
            read.onsuccess = () => {
              if ((read.result?.revision || 0) !== revision) {
                blocked = true;
                tx.abort();
                return;
              }
              if (recovery) s.put({ at: Date.now(), state: read.result || null }, 'recovery');
              s.put(data, KEY);
            };
          });
        } else {
          const current = JSON.parse(localStorage.getItem(FALLBACK) || 'null');
          if ((current?.revision || 0) !== revision) {
            blocked = true;
            throw Error('Another tab changed this save.');
          }
          if (recovery) localStorage.setItem(FALLBACK + ':recovery', JSON.stringify(current));
          localStorage.setItem(FALLBACK, JSON.stringify(data));
        }
        revision = data.revision;
        state.revision = revision;
        onstatus(
          mode === 'indexeddb' ? 'Saved on this device' : 'Saved · single-tab fallback',
          'ok',
        );
        return revision;
      })
      .catch((e) => {
        onstatus(e.message + ' Export to keep your work.', 'error');
        throw e;
      });
    return queue;
  }
  G.QWStore = {
    open,
    write: (s) => enqueue(s, false),
    replace: (s) => {
      if (mode !== 'indexeddb')
        return Promise.reject(Error('Restore requires IndexedDB. Export this session first.'));
      return enqueue(validate(s), true);
    },
    validate,
    raw,
    recovery,
    flush: () => queue,
    status: (f) => (onstatus = f),
    info: () => ({ mode, revision, blocked }),
  };
})(window);
