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
