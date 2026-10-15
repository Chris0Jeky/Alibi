'use strict';
/* Page rendering coverage for fallback selection, room actions, notes and search. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const PAGES_URL = pathToFileURL(path.join(ROOT, 'src', 'castle', 'pages.mjs')).href;
const CONTENT_URL = pathToFileURL(path.join(ROOT, 'src', 'castle', 'content.mjs')).href;
const ENGINE_URL = pathToFileURL(path.join(ROOT, 'src', 'castle', 'engine.mjs')).href;

let cached = null;
async function load() {
  if (!cached) {
    const [{ createPages }, content, engine] = await Promise.all([
      import(PAGES_URL),
      import(CONTENT_URL),
      import(ENGINE_URL),
    ]);
    cached = { createPages, W: content.default, E: engine };
  }
  return cached;
}

function makePages(modules, state, extra = {}) {
  return modules.createPages({
    state,
    view: 'map',
    selected: 'gatehouse',
    era: 'today',
    mapZoom: 4,
    search: '',
    filter: 'all',
    practiceSnapshot: null,
    ...extra,
  });
}

function solve(modules, ...ids) {
  const { E, W } = modules;
  return ids.reduce((state, id) => {
    const result = E.complete(state, id, W.puzzles[id].solution);
    assert.equal(result.ok, true, id);
    return E.validate(result.state);
  }, E.validate(E.initial()));
}

test('unknown selection falls back to the first room', async () => {
  const modules = await load();
  const state = modules.E.validate(modules.E.initial());
  const map = makePages(modules, state, { selected: 'definitely-not-a-room' }).mapPage();
  assert.match(map, /<h2>The Gatehouse<\/h2>/);
  assert.doesNotMatch(map, /definitely-not-a-room/);
  const room = makePages(modules, state, {
    view: 'room',
    selected: 'definitely-not-a-room',
  }).roomPage();
  assert.match(room, /The Gatehouse/);
  assert.doesNotMatch(room, /definitely-not-a-room/);
});

test('solved labels distinguish the reveal room from standard questions', async () => {
  const modules = await load();
  const stair = modules.W.rooms.find((r) => r.id === 'west-stair');
  const library = modules.W.rooms.find((r) => r.id === 'library');
  const chapter = solve(modules, 'shelves', 'clock', 'gate', 'route', 'inference');
  assert.match(makePages(modules, chapter).roomCard(stair), /Chapter I complete/);
  const shelves = solve(modules, 'shelves');
  assert.match(makePages(modules, shelves).roomCard(library), /Question solved/);
  assert.doesNotMatch(makePages(modules, shelves).roomCard(library), /Chapter I complete/);
  const fresh = modules.E.validate(modules.E.initial());
  assert.doesNotMatch(makePages(modules, fresh).roomCard(library), /Question solved/);
});

test('room-view rail offers the guest book and the margin actions', async () => {
  const modules = await load();
  const fresh = modules.E.validate(modules.E.initial());
  const rest = makePages(modules, fresh, { view: 'room', selected: 'conservatory' }).roomPage();
  assert.match(rest, /Open the guest book/);
  assert.match(rest, /data-do="rest"/);
  const chapter = solve(modules, 'shelves', 'clock', 'gate', 'route', 'inference');
  const reveal = makePages(modules, chapter, { view: 'room', selected: 'west-stair' }).roomPage();
  assert.match(reveal, /Read the margin/);
  assert.match(reveal, /data-do="resolution"/);
});

test('notebook escapes notes, counts characters and hides records when story is off', async () => {
  const modules = await load();
  const notes = 'a<b>&"\'';
  const base = modules.E.validate(modules.E.initial());
  const hidden = makePages(modules, {
    ...base,
    notes,
    preferences: { ...base.preferences, story: false },
  }).notebook();
  assert.match(hidden, /maxlength="12000"/);
  assert.ok(hidden.includes(`${notes.length} / 12,000 characters`));
  assert.ok(hidden.includes('a&lt;b&gt;&amp;&quot;&#39;'));
  assert.doesNotMatch(hidden, /a<b>/);
  assert.match(hidden, /Story records are hidden/);
});

test('directory search matches case-insensitively and an unmatched search has no planned group', async () => {
  const modules = await load();
  const fresh = modules.E.validate(modules.E.initial());
  const upper = makePages(modules, fresh, { view: 'directory', search: 'GATEHOUSE' }).results();
  assert.match(upper, /The Gatehouse/);
  const empty = makePages(modules, fresh, {
    view: 'directory',
    search: 'zzz-no-such-room-zzz',
  }).results();
  assert.match(empty, /0 rooms to visit/);
  assert.doesNotMatch(empty, /planned/);
  assert.doesNotMatch(empty, /later-rooms/);
});

test('directory escapes the search value in the rendered input', async () => {
  const modules = await load();
  const fresh = modules.E.validate(modules.E.initial());
  const html = makePages(modules, fresh, {
    view: 'directory',
    search: '"><script>alert(1)</script>',
  }).directory();
  assert.ok(html.includes('value="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"'));
  assert.doesNotMatch(html, /<script>alert/);
});
