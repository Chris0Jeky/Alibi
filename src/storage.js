/* Device-local persistence. IndexedDB transactions keep a save and its revision atomic.
   The fallback is deliberately labelled: localStorage is not a cross-tab transaction. */
(function (root) {
  'use strict';
  const PREFIX = 'alibi.v1.',
    DB = 'alibi-device',
    VERSION = 1;
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
    }
    async init() {
      try {
        if (!root.indexedDB) throw new Error('IndexedDB is unavailable.');
        this.db = await new Promise((resolve, reject) => {
          const request = indexedDB.open(DB, VERSION);
          let abandoned = false;
          const timer = setTimeout(() => {
            abandoned = true;
            reject(
              Object.assign(
                new Error(
                  'Opening saved progress timed out. Close other Alibi windows and reload. Your existing saves have not been changed.',
                ),
                { name: 'BlockedError' },
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
            reject(
              Object.assign(
                new Error('Close another Alibi tab to finish opening storage, then reload.'),
                { name: 'BlockedError' },
              ),
            );
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
      } catch (e) {
        this.mode = 'session';
      }
      return this;
    }
    watch(tx, reject) {
      const timer = setTimeout(() => {
        const error = new Error(
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
          if (!tx.onabort) reject(tx.error || new Error('Storage transaction aborted.'));
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
        const out = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith(PREFIX + store + '.')) {
            try {
              out.push(JSON.parse(localStorage.getItem(key)));
            } catch (e) {
              throw new Error(
                'A saved record is damaged. Export browser data before resetting anything.',
              );
            }
          }
        }
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
        return v ? JSON.parse(v) : undefined;
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
          tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted.'));
        });
      if (this.mode === 'local')
        localStorage.setItem(PREFIX + store + '.' + key, JSON.stringify(value));
      else this.memory[store][key] = value;
      return value;
    }
    async saveRun(record, expectedRevision) {
      const next = AlibiCore.clone(record);
      next.rev = expectedRevision + 1;
      next.updatedAt = new Date().toISOString();
      if (this.db)
        return new Promise((resolve, reject) => {
          let conflict = false;
          const tx = this.db.transaction('runs', 'readwrite'),
            os = tx.objectStore('runs'),
            r = os.get(record.key);
          this.watch(tx, reject);
          r.onsuccess = () => {
            if ((r.result?.value.rev || 0) !== expectedRevision) {
              conflict = true;
              tx.abort();
            } else os.put({ key: record.key, value: next });
          };
          tx.oncomplete = () => resolve(next);
          tx.onerror = () => reject(tx.error);
          tx.onabort = () =>
            reject(conflict ? new ConflictError() : tx.error || new Error('Save aborted.'));
        });
      const old = await this.get('runs', record.key);
      if ((old?.rev || 0) !== expectedRevision) throw new ConflictError();
      return this.put('runs', record.key, next);
    }
    async export() {
      return {
        format: 'alibi-backup',
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        runs: await this.getAll('runs'),
        packs: await this.getAll('packs'),
        settings: (await this.get('meta', 'settings')) || {},
        preferences: (await this.get('meta', 'preferences')) || {},
      };
    }
    async restore(backup) {
      const previous = await this.export();
      if (this.db)
        return new Promise((resolve, reject) => {
          const tx = this.db.transaction(['runs', 'packs', 'meta'], 'readwrite'),
            runs = tx.objectStore('runs'),
            packs = tx.objectStore('packs'),
            meta = tx.objectStore('meta');
          this.watch(tx, reject);
          meta.put({ key: 'pre-restore-backup', value: previous });
          runs.clear();
          packs.clear();
          for (const r of backup.runs) runs.put({ key: r.key, value: r });
          for (const p of backup.packs) packs.put({ key: p.id, value: p });
          meta.put({ key: 'settings', value: backup.settings || {} });
          meta.put({ key: 'preferences', value: backup.preferences || {} });
          tx.oncomplete = () => resolve();
          tx.onabort = () =>
            reject(tx.error || new Error('Restore cancelled. Previous data is unchanged.'));
          tx.onerror = () => reject(tx.error);
        });
      // Fallback cannot offer atomic multi-key replacement, so refuse destructive restores.
      throw new Error(
        'Backup restoration requires IndexedDB. Open the hosted app in a normal browser, then restore.',
      );
    }
  }
  root.AlibiStorage = { Store, ConflictError };
})(globalThis);
