import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { buildSync } from 'esbuild';
import State from '../tools/escape-state.cjs';
import buildRules from '../tools/escape-save-rules.cjs';
import { validateEscape } from '../src/castle/escape-save-validation.mjs';
import puzzles from '../src/castle/puzzles.mjs';
import rooms from '../src/castle/rooms.mjs';
import { initial } from '../src/castle/engine.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const contracts = buildRules(root);
const readRoom = (id) =>
  JSON.parse(readFileSync(new URL(`../content/escape-rooms/${id}.json`, import.meta.url), 'utf8'));
const record = (d, trail) => ({
  escapeRooms: {
    [d.id]: { revision: d.revision, sha: contracts[d.id][1], trail, drafts: {}, hints: {} },
  },
});
const encode = (d, s) => d.variables.map((v) => v.values.indexOf(s[v.id])).join('');

test('the compact worker contract accepts all reachable room states and applied transitions', () => {
  let count = 0,
    edges = 0;
  for (const id of Object.keys(contracts)) {
    const d = readRoom(id);
    const start = State.initial(d);
    const reachable = new Map([[encode(d, start), start]]);
    for (const [code, state] of reachable) {
      if (State.project(d, state, false).won)
        assert.throws(() => validateEscape(record(d, [code]), contracts));
      else validateEscape(record(d, [code]), contracts);
      count++;
      const following = new Set();
      for (const a of d.actions) {
        const result = State.transition(d, state, a.id, a.answer);
        if (!result.ok) continue;
        const next = encode(d, result.state);
        validateEscape(record(d, [code, next]), contracts);
        following.add(next);
        edges++;
        if (!reachable.has(next)) reachable.set(next, result.state);
      }
      const impossible = [...reachable.keys()].find((key) => key !== code && !following.has(key));
      if (impossible) assert.throws(() => validateEscape(record(d, [code, impossible]), contracts));
    }
    const product = d.variables.reduce(
      (states, v) => states.flatMap((s) => v.values.map((_, i) => s + i)),
      [''],
    );
    for (const code of product.filter((s) => !reachable.has(s)))
      assert.throws(() => validateEscape(record(d, [code]), contracts));
  }
  assert.equal(count, 648);
  assert.equal(edges, 4009);
});

test('the rehydration worker checks raw IndexedDB fields before normalization can discard them', () => {
  const compiled = buildSync({
    absWorkingDir: root,
    entryPoints: ['src/castle/validation-entry.mjs'],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2022',
    define: {
      CASTLE_VALIDATION: 'true',
      CASTLE_VISIT_IDS: JSON.stringify(rooms.map((r) => r.id)),
      ESCAPE_SAVE_RULES: JSON.stringify(contracts),
    },
  }).outputFiles[0].text;
  const context = vm.createContext({ atob });
  context.self = context;
  vm.runInContext(compiled, context);
  vm.runInContext(
    readFileSync(new URL('../src/validator-worker.js', import.meta.url), 'utf8'),
    context,
  );
  const d = readRoom('tidekeeper-workshop');
  const valid = {
    schema: 1,
    revision: 1,
    state: { ...initial(), ...record(d, [encode(d, State.initial(d))]) },
  };
  context.postMessage = (value) => {
    context.reply = value;
  };
  vm.runInContext(
    `globalThis.record = ${JSON.stringify(valid)}; onmessage({data: {type: 'castle-record', record}})`,
    context,
  );
  assert.equal(context.reply.ok, true);
  vm.runInContext(
    `record.state.escapeRooms['${d.id}'].future = undefined; onmessage({data: {type: 'castle-record', record}})`,
    context,
  );
  assert.equal(context.reply.ok, false);
  assert.match(context.reply.error, /preserved/);
});

test('legacy notebooks work while invalid room revisions, history and drafts fail closed', () => {
  validateEscape({}, contracts);
  const d = readRoom('tidekeeper-workshop');
  const initial = encode(d, State.initial(d));
  const original = record(d, [initial]);
  const room = (value) => value.escapeRooms[d.id];
  for (const mutate of [
    (value) => (value.escapeRooms.future = {}),
    (value) => room(value).revision++,
    (value) => (room(value).sha = 'wrong'),
    (value) => (room(value).newField = true),
    (value) => (room(value).trail = []),
    (value) => (room(value).trail = Array(66).fill(initial)),
    (value) => room(value).trail.push(initial),
    (value) => (room(value).trail[0] = '9' + initial.slice(1)),
    (value) => (room(value).drafts[0] = 'x'.repeat(65)),
    (value) => (room(value).drafts[-1] = 'x'),
    (value) => (room(value).hints[0] = 4),
  ]) {
    const candidate = structuredClone(original);
    mutate(candidate);
    assert.throws(() => validateEscape(candidate, contracts), /preserved/);
  }
});

test('a terminal room must retain a predecessor for the final Undo', () => {
  const d = readRoom('tidekeeper-workshop');
  assert.throws(() => validateEscape(record(d, ['121111']), contracts), /preserved/);
});

test('Castle puzzle definitions retain their exact decoded content', () => {
  const digest = createHash('sha256').update(JSON.stringify(puzzles)).digest('hex');
  assert.equal(digest, '9c8415b1a9338aabe02321025fcfc5acbd40f54c170af2783479e6cf8a2a97aa');
});
