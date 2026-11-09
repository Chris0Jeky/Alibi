'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { composePackDesk } = require('../tools/workshop-entry.cjs');
const source = fs.readFileSync('src/app.js', 'utf8');
test('pack reads quarantine mismatched database keys without changing the row', async () => {
  const rows = [
    { key: 'wrong', value: { id: 'actual' } },
    { key: 'right', value: { id: 'right' } },
  ];
  const context = vm.createContext({ setTimeout, clearTimeout, console, Event });
  vm.runInContext(fs.readFileSync('src/storage.js', 'utf8'), context);
  const store = new context.AlibiStorage.Store();
  store.db = {
    transaction() {
      const req = {};
      const listeners = {};
      const tx = {
        objectStore() {
          return {
            getAll() {
              queueMicrotask(() => {
                req.result = structuredClone(rows);
                req.onsuccess();
                listeners.complete();
              });
              return req;
            },
          };
        },
        addEventListener(name, fn) {
          listeners[name] = fn;
        },
      };
      return tx;
    },
  };
  const values = await store.getAll('packs');
  assert.deepEqual(JSON.parse(JSON.stringify(values)), [null, { id: 'right' }]);
  assert.deepEqual(rows, [
    { key: 'wrong', value: { id: 'actual' } },
    { key: 'right', value: { id: 'right' } },
  ]);
});
test('optional adder uses a neutral message for online module failures', () => {
  const output = composePackDesk(source, './assets/workshop/add.0123456789ab.js');
  assert.match(output, /navigator\.onLine\s*===\s*false/);
  assert.match(output, /Collection tools could not load/);
});
test('automatic restore refuses raw quarantined pack rows before touching storage', async () => {
  const context = vm.createContext({ setTimeout, clearTimeout, console, Event });
  vm.runInContext(fs.readFileSync('src/storage.js', 'utf8'), context);
  const store = new context.AlibiStorage.Store();
  store.db = {
    transaction() {
      throw Error('must not start a transaction');
    },
  };
  await assert.rejects(
    store.restore({ damaged: { packRows: [{ key: 'wrong', value: { id: 'actual' } }] } }),
    /manual|raw|damaged/i,
  );
});
test('export retains mismatched rows with original keys and refuses lossy values', async () => {
  const context = vm.createContext({ setTimeout, clearTimeout, console, Event });
  vm.runInContext(fs.readFileSync('src/storage.js', 'utf8'), context);
  const store = new context.AlibiStorage.Store();
  let row = { key: 'wrong', value: { id: 'actual', nested: ['kept'] } };
  store.db = {
    transaction() {
      const listeners = {},
        requests = [];
      const tx = {
        addEventListener(name, fn) {
          listeners[name] = fn;
        },
        objectStore(name) {
          return {
            getAll() {
              const req = { result: name === 'packs' ? [row] : [] };
              requests.push(req);
              return req;
            },
            get() {
              const req = { result: undefined };
              requests.push(req);
              return req;
            },
          };
        },
      };
      queueMicrotask(() => {
        listeners.complete();
        tx.oncomplete();
      });
      return tx;
    },
  };
  const out = await store.export();
  assert.deepEqual(JSON.parse(JSON.stringify(out.damaged.packRows)), [row]);
  assert.deepEqual(JSON.parse(JSON.stringify(out.packs)), []);
  row = { key: 'wrong', value: { id: 'actual', nonJson: new Date() } };
  await assert.rejects(store.export(), /raw|recover|export/i);
});
test('local pack lookup checks the original key while leaving raw storage unchanged', async () => {
  const raw = JSON.stringify(require('../content/workshop/afterlight-pictures.json'), null, 2),
    data = new Map([['alibi.v1.packs.wrong', raw]]);
  const localStorage = {
    get length() {
      return data.size;
    },
    key(i) {
      return [...data.keys()][i];
    },
    getItem(k) {
      return data.get(k) ?? null;
    },
  };
  const context = vm.createContext({ setTimeout, clearTimeout, console, Event, localStorage });
  vm.runInContext(fs.readFileSync('src/storage.js', 'utf8'), context);
  const store = new context.AlibiStorage.Store();
  store.mode = 'local';
  assert.deepEqual(JSON.parse(JSON.stringify(await store.getAll('packs'))), [null]);
  assert.equal(data.get('alibi.v1.packs.wrong'), raw);
  const backup = await store.export();
  assert.deepEqual(JSON.parse(JSON.stringify(backup.packs)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(backup.damaged.packRows)), [
    { storage: 'localStorage', key: 'alibi.v1.packs.wrong', value: raw },
  ]);
});
