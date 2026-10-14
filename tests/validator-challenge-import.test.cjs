'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const LIMIT = 3 * 1024 * 1024;
const MESSAGE = 'Challenge save exceeds the 3 MiB import limit.';

function loadWorker() {
  const source = fs.readFileSync('src/validator-worker.js', 'utf8');
  const results = [];
  const calls = { create: 0, validate: 0 };
  const context = { console, TextEncoder };
  context.self = context;
  context.postMessage = (value) => results.push(value);
  context.ALIBI_CHALLENGE_DATA = {};
  context.QWEngine = {};
  context.AlibiClubEngines = {};
  context.AlibiChallenges = {
    create: () => {
      calls.create += 1;
      return {
        validateRun: (value) => {
          calls.validate += 1;
          return value;
        },
      };
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

function byteLength(text) {
  return new TextEncoder().encode(text).length;
}

test('challenge-run ASCII text over the limit is rejected before validation', () => {
  const { context, results, calls } = loadWorker();
  const text = 'x'.repeat(LIMIT + 1);
  assert.equal(byteLength(text), LIMIT + 1);
  const result = send(context, results, { type: 'challenge-run', text });
  assert.equal(result.ok, false);
  assert.equal(result.error, MESSAGE);
  assert.equal(calls.validate, 0);
});

test('challenge-run non-string text is rejected before validation', () => {
  const { context, results, calls } = loadWorker();
  for (const text of [123, null, undefined, {}, ['x']]) {
    const result = send(context, results, { type: 'challenge-run', text });
    assert.equal(result.ok, false, `expected rejection for ${String(text)}`);
    assert.equal(result.error, MESSAGE);
  }
  assert.equal(calls.validate, 0);
});

test('challenge-run small valid run reaches validation', () => {
  const { context, results, calls } = loadWorker();
  const text = JSON.stringify({ format: 'alibi-challenge-run' });
  assert.ok(byteLength(text) < LIMIT);
  const result = send(context, results, { type: 'challenge-run', text });
  assert.equal(result.ok, true, result.error);
  assert.equal(calls.validate, 1);
  assert.equal(result.value.format, 'alibi-challenge-run');
});

test('challenge-run text exactly at the limit reaches validation', () => {
  const { context, results, calls } = loadWorker();
  const base = JSON.stringify({ format: 'alibi-challenge-run' });
  const text = base + ' '.repeat(LIMIT - base.length);
  assert.equal(byteLength(text), LIMIT);
  const result = send(context, results, { type: 'challenge-run', text });
  assert.equal(result.ok, true, result.error);
  assert.equal(calls.validate, 1);
});

test('challenge-run multibyte text over the limit is rejected below the character cap', () => {
  const { context, results, calls } = loadWorker();
  const text = 'é'.repeat(Math.floor(LIMIT / 2) + 1);
  assert.ok(text.length < LIMIT);
  assert.ok(byteLength(text) > LIMIT);
  const result = send(context, results, { type: 'challenge-run', text });
  assert.equal(result.ok, false);
  assert.equal(result.error, MESSAGE);
  assert.equal(calls.validate, 0);
});

test('challenge-run multibyte text exactly at the byte limit reaches validation', () => {
  const { context, results, calls } = loadWorker();
  const base = JSON.stringify({ format: 'alibi-challenge-run', note: 'café' });
  const pad = LIMIT - byteLength(base);
  assert.ok(pad > 0);
  const text = base + ' '.repeat(pad);
  assert.equal(byteLength(text), LIMIT);
  assert.ok(text.length < LIMIT);
  const result = send(context, results, { type: 'challenge-run', text });
  assert.equal(result.ok, true, result.error);
  assert.equal(calls.validate, 1);
});

test('quiet wing challenge UI keeps the matching byte cap and message', () => {
  const app = fs.readFileSync('src/quiet-wing/app.js', 'utf8');
  assert.ok(app.includes('file.size > 3 * 1024 * 1024'));
  assert.ok(app.includes(MESSAGE));
  const worker = fs.readFileSync('src/validator-worker.js', 'utf8');
  assert.ok(worker.includes('TextEncoder'));
  assert.ok(worker.includes(MESSAGE));
});
