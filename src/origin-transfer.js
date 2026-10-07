/* Device-local origin transfer. Checksum, version and shape are pure.
   Apply retains recovery and rolls back only domains whose writes were attempted.
   Separate IndexedDB databases are not one transaction. No network. */
(function (G) {
  'use strict';
  const FORMAT = 'alibi-origin-transfer',
    VERSION = 1,
    SECTIONS = ['cabinet', 'club', 'quiet', 'castle', 'challenges'],
    UNCHANGED = 'Existing saves were not changed.';
  const fail = (reason) => {
    throw Error(`${reason} ${UNCHANGED}`);
  };
  const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
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
    for (const row of challenges.runs)
      if (
        !isObject(row) ||
        typeof row.id !== 'string' ||
        !row.id ||
        row.schema !== 1 ||
        !Number.isSafeInteger(row.revision) ||
        row.revision < 1 ||
        !isObject(row.run) ||
        row.run.format !== 'alibi-challenge-run'
      )
        fail('This transfer file has the wrong shape.');
    return payload;
  }
  async function exportOriginTransfer(saves) {
    assertShape(saves);
    const payload = JSON.stringify({
      cabinet: saves.cabinet,
      club: saves.club,
      quiet: saves.quiet,
      castle: saves.castle,
      challenges: saves.challenges,
    });
    return { format: FORMAT, version: VERSION, checksum: await sha256Hex(payload), payload };
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
    let retained = false;
    try {
      for (const name of SECTIONS) before[name] = await ports.read(name);
      await ports.retain(before);
      retained = true;
      for (const name of SECTIONS) {
        // A rejected write may already have changed its domain. Record it first,
        // but never roll an untouched later domain back to an older snapshot.
        attempted.push(name);
        await ports.write(name, validated.payload[name]);
      }
    } catch (error) {
      if (!retained) fail(String(error?.message || 'Import could not read the current saves.'));
      try {
        for (const name of attempted) await ports.write(name, before[name]);
        for (const name of attempted)
          if (!sameAfterRollback(name, await ports.read(name), before[name]))
            throw Error('Rollback did not match the recovery copy.');
      } catch (rollbackError) {
        throw Error(`Import failed and the recovery copy was kept. ${rollbackError.message}`);
      }
      if (String(error.message).includes(UNCHANGED)) throw error;
      fail(error.message || 'Import stopped before it finished.');
    }
    await ports.release();
    return validated;
  }
  function openDb(name, version, upgrade) {
    return new Promise((resolve, reject) => {
      let request;
      try {
        request = version == null ? indexedDB.open(name) : indexedDB.open(name, version);
      } catch (error) {
        reject(error);
        return;
      }
      request.onupgradeneeded = () => upgrade?.(request.result);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || Error('Storage could not open.'));
      request.onblocked = () => reject(Error('Another tab is blocking storage.'));
    });
  }
  function txDone(db, storeName, mode, work) {
    return new Promise((resolve, reject) => {
      let tx, result;
      try {
        tx = db.transaction(storeName, mode);
      } catch (error) {
        reject(error);
        return;
      }
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
  async function readQuiet() {
    await G.QWStore?.flush?.().catch(() => {});
    let state = G.QWApp?.state || null;
    if (!state) state = (await readRecord('alibi-quiet-wing-v1', 'saves', 'state')) || null;
    if (!state) {
      try {
        const raw = G.localStorage?.getItem('alibi-quiet-wing-v1:fallback');
        if (raw) state = JSON.parse(raw);
      } catch {
        throw Error('Quiet Wing fallback could not be read.');
      }
    }
    return { kind: 'alibi-quiet-wing-backup', schema: 1, state: state || null };
  }
  async function writeQuiet(section) {
    const state = section.state;
    if (!state) {
      const db = await openExisting('alibi-quiet-wing-v1');
      if (db) {
        try {
          if (db.objectStoreNames.contains('saves'))
            await txDone(db, 'saves', 'readwrite', (store) => store.delete('state'));
        } finally {
          db.close();
        }
      }
      mirrorQuietFallback(null);
      return;
    }
    await withDb('alibi-quiet-wing-v1', 1, ensureStore('saves'), (db) =>
      txDone(db, 'saves', 'readwrite', (store) => store.put(state, 'state')),
    );
    mirrorQuietFallback(state);
  }
  function mirrorQuietFallback(state) {
    try {
      if (G.localStorage?.getItem('alibi-quiet-wing-v1:fallback') == null) return;
      if (state) G.localStorage.setItem('alibi-quiet-wing-v1:fallback', JSON.stringify(state));
      else G.localStorage.removeItem('alibi-quiet-wing-v1:fallback');
    } catch {
      /* A missing fallback is left missing. IndexedDB already holds the save. */
    }
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
      const db = await openExisting('alibi-castle-v1');
      if (db) {
        try {
          if (db.objectStoreNames.contains('records'))
            await txDone(db, 'records', 'readwrite', (store) => store.delete('chapter-one'));
        } finally {
          db.close();
        }
      }
      return;
    }
    await withDb('alibi-castle-v1', 1, ensureStore('records'), (db) =>
      txDone(db, 'records', 'readwrite', (store) => store.put(record, 'chapter-one')),
    );
  }
  async function readChallenges() {
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
            if (typeof key === 'string' && !key.startsWith('recovery:') && value)
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
            if (typeof key === 'string' && !key.startsWith('recovery:')) store.delete(key);
          for (const row of section.runs)
            store.put({ schema: row.schema, revision: row.revision, run: row.run }, row.id);
        };
      }),
    );
  }
  async function retainRecovery(snapshot) {
    await withDb('alibi-origin-recovery', 1, ensureStore('copies'), (db) =>
      txDone(db, 'copies', 'readwrite', (store) => store.put(snapshot, 'pending')),
    );
  }
  async function releaseRecovery() {
    const db = await openExisting('alibi-origin-recovery');
    if (!db || !db.objectStoreNames.contains('copies')) {
      db?.close();
      return;
    }
    try {
      await txDone(db, 'copies', 'readwrite', (store) => store.delete('pending'));
    } finally {
      db.close();
    }
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
      async write(name, value) {
        if (name === 'cabinet') return io.writeCabinet(value);
        if (name === 'club') return io.writeClub(value);
        if (name === 'quiet') return writeQuiet(value);
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
    createDevicePorts,
  };
})(globalThis);
