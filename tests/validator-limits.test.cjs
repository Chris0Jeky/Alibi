'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const WORKER_SOURCE = fs.readFileSync(path.join(ROOT, 'src/validator-worker.js'), 'utf8');

function loadWorkerFromSrc() {
  const results = [];
  const context = {
    console,
    TextEncoder,
    TextDecoder,
    URL,
    // Stubs: limit checks run before validation, so identity validators isolate the cap.
    AlibiCastleValidation: { validateBackup: (value) => value },
    AlibiBackupValidation: () => ({
      validateBackup: (value) => value,
      validateSave: (value) => value,
    }),
    AlibiCore: {},
    ALIBI_CATALOG: {},
    AlibiClubEngines: {},
    AlibiChallenges: { create: () => ({ validateRun: (value) => value }) },
    ALIBI_CHALLENGE_DATA: {},
    QWEngine: {},
    QWStore: { validate: (value) => value },
  };
  context.self = context;
  context.postMessage = (value) => results.push(value);
  vm.createContext(context);
  vm.runInContext(WORKER_SOURCE, context, { timeout: 5000 });
  return { context, results };
}

function send(context, results, message) {
  context.onmessage({ data: message });
  return results.at(-1);
}

function combinedBackup() {
  return {
    format: 'alibi-all-saves',
    schema: 1,
    manifest: ['cabinet', 'club'],
    sections: { cabinet: {}, club: {} },
    warnings: ['Quiet Wing was not included: export it separately when available.'],
  };
}

const CASES = [
  {
    type: 'castle-backup',
    cap: 512 * 1024,
    error: 'Castle backup exceeds the 512 KiB import limit.',
    // ~500k CJK chars: char length stays under the cap while UTF-8 bytes exceed it.
    cjkCount: 500000,
    asciiText: '{"format":"castle-test"}',
  },
  {
    type: 'combined-backup',
    cap: 20 * 1024 * 1024,
    error: 'Combined backup exceeds the 20 MB import limit.',
    cjkCount: 8000000,
    asciiText: null,
  },
  {
    type: 'cabinet-backup',
    cap: 16 * 1024 * 1024,
    error: 'Backup exceeds the 16 MB safety limit.',
    cjkCount: 6000000,
    asciiText: '{"format":"cabinet-test"}',
  },
  {
    type: 'club-backup',
    cap: 1 * 1024 * 1024,
    error: 'Club backup exceeds the import limit.',
    cjkCount: 500000,
    asciiText: '{"schema":1}',
  },
];

for (const { type, cap, error, cjkCount, asciiText } of CASES) {
  test(`${type} rejects a CJK payload over the byte cap`, () => {
    const { context, results } = loadWorkerFromSrc();
    const text = '城'.repeat(cjkCount);
    assert.ok(
      text.length <= cap,
      `${type}: CJK char length ${text.length} should stay under the ${cap} cap`,
    );
    assert.ok(
      new TextEncoder().encode(text).length > cap,
      `${type}: CJK byte length should exceed the ${cap} cap`,
    );
    const result = send(context, results, { type, text });
    assert.equal(result.ok, false);
    assert.equal(result.error, error);
  });

  test(`${type} accepts a small ASCII payload under the byte cap`, () => {
    const { context, results } = loadWorkerFromSrc();
    const text = asciiText ?? JSON.stringify(combinedBackup());
    assert.ok(text.length <= cap);
    assert.ok(new TextEncoder().encode(text).length <= cap);
    const result = send(context, results, { type, text });
    assert.equal(result.ok, true, result.error);
  });
}
