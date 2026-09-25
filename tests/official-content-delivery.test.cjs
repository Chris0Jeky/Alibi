'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { test } = require('node:test');

function emit(data) {
  return require('../tools/build-official-content.cjs').serialize(data);
}
function roundtrip(data) {
  const before = JSON.stringify(data);
  const context = {};
  vm.runInNewContext(emit(data), context, { timeout: 2000 });
  assert.equal(JSON.stringify(data), before, 'serialization does not mutate input');
  assert.deepEqual(Object.keys(context), Object.keys(data), 'no extra runtime globals');
  assert.equal(JSON.stringify(context), before, 'preserve JSON values and property order');
  return context;
}

test('official globals retain exact JSON values and key order', () => {
  roundtrip({
    ALIBI_RELEASES: { versions: ['0.11.6', '0.11.5'] },
    ALIBI_CATALOG: { puzzles: [{ id: 'one', givens: [-2, -1, 0, 1, 9, 89, 90] }] },
    ALIBI_CASEBOOKS: [],
    ALIBI_CURATION: { text: 'A café, ∑ and a moon 🌙; ~~~; </script>; "quoted".' },
    ALIBI_THEATRE: { enabled: true, optional: null },
  });
});

test('record runs preserve empty objects, ragged fields and heterogeneous segments', () => {
  roundtrip({
    ALIBI_CATALOG: [
      {},
      {},
      { id: 'a', nested: [1, 2] },
      { id: 'b', nested: [3] },
      null,
      12,
      'two',
      [],
      { nested: [], id: 'different-order' },
      { id: 'c', optional: null },
      { id: 'd' },
      [{ list: 1 }, { list: 2 }],
    ],
  });
});

test('small-integer packing preserves numeric boundaries and JSON normalization', () => {
  roundtrip({
    ALIBI_CATALOG: [
      [-2, -1, 0, 1, 9, 10, 35, 89],
      [-3, -2, 0, 90, 1000],
      [0.5, -0, 1, null, 2],
      [NaN, Infinity, -Infinity],
      [1, , 3, undefined, 5],
      [],
      [1],
      [true, false, '1', null],
    ],
  });
});

test('nested prototype-like keys remain data and strings cannot inject script', () => {
  const value = JSON.parse('{"__proto__":{"polluted":true},"constructor":5,"prototype":null}');
  const result = roundtrip({
    ALIBI_CATALOG: [value, value],
    ALIBI_CURATION: '");globalThis.INJECTED=true;//',
  });
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(Object.hasOwn(result.ALIBI_CATALOG[0], '__proto__'), true);
  assert.equal(result.INJECTED, undefined);
});

test('only explicit identifier-shaped official global names are accepted', () => {
  for (const data of [null, [], 'text', { 'bad-name': 1 }, JSON.parse('{"__proto__":1}')])
    assert.throws(() => emit(data), /global/i);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => emit({ ALIBI_CATALOG: cyclic }), /circular|cyclic/i);
  assert.throws(() => emit({ ALIBI_CATALOG: 1n }), /BigInt/i);
});

test('deterministic mixed nested JSON shapes roundtrip without reserved value collisions', () => {
  let seed = 24681;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  function sample(depth) {
    if (!depth || next() % 3 === 0)
      return [null, true, false, '~123', 89, -2, 0.5, 'é'][next() % 8];
    const items = Array.from({ length: next() % 6 }, () => sample(depth - 1));
    return next() % 2 ? items : Object.fromEntries(items.map((v, i) => ['field' + i, v]));
  }
  for (let i = 0; i < 150; i++) roundtrip({ ALIBI_CATALOG: sample(4) });
});

test('record grouping reduces measured transfer including the emitted decoder', () => {
  const data = {
    ALIBI_CATALOG: Array.from({ length: 300 }, (_, i) => ({
      id: 'study-' + i,
      family: 'binary',
      size: 8,
      givens: Array.from({ length: 64 }, (_, j) => ((i + j) % 3) - 1),
      story: 'An original study with retained clues and an exact published identity.',
    })),
  };
  const encoded = emit(data);
  const plain = `globalThis.ALIBI_CATALOG=${JSON.stringify(data.ALIBI_CATALOG)};\n`;
  assert.ok(zlib.gzipSync(encoded).length < zlib.gzipSync(plain).length);
  roundtrip(data);
});

test('actual built official catalogue matches every registered definition byte-for-JSON-byte', () => {
  const { load } = require('../tools/official-catalogue.cjs');
  const expected = load(process.cwd(), false);
  const dir = path.join(__dirname, '../dist/assets');
  const file = fs.readdirSync(dir).find((name) => /^official-content\.[a-f0-9]+\.js$/.test(name));
  assert.ok(file, 'the normal build emits one hashed official-data script');
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(dir, file), 'utf8'), context, { timeout: 2000 });
  assert.equal(JSON.stringify(context.ALIBI_CATALOG), JSON.stringify(expected));
});

test('nested non-record lists are encoded once rather than revisited exponentially', () => {
  const { execFileSync } = require('node:child_process');
  const helper = path.resolve(__dirname, '../tools/build-official-content.cjs');
  const script = `const { serialize } = require(${JSON.stringify(helper)});
    let value = { leaf: true };
    for (let i = 0; i < 32; i++) value = [value];
    const context = {};
    require('node:vm').runInNewContext(serialize({ ALIBI_CATALOG: value }), context);
    require('node:assert/strict').equal(JSON.stringify(context.ALIBI_CATALOG), JSON.stringify(value));`;
  assert.doesNotThrow(() => execFileSync(process.execPath, ['-e', script], { timeout: 10000 }));
});
