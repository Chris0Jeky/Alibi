'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');

function codec() {
  return require('../tools/official-data-codec.cjs');
}

test('official codec interns repeated prose and remains a self-contained JSON decoder', () => {
  const { encode, decode } = codec();
  const prose = 'Every connected component must retain a possible route to the central source.';
  const input = Array.from({ length: 200 }, (_, id) => ({ id, prose, nested: [1, 2, 3] }));
  const before = JSON.stringify(input);
  const encoded = encode(input);
  assert.equal(JSON.stringify(encoded).split(prose).length - 1, 1);
  assert.deepEqual(decode(encoded), input);
  const decoded = vm.runInNewContext(`(${decode})(${JSON.stringify(encoded)})`);
  assert.equal(JSON.stringify(decoded), before);
  decoded[0].nested[0] = 99;
  assert.equal(decoded[1].nested[0], 1, 'decoded records never share mutable arrays');
  assert.equal(JSON.stringify(input), before, 'encoding does not mutate input');
  assert.deepEqual(encode(input), encoded, 'encoding is deterministic');
});

test('codec preserves integer tags, literal tag-like arrays, Unicode and own prototype keys', () => {
  const { encode, decode } = codec();
  const input = JSON.parse(
    '{"__proto__":{"safe":true},"constructor":5,"prototype":[5,0],"a":[-2,-1,0,35,89],"b":[-3,90,1.5],"c":"🌙 café","d":[{},[],null,[5,1]]}',
  );
  assert.equal(JSON.stringify(decode(encode(input))), JSON.stringify(input));
  assert.equal(Object.prototype.safe, undefined);
  assert.ok(Object.hasOwn(decode(encode(input)), '__proto__'));
});

test('dictionary references fail closed when the index or referenced value is invalid', () => {
  const { decode } = codec();
  for (const input of [
    [[], [5, 0]],
    [['valid'], [5, -1]],
    [['valid'], [5, 0.5]],
    [[{}], [5, 0]],
  ]) {
    assert.throws(() => decode(input), /official content/i);
  }
});

test('codec preserves empty dictionaries and deeply nested repeated record runs', () => {
  const { encode, decode } = codec();
  for (const input of [null, false, 0, '', [], {}, [1, 2]]) {
    assert.deepEqual(decode(encode(input)), input);
  }
  let nested = [{ key: 'a' }, { key: 'b' }];
  for (let i = 0; i < 32; i++) nested = [nested];
  assert.deepEqual(decode(encode(nested)), nested);
});
