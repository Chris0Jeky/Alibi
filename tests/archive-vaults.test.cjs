'use strict';
const fs = require('node:fs'),
  assert = require('node:assert/strict');
const { test } = require('node:test');
const E = require('../src/club-engines.js');
assert.ok(
  fs.existsSync('tests/helpers/archive-push-oracle.cjs'),
  'independent push oracle is present',
);
const { solve } = require('./helpers/archive-push-oracle.cjs');
function collection() {
  const file = 'content/challenges/archive-vaults.json';
  assert.ok(fs.existsSync(file), '24 selected Archive vaults exist');
  return JSON.parse(fs.readFileSync(file, 'utf8')).challenges;
}
test('Archive vaults have substantially deeper minimum pushes and production replays', () => {
  const entries = collection();
  assert.equal(entries.length, 24);
  for (const c of entries) {
    let s = E.warehouse.fromMap(c.map);
    const initial = JSON.stringify(s);
    assert.ok([3, 4].includes(s.crates.length));
    const proof = solve(c.map);
    assert.equal(proof.exhausted, false, c.id);
    assert.equal(proof.minimumPushes, c.verification.minimumPushes, c.id);
    assert.ok(proof.minimumPushes >= 18 && proof.minimumPushes <= 21);
    const w = c.map[0].length,
      flat = c.map.join('');
    const goals = [...flat].flatMap((v, i) => ('.+*'.includes(v) ? [i] : []));
    const crates = [...flat].flatMap((v, i) => ('$*'.includes(v) ? [i] : []));
    const assign = (left, used = []) =>
      !left.length
        ? 0
        : Math.min(
            ...goals
              .filter((g) => !used.includes(g))
              .map(
                (g) =>
                  Math.abs((g % w) - (left[0] % w)) +
                  Math.abs(Math.floor(g / w) - Math.floor(left[0] / w)) +
                  assign(left.slice(1), [...used, g]),
              ),
          );
    assert.equal(assign(crates), c.verification.assignmentBound);
    assert.ok(proof.minimumPushes - assign(crates) >= 6);
    const hash = require('node:crypto')
      .createHash('sha256')
      .update(JSON.stringify(c.map))
      .digest('hex');
    assert.equal(hash, c.verification.mapSha256);
    for (const letter of c.solutionPath) {
      const before = JSON.stringify(s);
      const next = E.warehouse.move(s, { U: 'up', R: 'right', D: 'down', L: 'left' }[letter]);
      assert.notEqual(next, s, c.id);
      assert.equal(JSON.stringify(s), before);
      s = next;
    }
    assert.equal(s.done, true, c.id);
    assert.equal(s.pushes, proof.minimumPushes, c.id);
    assert.equal(JSON.stringify(E.warehouse.fromMap(c.map)), initial);
    assert.equal(c.humanPlaytested, false);
    assert.equal(Object.hasOwn(c.verification, 'uniqueSolutionClaim'), false);
  }
});
test('forward push oracle distinguishes solved, deadlocked and bounded searches', () => {
  assert.equal(solve(['#####', '#@* #', '#####']).minimumPushes, 0);
  assert.equal(solve(['#####', '#$@.#', '#####']).minimumPushes, null);
  assert.equal(solve(['######', '#@ $.#', '######'], 1).exhausted, true);
});
test('new vault footprints are not rotations or reflections of any old room or sibling', () => {
  function identity(map) {
    const w = map[0].length,
      h = map.length,
      points = map.flatMap((row, y) => [...row].flatMap((c, x) => (c === '#' ? [] : [[x, y]])));
    const variants = [];
    for (const flip of [false, true])
      for (let turn = 0; turn < 4; turn++) {
        const pts = points.map(([x, y]) => {
          let a = flip ? w - 1 - x : x,
            b = y,
            cw = w,
            ch = h;
          for (let t = 0; t < turn; t++) {
            [a, b, cw, ch] = [ch - 1 - b, a, ch, cw];
          }
          return [a, b];
        });
        const ox = Math.min(...pts.map((p) => p[0])),
          oy = Math.min(...pts.map((p) => p[1]));
        variants.push(
          pts
            .map(([x, y]) => [x - ox, y - oy])
            .sort((a, b) => a[0] - b[0] || a[1] - b[1])
            .map((p) => p.join(','))
            .join(';'),
        );
      }
    return variants.sort()[0];
  }
  const old = [...E.warehouse.maps, ...require('../content/challenges/warehouse.json').challenges];
  const seen = new Set(old.map((c) => identity(c.map)));
  for (const c of collection()) {
    const key = identity(c.map);
    assert.equal(seen.has(key), false, c.id);
    seen.add(key);
  }
});
