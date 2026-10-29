/* Device-local origin transfer. Checksum, version and shape are pure.
   Apply retains recovery and rolls back only domains whose writes were attempted.
   Separate IndexedDB databases are not one transaction. No network. */
(function (G) {
  'use strict';
  const QUIET_FALLBACK = 'alibi-quiet-wing-v1:fallback',
    FORMAT = 'alibi-origin-transfer',
    VERSION = 1,
    SECTIONS = ['cabinet', 'club', 'quiet', 'castle', 'challenges'],
    UNCHANGED = 'Existing saves were not changed.';
  const fail = (reason) => {
    throw Error(`${reason} ${UNCHANGED}`);
  };
  const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
  // Validate data before a JSON boundary without reading accessors or normalizing preimages.
  // The one private Quiet wrapper field is needed by live rollback, never by JSON recovery.
  function checkJson(value, privateQuiet = false) {
    const active = new Set();
    const reject = () => {
      throw Error('Save data cannot be preserved as JSON.');
    };
    function check(item, rawQuiet = false) {
      if (item === null || ['string', 'boolean'].includes(typeof item)) return;
      if (typeof item === 'number' && Number.isFinite(item) && !Object.is(item, -0)) return;
      if (!item || typeof item !== 'object' || active.has(item)) reject();
      active.add(item);
      const array = Array.isArray(item),
        keys = Reflect.ownKeys(item);
      let prototype = Object.getPrototypeOf(item),
        type = array ? Array : Object;
      if (array && prototype === null) reject();
      while (prototype !== null) {
        const constructor = Object.getOwnPropertyDescriptor(prototype, 'constructor')?.value;
        if (
          typeof constructor !== 'function' ||
          constructor.prototype !== prototype ||
          Function.prototype.toString.call(constructor) !==
            Function.prototype.toString.call(type) ||
          Object.getOwnPropertyDescriptor(prototype, 'toJSON')
        )
          reject();
        prototype = Object.getPrototypeOf(prototype);
        if (type === Object && prototype !== null) reject();
        type = Object;
      }
      if (
        array &&
        (keys.length !== item.length + 1 ||
          keys.some((key, i) => key !== (i === item.length ? 'length' : String(i))))
      )
        reject();
      for (const key of keys) {
        if (array && key === 'length') continue;
        const descriptor = Object.getOwnPropertyDescriptor(item, key);
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) reject();
        if (typeof key === 'symbol') {
          if (
            rawQuiet &&
            key === FALLBACK_RAW &&
            (descriptor.value == null || typeof descriptor.value === 'string')
          )
            continue;
          reject();
        }
        check(descriptor.value, privateQuiet && item === value && key === 'quiet');
      }
      active.delete(item);
    }
    check(value);
  }
  // JSON object member order is immaterial; array order and every state value must match.
  function sameJson(left, right) {
    if (left === right) return true;
    if (
      !left ||
      !right ||
      typeof left !== 'object' ||
      typeof right !== 'object' ||
      Array.isArray(left) !== Array.isArray(right) ||
      (Array.isArray(left) && left.length !== right.length)
    )
      return false;
    const keys = Object.keys(left);
    return (
      keys.length === Object.keys(right).length &&
      keys.every((key) => Object.hasOwn(right, key) && sameJson(left[key], right[key]))
    );
  }
  function isRecovery(id) {
    return id.startsWith('recovery:');
  }
  async function sha256Hex(text) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  function noun(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural}`;
  }
  function assertShape(payload) {
    const cabinet = payload?.cabinet,
      club = payload?.club,
      quiet = payload?.quiet,
      castle = payload?.castle,
      challenges = payload?.challenges;
    if (!isObject(payload) || SECTIONS.some((name) => !Object.hasOwn(payload, name)))
      fail('This transfer file has the wrong shape.');
    if (
      !isObject(cabinet) ||
      cabinet.format !== 'alibi-backup' ||
      cabinet.schemaVersion !== 1 ||
      !Array.isArray(cabinet.runs) ||
      !Array.isArray(cabinet.packs) ||
      !isObject(club) ||
      club.schema !== 1 ||
      !isObject(club.settings) ||
      !isObject(club.runs) ||
      !Array.isArray(club.records) ||
      !isObject(quiet) ||
      quiet.kind !== 'alibi-quiet-wing-backup' ||
      quiet.schema !== 1 ||
      !(quiet.state === null || isObject(quiet.state)) ||
      !isObject(castle) ||
      castle.format !== 'alibi-castle' ||
      castle.version !== 1 ||
      typeof castle.scope !== 'string' ||
      !(castle.state === null || isObject(castle.state)) ||
      !(castle.record == null || isObject(castle.record)) ||
      !isObject(challenges) ||
      challenges.format !== 'alibi-challenges' ||
      challenges.schema !== 1 ||
      !Array.isArray(challenges.runs)
    )
      fail('This transfer file has the wrong shape.');
    // writeCastle prefers the envelope; even equal revisions cannot justify discarding a
    // different notebook state. The envelope's own CAS revision is a separate counter.
    if (castle.record && !sameJson(castle.state, castle.record.state))
      fail('Castle has unsaved or conflicting edits.');
    const ids = new Set();
    for (const row of challenges.runs) {
      if (
        !isObject(row) ||
        typeof row.id !== 'string' ||
        !row.id ||
        ids.has(row.id) ||
        isRecovery(row.id) ||
        row.schema !== 1 ||
        !Number.isSafeInteger(row.revision) ||
        row.revision < 1 ||
        !isObject(row.run) ||
        row.run.format !== 'alibi-challenge-run'
      )
        fail('This transfer file has the wrong shape.');
      ids.add(row.id);
    }
    return payload;
  }
  async function exportOriginTransfer(saves) {
    try {
      checkJson(saves, true);
    } catch {
      fail('These saves contain values a JSON transfer cannot preserve.');
    }
    assertShape(saves);
    const payload = JSON.stringify({
      __proto__: null,
      cabinet: saves.cabinet,
      club: saves.club,
      quiet: saves.quiet,
      castle: saves.castle,
      challenges: saves.challenges,
    });
    return {
      __proto__: null,
      format: FORMAT,
      version: VERSION,
      checksum: await sha256Hex(payload),
      payload,
    };
  }
  async function validateOriginTransfer(text) {
    if (typeof text !== 'string' || !text.trim() || text.length > 20 * 1024 * 1024)
      fail('This transfer file is corrupt.');
    const trimmed = text.trim();
    const header = trimmed.includes('"alibi-origin-transfer"') && trimmed.includes('"checksum"');
    let data;
    try {
      data = JSON.parse(trimmed);
    } catch {
      fail(header ? 'This transfer file is truncated.' : 'This transfer file is corrupt.');
    }
    if (!isObject(data) || data.format !== FORMAT) fail('This transfer file is corrupt.');
    if (!Number.isInteger(data.version)) fail('This transfer file has the wrong version.');
    if (data.version > VERSION) fail('This transfer file is from a newer version.');
    if (data.version !== VERSION) fail('This transfer file has the wrong version.');
    if (typeof data.checksum !== 'string' || typeof data.payload !== 'string')
      fail('This transfer file failed its checksum.');
    if ((await sha256Hex(data.payload)) !== data.checksum)
      fail('This transfer file failed its checksum.');
    let payload;
    try {
      payload = JSON.parse(data.payload);
    } catch {
      fail('This transfer file is corrupt.');
    }
    assertShape(payload);
    return { format: FORMAT, version: VERSION, checksum: data.checksum, payload };
  }
  function previewOriginTransfer(validated) {
    const payload = validated.payload;
    return [
      `Cabinet: ${noun(payload.cabinet.runs.length, 'saved puzzle', 'saved puzzles')}, ${noun(payload.cabinet.packs.length, 'custom pack', 'custom packs')}`,
      `Club: ${noun(Object.keys(payload.club.runs).length, 'game', 'games')}, ${noun(payload.club.records.length, 'record', 'records')}`,
      `Quiet Wing: ${payload.quiet.state ? 'included' : 'empty'}`,
      `Castle: ${payload.castle.state ? 'included' : 'empty'}`,
      `Challenges: ${noun(payload.challenges.runs.length, 'replay', 'replays')}`,
    ];
  }
  // cabinetBackup stamps exportedAt on every read and the open puzzle's elapsed.
  function sameAfterRollback(name, live, saved) {
    if (name !== 'cabinet') return JSON.stringify(live) === JSON.stringify(saved);
    if (!isObject(live) || !isObject(saved)) return false;
    const left = JSON.parse(JSON.stringify(live)),
      right = JSON.parse(JSON.stringify(saved));
    delete left.exportedAt;
    delete right.exportedAt;
    if (
      !Array.isArray(left.runs) ||
      !Array.isArray(right.runs) ||
      left.runs.length !== right.runs.length
    )
      return false;
    let drift = 0;
    for (let i = 0; i < left.runs.length; i += 1) {
      const a = left.runs[i],
        b = right.runs[i];
      if (!isObject(a) || !isObject(b)) return false;
      if (a.elapsed !== b.elapsed) drift += 1;
      delete a.elapsed;
      delete b.elapsed;
    }
    return drift < 2 && JSON.stringify(left) === JSON.stringify(right);
  }
  async function applyOriginTransfer(validated, ports, options = {}) {
    if (options?.confirmed !== true) fail('Import needs explicit confirmation.');
    const before = {},
      attempted = [];
    try {
      for (const name of SECTIONS) before[name] = await ports.read(name);
      try {
        checkJson(before, true);
      } catch {
        throw Error('Current saves contain values a JSON recovery copy cannot preserve.');
      }
      await ports.retain(before);
      for (const name of SECTIONS) {
        // A rejected write may already have changed its domain. Record it first,
        // but never roll an untouched later domain back to an older snapshot.
        attempted.push(name);
        await ports.write(name, validated.payload[name]);
      }
    } catch (error) {
      if (!attempted.length)
        fail(String(error?.message || 'Import could not read the current saves.'));
      try {
        for (const name of attempted)
          await ports.write(name, before[name], validated.payload[name]);
        for (const name of attempted)
          if (!sameAfterRollback(name, await ports.read(name), before[name]))
            throw Error('Rollback did not match the recovery copy.');
      } catch (rollbackError) {
        throw Error(`Import failed and the recovery copy was kept. ${rollbackError.message}`);
      }
      if (String(error.message).includes(UNCHANGED)) throw error;
      fail(error.message || 'Import stopped before it finished.');
    }
    // All domains are committed; cleanup must not leave stale in-memory writers active.
    let recoveryPending = false;
    try {
      await ports.release();
    } catch {
      recoveryPending = true;
    }
    return { committed: true, recoveryPending };
  }
  function openDb(name, version, upgrade) {
    return new Promise((resolve, reject) => {
      let request = indexedDB.open(name, version),
        abandoned = false;
      request.onupgradeneeded = () => {
        if (abandoned) {
          request.transaction.abort();
          return;
        }
        upgrade?.(request.result);
      };
      request.onsuccess = () => {
        if (abandoned) request.result.close();
        else resolve(request.result);
      };
      request.onerror = () => reject(request.error || Error('Storage could not open.'));
      request.onblocked = () => {
        abandoned = true;
        reject(Error('Another tab is blocking storage.'));
      };
    });
  }
  function txDone(db, storeName, mode, work) {
    return new Promise((resolve, reject) => {
      let tx = db.transaction(storeName, mode),
        result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || Error('Storage failed.'));
      tx.onabort = () => reject(tx.error || Error('Storage was aborted.'));
      work(tx.objectStore(storeName), (value) => {
        result = value;
      });
    });
  }
  async function withDb(name, version, upgrade, fn) {
    const db = await openDb(name, version, upgrade);
    try {
      return await fn(db);
    } finally {
      db.close();
    }
  }
  function ensureStore(storeName) {
    return (db) => {
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
    };
  }
  async function openExisting(name) {
    if (indexedDB.databases) {
      const rows = await indexedDB.databases();
      if (!rows.some((row) => row.name === name)) return null;
    }
    return new Promise((resolve, reject) => {
      let request,
        created = false;
      try {
        request = indexedDB.open(name);
      } catch (error) {
        reject(error);
        return;
      }
      request.onupgradeneeded = () => {
        created = true;
        try {
          request.transaction.abort();
        } catch {}
      };
      request.onsuccess = () => {
        if (created) {
          request.result.close();
          resolve(null);
          return;
        }
        resolve(request.result);
      };
      request.onerror = () =>
        created ? resolve(null) : reject(request.error || Error('Storage could not open.'));
    });
  }
  async function readRecord(name, storeName, key) {
    const db = await openExisting(name);
    if (!db || !db.objectStoreNames.contains(storeName)) {
      db?.close();
      return undefined;
    }
    try {
      return await txDone(db, storeName, 'readonly', (store, set) => {
        const request = store.get(key);
        request.onsuccess = () => set(request.result);
      });
    } finally {
      db.close();
    }
  }
  // Symbol keys never reach JSON or structured clones, so the raw fallback bytes stay out of
  // export files and recovery copies; a rollback write receives the same section object back.
  const FALLBACK_RAW = Symbol(),
    fallbackOnly = new WeakSet();
  async function quietRecord() {
    const db = await openExisting('alibi-quiet-wing-v1');
    if (!db || !db.objectStoreNames.contains('saves')) {
      db?.close();
      return { present: false };
    }
    try {
      return await txDone(db, 'saves', 'readonly', (store, set) => {
        const key = store.getKey('state'),
          value = store.get('state');
        value.onsuccess = () => set({ present: key.result !== undefined, value: value.result });
      });
    } finally {
      db.close();
    }
  }
  async function readQuiet() {
    await G.QWStore?.flush?.().catch(() => {});
    // G.QWApp outlives dispose(); a detached app's state is stale. Dispose keeps only unsaved
    // state in QWRetainedState, so otherwise the committed record is the truth.
    const app = G.QWApp;
    let state = (app && !app.disposed ? app.state : G.QWRetainedState) || null,
      raw,
      missing = false;
    if (!state) {
      const record = await quietRecord();
      missing = !record.present;
      state = record.value || null;
    }
    let fromFallback = false;
    try {
      raw = G.localStorage?.getItem(QUIET_FALLBACK) ?? null;
      if (!state && raw) {
        state = JSON.parse(raw);
        fromFallback = !!state;
      }
    } catch {
      if (!state) throw Error('Quiet Wing fallback could not be read.');
    }
    // raw undefined: unreadable, so a rollback must not touch it.
    const section = {
      kind: 'alibi-quiet-wing-backup',
      schema: 1,
      state: state || null,
      [FALLBACK_RAW]: raw,
    };
    if (missing && fromFallback) fallbackOnly.add(section);
    return section;
  }
  async function deleteRecord(name, storeName, key) {
    const db = await openExisting(name);
    if (!db) return;
    try {
      if (db.objectStoreNames.contains(storeName))
        await txDone(db, storeName, 'readwrite', (store) => store.delete(key));
    } finally {
      db.close();
    }
  }
  async function removeImportedQuiet(attempted) {
    if (!attempted || !Object.hasOwn(attempted, 'state'))
      throw Error('Quiet rollback cannot verify the imported record.');
    const db = await openExisting('alibi-quiet-wing-v1');
    if (!db) return;
    try {
      if (!db.objectStoreNames.contains('saves')) return;
      await txDone(db, 'saves', 'readwrite', (store) => {
        const key = store.getKey('state'),
          value = store.get('state');
        value.onsuccess = () => {
          if (key.result === undefined) return;
          try {
            checkJson(value.result);
            if (attempted.state && sameJson(value.result, attempted.state)) {
              store.delete('state');
              return;
            }
          } catch {}
          store.transaction.abort();
        };
      });
    } finally {
      db.close();
    }
  }
  async function writeQuiet(section, attempted) {
    const state = section.state;
    if (fallbackOnly.has(section)) {
      await removeImportedQuiet(attempted);
      mirrorQuietFallback(section, state);
      return;
    }
    if (!state) {
      await deleteRecord('alibi-quiet-wing-v1', 'saves', 'state');
      mirrorQuietFallback(section, null);
      return;
    }
    await withDb('alibi-quiet-wing-v1', 1, ensureStore('saves'), (db) =>
      txDone(db, 'saves', 'readwrite', (store) => store.put(state, 'state')),
    );
    mirrorQuietFallback(section, state);
  }
  function mirrorQuietFallback(section, state) {
    const ls = G.localStorage;
    if (FALLBACK_RAW in section) {
      // Rollback: restore the bytes read before the import; never derive them from IndexedDB.
      const raw = section[FALLBACK_RAW];
      if (typeof raw === 'string' && ls.getItem(QUIET_FALLBACK) !== raw)
        ls.setItem(QUIET_FALLBACK, raw);
      return;
    }
    if (ls?.getItem(QUIET_FALLBACK) == null) return;
    if (state) ls.setItem(QUIET_FALLBACK, JSON.stringify(state));
    else ls.removeItem(QUIET_FALLBACK);
  }
  async function readCastle() {
    await G.AlibiCastle?.flush?.().catch(() => {});
    let backup = null;
    if (G.AlibiCastle?.exportBackup) {
      try {
        backup = await G.AlibiCastle.exportBackup();
      } catch {
        backup = null;
      }
    }
    const record = (await readRecord('alibi-castle-v1', 'records', 'chapter-one')) ?? null;
    const state = backup?.state ?? record?.state ?? null;
    return {
      format: 'alibi-castle',
      version: 1,
      scope: backup?.scope || 'Wrenmere Chapter I only',
      state,
      mode: backup?.mode || 'local',
      record: record || (state ? { schema: 1, revision: state.revision || 1, state } : null),
    };
  }
  async function writeCastle(section) {
    const record =
      section.record ||
      (section.state
        ? { schema: 1, revision: section.state.revision || 1, state: section.state }
        : null);
    if (!record) {
      await deleteRecord('alibi-castle-v1', 'records', 'chapter-one');
      return;
    }
    await withDb('alibi-castle-v1', 1, ensureStore('records'), (db) =>
      txDone(db, 'records', 'readwrite', (store) => store.put(record, 'chapter-one')),
    );
  }
  async function readChallenges() {
    // A rejected write leaves the newest replay only in memory (the flush failure is swallowed on
    // leave), so the committed record below would silently be an older run.
    const store = G.QWApp?.challengeStore;
    await store?.flush().catch(() => {});
    if (store && (store.info().mode === 'session' || store.info().protected))
      throw Error('Challenge storage is session-only or protected. Export its replays separately.');
    if (store?.unsaved())
      throw Error(
        'A challenge replay did not save. If it is still open, export it; otherwise reload (its newest moves are lost).',
      );
    const db = await openExisting('alibi-challenges-v1');
    if (!db || !db.objectStoreNames.contains('runs')) {
      db?.close();
      return { format: 'alibi-challenges', schema: 1, runs: [] };
    }
    try {
      const runs = await txDone(db, 'runs', 'readonly', (store, set) => {
        const values = store.getAll(),
          keys = store.getAllKeys();
        let pending = 2;
        const finish = () => {
          if (--pending) return;
          const rows = [];
          keys.result.forEach((key, index) => {
            const value = values.result[index];
            if (typeof key === 'string' && !isRecovery(key) && value)
              rows.push({
                id: key,
                schema: value.schema,
                revision: value.revision,
                run: value.run,
              });
          });
          set(rows);
        };
        values.onsuccess = keys.onsuccess = finish;
      });
      return { format: 'alibi-challenges', schema: 1, runs };
    } finally {
      db.close();
    }
  }
  async function writeChallenges(section) {
    await withDb('alibi-challenges-v1', 1, ensureStore('runs'), (db) =>
      txDone(db, 'runs', 'readwrite', (store) => {
        const keys = store.getAllKeys();
        keys.onsuccess = () => {
          for (const key of keys.result)
            if (typeof key === 'string' && !isRecovery(key)) store.delete(key);
          for (const row of section.runs)
            store.put({ schema: row.schema, revision: row.revision, run: row.run }, row.id);
        };
      }),
    );
  }
  async function retainRecovery(snapshot) {
    await withDb('alibi-origin-recovery', 1, ensureStore('copies'), (db) =>
      txDone(db, 'copies', 'readwrite', (store) => store.add(snapshot, 'pending')),
    );
  }
  async function releaseRecovery() {
    await deleteRecord('alibi-origin-recovery', 'copies', 'pending');
  }
  // A startup inspection is read-only and never creates a persistent database.
  // It is not a lock against a transfer started later in another tab.
  function inspectPendingRecovery() {
    if (!G.indexedDB) return Promise.resolve({ present: false });
    return new Promise((resolve, reject) => {
      let request,
        db,
        tx,
        created = false,
        settled = false;
      const timer = setTimeout(() => finish(Error('Recovery inspection timed out.')), 2200);
      function finish(error, result) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error)
          try {
            tx?.abort();
          } catch {}
        db?.close();
        error ? reject(error) : resolve(result);
      }
      try {
        request = G.indexedDB.open('alibi-origin-recovery');
        request.onupgradeneeded = () => {
          created = true;
          request.transaction.abort();
        };
        request.onblocked = () => finish(Error('Another tab is blocking recovery inspection.'));
        request.onerror = () =>
          created
            ? finish(null, { present: false })
            : finish(request.error || Error('Recovery storage could not be read.'));
        request.onsuccess = () => {
          db = request.result;
          if (settled) {
            db.close();
            return;
          }
          try {
            if (db.version !== 1 || !db.objectStoreNames.contains('copies'))
              throw Error('Recovery storage has an unrecognized format.');
            db.onversionchange = () => finish(Error('Recovery storage changed in another tab.'));
            tx = db.transaction('copies', 'readonly');
            const copies = tx.objectStore('copies'),
              count = copies.count('pending'),
              value = copies.get('pending');
            tx.oncomplete = () => finish(null, { present: count.result > 0, value: value.result });
            tx.onabort = tx.onerror = () =>
              finish(tx.error || Error('Recovery inspection was interrupted.'));
          } catch (error) {
            finish(error);
          }
        };
      } catch (error) {
        finish(error);
      }
    });
  }
  function recoveryJson(value) {
    try {
      checkJson(value);
    } catch {
      throw Error('This recovery copy cannot be preserved as JSON. It remains on this device.');
    }
    return JSON.stringify(
      { __proto__: null, format: 'alibi-origin-recovery-export', version: 1, pending: value },
      null,
      2,
    );
  }
  async function protectStartup(download) {
    let pending,
      unreadable = false;
    try {
      pending = await inspectPendingRecovery();
      if (!pending.present) return false;
    } catch {
      unreadable = true;
    }
    const app = document.getElementById('app');
    app.innerHTML =
      '<main id="main" class="main" tabindex="-1"><section class="panel" aria-labelledby="origin-recovery-title"><h1 id="origin-recovery-title">Save transfer needs attention</h1><p id="origin-recovery-summary"></p><ul id="origin-recovery-sections"></ul><p id="origin-recovery-help"></p><div class="row actions"><button class="btn" id="origin-recovery-export">Download recovery copy</button><button class="btn secondary" id="origin-recovery-retry">Retry opening</button></div><p id="origin-recovery-status" role="status"></p></section></main>';
    const get = (id) => document.getElementById('origin-recovery-' + id),
      button = get('export');
    get('summary').textContent = unreadable
      ? 'Recovery storage could not be checked. Play is paused to protect any unfinished save transfer.'
      : 'An unfinished save transfer left a recovery copy on this device. Some saves may already have changed. Play is paused while recovery needs attention.';
    get('help').textContent = unreadable
      ? 'Close other Alibi windows and retry. No recovery copy has been removed.'
      : 'Download the retained copy and keep it somewhere safe before seeking help. It contains private progress. This recovery file is not a normal backup; automatic restoration is not available yet.';
    if (unreadable) button.remove();
    if (!unreadable) {
      try {
        assertShape(pending.value);
        for (const line of previewOriginTransfer({ payload: pending.value })) {
          const item = document.createElement('li');
          item.textContent = line;
          get('sections').appendChild(item);
        }
      } catch {
        get('sections').textContent =
          'The retained copy has an unrecognized format and is preserved.';
      }
      button.onclick = async () => {
        button.disabled = true;
        try {
          await download('alibi-origin-recovery.json', recoveryJson(pending.value));
          get('status').textContent =
            'Recovery download prepared. The copy on this device is still retained.';
        } catch {
          get('status').textContent =
            'Download could not be prepared. The recovery copy remains on this device.';
        } finally {
          button.disabled = false;
        }
      };
    }
    get('retry').onclick = () => location.reload();
    document.title = 'Save recovery · Alibi';
    G.AlibiBootProtected?.();
    document.getElementById('main').focus();
    return true;
  }
  function createDevicePorts(io) {
    return {
      async read(name) {
        if (name === 'cabinet') return io.readCabinet();
        if (name === 'club') return io.readClub();
        if (name === 'quiet') return readQuiet();
        if (name === 'castle') return readCastle();
        if (name === 'challenges') return readChallenges();
        throw Error('Unknown save section.');
      },
      async write(name, value, attempted) {
        if (name === 'cabinet') return io.writeCabinet(value);
        if (name === 'club') return io.writeClub(value);
        if (name === 'quiet') return writeQuiet(value, attempted);
        if (name === 'castle') return writeCastle(value);
        if (name === 'challenges') return writeChallenges(value);
        throw Error('Unknown save section.');
      },
      retain: retainRecovery,
      release: releaseRecovery,
    };
  }
  G.AlibiOriginTransfer = {
    FORMAT,
    VERSION,
    SECTIONS,
    exportOriginTransfer,
    validateOriginTransfer,
    previewOriginTransfer,
    applyOriginTransfer,
    inspectPendingRecovery,
    recoveryJson,
    protectStartup,
    createDevicePorts,
  };
})(globalThis);
