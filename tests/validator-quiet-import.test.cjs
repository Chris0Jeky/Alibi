'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const LIMIT = 1 * 1024 * 1024;
const MESSAGE = 'Quiet Wing import exceeds the 1 MiB import limit.';

function loadWorker() {
  const source = fs.readFileSync('src/validator-worker.js', 'utf8');
  const results = [];
  const calls = { scenes: 0, states: 0 };
  const context = { console, TextEncoder };
  context.self = context;
  context.postMessage = (value) => results.push(value);
  context.QWEngine = {
    validateScene: (data) => {
      calls.scenes += 1;
      return data;
    },
  };
  context.QWStore = {
    validate: (state) => {
      calls.states += 1;
      return state;
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context, { timeout: 5000 });
  return { context, results, calls };
}

function send(context, results, message) {
  context.onmessage({ data: message });
  return results.at(-1);
}

test('quiet-import text over 1 MiB is rejected cleanly before parse', () => {
  const { context, results, calls } = loadWorker();
  const text = 'x'.repeat(LIMIT + 1);
  assert.ok(text.length > LIMIT);
  const result = send(context, results, { type: 'quiet-import', text });
  assert.equal(result.ok, false);
  assert.equal(result.error, MESSAGE);
  assert.equal(calls.scenes, 0);
  assert.equal(calls.states, 0);
});

test('quiet-import text at the limit proceeds to kind validation', () => {
  const { context, results } = loadWorker();
  const base = JSON.stringify({ kind: 'not-quiet' });
  const text = base + ' '.repeat(LIMIT - base.length);
  assert.equal(text.length, LIMIT);
  const result = send(context, results, { type: 'quiet-import', text });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'This is not an Alibi Quiet Wing backup or realm.');
});

test('quiet-import non-string text is rejected cleanly', () => {
  const { context, results, calls } = loadWorker();
  for (const text of [123, null, undefined, {}, ['x']]) {
    const result = send(context, results, { type: 'quiet-import', text });
    assert.equal(result.ok, false, `expected rejection for ${String(text)}`);
    assert.equal(result.error, MESSAGE);
  }
  assert.equal(calls.scenes, 0);
  assert.equal(calls.states, 0);
});

test('quiet-import cap counts UTF-8 bytes, not characters', () => {
  const { context, results, calls } = loadWorker();
  const prefix = '{"kind":"not-quiet","padx":"',
    suffix = '"}',
    room = (LIMIT - Buffer.byteLength(prefix + suffix, 'utf8')) / 2;
  assert.ok(Number.isInteger(room));
  const over = prefix + 'é'.repeat(room + 1) + suffix;
  assert.ok(over.length < LIMIT);
  assert.ok(Buffer.byteLength(over, 'utf8') > LIMIT);
  const rejected = send(context, results, { type: 'quiet-import', text: over });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error, MESSAGE);
  const atLimit = prefix + 'é'.repeat(room) + suffix;
  assert.equal(Buffer.byteLength(atLimit, 'utf8'), LIMIT);
  const accepted = send(context, results, { type: 'quiet-import', text: atLimit });
  assert.equal(accepted.ok, false);
  assert.equal(accepted.error, 'This is not an Alibi Quiet Wing backup or realm.');
  assert.equal(calls.scenes, 0);
  assert.equal(calls.states, 0);
});

test('quiet UI gate shares the worker cap and message', () => {
  const worker = fs.readFileSync('src/validator-worker.js', 'utf8');
  const app = fs.readFileSync('src/quiet-wing/app.js', 'utf8');
  assert.ok(worker.includes(MESSAGE));
  assert.ok(app.includes(`toast('${MESSAGE}')`));
  assert.ok(app.includes('f.size > 1 * 1024 * 1024'));
  assert.ok(!app.includes('2_000_000'));
});
