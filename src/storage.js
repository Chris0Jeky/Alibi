/* Device-local persistence. IndexedDB transactions keep a save and its revision atomic.
   Local run records are read-only without IndexedDB; session writes stay ephemeral. */
(function (root) {
  'use strict';
  const PREFIX = 'alibi.v1.',
    DB = 'alibi-device',
    VERSION = 1,
    STORES = ['runs', 'packs', 'meta'],
    META_KEYS = ['settings', 'preferences', 'workshop-draft'],
    REVISION_FLOOR = 'run-revision-floor',
    nextRevision = (current, floor = 0) => {
      const next = Math.max(current, floor) + 1;
      if (
        !Number.isSafeInteger(current) ||
        !Number.isSafeInteger(floor) ||
        current < 0 ||
        floor < 0 ||
        !Number.isSafeInteger(next)
      )
        throw Error('Revision limit or damaged revision history.');
      return next;
    },
    // A workshop draft's compare-and-swap token. Drafts saved before revisions count as 0.
    draftRevision = (v) => (Number.isSafeInteger(v?.rev) && v.rev > 0 ? v.rev : 0),
    blocked = (message) => Object.assign(Error(message), { name: 'BlockedError' }),
    aborted = () => Error('Storage transaction aborted.'),
    badDraft = (v) => {
      try {
        root.AlibiCore.validateSceneDraft(v?.puzzle);
      } catch {
        return true;
      }
    },
    // A stored run that fails validation is damage, never a cross-tab conflict.
    rowDamaged = (exists, old, key, validate) => {
      if (!exists) return false;
      if (
        !old ||
        old.schemaVersion !== 1 ||
        old.key !== key ||
        !Number.isSafeInteger(old.rev) ||
        old.rev < 0
      )
        return true;
      try {
        validate?.(old);
      } catch {
        return true;
      }
      return false;
    },
    damagedRun = () =>
      Object.assign(
        Error(
          'A saved record for this puzzle is damaged or from an unsupported version. It has not been deleted. Export browser data before resetting anything.',
        ),
        { name: 'DamagedRecordError' },
      ),
    readOnly = () =>
      Error('Local progress is read-only without IndexedDB. Export this session before reloading.');
  function backupEnvelope(runs, packs, settings, preferences, workshopDraft) {
    return {
      format: 'alibi-backup',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      runs,
      packs,
      settings,
      preferences,
      ...(workshopDraft !== undefined ? { workshopDraft } : {}),
    };
  }
  function snapshotRequests(tx) {
    return ['runs', 'packs', ...META_KEYS].map((key, i) =>
      i < 2 ? tx.objectStore(key).getAll() : tx.objectStore('meta').get(key),
    );
  }
  function snapshotValues(requests) {
    return requests.map((r, i) => (i < 2 ? r.result.map((x) => x.value) : r.result?.value));
  }
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
      // Identifies this tab's draft writes for the workshop compare-and-swap.
      this.tab = Math.random().toString(36).slice(2);
    }
    legacyRunEntries() {
      // Only local mode reads settings and packs from these keys itself; elsewhere every entry is unmigrated data.
      if (this.mode !== 'local') return this.legacyInventory;
      return this.legacyInventory.filter((entry) => entry.key.startsWith(PREFIX + 'runs.'));
    }
    legacySnapshot() {
      try {
        const ls = root.localStorage,
          keys = Array.from({ length: ls.length }, (_, i) => ls.key(i)),
          entries = [];
        for (const key of keys) {
          if (key == null) throw Error('A storage key is missing.');
          if (!key.startsWith(PREFIX) || key === PREFIX + 'probe') continue;
          const value = ls.getItem(key);
          if (value == null) throw Error('Browser data changed while reading.');
          entries.push({ key, value });
        }
        if (keys.length !== ls.length || keys.some((key, i) => key !== ls.key(i)))
          throw Error('Browser data changed while reading.');
        return entries;
      } catch (e) {
        throw Error('Older browser data could not be checked: ' + e.message);
      }
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
            for (const n of STORES)
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
          tx.onabort = () => reject(tx.error || aborted());
        });
      if (this.mode === 'local') {
        if (store === 'runs') throw readOnly();
        localStorage.setItem(PREFIX + store + '.' + key, JSON.stringify(value));
      } else this.memory[store][key] = value;
      return value;
    }
    async addPack(input, official) {
      if (this.fatal) throw Error(this.problem || 'Saved data is unavailable.');
      if (!this.db && this.mode === 'local')
        throw Error('Adding packs requires IndexedDB. Existing local data is unchanged.');
      const C = root.AlibiCore,
        pack = C.validatePack(input, false),
        incoming = new Set(pack.puzzles.map((p) => p.id));
      let count = 0;
      const reserve = (existing) => {
        if (existing.id === pack.id) throw Error('A pack with that ID is already installed.');
        if (existing.puzzles.some((p) => incoming.has(p.id)))
          throw Error('A puzzle ID in this pack is already in your collection. Use a distinct ID.');
        count += existing.puzzles.length;
        if (count + pack.puzzles.length > 3000)
          throw Error('This prototype is limited to 3,000 local puzzles.');
      };
      const check = (row) => {
        let existing;
        try {
          existing = C.validatePack(row.value, false);
          if (row.key !== existing.id) throw Error('Pack identity mismatch');
        } catch {
          throw Error(
            'A stored pack is damaged or unsupported. Export your data; nothing was added.',
          );
        }
        reserve(existing);
      };
      const checkRun = (puzzle, row) => {
        if (row !== undefined && !C.equal(row?.value?.puzzle, puzzle))
          throw Error(
            'A saved puzzle already uses this ID and revision. Use a new ID or revision.',
          );
      };
      reserve(official);
      if (!this.db) {
        // This Store owns session memory. Check and insert without yielding.
        for (const [key, value] of Object.entries(this.memory.packs)) check({ key, value });
        for (const p of pack.puzzles) {
          const key = p.id + '@' + p.revision;
          if (Object.hasOwn(this.memory.runs, key)) checkRun(p, { value: this.memory.runs[key] });
        }
        return this.put('packs', pack.id, pack);
      }
      return new Promise((resolve, reject) => {
        let failure = null;
        // Retained runs and pack admission share a transaction with concurrent save writers.
        const tx = this.db.transaction(['packs', 'runs'], 'readwrite'),
          os = tx.objectStore('packs'),
          request = os.openCursor();
        this.watch(tx, reject);
        for (const p of pack.puzzles) {
          const saved = tx.objectStore('runs').get(p.id + '@' + p.revision);
          saved.onsuccess = () => {
            try {
              checkRun(p, saved.result);
            } catch (error) {
              failure = error;
              tx.abort();
            }
          };
        }
        request.onsuccess = () => {
          try {
            const cursor = request.result;
            if (cursor) {
              check(cursor.value);
              cursor.continue();
            } else os.add({ key: pack.id, value: pack });
          } catch (error) {
            failure = error;
            tx.abort();
          }
        };
        tx.oncomplete = () => resolve(pack);
        tx.onabort = () => reject(failure || tx.error || aborted());
      });
    }
    async removePack(id, expected) {
      // Packs only: saved runs pin their own definitions and stay untouched. Delete only the pack the
      // player confirmed: another tab may have replaced it under the same ID since this tab loaded it.
      if (this.fatal) throw Error(this.problem || 'Saved data is unavailable.');
      if (!this.db && this.mode === 'local')
        throw Error('Removing packs requires IndexedDB. Existing local data is unchanged.');
      const C = root.AlibiCore,
        changed = () =>
          Object.assign(Error('This pack changed in another tab. Reload before removing it.'), {
            name: 'ConflictError',
          }),
        same = (stored) => {
          if (!stored || !expected) return true;
          try {
            return C.equal(C.validatePack(stored, false), C.validatePack(expected, false));
          } catch {
            return false;
          }
        };
      if (!this.db) {
        if (!same(this.memory.packs[id])) throw changed();
        delete this.memory.packs[id];
        return;
      }
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('packs', 'readwrite'),
          os = tx.objectStore('packs'),
          get = os.get(id);
        let refused = null;
        this.watch(tx, reject);
        get.onsuccess = () => {
          if (same(get.result?.value)) os.delete(id);
          else {
            refused = changed();
            tx.abort();
          }
        };
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(refused || tx.error || aborted());
      });
    }
    async saveDraft(value, expectedRevision) {
      // Write over the revision this tab loaded or last confirmed, or over this tab's own later
      // write (edits save before earlier saves confirm). Never over another tab's draft.
      const key = 'workshop-draft',
        write = (old) => {
          if (draftRevision(old) !== expectedRevision && old?.tab !== this.tab)
            throw new ConflictError();
          return { ...value, rev: nextRevision(draftRevision(old)), tab: this.tab };
        };
      if (this.db)
        return new Promise((resolve, reject) => {
          let bad = null,
            next;
          const tx = this.db.transaction('meta', 'readwrite'),
            os = tx.objectStore('meta'),
            r = os.get(key);
          this.watch(tx, reject);
          r.onsuccess = () => {
            try {
              next = write(r.result?.value);
              os.put({ key, value: next });
            } catch (e) {
              bad = e;
              tx.abort();
            }
          };
          tx.oncomplete = () => resolve(next);
          tx.onabort = () => reject(bad || tx.error || aborted());
        });
      // Fallback storage has no cross-tab transaction; compare, then write (damaged reads as 0).
      return this.put('meta', key, write(await this.get('meta', key).catch(() => {})));
    }
    async saveRun(record, expectedRevision) {
      // Validate the input and its increment before cloning or writing an unsafe revision.
      const revision = nextRevision(expectedRevision);
      if (!this.db && this.mode === 'local') throw readOnly();
      const key = record.key;
      const next = AlibiCore.clone(record);
      next.rev = revision;
      next.updatedAt = new Date().toISOString();
      if (this.db)
        return new Promise((resolve, reject) => {
          let bad = null,
            ready = 0;
          const tx = this.db.transaction(['runs', 'meta'], 'readwrite'),
            os = tx.objectStore('runs'),
            r = os.get(key),
            floor = tx.objectStore('meta').get(REVISION_FLOOR);
          this.watch(tx, reject);
          r.onsuccess = floor.onsuccess = () => {
            if (++ready < 2) return;
            const old = r.result?.value,
              invalid =
                (r.result !== undefined && r.result.key !== key) ||
                rowDamaged(r.result !== undefined, old, key, this.validateRun);
            if (invalid || (old?.rev ?? 0) !== expectedRevision) {
              bad = invalid ? damagedRun() : new ConflictError();
              tx.abort();
            } else
              try {
                if (old === undefined)
                  next.rev = nextRevision(expectedRevision, floor.result ? floor.result.value : 0);
                os.put({ key, value: next });
              } catch (e) {
                bad = e;
                tx.abort();
              }
          };
          tx.oncomplete = () => resolve(next);
          tx.onabort = () => reject(bad || tx.error || Error('Save aborted.'));
        });
      // Session memory belongs to this Store. Compare and write without yielding.
      const old = this.memory.runs[key];
      if (rowDamaged(old !== undefined, old, key, this.validateRun)) throw damagedRun();
      if ((old?.rev || 0) !== expectedRevision) throw new ConflictError();
      return this.put('runs', key, next);
    }
    async export() {
      // A concurrent restore must not mix old runs with new packs or metadata.
      const snapshot = this.db
        ? await new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORES, 'readonly'),
              requests = snapshotRequests(tx);
            this.watch(tx, reject);
            tx.oncomplete = () => resolve(snapshotValues(requests));
          })
        : null;
      const runs = snapshot ? snapshot[0] : await this.getAll('runs'),
        packs = snapshot ? snapshot[1] : await this.getAll('packs'),
        metaDamaged = [];
      let settings = {},
        preferences = {},
        workshopDraft;
      for (const [index, key] of META_KEYS.entries())
        try {
          const value = snapshot ? snapshot[index + 2] : await this.get('meta', key);
          if (key === 'settings') settings = value || {};
          else if (key === 'preferences') preferences = value || {};
          else if (value !== undefined)
            if (badDraft(value)) metaDamaged.push(key);
            else workshopDraft = value;
        } catch (e) {
          if (!/damaged/.test(e?.message || '')) throw e;
          metaDamaged.push(key);
        }
      this.damaged.meta = metaDamaged;
      return {
        ...backupEnvelope(runs, packs, settings, preferences, workshopDraft),
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
        const tx = this.db.transaction(STORES, 'readwrite'),
          runs = tx.objectStore('runs'),
          packs = tx.objectStore('packs'),
          meta = tx.objectStore('meta');
        this.watch(tx, reject);
        let bad = null,
          note = '';
        const requests = snapshotRequests(tx),
          rr = requests[0],
          hr = meta.get(REVISION_FLOOR);
        let n = 0;
        const go = () => {
          if (++n < 6) return;
          try {
            const [cR, cP, settings, preferences, cD] = snapshotValues(requests),
              cS = settings || {},
              cF = preferences || {};
            if (
              expected &&
              !root.AlibiCore.equal(
                [cR, cP, cS, cF, cD],
                [
                  expected.runs,
                  expected.packs,
                  expected.settings || {},
                  expected.preferences || {},
                  expected.workshopDraft,
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
            const cDbad = cD !== undefined && badDraft(cD);
            const draftConflict =
              backup.workshopDraft !== undefined &&
              cD !== undefined &&
              !cDbad &&
              // Revisions are device-local save tokens; only the draft itself can differ.
              !root.AlibiCore.equal(cD.puzzle, backup.workshopDraft?.puzzle);
            if (draftConflict)
              note =
                'Your local workshop draft was kept. The backup workshop draft was not applied because it differs, and is kept in Recovery copy. Keep the original backup file; the next restore replaces Recovery copy.';
            else if (cDbad && backup.workshopDraft !== undefined)
              note = 'Your damaged workshop draft was replaced; the original is in Recovery copy.';
            // Keep the largest removed revision across empty restores and later re-creations.
            // This device-local fence is never replaced by an imported backup.
            const floor = rr.result.reduce(
                (high, { value }) =>
                  Number.isSafeInteger(value?.rev) && value.rev >= 0
                    ? Math.max(high, value.rev)
                    : high,
                hr.result ? hr.result.value : 0,
              ),
              currentRuns = new Map(rr.result.map(({ key, value }) => [key, value])),
              restoredRuns = backup.runs.map((r) => {
                const current = currentRuns.get(r.key);
                // Only Add missing supplies an expected snapshot. Preserve a row's CAS token
                // there only when both complete, validated rows still match exactly.
                if (expected && this.validateRun && current?.key === r.key)
                  try {
                    this.validateRun(current);
                    this.validateRun(r);
                    if (root.AlibiCore.equal(current, r)) return r;
                  } catch {}
                return { ...r, rev: nextRevision(r.rev, floor) };
              });
            // Validate the stored floor even when the backup contains no runs.
            nextRevision(hr.result ? hr.result.value : 0, floor);
            meta.put({
              key: 'pre-restore-backup',
              value: {
                ...backupEnvelope(cR, cP, cS, cF, cDbad ? undefined : cD),
                // Damaged bytes live under a field the validator ignores, so this copy re-imports.
                ...(cDbad
                  ? {
                      damagedWorkshopDraft: cD,
                      damaged: { meta: ['workshop-draft'] },
                    }
                  : {}),
                ...(draftConflict ? { unappliedWorkshopDraft: backup.workshopDraft } : {}),
              },
            });
            meta.put({
              key: REVISION_FLOOR,
              value: restoredRuns.reduce((high, r) => Math.max(high, r.rev), floor),
            });
            runs.clear();
            packs.clear();
            for (const r of restoredRuns) runs.put({ key: r.key, value: r });
            for (const p of backup.packs) packs.put({ key: p.id, value: p });
            meta.put({ key: 'settings', value: backup.settings || {} });
            meta.put({ key: 'preferences', value: backup.preferences || {} });
            if (backup.workshopDraft !== undefined && (cD === undefined || cDbad))
              meta.put({ key: 'workshop-draft', value: backup.workshopDraft });
          } catch (e) {
            bad = e;
            tx.abort();
          }
        };
        for (const request of [...requests, hr]) request.onsuccess = go;
        tx.oncomplete = () => resolve({ note });
        tx.onabort = () =>
          reject(bad || tx.error || Error('Restore cancelled. Previous data is unchanged.'));
      });
    }
  }
  root.AlibiStorage = { Store, ConflictError, draftRevision };
})(globalThis);
