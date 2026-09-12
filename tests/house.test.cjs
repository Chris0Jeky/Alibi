'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const M = require('../src/house/model.js');
require('../src/house/components.js');
require('../src/house/view.js');
const V = globalThis.AlibiHouseView;
const puzzle = (id, extra = {}) => ({
  id,
  revision: 1,
  type: 'binary',
  title: id,
  difficulty: 'Gentle',
  ...extra,
});
const record = (p, extra = {}) => ({
  key: M.key(p),
  puzzle: p,
  moves: 1,
  updatedAt: '2026-09-12T12:00:00Z',
  ...extra,
});
const fixtures = [
  puzzle('binary-01'),
  puzzle('old', { revision: 2, difficulty: 'Expert' }),
  puzzle('bridge', { type: 'bridges' }),
];
const route = M.locationState('#/home?ux=house&view=puzzles');
function data(extra = {}) {
  return {
    route,
    puzzles: fixtures,
    records: [],
    recent: [],
    games: [],
    first: fixtures[0],
    resume: null,
    study: M.study(),
    limit: 12,
    names: {},
    icons: {},
    settings: {},
    media: {},
    storage: 'session',
    ...extra,
  };
}
test('only explicit house routes activate the review edition', () => {
  for (const hash of ['#/home', '#/library?ux=house', '#/home?ux=other', '#/play/x?ux=house'])
    assert.equal(M.locationState(hash).active, false);
  assert.equal(route.active, true);
});
test('unknown route fields fail to safe visible defaults', () => {
  const r = M.locationState('#/home?ux=house&view=no&family=no&level=no&progress=no');
  assert.equal(r.view, 'desk');
  assert.equal(r.family + r.level + r.progress, '');
});
test('filters round trip through URL including punctuation and unicode', () => {
  const r = {
    view: 'puzzles',
    q: 'moon & sun # été',
    family: 'binary',
    progress: 'active',
    level: 'Gentle',
  };
  assert.deepEqual(M.locationState(M.url(r)), { active: true, ...r });
  assert.equal(M.locationState(M.url({ q: 'a'.repeat(300) })).q.length, 120);
});
test('progress is revision-specific and completed history remains completed', () => {
  const saves = [
    record(puzzle('old'), { firstCompletedAt: 'yesterday' }),
    record(fixtures[0]),
    record(fixtures[2], { completedAt: 'today' }),
  ];
  assert.deepEqual(M.catalogue(fixtures, saves, { ...route, progress: 'new' }).map(M.key), [
    'old@2',
  ]);
  assert.deepEqual(M.catalogue(fixtures, saves, { ...route, progress: 'active' }).map(M.key), [
    'binary-01@1',
  ]);
  assert.deepEqual(M.catalogue(fixtures, saves, { ...route, progress: 'solved' }).map(M.key), [
    'bridge@1',
  ]);
});
test('all filters combine without rewriting their inputs', () => {
  const before = JSON.stringify(fixtures);
  assert.deepEqual(
    M.catalogue(fixtures, [], { ...route, level: 'Expert', q: 'OLD', progress: 'new' }),
    [fixtures[1]],
  );
  assert.deepEqual(M.catalogue(fixtures, [], { ...route, family: 'binary', q: 'bridge' }), []);
  assert.equal(JSON.stringify(fixtures), before);
});
test('continue uses a pinned definition and deterministic timestamp order', () => {
  const older = record(puzzle('removed'), { updatedAt: '2025-01-01' });
  const current = record(fixtures[0]);
  const solved = record(fixtures[1], { firstCompletedAt: 'once' });
  const records = [older, solved, current];
  assert.deepEqual(M.recent(records), [current, older]);
  assert.deepEqual(records, [older, solved, current]);
});
test('first play avoids already completed introductory content', () => {
  assert.equal(M.firstPuzzle(fixtures, []).id, 'binary-01');
  assert.equal(
    M.firstPuzzle(fixtures, [record(fixtures[0], { completedAt: 'once' })]).id,
    'bridge',
  );
  assert.equal(M.firstPuzzle([], []), undefined);
});
test('most recent activity can be a game or a puzzle', () => {
  const records = [record(fixtures[0])];
  assert.equal(
    M.nextActivity(records, [{ id: 'blockcabinet', updatedAt: '2026-09-13' }]).kind,
    'game',
  );
  assert.equal(
    M.nextActivity(records, [{ id: 'blockcabinet', updatedAt: '2026-09-11' }]).kind,
    'puzzle',
  );
  assert.equal(M.nextActivity([], []), null);
});
test('game projection skips completed, unknown and unreadable runs without repairs', () => {
  const state = {
    runs: {
      blockcabinet: { log: [1], seed: 1 },
      tictactoe: { log: [2] },
      future: { log: [1] },
      duel: { log: [1] },
    },
  };
  const before = JSON.stringify(state);
  const E = {
    blockCabinet: { replay: () => ({ done: false }) },
    tictactoe: { replay: () => ({ done: true }) },
    reversi: {
      initial: () => {
        throw Error('unknown');
      },
    },
  };
  assert.deepEqual(
    M.gameRuns(state, E).map((r) => r.id),
    ['blockcabinet'],
  );
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(M.gameRuns(state), []);
});
test('observations are immutable, idempotent and bounded to published rooms', () => {
  const empty = M.study();
  const one = M.reduce(empty, { type: 'inspect', id: 'study' });
  assert.deepEqual(empty.visited, []);
  assert.deepEqual(M.reduce(one, { type: 'inspect', id: 'study' }).visited, ['study']);
  assert.equal(M.reduce(one, { type: 'inspect', id: 'unknown' }), one);
});
test('conclusion requires the letter and observations, not just a guessed answer', () => {
  const s = M.study();
  assert.equal(M.reduce(s, { type: 'answer', id: 'maps' }).solved, false);
  let all = M.rooms.reduce((s, r) => M.reduce(s, { type: 'inspect', id: r.id }), s);
  assert.equal(M.reduce(all, { type: 'answer', id: 'maps' }).solved, false);
  all = M.reduce(all, { type: 'letter' });
  const wrong = M.reduce(all, { type: 'answer', id: 'library' });
  assert.equal(wrong.solved, false);
  assert.deepEqual(wrong.visited, all.visited);
  assert.equal(M.reduce(wrong, { type: 'answer', id: 'maps' }).solved, true);
});
test('hint escalation is bounded and does not complete the study', () => {
  let s = M.study();
  for (let i = 0; i < 10; i++) s = M.reduce(s, { type: 'hint' });
  assert.equal(s.hint, 3);
  assert.equal(s.solved, false);
});
test('every study state has a visible next step', () => {
  assert.match(M.nextStep(M.study()), /envelope/);
  assert.match(M.nextStep({ ...M.study(), letter: true }), /Inspect/);
  assert.match(
    M.nextStep({ ...M.study(), letter: true, visited: M.rooms.map((r) => r.id) }),
    /notebook/,
  );
  assert.match(M.nextStep({ ...M.study(), solved: true }), /complete/);
});
test('imported text is escaped rather than interpreted as HTML', () => {
  const html = V.render(
    data({ puzzles: [puzzle('untrusted', { title: '<img src=x onerror=alert(1)>' })] }),
  );
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<img src=x'));
  assert.equal(V.esc('"&<>\''), '&quot;&amp;&lt;&gt;&#39;');
});
test('all five views expose landmarks and a route back to classic', () => {
  for (const view of M.views) {
    const html = V.render(data({ route: { ...route, view } }));
    assert.ok(html.includes('<h1>'));
    assert.ok(html.includes('aria-current="page"'));
    assert.ok(html.includes('href="#/home"'));
    assert.ok(html.includes('House navigation'));
  }
});
test('no-results state recovers, pagination is bounded', () => {
  assert.match(V.render(data({ route: { ...route, q: 'unmatchable' } })), /Show every puzzle/);
  const html = V.render(data({ puzzles: Array.from({ length: 35 }, (_, i) => puzzle('p' + i)) }));
  assert.equal((html.match(/class="hx-puzzle"/g) || []).length, 12);
  assert.match(html, /Show 12 more/);
});
test('map and textual list expose the same three rooms', () => {
  const html = V.render(data({ route: { ...route, view: 'house' } }));
  for (const room of M.rooms) assert.equal(html.split(`data-room="${room.id}"`).length - 1, 2);
  assert.ok(html.includes('<details'));
});
test('spoiler warning precedes the final hint and storage warning is truthful', () => {
  const html = V.render(
    data({ route: { ...route, view: 'notebook' }, study: { ...M.study(), hint: 2 } }),
  );
  assert.match(html, /Reveal the explanation \(spoiler\)/);
  assert.match(html, /Session-only storage/);
  assert.ok(!V.render(data({ storage: 'indexeddb' })).includes('Session-only storage'));
});
test('settings keep the existing owner and canonical recovery routes', () => {
  const html = V.render(
    data({
      route: { ...route, view: 'comfort' },
      settings: { reducedMotion: true, theme: 'night' },
    }),
  );
  assert.ok(html.includes('id="theme-select"'));
  assert.match(html, /data-setting="reducedMotion" checked/);
  assert.match(html, /href="#\/settings"/);
  assert.ok(
    V.render(data({ route: { ...route, view: 'notebook' } })).includes('#/quiet/castle/journal'),
  );
});
test('presentation implementation does not create save writers or observers', () => {
  const root = path.resolve(__dirname, '..');
  const source = require('../tools/build-house.cjs').sources(root);
  assert.ok(
    !/localStorage\.setItem|indexedDB\.open|MutationObserver|setInterval|\.innerHTML\s*=/.test(
      source.source,
    ),
  );
  // Use compressed source ceilings: formatting is not a delivered-byte regression.
  // Production release budgets remain enforced by the existing build/budget suite.
  assert.ok(zlib.gzipSync(source.source).length < 14 * 1024);
  assert.ok(zlib.gzipSync(source.cssSource).length < 6 * 1024);
});
test('entry facade is small, retryable and wired before app initialization', () => {
  const build = fs.readFileSync(path.join(__dirname, '../tools/build.cjs'), 'utf8');
  const loader = fs.readFileSync(path.join(__dirname, '../src/house-loader.js'), 'utf8');
  assert.ok(build.indexOf("'house-loader.js'") < build.indexOf("'app.js'"));
  assert.ok(build.includes('JSON.stringify(house.config)'));
  assert.ok(build.includes('house.bytes'));
  assert.ok(build.includes('JSON.stringify(house.standalone)'));
  assert.ok(build.includes('houseScriptGzipBytes: house.scriptGzipBytes'));
  assert.ok(zlib.gzipSync(loader).length < 2 * 1024);
  assert.match(loader, /AlibiActivities\.loadSource/);
  const activities = fs.readFileSync(path.join(__dirname, '../src/activities.js'), 'utf8');
  assert.match(activities, /15000/);
  assert.match(loader, /data-house-retry/);
});
test('phone desk has exactly one launch control, before the story artwork', () => {
  const html = V.render(data({ route: { ...route, view: 'desk' } }));
  assert.equal((html.match(/data-house-action="play"/g) || []).length, 1);
  assert.ok(html.indexOf('class="hx-resume"') < html.indexOf('class="hx-hero"'));
  assert.ok(!html.includes('hx-mobile-quick'));
});
test('visible navigation labels retain full accessible names', () => {
  const html = V.render(data());
  for (const name of ['Your desk', 'Puzzles', 'The house', 'Notebook', 'Comfort'])
    assert.ok(html.includes(`aria-label="${name}"`));
  assert.ok(html.includes('<span>Notes</span>'));
});
test('decorative vectors use no scripts, remote dependencies or focusable targets', () => {
  const C = globalThis.AlibiHouseComponents;
  for (const svg of [
    C.icon('house'),
    C.icon('<script>'),
    ...M.rooms.map((r) => C.engraving(r.id)),
  ]) {
    assert.match(svg, /aria-hidden="true" focusable="false"/);
    assert.ok(!/href=|<script|<image|onload=/.test(svg));
    assert.match(svg, /viewBox=/);
  }
});
test('filter form round-trips draft values and exposes explicit apply and reset', () => {
  const html = V.filters(
    data({
      route: { ...route, q: '<unsafe>', family: 'binary', level: 'Gentle', progress: 'active' },
    }),
  );
  assert.ok(html.includes('&lt;unsafe&gt;'));
  assert.match(html, /value="binary" selected/);
  assert.match(html, /Apply filters/);
  assert.match(html, /filter-reset/);
});
test('search recognises the visible family label as well as its internal ID', () => {
  assert.equal(
    M.catalogue(fixtures, [], { ...route, q: 'SUN & MOON' }, { binary: 'Sun & moon' }).length,
    2,
  );
});
test('puzzle icon buttons have escaped title-specific accessible names', () => {
  const html = V.render(data({ puzzles: [puzzle('x', { title: '<A> "title"' })] }));
  assert.ok(html.includes('aria-label="Play &lt;A&gt; &quot;title&quot;"'));
});
test('illustration failure cannot remove the envelope action', () => {
  const html = V.render(data({ route: { ...route, view: 'desk' }, media: {} }));
  assert.match(html, /data-house-action="letter"/);
  assert.ok(!html.includes('src="undefined"'));
});
