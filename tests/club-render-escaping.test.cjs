'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { session, fresh } = require('./helpers/club-session.cjs');

test('Club renderers escape journal labels and Lantern Gardens titles', async () => {
  const hostile = `<img src=x onerror=alert(1)>&"'`;
  const escaped = '&lt;img src=x onerror=alert(1)&gt;&amp;&quot;&#39;';
  const data = fresh();
  data.boroughBests = [
    {
      label: hostile,
      score: 1,
      date: '2026-10-24T00:00:00.000Z',
    },
  ];
  data.records = ['borough', 'tictactoe'].map((type) => ({
    id: type + ':escaping',
    type,
    label: hostile,
    score: 1,
    date: '2026-10-24T00:00:00.000Z',
  }));
  // The shared harness loads the real Club, engines and save validator in a VM.
  const { club, context } = await session(data, null, {
    context: { AlibiAssets: { badge: () => '' } },
  });

  await club.onRoute({ page: 'club' });
  const journal = club.profile();
  assert.ok(journal.includes(`<strong>${escaped}</strong>`), 'local personal-best label');
  assert.ok(journal.includes(`<strong>Tic-Tac-Toe · ${escaped}</strong>`), 'completed game label');
  assert.doesNotMatch(journal, /<img\b/i);

  context.AlibiClubEngines.regionGardens.layouts[0].title = hostile;
  await club.onRoute({ page: 'salon', id: 'regiongardens' });
  const garden = club.roomPage('regiongardens');
  assert.ok(garden.includes(`<h2>${escaped}</h2>`), 'current garden title');
  assert.ok(garden.includes(`${escaped} · `), 'garden selector label');
  assert.doesNotMatch(garden, /<img\b/i);
});
