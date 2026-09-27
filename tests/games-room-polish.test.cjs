'use strict';
// Games Room polish: finished games replay without ceremony, pages number themselves from the
// card order, and journal records name their game.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { session, fresh } = require('./helpers/club-session.cjs');
const gardens = require('../content/region-gardens.json').puzzles;

const finishedDuel = [
  8,
  7,
  6,
  0,
  13,
  9,
  1,
  2,
  3,
  4,
  10,
  12,
  22,
  11,
  5,
  16,
  17,
  25,
  19,
  24,
  18,
  26,
  30,
  23,
  27,
  28,
  29,
  31,
  32,
  33,
  34,
  35,
];
const draw = [0, 4, 8, 2, 6, 3, 5, 7, 1];

test('a finished game plays again without a dialog; an unfinished one still asks', async () => {
  const data = fresh();
  data.runs.tictactoe = { mode: 'local', log: [0, 3, 1, 4, 2], redo: [] };
  data.runs.duel = { mode: 'local', log: [8], redo: [] };
  const tab = await session(data);
  let restartFocus = 0;
  tab.nodes.set('club-control-restart-tictactoe', {
    focus(options) {
      assert.equal(options.preventScroll, true);
      restartFocus++;
    },
  });
  await tab.club.onRoute({ page: 'salon', id: 'tictactoe' });
  assert.match(
    tab.club.roomPage('tictactoe'),
    /id="club-control-restart-tictactoe"[^>]*>Play again</,
  );
  await tab.action('restart', { id: 'tictactoe' });
  assert.equal(tab.dialogs.length, 0);
  assert.deepEqual(tab.state().runs.tictactoe.log, []);
  assert.equal(tab.state().records.length, 1, 'the finished game reaches the journal first');
  assert.equal(tab.state().records[0].type, 'tictactoe');
  assert.equal(restartFocus, 1, 'focus returns to the replacement restart control');
  await tab.club.onRoute({ page: 'salon', id: 'duel' });
  assert.match(tab.club.roomPage('duel'), />Start again</);
  await tab.action('restart', { id: 'duel' });
  assert.equal(tab.dialogs.length, 1, 'an unfinished duel still confirms');
  assert.deepEqual(tab.state().runs.duel.log, [8]);
});

test('a solved garden offers the next garden and leaves without confirmation', async () => {
  const data = fresh();
  data.runs.regiongardens = { level: 0, log: gardens[0].solution, redo: [] };
  const tab = await session(data);
  let nextFocus = 0;
  tab.nodes.set('club-control-garden-level-1', {
    focus(options) {
      assert.equal(options.preventScroll, true);
      nextFocus++;
    },
  });
  await tab.club.onRoute({ page: 'salon', id: 'regiongardens' });
  const page = tab.club.roomPage('regiongardens');
  assert.match(page, /data-action="club-garden-level" data-value="1">Next garden →/);
  assert.match(page, /aria-pressed="true">Window boxes/);
  await tab.action('garden-level', { value: '1' });
  assert.equal(tab.dialogs.length, 0);
  assert.equal(tab.state().runs.regiongardens.level, 1);
  assert.deepEqual(tab.state().runs.regiongardens.log, []);
  assert.equal(tab.state().records.length, 1, 'the solved garden reaches the journal first');
  assert.match(tab.state().records[0].id, /^regiongardens:0:/);
  assert.equal(nextFocus, 1, 'focus follows the newly selected garden');
  await tab.action('garden-cell', { cell: '0' });
  await tab.action('garden-level', { value: '2' });
  assert.equal(tab.dialogs.length, 1, 'an unsolved garden still confirms');
});

test('completed Duel setting changes journal the old result, skip confirmation and restore focus', async () => {
  const strengthData = fresh();
  strengthData.runs.duel = {
    mode: 'bot',
    difficulty: 'learner',
    log: finishedDuel,
    redo: [],
  };
  const strengthTab = await session(strengthData);
  let strengthFocus = 0;
  strengthTab.nodes.set('club-control-duel-strength-expert', {
    focus() {
      strengthFocus++;
    },
  });
  await strengthTab.club.onRoute({ page: 'salon', id: 'duel' });
  await strengthTab.action('duel-strength', { value: 'expert' });
  assert.equal(strengthTab.dialogs.length, 0, 'a completed match does not ask again');
  assert.equal(strengthTab.state().runs.duel.difficulty, 'expert');
  assert.deepEqual(strengthTab.state().runs.duel.log, []);
  assert.equal(strengthTab.state().records.length, 1);
  assert.equal(
    strengthTab.state().records[0].difficulty,
    'learner',
    'the old result keeps its strength',
  );
  assert.equal(strengthFocus, 1);

  const modeData = fresh();
  modeData.runs.duel = { mode: 'bot', difficulty: 'keeper', log: finishedDuel, redo: [] };
  const modeTab = await session(modeData);
  let modeFocus = 0;
  modeTab.nodes.set('club-control-duel-mode-local', {
    focus() {
      modeFocus++;
    },
  });
  await modeTab.club.onRoute({ page: 'salon', id: 'duel' });
  await modeTab.action('duel-mode', { value: 'local' });
  assert.equal(modeTab.dialogs.length, 0);
  assert.equal(modeTab.state().runs.duel.mode, 'local');
  assert.deepEqual(modeTab.state().runs.duel.log, []);
  assert.equal(modeTab.state().records.length, 1);
  assert.equal(modeFocus, 1);
});

test('unfinished Duel setting changes still wait for confirmation', async () => {
  const data = fresh();
  data.runs.duel = { mode: 'bot', difficulty: 'keeper', log: [8], redo: [] };
  const tab = await session(data);
  await tab.club.onRoute({ page: 'salon', id: 'duel' });
  await tab.action('duel-strength', { value: 'expert' });
  assert.equal(tab.dialogs.length, 1);
  assert.equal(tab.state().runs.duel.difficulty, 'keeper');
  assert.deepEqual(tab.state().runs.duel.log, [8]);
});

test('the keeper note and a table-for-two offer follow a solo Tic-Tac-Toe result', async () => {
  const data = fresh();
  data.runs.tictactoe = { mode: 'bot', log: draw, redo: [] };
  const tab = await session(data);
  await tab.club.onRoute({ page: 'salon', id: 'tictactoe' });
  const page = tab.club.roomPage('tictactoe');
  assert.match(page, /The keeper cannot be beaten; a draw is the best result\./);
  assert.match(page, /data-id="again" data-value="local">Play two at the table/);
  assert.equal(page.match(/id="club-control-tictactoe-mode-local"/g).length, 1, 'ids stay unique');
  await tab.action('tictactoe-mode', { id: 'again', value: 'local' });
  assert.equal(tab.dialogs.length, 0);
  assert.equal(tab.state().runs.tictactoe.mode, 'local');
});

test('section numbers follow the card order; legacy tables and the room page say so', async () => {
  const tab = await session();
  const kicker = async (id) => {
    await tab.club.onRoute({ page: 'salon', id });
    return tab.club.roomPage(id).match(/<span class="eyebrow">([^<]*)<\/span><h1>/)[1];
  };
  assert.equal(await kicker('duel'), 'THE GAMES ROOM / 01');
  assert.equal(await kicker('regiongardens'), 'THE GAMES ROOM / 03');
  assert.equal(await kicker('borough'), 'THE GAMES ROOM / 05');
  assert.equal(await kicker('archive'), 'THE GAMES ROOM / 06');
  assert.equal(await kicker('dominoes'), 'LEGACY TABLE · KEPT FOR SAVED GAMES');
  assert.equal(await kicker('mahjong'), 'LEGACY TABLE · KEPT FOR SAVED GAMES');
  await tab.club.onRoute({ page: 'salon', id: '' });
  assert.doesNotMatch(tab.club.roomPage(''), />Games room<\/button>/, 'no self-link');
  const engravings = tab.club.roomPage('').match(/\d\d \/ ALIBI/g);
  assert.deepEqual(
    engravings,
    ['01', '02', '03', '04', '05', '06', '07'].map((n) => n + ' / ALIBI'),
  );
});

test('Duel strength copy counts moves, and the online room needs a configured API', async () => {
  const data = fresh();
  data.runs.duel = { mode: 'bot', difficulty: 'learner', log: [], redo: [] };
  const tab = await session(data);
  await tab.club.onRoute({ page: 'salon', id: 'duel' });
  let page = tab.club.roomPage('duel');
  assert.match(page, /1 move ahead at most/);
  assert.doesNotMatch(page, /Private online room/);
  tab.context.ALIBI_CLUB_CONFIG = { apiBase: 'https://rooms.example.test/api' };
  page = tab.club.roomPage('duel');
  assert.match(page, /Private online room/);
});

test('journal records name their game and count in the singular', async () => {
  const data = fresh();
  data.records = [
    { id: 'a', type: 'duel', label: 'Against the keeper · Keeper', score: 1, date: '2026-09-27' },
    { id: 'b', type: 'archive', label: 'The receiving room', score: 1, date: '2026-09-27' },
    { id: 'c', type: 'blockcabinet', label: 'Block Cabinet · B1', score: 40, date: '2026-09-27' },
  ];
  const tab = await session(data);
  tab.context.AlibiAssets = { badge: () => '' };
  await tab.club.onRoute({ page: 'club' });
  const page = tab.club.profile();
  assert.match(page, /Lantern Duel · Against the keeper · Keeper/);
  assert.match(page, /Archive Heist · The receiving room<\/strong><span>1 push</);
  assert.match(page, /<strong>Block Cabinet · B1<\/strong>/);
});
