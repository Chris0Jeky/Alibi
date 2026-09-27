'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const { fixture } = require('./fixtures/escape-room.cjs');
const S = require('../tools/escape-state.cjs');
const file = path.join(__dirname, '../tools/escape-authoring.cjs');
const A = fs.existsSync(file) ? require(file) : {};
function extra(d, id, when, set) {
  d.actions.push({ ...structuredClone(d.actions[0]), id, when, check: {}, set });
}
function replay(d, trace) {
  let s = S.initial(d);
  for (const id of trace) {
    const a = d.actions.find(a => a.id === id);
    const next = S.transition(d, s, id, a.answer);
    assert.equal(next.ok, true); s = next.state;
  }
  return s;
}
test('authoring functions exist', () => {
  for (const name of ['parse','read','analyze']) assert.equal(typeof A[name], 'function');
});
test('verifies a tiny independently enumerated transition graph', () => {
  const d = fixture(), r = A.analyze(d);
  assert.equal(r.status, 'verified'); assert.equal(r.reachableStates, 2);
  assert.equal(r.edges, 1); assert.equal(r.softlockCount, 0);
  assert.deepEqual(r.solution, ['leave']); assert.equal(r.softlockTrace, null);
  assert.equal(S.project(d, replay(d, r.solution), true).won, true);
});
test('a winning route does not hide an irreversible losing branch', () => {
  const d = fixture(); extra(d, 'discard', {}, { key: 'lost' });
  const r = A.analyze(d);
  assert.equal(r.status, 'unsafe'); assert.equal(r.reachableStates, 3);
  assert.equal(r.softlockCount, 1); assert.deepEqual(r.softlockTrace, ['discard']);
  const trapped = replay(d, r.softlockTrace);
  assert.equal(S.transition(d, trapped, 'leave', null).code, 'mechanism');
  assert.deepEqual(r.solution, ['leave']);
});
test('reversible cycles and redundant actions are safe, not infinite exploration', () => {
  const d = fixture(); extra(d, 'discard', {}, { key: 'lost' });
  extra(d, 'recover', { key: 'lost' }, { key: 'held' });
  const r = A.analyze(d);
  assert.equal(r.status, 'verified'); assert.equal(r.reachableStates, 3);
  assert.equal(r.edges, 4); assert.equal(r.softlockCount, 0);
});
test('hidden objects cannot provide an imaginary route to the goal', () => {
  const d = fixture(); d.objects[0].when = { door: 'open' };
  const r = A.analyze(d);
  assert.equal(r.status, 'unsafe'); assert.equal(r.solution, null);
  assert.equal(r.softlockCount, 1); assert.deepEqual(r.softlockTrace, []);
  assert.deepEqual(r.unreachableActions, ['leave']);
});
test('state and edge caps return inconclusive, never a clean softlock count', () => {
  const d = fixture(); extra(d, 'discard', {}, { key: 'lost' });
  for (const options of [{ maxStates: 1 }, { maxEdges: 1 }]) {
    const r = A.analyze(d, options);
    assert.equal(r.status, 'inconclusive'); assert.equal(r.softlockCount, null);
    assert.equal(r.solution, null); assert.equal(r.unreachableActions, null);
  }
});
test('invalid cap values and unknown options fail before traversal', () => {
  for (const options of [null, { maxStates: 0 }, { maxStates: 4097 }, { maxEdges: 196609 }, { maxStates: 1.5 }, { pretend: true }])
    assert.throws(() => A.analyze(fixture(), options), /options/);
});
test('analysis is deterministic and leaves authored input untouched', () => {
  const d = fixture(), before = JSON.stringify(d);
  assert.deepEqual(A.analyze(d), A.analyze(d)); assert.equal(JSON.stringify(d), before);
});
test('exact UTF-8 source receipt changes with whitespace', () => {
  const source = JSON.stringify(fixture()), r = A.parse(source);
  assert.equal(r.receipt.sourceSha256, crypto.createHash('sha256').update(source).digest('hex'));
  assert.equal(r.receipt.sourceBytes, Buffer.byteLength(source));
  assert.notEqual(r.receipt.sourceSha256, A.parse(source + '\n').receipt.sourceSha256);
});
test('source limit is bytes, checked before parsing including multibyte source', () => {
  const source = JSON.stringify(fixture());
  assert.equal(A.parse(source.padEnd(262144)).receipt.sourceBytes, 262144);
  assert.throws(() => A.parse(source.padEnd(262145)), /bytes/);
  assert.throws(() => A.parse('é'.repeat(131073)), /bytes/);
  assert.throws(() => A.parse('{'), /JSON/); assert.throws(() => A.parse(null), /source/);
});
test('file reader and CLI validate source and publish a real analysis receipt', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'escape-authoring-'));
  try {
    const source = path.join(dir, 'room.json'); fs.writeFileSync(source, JSON.stringify(fixture()));
    assert.equal(A.read(source).definition.id, 'test-room');
    const run = () => spawnSync(process.execPath, [file, source], { encoding: 'utf8' });
    const result = run(); assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).model.status, 'verified');
    const d = fixture(); extra(d, 'discard', {}, { key: 'lost' });
    fs.writeFileSync(source, JSON.stringify(d)); assert.equal(run().status, 2);
    fs.writeFileSync(source, Buffer.from([255])); assert.throws(() => A.read(source), /UTF-8/);
    fs.writeFileSync(source, Buffer.alloc(262145)); assert.throws(() => A.read(source), /bytes/);
    assert.throws(() => A.read(dir), /regular/);
    assert.equal(spawnSync(process.execPath, [file]).status, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('named pipes are refused without waiting for a writer', { skip: process.platform === 'win32' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'escape-fifo-'));
  try {
    const source = path.join(dir, 'room'); assert.equal(spawnSync('mkfifo', [source]).status, 0);
    const result = spawnSync(process.execPath, [file, source], { encoding: 'utf8', timeout: 1500 });
    assert.equal(result.status, 1, String(result.error)); assert.match(result.stderr, /regular/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('explicit null or undefined caps are invalid rather than defaulted', () => {
  for (const key of ['maxStates', 'maxEdges']) {
    for (const value of [null, undefined])
      assert.throws(() => A.analyze(fixture(), { [key]: value }), /options/);
  }
  assert.equal(A.analyze(fixture(), {}).status, 'verified');
});
