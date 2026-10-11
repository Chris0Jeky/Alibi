/* Device-local persistence. IndexedDB transactions keep a save and its revision atomic.
   Local run records are read-only without IndexedDB; session writes stay ephemeral. */
(function (root) {
  'use strict';
  const PREFIX = 'alibi.v1.',
    DB = 'alibi-device',
    VERSION = 1,
    blocked = (message) => Object.assign(Error(message), { name: 'BlockedError' }),
    aborted = () => Error('Storage transaction aborted.'),
    readOnly = () =>
      Error('Local progress is read-only without IndexedDB. Export this session before reloading.');
  class ConflictError extends Error {
    constructor() {
      super('This puzzle changed in another tab. Reload its latest save or export this session.');
      this.name = 'ConflictError';
    }
  }
  class Store {
    constructor() {
      this.db = null;
      this.mode = 'session';
      this.memory = { runs: {}, packs: {}, meta: {} };
      this.problem = null;
      this.fatal = false;
      this.damaged = {};
      this.legacyInventory = [];
      this.legacyProblem = null;
    }
    legacySnapshot() {
      let ls, count;
      try {
        ls = root.localStorage;
        if (!ls) throw Error('localStorage is unavailable.');
        count = ls.length;
      } catch (e) {
        throw Error(
          'Older browser data could not be checked: ' + (e?.message || String(e)),
        );
      }
      const entries = [];
      for (let i = 0; i < count; i++) {
        let key;
        try {
          key = ls.key(i);
        } catch (e) {
          throw Error(
            'Older browser data could not be checked: ' + (e?.message || String(e)),
          );
        }
        if (key === null || key === undefined)
          throw Error('Older browser data could not be fully read: a storage key is missing.');
        if (!key.startsWith(PREFIX) || key === PREFIX + 'probe') continue;
        let value;
        try {
          value = ls.getItem(key);
        } catch (e) {
          throw Error(
            'Older browser data could not be read: ' + (e?.message || String(e)),
          );
        }
        if (value === null || value === undefined)
          throw Error('Older browser data changed while reading; nothing was exported.');
        entries.push({ key, value: String(value) });
      }
      return entries;
    }
    async init() {
      try {
        this.legacyInventory = this.legacySnapshot();
        this.legacyProblem = null;
      } catch (e) {
        this.legacyInventory = [];
        this.legacyProblem = e?.message || String(e);
      }
      try {
        if (!root.indexedDB) throw Error('IndexedDB is unavailable.');
        this.db = await new Promise((resolve, reject) => {
          const request = indexedDB.open(DB, VERSION);
          let abandoned = false;
          const timer = setTimeout(() => {
            abandoned = true;
            reject(
              blocked(
                'Opening saved progress timed out. Close other Alibi windows and reload. Your existing saves have not been changed.',
              ),
            );
          }, 8000);
          request.onupgradeneeded = () => {
            if (abandoned) {
              request.transaction.abort();
              return;
            }
            for (const n of ['runs', 'packs', 'meta'])
              if (!request.result.objectStoreNames.contains(n))
                request.result.createObjectStore(n, { keyPath: 'key' });
          };
          request.onsuccess = () => {
            clearTimeout(timer);
            if (abandoned) request.result.close();
            else resolve(request.result);
          };
          request.onerror = () => {
            clearTimeout(timer);
            reject(request.error);
          };
          request.onblocked = () => {
            clearTimeout(timer);
            abandoned = true;
            reject(blocked('Close another Alibi tab to finish opening storage, then reload.'));
          };
        });
        this.db.onversionchange = () => {
          this.db.close();
          this.problem = 'Storage was upgraded in another tab. Reload before playing.';
          root.dispatchEvent(new Event('alibi-storage-change'));
        };
        this.mode = 'indexeddb';
        return this;
      } catch (error) {
        this.problem = error.message;
        if (error.name === 'VersionError' || error.name === 'BlockedError') {
          this.fatal = true;
          if (error.name === 'VersionError')
            this.problem =
              'These saves were created by a newer version of Alibi. Reopen the latest app. The existing database has not been modified.';
          return this;
        }
      }
      try {
        localStorage.setItem(PREFIX + 'probe', '1');
        localStorage.removeItem(PREFIX + 'probe');
        this.mode = 'local';
        this.problem = readOnly().message;
      } catch (e) {
        this.mode = 'session';
      }
      return this;
    }
    watch(tx, reject) {
      const timer = setTimeout(() => {
        const error = Error(
          'Saved progress stopped responding. Export your current session, close other Alibi windows, and reload.',
        );
        reject(error);
        try {
          tx.abort();
        } catch {}
        this.problem = error.message;
        root.dispatchEvent(new Event('alibi-storage-change'));
      }, 8000);
      const finish = () => clearTimeout(timer);
      tx.addEventListener('complete', finish, { once: true });
      tx.addEventListener('error', finish, { once: true });
      tx.addEventListener(
        'abort',
        () => {
          finish();
          if (!tx.onabort) reject(tx.error || aborted());
        },
        { once: true },
      );
    }
    async getAll(store) {
      if (this.db)
        return new Promise((resolve, reject) => {
          const tx = this.db.transaction(store, 'readonly'),
            r = tx.objectStore(store).getAll();
          this.watch(tx, reject);
          r.onsuccess = () => resolve(r.result.map((x) => x.value));
          r.onerror = () => reject(r.error);
        });
      if (this.mode === 'local') {
        const out = [],
          damaged = [],
          prefix = PREFIX + store + '.';
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            try {
              out.push(JSON.parse(localStorage.getItem(key)));
            } catch {
              damaged.push(key.slice(prefix.length));
            }
          }
        }
        this.damaged[store] = out.damaged = damaged;
        return out;
      }
      return Object.values(this.memory[store]);
    }
    async get(store, key) {
      if (this.db)
        return new Promise((resolve, reject) => {
          const tx = this.db.transaction(store, 'readonly'),
            r = tx.objectStore(store).get(key);
          this.watch(tx, reject);
          r.onsuccess = () => resolve(r.result?.value);
          r.onerror = () => reject(r.error);
        });
      if (this.mode === 'local') {
        const v = localStorage.getItem(PREFIX + store + '.' + key);
        if (v === null) return undefined;
        try {
          return JSON.parse(v);
        } catch (e) {
          throw Error('A saved record is damaged. Export browser data before resetting anything.');
        }
      }
      return this.memory[store][key];
    }
    async put(store, key, value) {
      if (this.db)
        return new Promise((resolve, reject) => {
          const tx = this.db.transaction(store, 'readwrite');
          this.watch(tx, reject);
          tx.objectStore(store).put({ key, value });
          tx.oncomplete = () => resolve(value);
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error || aborted());
        });
      if (this.mode === 'local') {
        if (store === 'runs') throw readOnly();
        localStorage.setItem(PREFIX + store + '.' + key, JSON.stringify(value));
      } else this.memory[store][key] = value;
      return value;
    }
    async saveRun(record, expectedRevision) {
      // Validate the input and its increment before cloning or writing an unsafe revision.
      if (
        !Number.isInteger(expectedRevision) ||
        !Number.isSafeInteger(expectedRevision + 1) ||
        expectedRevision < 0
      )
        throw Error('Revision limit.');
      if (!this.db && this.mode === 'local') throw readOnly();
      const key = record.key;
      const next = AlibiCore.clone(record);
      next.rev = expectedRevision + 1;
      next.updatedAt = new Date().toISOString();
      if (this.db)
        return new Promise((resolve, reject) => {
          let conflict = false;
          const tx = this.db.transaction('runs', 'readwrite'),
            os = tx.objectStore('runs'),
            r = os.get(key);
          this.watch(tx, reject);
          r.onsuccess = () => {
            const old = r.result?.value;
            let invalid = false;
            try {
              if (old !== undefined) this.validateRun?.(old);
            } catch {
              invalid = true;
            }
            if (
              invalid ||
              (r.result !== undefined &&
                (!old ||
                  r.result.key !== key ||
                  old.key !== key ||
                  old.schemaVersion !== 1 ||
                  !Number.isSafeInteger(old.rev) ||
                  old.rev < 0)) ||
              (old?.rev ?? 0) !== expectedRevision
            ) {
              conflict = true;
              tx.abort();
            } else os.put({ key, value: next });
          };
          tx.oncomplete = () => resolve(next);
          tx.onerror = () => reject(tx.error);
          tx.onabort = () =>
            reject(conflict ? new ConflictError() : tx.error || Error('Save aborted.'));
        });
      // Session memory belongs to this Store. Compare and write without yielding.
      const old = this.memory.runs[key];
      if (
        old !== undefined &&
        (!old ||
          old.schemaVersion !== 1 ||
          old.key !== key ||
          !Number.isSafeInteger(old.rev) ||
          old.rev < 0)
      )
        throw Error(
          'A saved record is damaged or from an unsupported version. Nothing was changed.',
        );
      if (old !== undefined) this.validateRun?.(old);
      if ((old?.rev || 0) !== expectedRevision) throw new ConflictError();
      return this.put('runs', key, next);
    }
    async export() {
      const runs = await this.getAll('runs'),
        packs = await this.getAll('packs'),
        metaDamaged = [];
      let settings = {},
        preferences = {};
      for (const key of ['settings', 'preferences'])
        try {
          const value = await this.get('meta', key);
          if (key === 'settings') settings = value || {};
          else preferences = value || {};
        } catch (e) {
          if (!/damaged/.test(e?.message || '')) throw e;
          metaDamaged.push(key);
        }
      this.damaged.meta = metaDamaged;
      return {
        format: 'alibi-backup',
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        runs: [...runs],
        packs: [...packs],
        settings,
        preferences,
        damaged: {
          runs: [...(this.damaged.runs || [])],
          packs: [...(this.damaged.packs || [])],
          meta: [...metaDamaged],
        },
      };
    }
    async restore(backup, expected) {
      if (!this.db)
        throw Error(
          'Backup restoration requires IndexedDB. Open the hosted app in a normal browser, then restore.',
        );
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(['runs', 'packs', 'meta'], 'readwrite'),
          runs = tx.objectStore('runs'),
          packs = tx.objectStore('packs'),
          meta = tx.objectStore('meta');
        this.watch(tx, reject);
        let bad = null;
        const rr = runs.getAll(),
          pr = packs.getAll(),
          sr = meta.get('settings'),
          fr = meta.get('preferences');
        let n = 0;
        const go = () => {
          if (++n < 4) return;
          try {
            const cR = rr.result.map((x) => x.value),
              cP = pr.result.map((x) => x.value),
              cS = sr.result?.value || {},
              cF = fr.result?.value || {};
            if (
              expected &&
              !root.AlibiCore.equal(
                [cR, cP, cS, cF],
                [
                  expected.runs,
                  expected.packs,
                  expected.settings || {},
                  expected.preferences || {},
                ],
              )
            )
              throw new ConflictError();
            if (
              backup?.format !== 'alibi-backup' ||
              backup.schemaVersion !== 1 ||
              !backup.runs?.every?.((r) => typeof r?.key === 'string') ||
              !backup.packs?.every?.((p) => typeof p?.id === 'string')
            )
              throw Error('Unsupported backup format. Nothing was changed.');
            meta.put({
              key: 'pre-restore-backup',
              value: {
                format: 'alibi-backup',
                schemaVersion: 1,
                exportedAt: new Date().toISOString(),
                runs: cR,
                packs: cP,
                settings: cS,
                preferences: cF,
              },
            });
            runs.clear();
            packs.clear();
            for (const r of backup.runs) runs.put({ key: r.key, value: r });
            for (const p of backup.packs) packs.put({ key: p.id, value: p });
            meta.put({ key: 'settings', value: backup.settings || {} });
            meta.put({ key: 'preferences', value: backup.preferences || {} });
          } catch (e) {
            bad = e;
            tx.abort();
          }
        };
        rr.onsuccess = pr.onsuccess = sr.onsuccess = fr.onsuccess = go;
        tx.oncomplete = () => resolve();
        tx.onabort = () =>
          reject(bad || tx.error || Error('Restore cancelled. Previous data is unchanged.'));
        tx.onerror = () => reject(tx.error);
      });
    }
  }
  root.AlibiStorage = { Store, ConflictError };
})(globalThis);
