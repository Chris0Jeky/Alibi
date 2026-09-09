import { initial, validate, clone } from './engine.mjs';
import { backup, validateBackup, mergeStates } from './backup.mjs';

export const DATABASE = 'alibi-castle-v1';
const KEY = 'chapter-one';
const RECOVERY = 'pre-restore-chapter-one';
const envelope = (value) => {
  if (
    !value ||
    value.schema !== 1 ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 1 ||
    Object.keys(value).some((k) => !['schema', 'revision', 'state'].includes(k))
  ) {
    throw Error('This castle record needs a newer or repaired reader. It has been left untouched.');
  }
  return { schema: 1, revision: value.revision, state: validate(value.state) };
};

/** One retained instance per page. Every write compares the committed revision in its transaction. */
export class CastleStore {
  constructor(factory = globalThis.indexedDB, timeout = 4000) {
    this.factory = factory;
    this.timeout = timeout;
    this.state = initial();
    this.mode = 'opening';
    this.error = '';
    this.dirty = false;
    this.diskRevision = 0;
    this.raw = null;
    this.pending = Promise.resolve();
    this.listeners = new Set();
  }
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  notify() {
    for (const fn of this.listeners) fn();
  }
  async init() {
    if (!this.ready) this.ready = this.open();
    await this.ready;
    return this;
  }
  async open() {
    if (!this.factory) {
      this.mode = 'session';
      this.error = 'Storage is unavailable. Export the castle save before closing.';
      return;
    }
    try {
      this.db = await new Promise((resolve, reject) => {
        let request,
          done = false;
        const finish = (error, value) => {
          if (done) {
            value?.close();
            return;
          }
          done = true;
          clearTimeout(timer);
          error ? reject(error) : resolve(value);
        };
        const timer = setTimeout(
          () => finish(Error('Castle storage did not respond. No replacement save was created.')),
          this.timeout,
        );
        try {
          request = this.factory.open(DATABASE, 1);
        } catch (error) {
          finish(error);
          return;
        }
        request.onupgradeneeded = (event) => {
          if (done || event.oldVersion !== 0) {
            request.transaction.abort();
            return;
          }
          request.result.createObjectStore('records');
        };
        request.onblocked = () =>
          finish(Error('Another tab is holding castle storage open. Close that tab and retry.'));
        request.onerror = () =>
          finish(request.error || Error('Castle storage could not be opened.'));
        request.onsuccess = () => finish(null, request.result);
      });
      this.db.onversionchange = () => {
        this.db.close();
        this.mode = 'protected';
        this.error = 'Another version opened castle storage. Export this session before reloading.';
        this.notify();
      };
      this.raw = await this.transaction('readonly', (records, setResult) => {
        const request = records.get(KEY);
        request.onsuccess = () => setResult(request.result ?? null);
      });
      if (this.raw !== null) {
        const saved = envelope(this.raw);
        this.state = saved.state;
        this.diskRevision = saved.revision;
      }
      this.mode = 'local';
    } catch (error) {
      this.mode = ['SecurityError', 'NotSupportedError'].includes(error.name)
        ? 'session'
        : 'protected';
      this.error = error.message;
      this.db?.close();
    }
    this.notify();
  }
  transaction(mode, operation) {
    return new Promise((resolve, reject) => {
      let tx,
        result,
        failure,
        done = false;
      const finish = (error) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        error ? reject(error) : resolve(result);
      };
      const timer = setTimeout(() => {
        failure = Error('Castle save timed out. Export this session before reloading.');
        try {
          tx?.abort();
        } catch {}
        finish(failure);
      }, this.timeout);
      try {
        tx = this.db.transaction('records', mode);
        tx.oncomplete = () => finish();
        tx.onerror = tx.onabort = () =>
          finish(failure || tx.error || Error('Castle save was interrupted.'));
        operation(
          tx.objectStore('records'),
          (value) => {
            result = value;
          },
          (error) => {
            failure = error;
            tx.abort();
          },
        );
      } catch (error) {
        finish(error);
      }
    });
  }
  save(next) {
    if (this.restoring) throw Error('Wait for the notebook restore to finish before editing.');
    const snapshot = validate(next);
    if (snapshot.revision <= this.state.revision)
      throw Error('A castle edit must advance its revision.');
    this.state = snapshot;
    this.dirty = true;
    this.pending = this.pending.then(async () => {
      if (this.mode !== 'local') return false;
      try {
        const expected = this.diskRevision;
        if (expected >= Number.MAX_SAFE_INTEGER)
          throw Error('Castle revision limit reached. Export this save.');
        const saved = { schema: 1, revision: expected + 1, state: snapshot };
        await this.transaction('readwrite', (records, _, abort) => {
          const read = records.get(KEY);
          read.onsuccess = () => {
            try {
              const current = read.result === undefined ? 0 : envelope(read.result).revision;
              if (current !== expected)
                throw Error(
                  'Another tab changed this castle save. Export this session before reloading.',
                );
              records.put(saved, KEY);
            } catch (error) {
              abort(error);
            }
          };
        });
        this.raw = saved;
        this.diskRevision = saved.revision;
        this.dirty = this.state.revision !== snapshot.revision;
        return true;
      } catch (error) {
        this.mode = error.name === 'QuotaExceededError' ? 'session' : 'protected';
        this.error = error.message;
        return false;
      } finally {
        this.notify();
      }
    });
    this.notify();
    return this.pending;
  }
  async flush() {
    await this.pending;
    if (
      (this.dirty || this.mode === 'protected') &&
      this.acknowledgedExport !== this.exportIdentity()
    )
      throw Error(this.error || 'Export the unsaved castle notebook before updating.');
  }
  exportIdentity() {
    return JSON.stringify([this.state, this.mode, this.raw]);
  }
  export() {
    this.lastExport = this.exportIdentity();
    return JSON.stringify(
      backup(this.state, this.mode, this.mode === 'protected' ? this.raw : null),
      null,
      2,
    );
  }
  acknowledgeExport() {
    if (!this.lastExport || this.lastExport !== this.exportIdentity())
      throw Error('The notebook changed after that export. Export the current notebook first.');
    this.acknowledgedExport = this.lastExport;
    this.notify();
  }
  async recovery() {
    await this.pending;
    if (this.mode !== 'local')
      throw Error('Recovery copies require readable device storage. Your session is unchanged.');
    return this.transaction('readonly', (records, result) => {
      const request = records.get(RECOVERY);
      request.onsuccess = () => result(request.result ?? null);
    });
  }
  async restore(data, { replace = false, expectedRevision = this.state.revision } = {}) {
    const incoming = validateBackup(data).state;
    if (this.restoring) throw Error('A notebook restore is already in progress.');
    this.restoring = true;
    const task = this.pending.then(async () => {
      if (this.mode !== 'local' || this.dirty)
        throw Error(
          'Restoration requires committed IndexedDB storage. Export this session or resolve recovery first.',
        );
      if (this.state.revision !== expectedRevision)
        throw Error(
          'The notebook changed while this restore was being reviewed. Review the file again.',
        );
      const expected = this.diskRevision;
      const next = replace ? clone(incoming) : mergeStates(this.state, incoming);
      next.revision = Math.max(this.state.revision, incoming.revision) + 1;
      validate(next);
      if (expected >= Number.MAX_SAFE_INTEGER)
        throw Error('Castle revision limit reached. Export this save.');
      const saved = { schema: 1, revision: expected + 1, state: next };
      const previous = backup(this.state);
      await this.transaction('readwrite', (records, _, abort) => {
        const request = records.get(KEY);
        request.onsuccess = () => {
          try {
            const revision = request.result === undefined ? 0 : envelope(request.result).revision;
            if (revision !== expected)
              throw Error(
                'Another tab changed this castle save. Reload and review the file again.',
              );
            if (this.state.revision !== expectedRevision)
              throw Error('The notebook changed during restore. No records were replaced.');
            records.put(previous, RECOVERY);
            records.put(saved, KEY);
          } catch (error) {
            abort(error);
          }
        };
      });
      this.state = next;
      this.raw = saved;
      this.diskRevision = saved.revision;
      this.dirty = false;
      this.lastExport = this.acknowledgedExport = null;
      this.notify();
      return clone(next);
    });
    const settled = task.finally(() => {
      this.restoring = false;
      this.notify();
    });
    this.pending = settled.catch(() => {});
    return settled;
  }
  info() {
    return { mode: this.mode, dirty: this.dirty, revision: this.diskRevision, error: this.error };
  }
}
