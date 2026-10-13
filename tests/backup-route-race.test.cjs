'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  process.env.ALIBI_APP_SOURCE || path.join(__dirname, '..', 'src', 'app.js'),
  'utf8',
);
function appFunction(name) {
  const start = source.indexOf(`  async function ${name}(`);
  assert.notEqual(start, -1, `${name} exists in the app`);
  const end = source.indexOf('\n  async function ', start + 1);
  assert.notEqual(end, -1, `${name} has a following function boundary`);
  return source.slice(start, end);
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const cabinet = {
  runs: [{ key: 'existing' }, { key: 'missing' }],
  packs: [{ id: 'custom-pack' }],
};
const combined = {
  sections: { cabinet, club: {}, quiet: {}, castle: {} },
  warnings: ['Keep the recovery copy.'],
};
const cases = [
  {
    name: 'stageAll',
    type: 'combined-backup',
    data: combined,
    limit: 20,
    title: 'Choose a section to restore',
  },
  {
    name: 'importBackup',
    type: 'cabinet-backup',
    data: cabinet,
    limit: 16,
    title: 'Restore your progress.',
  },
];
function fixture(subject, worker) {
  const dialogs = [],
    requests = [];
  const previousAll = { sections: { cabinet, club: {} }, warnings: [] };
  const previousBackup = { runs: [{ key: 'previous' }], packs: [] };
  const context = {
    previousAll,
    previousBackup,
    records: new Map([['existing', {}]]),
    esc: (text) => text,
    dialog: (title, body, actions) => dialogs.push({ title, body, actions }),
    inWorker: (request) => {
      requests.push(request);
      return worker(request);
    },
  };
  vm.runInNewContext(
    `
    let routeSerial = 10, stagedAll = previousAll, pendingBackup = previousBackup;
    ${appFunction(subject.name)}
    globalThis.api = {
      run: ${subject.name},
      navigate() { routeSerial++; },
      get stagedAll() { return stagedAll; },
      get pendingBackup() { return pendingBackup; }
    };
  `,
    context,
    { filename: 'src/app.js' },
  );
  return {
    api: context.api,
    dialogs,
    requests,
    assertPrevious() {
      assert.equal(context.api.stagedAll, previousAll);
      assert.equal(context.api.pendingBackup, previousBackup);
      assert.equal(dialogs.length, 0, 'no restore dialog opens after navigation');
    },
  };
}

for (const subject of cases) {
  test(`${subject.name}: publishes the validated backup on the same route`, async () => {
    const f = fixture(subject, async () => subject.data);
    await f.api.run({ size: 20, text: async () => 'backup text' });
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].type, subject.type);
    assert.equal(f.requests[0].text, 'backup text');
    assert.equal(f.dialogs.length, 1);
    assert.equal(f.dialogs[0].title, subject.title);
    if (subject.name === 'stageAll') {
      assert.equal(f.api.stagedAll, combined);
      assert.match(f.dialogs[0].body, /Keep the recovery copy/);
      assert.deepEqual(
        Array.from(f.dialogs[0].actions, (action) => action.action),
        ['all-cabinet', 'all-club', 'all-quiet', 'all-castle', 'close-dialog'],
      );
    } else {
      assert.equal(f.api.pendingBackup, cabinet);
      assert.match(f.dialogs[0].body, /2 saved puzzles/);
      assert.match(f.dialogs[0].body, /1 custom packs/);
      assert.match(f.dialogs[0].body, /1 saved puzzle already exists/);
      assert.deepEqual(
        Array.from(f.dialogs[0].actions, (action) => action.action),
        ['restore-merge', 'restore-replace', 'export', 'close-dialog'],
      );
    }
  });

  test(`${subject.name}: navigation during file reading retains the previous backup`, async () => {
    const reading = deferred();
    const f = fixture(subject, async () => subject.data);
    const importing = f.api.run({ size: 20, text: () => reading.promise });
    assert.equal(f.requests.length, 0);
    f.api.navigate();
    reading.resolve('backup text');
    await importing;
    assert.equal(f.requests.length, 1, 'validation still finishes without publishing');
    f.assertPrevious();
  });

  test(`${subject.name}: navigation during worker validation retains the previous backup`, async () => {
    const validation = deferred(),
      started = deferred();
    const f = fixture(subject, () => {
      started.resolve();
      return validation.promise;
    });
    const importing = f.api.run({ size: 20, text: async () => 'backup text' });
    await started.promise;
    f.api.navigate();
    validation.resolve(subject.data);
    await importing;
    f.assertPrevious();
  });

  for (const failingAt of ['reading', 'validation']) {
    test(`${subject.name}: stale ${failingAt} rejection retains state without feedback`, async () => {
      const failure = deferred(),
        started = deferred();
      const f = fixture(subject, () => {
        started.resolve();
        return failure.promise;
      });
      const importing = f.api.run({
        size: 20,
        text: () => (failingAt === 'reading' ? failure.promise : Promise.resolve('backup text')),
      });
      const error = new Error('Unreadable backup');
      const settled = assert.doesNotReject(importing);
      if (failingAt === 'validation') await started.promise;
      f.api.navigate();
      failure.reject(error);
      await settled;
      f.assertPrevious();
    });
  }

  test(`${subject.name}: a current validation error still reaches the caller`, async () => {
    const error = new Error('Current backup validation failed');
    const f = fixture(subject, async () => {
      throw error;
    });
    await assert.rejects(
      f.api.run({ size: 20, text: async () => 'backup text' }),
      (actual) => actual === error,
    );
    f.assertPrevious();
  });

  test(`${subject.name}: the byte limit still rejects before reading or validation`, async () => {
    const f = fixture(subject, async () => subject.data);
    let read = false;
    await assert.rejects(
      f.api.run({
        size: subject.limit * 1024 * 1024 + 1,
        text: async () => {
          read = true;
          return 'backup text';
        },
      }),
      /exceeds/,
    );
    assert.equal(read, false);
    assert.equal(f.requests.length, 0);
    f.assertPrevious();
  });
}
