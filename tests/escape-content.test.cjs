'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const A = require('../tools/escape-authoring.cjs');
const S = require('../tools/escape-state.cjs');
const names = [
  'tidekeeper-workshop',
  'printmaker-cabinet',
  'moonseed-conservatory',
  'herbarium-lift',
  'counterweight-loft',
  'clockmaker-rehearsal',
];
function load(name) {
  const file = path.join(__dirname, '../content/escape-rooms', name + '.json');
  assert.ok(fs.existsSync(file), 'Missing authored room ' + name);
  return A.read(file).definition;
}
function permutations(values) {
  if (!values.length) return [[]];
  return values.flatMap((v, i) =>
    permutations(values.filter((_, j) => i !== j)).map((rest) => [v, ...rest]),
  );
}
for (const name of names)
  test(`${name}: source, recovery, every action, terminal and story parity`, () => {
    const d = load(name),
      before = JSON.stringify(d),
      report = A.analyze(d);
    assert.equal(d.id, name);
    assert.equal(report.status, 'verified');
    assert.equal(report.softlockCount, 0);
    assert.deepEqual(report.unreachableActions, []);
    assert.ok(report.solution.length >= 3);
    let state = S.initial(d);
    for (const id of report.solution) {
      const action = d.actions.find((a) => a.id === id);
      for (const story of [true, false]) {
        assert.ok(
          S.project(d, state, story).objects.some((o) => o.actions.some((a) => a.id === id)),
        );
      }
      const next = S.transition(d, state, id, action.answer);
      assert.equal(next.ok, true, id);
      state = next.state;
    }
    assert.equal(S.project(d, state, true).won, true);
    assert.equal(S.transition(d, state, report.solution[0], null).code, 'complete');
    assert.equal(JSON.stringify(d), before);
  });
test('Tidekeeper independent order and gauge derivations match authored inputs', () => {
  const d = load(names[0]);
  const orders = permutations(['Snipe', 'Heron', 'Tern', 'Plover']).filter(
    (p) =>
      p.indexOf('Heron') === p.indexOf('Snipe') + 1 &&
      [1, 2].includes(p.indexOf('Tern')) &&
      p.indexOf('Plover') > p.indexOf('Tern'),
  );
  assert.equal(orders.length, 1);
  const marks = { Snipe: '9', Heron: '4', Tern: '7', Plover: '2' };
  assert.equal(
    d.actions.find((a) => a.id === 'open-cabinet').answer,
    orders[0].map((n) => marks[n]).join(''),
  );
  const offsets = [
    [2, 5],
    [8, 11],
  ].map(([actual, reading]) => reading - actual);
  assert.equal(offsets[0], offsets[1]);
  assert.equal(d.actions.find((a) => a.id === 'calibrate').answer, String(offsets[0]));
  assert.equal(8 - offsets[0], 5);
});
test('Printmaker independent ordering, transfer and dispatch derivations', () => {
  const d = load(names[1]);
  const orders = permutations(['A', 'B', 'C', 'D']).filter(
    (p) =>
      p.indexOf('A') === p.indexOf('B') + 1 &&
      p.indexOf('D') > p.indexOf('A') &&
      p.indexOf('C') > p.indexOf('D'),
  );
  assert.deepEqual(orders, [['B', 'A', 'D', 'C']]);
  assert.equal(d.actions.find((a) => a.id === 'open-plate-cabinet').answer, orders[0].join(''));
  assert.equal([...'KCOD'].reverse().join(''), 'DOCK');
  const route = [
    { distance: 4, stamp: '6' },
    { distance: 2, stamp: '2' },
    { distance: 3, stamp: '9' },
  ].sort((a, b) => a.distance - b.distance);
  assert.equal(
    d.actions.find((a) => a.id === 'open-dispatch').answer,
    route.map((r) => r.stamp).join(''),
  );
});
test('Moonseed has one independently enumerated shutter combination', () => {
  const d = load(names[2]),
    masks = [
      [1, 2, 4],
      [2, 3],
      [4, 5],
    ],
    solutions = [];
  for (let bits = 0; bits < 8; bits++) {
    const glow = new Set();
    masks.forEach((mask, i) => {
      if (bits & (1 << i)) mask.forEach((n) => (glow.has(n) ? glow.delete(n) : glow.add(n)));
    });
    if ([...glow].sort().join(',') === '1,3,5') solutions.push(bits);
  }
  assert.deepEqual(solutions, [7]);
  const check = d.actions.find((a) => a.id === 'release-drawer').check;
  for (const key of ['shutter-a', 'shutter-b', 'shutter-c']) assert.equal(check[key], 'open');
});
test('Herbarium mass equations and dated exit record have independent answers', () => {
  const d = load(names[3]),
    triples = [];
  for (let f = 1; f <= 8; f++)
    for (let a = 1; a <= 8; a++)
      for (let i = 1; i <= 8; i++)
        if (f + a === 5 && a + i === 8 && f + i === 7) triples.push([f, a, i]);
  assert.deepEqual(triples, [[2, 3, 5]]);
  assert.equal(d.actions.find((a) => a.id === 'lower-lift').check.brackets, 'fern-ash');
  const stamps = [
    [1911, '8'],
    [1904, '3'],
    [1907, '6'],
  ].sort((a, b) => a[0] - b[0]);
  assert.equal(
    d.actions.find((a) => a.id === 'open-return').answer,
    stamps.map((v) => v[1]).join(''),
  );
});
test('Counterweight balance is unique and latch permits later resource reuse', () => {
  const d = load(names[4]),
    weights = [1, 3, 4, 5],
    solutions = [];
  for (let bits = 0; bits < 16; bits++) {
    let left = 1,
      right = 0;
    weights.forEach((w, i) => {
      if (bits & (1 << i)) left += w;
      else right += w;
    });
    if (left === right) solutions.push(bits);
  }
  assert.deepEqual(solutions, [9]);
  const c = d.actions.find((a) => a.id === 'engage-latch').check;
  weights.forEach((w, i) =>
    assert.equal(c['weight-' + w], solutions[0] & (1 << i) ? 'left' : 'right'),
  );
});
test('Clockmaker turn target is unique only inside the disclosed interval', () => {
  const d = load(names[5]),
    find = (n) =>
      Array.from({ length: n }, (_, i) => i).filter(
        (t) => t % 3 === 1 && t % 4 === 2 && t % 5 === 4,
      );
  assert.deepEqual(find(60), [34]);
  assert.deepEqual(find(120), [34, 94]);
  assert.equal(d.actions.find((a) => a.id === 'set-turns').answer, String(find(60)[0]));
});

function play(d, steps) {
  let state = S.initial(d);
  for (const [id, input = null] of steps) {
    const result = S.transition(d, state, id, input);
    assert.equal(result.ok, true, `${d.id}/${id}: ${result.code}`);
    state = result.state;
  }
  return state;
}
test('Tidekeeper allows calibration first and recovery after moving the handle back', () => {
  const d = load(names[0]);
  const state = play(d, [
    ['calibrate', '3'],
    ['open-cabinet', '9472'],
    ['take-handle'],
    ['install-handle'],
    ['remove-handle'],
    ['stow-handle'],
    ['take-handle'],
    ['install-handle'],
    ['notch-middle'],
    ['route-lift'],
    ['raise-gate'],
  ]);
  assert.equal(S.project(d, state, false).won, true);
});
test('a printed proof persists after wiping ink and returning the plate', () => {
  const d = load(names[1]);
  const state = play(d, [
    ['open-plate-cabinet', 'BADC'],
    ['take-plate'],
    ['fit-plate'],
    ['apply-ink'],
    ['transfer-mirror'],
    ['register-center'],
    ['pull-proof'],
    ['remove-plate'],
    ['stow-plate'],
    ['wipe-ink'],
    ['transfer-face'],
  ]);
  assert.equal(state.proof, 'printed');
  assert.ok(S.project(d, state, false).objects.some((o) => o.id === 'printed-proof'));
  assert.equal(S.transition(d, state, 'open-dispatch', '296').ok, true);
});
test('removing the prism turns the light off without destroying the shutter setup', () => {
  const d = load(names[2]);
  const state = play(d, [
    ['take-prism'],
    ['fit-prism'],
    ['lamp-on'],
    ['a-open'],
    ['b-open'],
    ['c-open'],
    ['remove-prism'],
  ]);
  assert.equal(state.lamp, 'off');
  assert.equal(
    S.project(d, state, true).objects.some((o) => o.id === 'beds'),
    false,
  );
  assert.equal(S.transition(d, state, 'release-drawer', null).ok, false);
  const refit = S.transition(d, state, 'fit-prism', null).state;
  const lit = S.transition(d, refit, 'lamp-on', null).state;
  assert.equal(S.transition(d, lit, 'release-drawer', null).ok, true);
});
test('correct total without two occupied brackets does not lower the lift', () => {
  const d = load(names[3]);
  const state = play(d, [['brackets-ivy-only'], ['tray-lower']]);
  const result = S.transition(d, state, 'lower-lift', null);
  assert.equal(result.code, 'mechanism');
  assert.deepEqual(result.state, state);
});
test('latched platform remains supported when all weights return to the shelf', () => {
  const d = load(names[4]);
  const state = play(d, [
    ['weight-1-left'],
    ['weight-5-left'],
    ['weight-3-right'],
    ['weight-4-right'],
    ['engage-latch'],
    ...[1, 3, 4, 5].map((w) => ['weight-' + w + '-shelf']),
    ['take-tool'],
    ['fit-tool'],
    ['open-hatch'],
  ]);
  assert.equal(S.project(d, state, true).won, true);
});
test('removing an installed spring releases tension and still permits recovery', () => {
  const d = load(names[5]);
  const state = play(d, [
    ['set-turns', '34'],
    ['take-spring'],
    ['install-spring'],
    ['wind-spring'],
    ['remove-spring'],
  ]);
  assert.equal(state.tension, 'slack');
  assert.equal(state.spring, 'held');
});
for (const name of names)
  test(`${name}: independent transition enumeration agrees on all reachable controls`, () => {
    const d = load(name),
      start = S.initial(d),
      states = [start],
      seen = new Set([JSON.stringify(start)]);
    const matches = (s, c) => Object.entries(c).every(([k, v]) => s[k] === v);
    let edges = 0;
    for (const state of states) {
      if (matches(state, d.goal)) continue;
      const visible = d.objects.filter((o) => matches(state, o.when));
      const candidates = d.actions.filter(
        (a) => visible.some((o) => o.id === a.object) && matches(state, a.when),
      );
      for (const mode of [true, false]) {
        const view = S.project(d, state, mode);
        assert.deepEqual(
          view.objects.flatMap((o) => o.actions.map((a) => a.id)).sort(),
          candidates.map((a) => a.id).sort(),
        );
      }
      for (const action of candidates) {
        if (action.input) {
          const bad = S.transition(d, state, action.id, 'NOT-A-SOLUTION');
          assert.equal(bad.ok, false);
          assert.deepEqual(bad.state, state);
        }
        if (!matches(state, action.check)) continue;
        const next = { ...state, ...action.set };
        edges++;
        const actual = S.transition(d, state, action.id, action.answer);
        assert.deepEqual(actual.state, next);
        const k = JSON.stringify(next);
        if (!seen.has(k)) {
          seen.add(k);
          states.push(next);
        }
      }
    }
    const report = A.analyze(d);
    assert.equal(report.reachableStates, states.length);
    assert.equal(report.edges, edges);
  });
