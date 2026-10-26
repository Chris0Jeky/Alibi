'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../tools/case-session.cjs');
const fixture = () =>
  JSON.parse(
    fs.readFileSync(path.join(__dirname, '../content/cases/reading-room-blackout.json'), 'utf8'),
  );
function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}
function privateStringsOf(d) {
  // Only the top-level format, id and title are public; nested ids and titles are not.
  const { format, id, title, revision, ...rest } = d;
  return strings(rest).filter((s) => s.length >= 3);
}
test('share projection is an exact allowlist with a versioned format', () => {
  const d = fixture(),
    out = S.share(d, []);
  assert.deepEqual(Object.keys(out).sort(), ['caseId', 'format', 'revision', 'text']);
  assert.equal(out.format, 'postern-case-share-1');
  assert.equal(out.caseId, d.id);
  assert.equal(out.revision, d.revision);
  assert.ok(out.text.includes(d.title));
  assert.ok(Object.isFrozen(out));
  assert.doesNotMatch(out.text, /\b(fast|time|seconds|minutes|rank|score|beat)\b/i);
});
test('every progress boundary yields the same spoiler-free projection', () => {
  const d = fixture(),
    secrets = privateStringsOf(d),
    first = S.share(d, []);
  assert.ok(secrets.length > 20);
  const boundaries = [[], ['window'], ['window', 'alarm'], ['window', 'alarm', 'attribution']];
  for (const completed of boundaries) {
    const out = S.share(d, completed),
      serial = JSON.stringify(out);
    assert.deepEqual(out, first);
    for (const secret of secrets) assert.ok(!serial.includes(secret), `leaked: ${secret}`);
  }
});
test('construction never reads private fields, even through getters', () => {
  const d = fixture(),
    trap = (obj, key) =>
      Object.defineProperty(obj, key, {
        get() {
          throw new Error(`read ${key}`);
        },
      });
  for (const key of ['intro', 'ending', 'provenance', 'records']) trap(d, key);
  for (const step of d.steps)
    for (const key of ['title', 'prompt', 'claims', 'hints', 'workedAnswer']) trap(step, key);
  d.deviceId = 'device-123';
  d.notes = 'my private notebook';
  d.save = { completed: ['window'], hintsShown: 3, reveals: ['window'] };
  for (const key of ['deviceId', 'notes', 'save']) trap(d, key);
  trap(d, 'solution');
  const out = S.share(d, ['window']);
  assert.equal(out.caseId, 'reading-room-blackout');
  assert.doesNotMatch(JSON.stringify(out), /device|notebook|hintsShown|reveal/);
});
test('future revisions keep the same public shape; future formats are refused', () => {
  const d = fixture();
  d.revision = 99;
  assert.equal(S.share(d, []).revision, 99);
  for (const bad of [
    { format: 'postern-case-2' },
    { format: undefined },
    { revision: 0 },
    { revision: 1.5 },
    { revision: '1' },
    { id: 7 },
    { id: '' },
    { id: 'invalid id' },
    { id: 'a'.repeat(49) },
    { title: '' },
    { title: '   ' },
    { title: 'a'.repeat(121) },
    { title: { toString: () => 'x' } },
  ]) {
    const hostile = { ...fixture(), ...bad };
    assert.throws(() => S.share(hostile, []), TypeError, JSON.stringify(bad));
  }
});
test('share validates progress with the same rules as the session', () => {
  for (const completed of [null, ['unknown'], ['alarm'], ['window', 'window']])
    assert.throws(() => S.share(fixture(), completed), /completion/);
});
