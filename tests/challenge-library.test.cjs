'use strict';
// Player-facing challenge library: launcher behaviour through a minimal host, plus app contracts.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Q = require('../src/quiet-wing/engine.js');
const E = require('../src/club-engines.js');
const Challenges = require('../src/challenges.js');
const L = require('../src/challenge-launcher.js');
const data = require('../tools/challenge-catalogue.cjs').load();
const registry = Challenges.create(require('../tools/challenge-catalogue.cjs').runtime(data), {
  quiet: Q,
  club: E,
});
const R = E.reversi;
const duels = registry.entries().filter((c) => c.family === 'reversi');

function host() {
  return {
    innerHTML: '',
    replaceChildren() {
      this.innerHTML = '';
    },
    getRootNode: () => ({ activeElement: null }),
    contains: () => false,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}
function press(h, dataset) {
  h.onclick({ target: { closest: () => ({ dataset }) } });
}
function open(id, saved = null) {
  const h = host(),
    saves = [],
    trips = [];
  const handle = L.mount(
    h,
    registry,
    id,
    saved,
    (run) => saves.push(run),
    (to) => trips.push(to),
  );
  return { h, saves, trips, handle, text: () => h.innerHTML.replace(/<[^>]+>/g, ' ') };
}
const solution = (c) => {
  const s = c.solutionActions || c.solutionPath || c.principalVariation;
  return typeof s === 'string' ? [...s] : structuredClone(s);
};

test('every family in the library has a player-facing name', () => {
  const families = new Set(registry.entries().map((c) => c.family));
  assert.equal(families.size, 10);
  for (const f of families) assert.ok(L.names[f] && L.names[f] !== f, f);
});

test('the player view drops internal labels and pluralises counts', () => {
  const view = open('curated-classic-hanoi-01');
  assert.doesNotMatch(view.h.innerHTML, /TRUSTED CHALLENGE|REVISION|<h2>/);
  assert.match(view.text(), /0 moves so far\./);
  press(view.h, { action: 'peg', value: '1' });
  assert.match(view.h.innerHTML, /data-value="1" aria-pressed="true"/);
  press(view.h, { action: 'peg', value: '2' });
  assert.match(view.text(), /1 move so far\./);
  assert.match(view.h.innerHTML, /<i style="width:\d+%">/, 'Hanoi discs are drawn');
  const sliding = open('curated-classic-sliding-01');
  assert.doesNotMatch(sliding.text(), /Picture mode/);
});

test('refused moves read as player text, not engine messages', () => {
  const vault = open('curated-archive-vault-01');
  const blocked = ['up', 'left', 'down', 'right'].find(
    (d) =>
      E.warehouse.move(registry.replay(vault.handle.save()).state, d) ===
      registry.replay(vault.handle.save()).state,
  );
  press(vault.h, { action: 'walk', value: blocked });
  assert.match(vault.text(), /That way is blocked\./);
  assert.doesNotMatch(vault.text(), /Illegal|replay/);
  const queens = open('curated-classic-queens-01');
  press(queens.h, {
    action: 'cell',
    value: String(registry.get('curated-classic-queens-01').fixedCells[0]),
  });
  assert.doesNotMatch(queens.text(), /replay|Invalid|Illegal/);
});

test('warehouse boards walk by adjacent cell, arrows and keys, with a legend', () => {
  const c = registry.get('curated-archive-vault-01');
  const view = open(c.id);
  assert.match(view.text(), /brass plate/);
  assert.equal((view.h.innerHTML.match(/data-action="walk"/g) || []).length, 4);
  assert.match(view.h.innerHTML, />↑<\/button>/);
  const steps = view.h.innerHTML.match(/data-action="step" data-value="(\w+)"/g) || [];
  assert.ok(steps.length >= 1 && steps.length <= 4, 'only adjacent open squares are tappable');
  const moves = solution(c).map((m) => ({ U: 'up', R: 'right', D: 'down', L: 'left' })[m]);
  moves.forEach((d, i) => {
    if (i % 3 === 0) press(view.h, { action: 'step', value: d });
    else if (i % 3 === 1) {
      let prevented = false;
      view.h.onkeydown({
        key: 'Arrow' + d[0].toUpperCase() + d.slice(1),
        preventDefault: () => (prevented = true),
      });
      assert.ok(prevented);
    } else press(view.h, { action: 'walk', value: d });
  });
  assert.equal(registry.replay(view.handle.save()).complete, true);
  assert.match(view.text(), /Complete in \d+ moves\./);
  assert.match(view.text(), new RegExp(`${c.difficulty} · Challenge complete`));
  assert.doesNotMatch(view.h.innerHTML, /data-action="step"/, 'a finished vault stops walking');
});

test('completion offers the next challenge in the family and the list, then confirms a restart', () => {
  const c = registry.get('curated-classic-hanoi-01');
  const run = registry.begin(c.id);
  run.log = solution(c);
  const view = open(c.id, run);
  assert.match(view.h.innerHTML, /data-challenge="next"/);
  press(view.h, { challenge: 'next' });
  press(view.h, { challenge: 'list' });
  assert.deepEqual(view.trips, ['curated-classic-hanoi-02', '']);
  press(view.h, { challenge: 'reset' });
  assert.equal(view.saves.length, 0, 'the first press only asks');
  assert.match(view.text(), /start again\?/);
  press(view.h, { challenge: 'keep' });
  assert.equal(registry.replay(view.handle.save()).complete, true);
  press(view.h, { challenge: 'reset' });
  press(view.h, { challenge: 'reset' });
  assert.equal(view.saves.at(-1).log.length, 0);
  const family = registry.entries().filter((x) => x.family === 'hanoi');
  const last = family.at(-1),
    finished = registry.begin(last.id);
  finished.log = solution(last);
  assert.doesNotMatch(open(last.id, finished).h.innerHTML, /data-challenge="next"/);
});

test('Borough contracts use Pocket Borough names and say what scores', () => {
  const c = registry.entries().find((x) => x.family === 'borough' && x.requirements);
  const view = open(c.id);
  const names = Object.values(E.borough.typeInfo).map((t) => t.name);
  const offers = [...view.h.innerHTML.matchAll(/data-action="slot"[^>]*><strong>([^<]+)</g)];
  const plots = [...view.h.innerHTML.matchAll(/data-action="plot"[^>]*>([^<]+)</g)];
  assert.equal(offers.length, 3);
  assert.equal(plots.length, 25);
  for (const [, label] of offers) assert.ok(names.includes(label), label);
  for (const [, label] of plots) assert.ok(label === '+' || names.includes(label), label);
  assert.ok(plots.some(([, label]) => label === 'Canal'));
  assert.match(view.text(), /points \+/);
  press(view.h, { action: 'plot', value: String(E.borough.initial(c.seed).board.indexOf(null)) });
  assert.match(view.text(), /Choose a plan first\./);
  const r = c.requirements[0];
  const name = (t) => E.borough.typeInfo[t].name;
  assert.match(view.text(), new RegExp(`0 / ${r.count} ${name(r.building)}`));
});

test('Lantern Duel endgames: the player keeps Gold and Ink answers by itself', () => {
  for (const c of duels) {
    assert.equal(c.startState.turn, 1, c.id);
    // Six empty squares keep the expert search exhaustive for every reply and verdict.
    assert.ok(c.startState.board.filter((v) => !v).length <= 6, c.id);
    const view = open(c.id);
    assert.match(view.text(), /Gold to move/);
    assert.match(view.text(), /Ink, who replies by itself/);
    let guard = 0;
    while (!registry.replay(view.handle.save()).complete && guard++ < 10) {
      const log = view.handle.save().log;
      assert.equal(registry.replay(view.handle.save()).state.turn, 1, 'Gold is always to move');
      assert.doesNotMatch(view.text(), /can no longer/, 'the recorded line still wins');
      press(view.h, { action: 'cell', value: String(c.principalVariation[log.length]) });
    }
    assert.deepEqual(view.handle.save().log, c.principalVariation, c.id);
    assert.match(view.text(), /Challenge complete/);
  }
});

test('a wrong Duel opening is reported at once and the hint is offered', () => {
  for (const c of duels) {
    const start = registry.replay(registry.begin(c.id)).state;
    for (const wrong of R.legal(start).filter((m) => m !== c.solutionFirstMove)) {
      const view = open(c.id);
      press(view.h, { action: 'cell', value: String(wrong) });
      const run = view.handle.save();
      const ink = run.log[1];
      if (ink !== undefined)
        assert.equal(ink, R.best(R.move(start, wrong), R.strengths.expert.depth).cell, c.id);
      assert.match(view.text(), /can no longer force a win/);
      assert.match(view.h.innerHTML, /<summary>A hint<\/summary>/);
      // Undo takes back the Gold move together with Ink's reply.
      press(view.h, { challenge: 'undo' });
      assert.equal(view.handle.save().log.length, 0);
      // The verdict is true on the board: best Gold play from here no longer wins.
      const replay = view.handle.save();
      replay.log = run.log;
      let s = registry.replay(replay).state;
      while (!s.done) {
        replay.log.push(R.best(s, R.strengths.expert.depth).cell);
        L.settle(registry, replay);
        s = registry.replay(replay).state;
      }
      const final = R.score(s);
      assert.ok(final.gold <= final.ink, `${c.id} after ${wrong}`);
    }
  }
});

test('old Duel saves where the player also moved Ink still load', () => {
  const c = duels[0],
    run = registry.begin(c.id);
  run.log = c.principalVariation.slice(0, 1);
  const view = open(c.id, run);
  assert.deepEqual(view.handle.save().log, c.principalVariation.slice(0, 2));
  const legacy = registry.begin(c.id);
  legacy.log = [1, 2, 5, 35, 34, 3];
  assert.doesNotThrow(() => open(c.id, legacy));
});

test('the Quiet Wing list deep-links, groups by family and derives completion from replays', () => {
  const app = fs.readFileSync('src/quiet-wing/app.js', 'utf8');
  assert.match(app, /routePath = \(\) => location\.hash\.replace\([^)]*\)\.split\('\?'\)\[0\]/);
  assert.match(app, /new URLSearchParams\(location\.hash\.split\('\?'\)\[1\]\)\.get\('family'\)/);
  assert.match(app, /class="challenge-family" data-family=/);
  assert.match(app, /A\.challengeRegistry\.replay\(run\)\.complete/);
  assert.match(app, /'05 \/ ' \+ NAMES\[challenge\.family\]/);
  assert.doesNotMatch(app, /id="classics-challenges" class="textbtn" style="font-size:10px"/);
  assert.match(app, /id="classics-challenges" class="soft" style="min-height:44px/);
});

test('only classics that earn a journal stamp say so', () => {
  const app = fs.readFileSync('src/quiet-wing/app.js', 'utf8');
  assert.match(app, /\$\{stamped\(A\.classic\) \? ' Your stamp is in the journal\.' : ''\}/);
  assert.doesNotMatch(app, /legal moves\. Your stamp is in the journal/);
  const stamped = (id) => {
    const fresh = Q.newState(0),
      solved = Q.newState(0);
    solved.stats.solves = [id];
    return Q.BADGES.some(([, , , t]) => t(solved) && !t(fresh));
  };
  for (const id of ['tideglass-morning', 'tideglass-dusk', 'pairs-meadow', 'pairs-shore'])
    assert.equal(stamped(id), false, id);
  for (const id of ['hanoi3', 'river', 'jugs', 'queens', 'magic', 'knight', 'slide-town'])
    assert.equal(stamped(id), true, id);
});

// Trust-boundary pins for src/challenges.js create()/validateRequirements.
// Tampered classic starts and archive maps are already pinned in
// tests/challenges.test.cjs:63-72; borough completion flow (not shape
// rejection) is exercised in tests/planning-vault-integration.test.cjs:98.

test('the registry rejects malformed curated envelopes', () => {
  const base = structuredClone(registry.get('curated-classic-hanoi-01'));
  const fresh = (id) => ({ ...structuredClone(base), id });
  const make = (entries) => () => Challenges.create(entries, { quiet: Q, club: E });

  // A known-good single entry is accepted, so every rejection below blames the mutation.
  const single = Challenges.create([fresh('curated-classic-hanoi-90')], { quiet: Q, club: E });
  assert.equal(single.count, 1);

  // Duplicate ids and non-1 revisions share one rejection.
  assert.throws(make([base, fresh(base.id)]), /Invalid trusted challenge revision\./);
  for (const revision of [0, 2, undefined]) {
    const entry = fresh('curated-classic-hanoi-91');
    entry.revision = revision;
    assert.throws(make([entry]), /Invalid trusted challenge revision\./, `revision ${revision}`);
  }

  // Curated ids keep their release-owned shape.
  for (const id of [
    'bogus',
    'curated-unknown-01',
    'curated-classic-',
    'curated-classic-HANOI-01',
    'curated-classic-01!',
    '',
  ]) {
    assert.throws(make([fresh(id)]), /Invalid trusted challenge ID\./, id || '(empty)');
  }

  // The pack holds 1 to 128 challenges, as an array or a { challenges } pack.
  assert.throws(make([]), /Expected 1 to 128 trusted challenges\./);
  assert.throws(make({ challenges: [] }), /Expected 1 to 128 trusted challenges\./);
  assert.throws(
    () => Challenges.create(null, { quiet: Q, club: E }),
    /Expected 1 to 128 trusted challenges\./,
  );
  const many = Array.from({ length: 129 }, (_, i) => fresh(`curated-classic-hanoi-t${i}`));
  assert.throws(make(many), /Expected 1 to 128 trusted challenges\./);

  // Engine slots fall back to globals; only a present-but-incomplete slot refuses.
  // (This harness loads both engine modules, so {} resolves via the fallback.)
  const lone = [fresh('curated-classic-hanoi-92')];
  const noBorough = { warehouse: E.warehouse, reversi: E.reversi };
  assert.doesNotThrow(() => Challenges.create(lone, {}));
  assert.throws(
    () => Challenges.create(lone, { quiet: {}, club: E }),
    /Challenge engines are unavailable\./,
  );
  assert.throws(
    () => Challenges.create(lone, { quiet: Q, club: {} }),
    /Challenge engines are unavailable\./,
  );
  assert.throws(
    () => Challenges.create(lone, { quiet: Q, club: noBorough }),
    /Challenge engines are unavailable\./,
  );

  // A well-formed id can still name a family the registry does not run.
  const strange = fresh('curated-classic-shape-01');
  strange.family = 'nope';
  assert.throws(make([strange]), /Unsupported challenge mechanism\./);
});

test('borough requirements pin their exact shape', () => {
  const contract = structuredClone(
    registry.entries().find((c) => c.family === 'borough' && c.requirements),
  );
  const [model] = contract.requirements;
  const entryWith = (requirements) => {
    const entry = structuredClone(contract);
    entry.id = 'curated-borough-shape-01';
    if (requirements === undefined) delete entry.requirements;
    else entry.requirements = requirements;
    return [entry];
  };
  const shape = (requirements) => () =>
    Challenges.create(entryWith(requirements), { quiet: Q, club: E });

  // Every requirement carries exactly these four keys with engine-known names.
  assert.throws(shape([{ ...model, extra: 1 }]), /Invalid Borough requirement\./);
  const withoutCount = { ...model };
  delete withoutCount.count;
  assert.throws(shape([withoutCount]), /Invalid Borough requirement\./);
  assert.throws(shape([null]), /Invalid Borough requirement\./);
  assert.throws(shape([{ ...model, building: 'castle' }]), /Invalid Borough requirement\./);
  assert.throws(shape([{ ...model, neighbor: 'castle' }]), /Invalid Borough requirement\./);

  // Ranges are inclusive integers: minimumNeighbors 1-4, count 1-18.
  for (const minimumNeighbors of [0, 5, 1.5, '1']) {
    assert.throws(
      shape([{ ...model, minimumNeighbors }]),
      /Invalid Borough requirement\./,
      `minimumNeighbors ${minimumNeighbors}`,
    );
  }
  for (const badCount of [0, 19, 1.5]) {
    assert.throws(
      shape([{ ...model, count: badCount }]),
      /Invalid Borough requirement\./,
      `count ${badCount}`,
    );
  }

  // The list itself holds 1 to 3 entries and never repeats a key.
  assert.throws(shape([]), /Invalid Borough requirements\./);
  assert.throws(shape({}), /Invalid Borough requirements\./);
  assert.throws(
    shape([
      { ...model, minimumNeighbors: 1, count: 1 },
      { ...model, minimumNeighbors: 2, count: 1 },
      { ...model, minimumNeighbors: 3, count: 1 },
      { ...model, minimumNeighbors: 4, count: 1 },
    ]),
    /Invalid Borough requirements\./,
  );
  assert.throws(shape([model, { ...model }]), /Duplicate Borough requirement\./);

  // Accepted shapes still replay: omission, a relaxed count and one extra
  // satisfiable clause all complete from the curated solution.
  for (const requirements of [
    undefined,
    [{ ...model, count: 1 }],
    [model, { ...model, minimumNeighbors: 1, count: 1 }],
  ]) {
    const only = Challenges.create(entryWith(requirements), { quiet: Q, club: E });
    assert.equal(only.count, 1);
    const run = only.begin('curated-borough-shape-01');
    run.log = structuredClone(contract.solutionActions);
    assert.equal(only.replay(run).complete, true);
  }
});

test('borough adjacency never wraps at row edges', () => {
  const board = (cells) => {
    const plots = Array(25).fill(null);
    for (const [i, v] of cells) plots[i] = v;
    return plots;
  };
  const actual = (cells, minimumNeighbors = 1) =>
    Challenges.boroughRequirements(
      {
        requirements: [{ building: 'home', neighbor: 'garden', minimumNeighbors, count: 1 }],
      },
      { board: board(cells) },
    )[0].actual;
  assert.equal(
    actual([
      [5, 'home'],
      [4, 'garden'],
    ]),
    0,
    'i-1 must not wrap to the previous row',
  );
  assert.equal(
    actual([
      [10, 'home'],
      [9, 'garden'],
    ]),
    0,
    'row starts exclude the row above end',
  );
  assert.equal(
    actual([
      [5, 'home'],
      [6, 'garden'],
    ]),
    1,
  );
  assert.equal(
    actual([
      [4, 'home'],
      [9, 'garden'],
    ]),
    1,
    'i+5 crosses rows legitimately',
  );
  assert.equal(
    actual([
      [0, 'home'],
      [5, 'garden'],
    ]),
    1,
  );
  assert.equal(
    actual([
      [0, 'home'],
      [6, 'garden'],
    ]),
    0,
    'diagonals never count',
  );
  assert.equal(
    actual(
      [
        [6, 'home'],
        [1, 'garden'],
        [11, 'garden'],
      ],
      2,
    ),
    1,
    'two edge neighbours satisfy a count of 2',
  );
  assert.equal(
    actual(
      [
        [6, 'home'],
        [1, 'garden'],
      ],
      2,
    ),
    0,
  );
});
