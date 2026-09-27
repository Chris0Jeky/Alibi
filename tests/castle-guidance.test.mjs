import test from 'node:test';
import assert from 'node:assert/strict';
import W from '../src/castle/content.mjs';
import * as E from '../src/castle/engine.mjs';
import { createPages } from '../src/castle/pages.mjs';
import { nextThread } from '../src/castle/exploration.mjs';

const solve = (...ids) =>
  ids.reduce((s, id) => {
    const result = E.complete(s, id, W.puzzles[id].solution);
    assert.equal(result.ok, true, id);
    return E.validate(result.state);
  }, E.initial());
const chapter = ['shelves', 'clock', 'gate', 'route', 'inference'];
const pages = (state, extra = {}) =>
  createPages({
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
const stair = W.rooms.find((r) => r.id === 'west-stair');

test('Chapter I progress counts one Map Room key and keeps extras separate', () => {
  assert.deepEqual(E.progress(E.initial()), [0, 0]);
  assert.deepEqual(E.progress(solve('lamps')), [0, 1]);
  assert.deepEqual(E.progress(solve('gate', 'bridges', 'magic')), [1, 2]);
  assert.deepEqual(E.progress(solve(...chapter.slice(0, 4))), [4, 0]);
  assert.deepEqual(E.progress(solve(...chapter)), [5, 0]);
  assert.deepEqual(E.progress(solve(...chapter, 'lamps', 'ur')), [5, 2]);
  assert.deepEqual(
    E.progress(solve(...chapter, ...E.ids.filter((id) => !chapter.includes(id)))),
    [5, 5],
  );
});

test('The Unrecorded Stair counts as done exactly when the resolution is available', () => {
  assert.equal(E.solved(solve(...chapter.slice(0, 4)), stair), false);
  const done = solve(...chapter);
  assert.equal(E.solved(done, stair), true);
  assert.equal(
    E.solved(
      done,
      W.rooms.find((r) => r.id === 'study'),
    ),
    true,
  );
  assert.equal(
    E.solved(
      done,
      W.rooms.find((r) => r.id === 'conservatory'),
    ),
    false,
  );
});

test('Completed chapter shows a persistent mark, a finished thread and a done stair', () => {
  const before = pages(solve(...chapter.slice(0, 4))).mapPage();
  assert.doesNotMatch(before, /Chapter I complete/);
  const state = solve(...chapter);
  const map = pages(state).mapPage();
  assert.match(map, /class="status chapter-mark">✓ Chapter I complete</);
  assert.match(map, /class="pin completed"[^>]*>09</);
  assert.match(pages(state).roomCard(stair), /<div class="tag">Chapter I complete<\/div>/);
  const thread = nextThread(state);
  assert.match(thread, /Chapter I complete\./);
  assert.match(thread, /0 \/ 5 extra questions answered/);
  assert.doesNotMatch(thread, /Visit the unrecorded stair/);
  for (const room of ['west-stair', 'orangery', 'workshop', 'museum'])
    assert.match(thread, new RegExp(`data-do="visit" data-value="${room}"`));
  assert.doesNotMatch(thread, /data-value="gatehouse"/, 'a solved Map Room key is not an extra');
});

test('Completion is derived from existing saves without a schema change', () => {
  const state = solve(...chapter);
  assert.deepEqual(Object.keys(E.validate(JSON.parse(JSON.stringify(state)))).sort(), [
    'completed',
    'drafts',
    'labels',
    'notes',
    'preferences',
    'revealed',
    'revision',
    'theories',
    'version',
    'visited',
  ]);
  const all = solve(...E.ids);
  assert.match(nextThread(all), /5 \/ 5 extra questions answered/);
  assert.doesNotMatch(nextThread(all), /data-value="museum"/);
});
