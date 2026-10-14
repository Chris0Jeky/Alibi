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

test('dictionary interns a 20-character string repeated four times but not three', () => {
  const { encode, decode } = codec();
  const text = 'abcdefghij1234567890';
  assert.equal(text.length, 20);
  const four = [text, text, text, text];
  const encodedFour = encode(four);
  assert.deepEqual(encodedFour[0], [text]);
  assert.deepEqual(decode(encodedFour), four);
  const three = [text, text, text];
  const encodedThree = encode(three);
  assert.deepEqual(encodedThree[0], []);
  assert.deepEqual(decode(encodedThree), three);
  assert.ok(JSON.stringify(encodedThree).includes(text));
});

test('integer arrays use tag3 for lengths three and four while pairs stay literal', () => {
  const { encode, decode } = codec();
  for (const input of [
    [1, 2, 3],
    [1, 2, 3, 4],
    [-2, 0, 89],
  ]) {
    const encoded = encode(input);
    assert.equal(encoded[1][0], 3);
    assert.deepEqual(decode(encoded), input);
  }
  for (const input of [
    [1, 2],
    [-2, 89],
    [5, 0],
    [3, 'x'],
  ]) {
    const encoded = encode(input);
    assert.equal(encoded[1][0], 0);
    assert.deepEqual(decode(encoded), input);
  }
  for (const input of [
    [-3, 0, 1],
    [0, 1, 90],
    [1, 2, 1.5],
  ]) {
    const encoded = encode(input);
    assert.equal(encoded[1][0], 0);
    assert.deepEqual(decode(encoded), input);
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
