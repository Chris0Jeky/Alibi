import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const helper = app.slice(
  app.indexOf('  async function importBackupFromPicker()'),
  app.indexOf('  async function importBackup('),
);
assert.ok(helper && !helper.includes('async function importBackup(file)'));

class FixtureFile {
  constructor(parts, name, options) {
    this.parts = parts;
    this.name = name;
    this.type = options.type;
  }
}

async function picker(overrides = {}) {
  const calls = [];
  const notices = [];
  const imported = [];
  const released = [];
  const context = {
    platform: {
      documents: {
        pickBackup: async (options) => {
          calls.push({ kind: 'pick', options });
          return overrides.pick || { ok: true, value: 'token-1' };
        },
        readLimited: async (token, limit, options) => {
          calls.push({ kind: 'read', token, limit, options });
          return overrides.read || { ok: true, value: '{"format":"alibi-backup"}' };
        },
        release: async (token) => {
          released.push(token);
          if (overrides.release) await overrides.release(token);
        },
      },
      capabilities: () => ({ userDocuments: true }),
    },
    toast: (message, error) => notices.push({ message, error }),
    importBackup: async (file) => {
      imported.push(file);
      if (overrides.importBackup) await overrides.importBackup(file);
    },
    File: FixtureFile,
  };
  const factory = await vm.runInNewContext(
    `(async()=>{let backupPickerBusy=false,backupPickerSerial=0,routeSerial=1;${helper};return Object.assign(importBackupFromPicker, {navigate:()=>routeSerial++,isBusy:()=>backupPickerBusy});})()`,
    context,
  );
  return { run: factory, calls, notices, imported, released };
}

test('picker import reads the bounded cabinet document, releases its token and passes a File', async () => {
  const fixture = await picker();
  await fixture.run();
  assert.equal(fixture.imported.length, 1);
  assert.equal(fixture.imported[0].name, 'alibi-backup.json');
  assert.equal(fixture.imported[0].type, 'application/json');
  assert.equal(fixture.imported[0].parts[0], '{"format":"alibi-backup"}');
  assert.deepEqual(fixture.released, ['token-1']);
  assert.deepEqual(
    fixture.calls.map((call) => [call.kind, call.limit, call.options.timeoutMs]),
    [
      ['pick', undefined, 30000],
      ['read', 16 * 1024 * 1024, 30000],
    ],
  );
  assert.notEqual(fixture.calls[0].options.operationId, fixture.calls[1].options.operationId);
  assert.match(fixture.calls[0].options.operationId, /^cabinet-restore-pick-[a-z0-9]+$/);
  assert.match(fixture.calls[1].options.operationId, /^cabinet-restore-read-[a-z0-9]+$/);
  assert.deepEqual(fixture.notices, []);
});

for (const navigated of [false, true]) {
  for (const releaseFails of [false, true]) {
    test(`picker ${navigated ? 'discards obsolete' : 'preserves current'} import exceptions after held release ${releaseFails ? 'fails' : 'completes'}`, async () => {
      for (const failure of [Error('worker failure'), undefined, null, false, 0, '', 'worker failure']) {
        let beginRelease, finishRelease, failRelease;
        const releasing = new Promise((resolve) => {
          beginRelease = resolve;
        });
        const heldRelease = new Promise((resolve, reject) => {
          finishRelease = resolve;
          failRelease = reject;
        });
        let importCalls = 0;
        const fixture = await picker({
          importBackup: async () => {
            if (++importCalls === 1) throw failure;
          },
          release: async () => {
            if (importCalls === 1) {
              beginRelease();
              await heldRelease;
            }
          },
        });
        const outerErrors = [];
        let modal = 'restore',
          settled = false;
        const running = fixture.run().then(
          () => {
            settled = true;
          },
          (error) => {
            assert.equal(fixture.run.isBusy(), false, 'busy resets before the outer error handler');
            settled = true;
            modal = null;
            outerErrors.push(error);
          },
        );
        await releasing;
        assert.equal(settled, false, 'the import waits for token cleanup');
        assert.equal(fixture.run.isBusy(), true);
        await fixture.run();
        assert.equal(fixture.calls.filter((call) => call.kind === 'pick').length, 1);
        if (navigated) {
          fixture.run.navigate();
          modal = 'newer lesson';
        }
        if (releaseFails) failRelease(Error('release failure'));
        else finishRelease();
        await running;
        assert.equal(fixture.run.isBusy(), false);
        assert.deepEqual(fixture.released, ['token-1']);
        assert.deepEqual(fixture.notices, []);
        assert.equal(outerErrors.length, navigated ? 0 : 1);
        if (!navigated) assert.equal(outerErrors[0], failure, 'preserves the original thrown value');
        assert.equal(modal, navigated ? 'newer lesson' : null);
        await fixture.run();
        assert.equal(fixture.calls.filter((call) => call.kind === 'pick').length, 2, 'cleanup leaves the picker available');
        assert.equal(fixture.imported.length, 2);
        assert.deepEqual(fixture.released, ['token-1', 'token-1']);
      }
    });
  }
}

test('picker success survives held release failure and resets busy', async () => {
  let beginRelease, failRelease;
  const releasing = new Promise((resolve) => {
    beginRelease = resolve;
  });
  const heldRelease = new Promise((resolve, reject) => {
    failRelease = reject;
  });
  const fixture = await picker({
    release: async () => {
      beginRelease();
      await heldRelease;
    },
  });
  const running = fixture.run();
  await releasing;
  assert.equal(fixture.run.isBusy(), true);
  failRelease(Error('release failure'));
  await running;
  assert.equal(fixture.run.isBusy(), false);
  assert.equal(fixture.imported.length, 1);
  assert.deepEqual(fixture.released, ['token-1']);
  assert.deepEqual(fixture.notices, []);
});

test('cancelled selection reports no mutation and the picker can be opened again', async () => {
  const fixture = await picker({ pick: { ok: false, code: 'cancelled' } });
  await fixture.run();
  await fixture.run();
  assert.equal(fixture.calls.filter((call) => call.kind === 'pick').length, 2);
  assert.equal(fixture.imported.length, 0);
  assert.deepEqual(fixture.notices, [
    { message: 'No backup was selected. Nothing was changed.', error: false },
    { message: 'No backup was selected. Nothing was changed.', error: false },
  ]);
});

test('bounded read failures release the token and do not invoke restore', async () => {
  for (const code of ['protected', 'denied', 'timeout', 'invalid']) {
    const fixture = await picker({
      read: { ok: false, code },
    });
    await fixture.run();
    assert.equal(fixture.imported.length, 0, code);
    assert.deepEqual(fixture.released, ['token-1'], code);
    assert.equal(fixture.notices.length, 1, code);
    assert.equal(fixture.notices[0].error, true, code);
  }
  const malformed = await picker({ read: { ok: true, value: 42 } });
  await malformed.run();
  assert.equal(malformed.imported.length, 0);
  assert.deepEqual(malformed.released, ['token-1']);
  assert.match(malformed.notices[0].message, /could not be read/i);
});

test('overlapping picker requests share one in-flight request and reset after exceptions', async () => {
  let resolvePick;
  let pickCalls = 0;
  const fixture = await picker();
  fixture.calls.length = 0;
  fixture.run = await vm.runInNewContext(
    `(async()=>{let backupPickerBusy=false,backupPickerSerial=0,routeSerial=1;${helper};return Object.assign(importBackupFromPicker, {navigate:()=>routeSerial++});})()`,
    {
      platform: {
        documents: {
          pickBackup: async () => {
            pickCalls++;
            return new Promise((resolve) => {
              resolvePick = resolve;
            });
          },
          readLimited: async () => ({ ok: true, value: '{}' }),
          release: () => {
            throw Error('release failed');
          },
        },
        capabilities: () => ({ userDocuments: true }),
      },
      toast: () => {},
      importBackup: async () => {
        throw Error('worker failure');
      },
      File: FixtureFile,
    },
  );
  const first = fixture.run();
  const second = fixture.run();
  assert.equal(pickCalls, 1);
  resolvePick({ ok: true, value: 'token-2' });
  await assert.rejects(first, /worker failure/);
  assert.equal(await second, undefined);
  const third = fixture.run();
  assert.equal(pickCalls, 2, 'busy flag resets after an import exception and release failure');
  resolvePick({ ok: false, code: 'cancelled' });
  await third;
});

for (const boundary of ['pick', 'read']) {
  for (const outcome of ['success', 'failure', 'exception']) {
    test(`picker discards ${outcome} after navigation during ${boundary} and releases its token`, async () => {
      let resolve, reject;
      const pending = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      });
      const fixture = await picker({ [boundary]: pending });
      const running = fixture.run();
      if (boundary === 'read') await new Promise(setImmediate);
      fixture.run.navigate();
      fixture.run.navigate();
      if (outcome === 'exception') reject(Error('obsolete provider failure'));
      else
        resolve(
          outcome === 'failure'
            ? { ok: false, code: 'denied' }
            : { ok: true, value: boundary === 'pick' ? 'late-token' : '{}' },
        );
      await running;
      assert.deepEqual(fixture.imported, []);
      assert.deepEqual(fixture.notices, []);
      assert.deepEqual(
        fixture.released,
        boundary === 'read' ? ['token-1'] : outcome === 'success' ? ['late-token'] : [],
      );
    });
  }
}
