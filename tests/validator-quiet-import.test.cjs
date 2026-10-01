'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const LIMIT = 1 * 1024 * 1024;

function loadWorker() {
  const source = fs.readFileSync('src/validator-worker.js', 'utf8');
  const results = [];
  const calls = { scenes: 0, states: 0 };
  const context = { console };
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

test('quiet-import text over 1 MB is rejected cleanly before parse', () => {
  const { context, results, calls } = loadWorker();
  const text = 'x'.repeat(LIMIT + 1);
  assert.ok(text.length > LIMIT);
  const result = send(context, results, { type: 'quiet-import', text });
  assert.equal(result.ok, false);
  assert.match(result.error, /1 MB/);
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
    assert.match(result.error, /1 MB/);
  }
  assert.equal(calls.scenes, 0);
  assert.equal(calls.states, 0);
});
