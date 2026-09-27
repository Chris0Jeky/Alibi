import test from 'node:test';
import assert from 'node:assert/strict';
import W from '../src/castle/content.mjs';
import * as E from '../src/castle/engine.mjs';
import { createPages } from '../src/castle/pages.mjs';
import { nextThread, thread, go } from '../src/castle/exploration.mjs';

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

test('The clock accepts phone-keypad time formats and stores only HH:MM', () => {
  for (const text of ['21:00', '2100', '21.00', '21 00', ' 21:00 ', '21h00', '21-00'])
    assert.equal(E.clockTime(text), '21:00', text);
  assert.equal(E.clockTime('9:00'), '09:00');
  for (const text of ['', '21', '21:0', '25:00', '21:60', 'nine', '21::00', null])
    assert.equal(E.clockTime(text), null, String(text));
  const ready = solve('shelves');
  for (const text of ['2100', '21.00', '21 00']) {
    const result = E.complete(ready, 'clock', text);
    assert.equal(result.ok, true, text);
    assert.equal(result.state.completed.clock.answer, '21:00');
    assert.deepEqual(E.validate(result.state).completed.clock, { answer: '21:00', guided: false });
  }
  assert.equal(E.complete(ready, 'clock', '2117').ok, false);
  assert.equal(E.check('clock', '2100'), false, 'stored completions stay strictly HH:MM');
});

test('Clock feedback names the format problem before the arithmetic', () => {
  assert.match(E.clockFeedback('21'), /four digits, such as 21:17 or 2117/);
  assert.match(E.clockFeedback('900'), /09:00 is in the morning/);
  assert.match(E.clockFeedback('2134'), /21:34 does not match/);
});

const status = (state, id) =>
  E.roomStatus(
    state,
    W.rooms.find((r) => r.id === id),
  );

test('Locked doors name the rooms whose questions open them', () => {
  const fresh = E.initial();
  assert.deepEqual(status(fresh, 'observatory').via, ['library']);
  assert.deepEqual(status(fresh, 'cartography').via, ['gatehouse', 'museum']);
  assert.deepEqual(status(fresh, 'study').via, ['observatory', 'cartography']);
  assert.deepEqual(status(solve('shelves', 'clock'), 'study').via, ['cartography']);
  assert.deepEqual(status(solve('shelves', 'clock', 'gate', 'route'), 'west-stair').via, ['study']);
  assert.equal(status(fresh, 'rookery').via, undefined, 'planned rooms promise no unlock');
  for (const room of W.rooms.filter((r) => r.implemented))
    for (const id of status(fresh, room.id).via || [])
      assert.ok(
        W.rooms.some((r) => r.id === id && r.implemented),
        `${room.id} -> ${id}`,
      );
});

test('The thread never sends players to a locked room', () => {
  const states = [
    E.initial(),
    solve('shelves'),
    solve('shelves', 'clock'),
    solve('shelves', 'clock', 'magic'),
    solve('shelves', 'clock', 'gate', 'route'),
    solve(...chapter),
  ];
  for (const state of states)
    for (const id of thread(state)[1]) assert.equal(status(state, id).open, true, id);
  const locked = nextThread(solve('shelves', 'clock'));
  assert.match(locked, /Open the Map Room/);
  assert.match(locked, /data-do="visit" data-value="gatehouse"/);
  assert.match(locked, /data-do="visit" data-value="museum"/);
  assert.doesNotMatch(locked, /data-value="cartography"/);
  assert.match(nextThread(solve('shelves', 'clock', 'bridges')), /data-value="cartography"/);
  assert.equal(
    go(['library']),
    '<button data-do="visit" data-value="library" >The Long Library →</button>',
  );
});

test('Unlock copy points to a real door', () => {
  assert.match(W.puzzles.gate.after, /Map Room, beyond the Long Library/);
  assert.match(W.puzzles.inference.after, /Unrecorded Stair is open/);
});

test('The thread card comes before the grounds map and selected-room panel', () => {
  for (const state of [E.initial(), solve('shelves', 'clock'), solve(...chapter)]) {
    const html = pages(state).mapPage();
    const thread = html.indexOf('class="thread-guide"');
    assert.ok(thread > html.indexOf('class="scene-heading"'));
    assert.ok(thread < html.indexOf('class="map-scroll"'));
    assert.ok(thread < html.indexOf('class="rail"'));
    assert.equal(html.match(/class="thread-guide"/g).length, 1);
  }
});

test('The directory lists enterable rooms first and collapses planned rooms', () => {
  const html = pages(E.initial(), { view: 'directory' }).directory();
  assert.match(html, /id="results-count">9 rooms to visit · 22 planned</);
  const later = html.indexOf('<details class="later-rooms">');
  assert.ok(later > 0, 'planned rooms are collapsed by default');
  assert.match(html.slice(later), /<summary>Later chapters · 22 planned rooms<\/summary>/);
  assert.doesNotMatch(html.slice(0, later), /class="tag">Planned room/);
  assert.equal(html.slice(later).match(/data-do="visit"/g), null);
  assert.doesNotMatch(html, /Twenty-two planned locations/);
  const done = pages(solve(...chapter), { view: 'directory' }).directory();
  assert.match(done, /10 rooms to visit · 22 planned/);
  const found = pages(E.initial(), { view: 'directory', search: 'rookery' }).results();
  assert.match(found, /0 rooms to visit · 1 planned/);
  assert.match(found, /<details class="later-rooms" open>/, 'a search reveals planned matches');
  const wing = pages(E.initial(), { view: 'directory', filter: 'Below the castle' }).results();
  assert.match(wing, /0 rooms to visit · \d+ planned/);
  assert.match(wing, /<details class="later-rooms" open>/, 'a wing filter reveals planned rooms');
});
