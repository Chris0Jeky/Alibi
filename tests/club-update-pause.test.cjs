'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function memStore() {
  const data = new Map();
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

async function makeTab(storage) {
  const listeners = {};
  const workers = [];
  const c = {
    console,
    URLSearchParams,
    Math,
    Date,
    JSON,
    Number,
    Promise,
    setTimeout,
    clearTimeout,
    localStorage: storage,
    location: { hash: '', href: 'http://localhost/' },
    ALIBI_CLUB_CONFIG: { engineSource: '/* stub engine */' },
    Blob: class {
      constructor(parts) {
        this.parts = parts;
      }
    },
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL() {} },
    Worker: class {
      constructor(url) {
        this.url = url;
        this.terminated = false;
        workers.push(this);
      }
      postMessage(msg) {
        this.lastMsg = msg;
      }
      terminate() {
        this.terminated = true;
      }
    },
    matchMedia: () => ({ matches: false }),
    devicePixelRatio: 1,
    document: {
      hidden: false,
      addEventListener(type, fn) {
        (listeners[type] = listeners[type] || []).push(fn);
      },
      createElement() {
        return { hidden: true, accept: '', files: [], value: '' };
      },
      getElementById() {
        return null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      body: { append() {}, classList: { toggle() {} } },
    },
  };
  c.globalThis = c;
  c.window = c;
  c.self = c;
  vm.createContext(c);
  for (const f of ['core', 'backup-validation', 'club-engines', 'club']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src/' + f + '.js'), 'utf8'), c);
  }
  await c.AlibiClub.init({ toast() {}, render() {}, settings: () => ({}) });
  c.__listeners = listeners;
  c.__workers = workers;
  return c;
}

function keyEvent(key) {
  return { key, defaultPrevented: false, preventDefault() {}, target: { closest: () => null } };
}

test('paused Club action and keyboard paths cannot append moves; unpause restores control', async () => {
  const g = await makeTab(memStore());
  await g.AlibiClub.onRoute({ page: 'salon', id: 'tictactoe' });
  assert.equal(g.AlibiClub.diagnostics().state.runs.tictactoe.log.length, 0);
  g.AlibiClub.pauseForUpdate(true);
  await g.AlibiClub.action({ dataset: { action: 'club-tictactoe-cell', cell: '0' } });
  await g.AlibiClub.flush();
  assert.deepEqual(
    g.AlibiClub.diagnostics().state.runs.tictactoe.log,
    [],
    'action while paused appends nothing',
  );
  g.AlibiClub.pauseForUpdate(false);
  await g.AlibiClub.action({ dataset: { action: 'club-tictactoe-cell', cell: '0' } });
  await g.AlibiClub.flush();
  assert.deepEqual(
    g.AlibiClub.diagnostics().state.runs.tictactoe.log,
    [0],
    'unpaused control appends the move',
  );

  const h = await makeTab(memStore());
  await h.AlibiClub.onRoute({ page: 'salon', id: 'archive' });
  const before = h.AlibiClub.diagnostics().state.runs.archive.log.length;
  assert.equal(before, 0);
  const keydown = h.__listeners.keydown?.[0];
  assert.ok(keydown, 'Club registers a native keydown handler');
  h.AlibiClub.pauseForUpdate(true);
  for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) keydown(keyEvent(k));
  assert.equal(
    h.AlibiClub.diagnostics().state.runs.archive.log.length,
    0,
    'keydown while paused appends nothing',
  );
  h.AlibiClub.pauseForUpdate(false);
  let moved = false;
  for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    keydown(keyEvent(k));
    if (h.AlibiClub.diagnostics().state.runs.archive.log.length > 0) {
      moved = true;
      break;
    }
  }
  assert.ok(moved, 'unpaused keyboard move appends via the native path');
});

test('bot pending work is invalidated on pause and cannot restart until unpause', async () => {
  const g = await makeTab(memStore());
  await g.AlibiClub.onRoute({ page: 'salon', id: 'tictactoe' });
  await g.AlibiClub.action({ dataset: { action: 'club-tictactoe-cell', cell: '0' } });
  await g.AlibiClub.flush();
  assert.deepEqual(g.AlibiClub.diagnostics().state.runs.tictactoe.log, [0]);
  g.AlibiClub.afterRender({ page: 'salon', id: 'tictactoe' });
  assert.equal(g.AlibiClub.diagnostics().botPending, true, 'bot job starts on the keeper turn');
  assert.equal(g.__workers.length, 1);
  const stale = g.__workers[0];
  const staleId = stale.lastMsg?.id;
  g.AlibiClub.pauseForUpdate(true);
  assert.equal(g.AlibiClub.diagnostics().botPending, false, 'pause clears pending bot work');
  assert.ok(stale.terminated, 'pause terminates the worker so its epoch is stale');
  const countWhilePaused = g.__workers.length;
  g.AlibiClub.afterRender({ page: 'salon', id: 'tictactoe' });
  assert.equal(g.__workers.length, countWhilePaused, 'bot cannot restart while paused');
  assert.equal(g.AlibiClub.diagnostics().botPending, false);
  if (stale.onmessage && staleId !== undefined) {
    stale.onmessage({ data: { id: staleId, cell: 1 } });
    await g.AlibiClub.flush();
    assert.deepEqual(
      g.AlibiClub.diagnostics().state.runs.tictactoe.log,
      [0],
      'stale worker reply is rejected by the job epoch',
    );
  }
  g.AlibiClub.pauseForUpdate(false);
  g.AlibiClub.afterRender({ page: 'salon', id: 'tictactoe' });
  assert.equal(
    g.AlibiClub.diagnostics().botPending,
    true,
    'unpause lets the render path resume bot play',
  );
  assert.equal(g.__workers.length, countWhilePaused + 1);
});
