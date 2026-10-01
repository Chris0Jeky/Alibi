import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { session, fresh } = require('./helpers/club-session.cjs');

async function boroughTab(data) {
  const tab = await session(data ?? fresh());
  await tab.club.onRoute({ page: 'salon', id: 'borough' });
  return tab;
}

test('out-of-range plan choices are ignored; the borough page still renders', async () => {
  const tab = await boroughTab();
  for (const value of ['5', '-1', '3', '1.5', 'abc']) {
    await tab.action('plan', { value });
    const html = tab.club.roomPage('borough');
    assert.equal(
      html.includes('data-value="0" aria-pressed="true"'),
      true,
      `plan ${value} keeps slot 0`,
    );
    assert.match(html, /class="plan-rule"/);
  }
});

test('non-numeric and out-of-range plot cells never persist and never break preview', async () => {
  const tab = await boroughTab();
  for (const cell of ['abc', '25', '-1', '2.5']) {
    await tab.action('plot', { cell });
    const html = tab.club.roomPage('borough');
    assert.equal(html.includes('plot-selected'), false, `cell ${cell} selects nothing`);
    assert.equal(html.includes('ghost-building'), false, `cell ${cell} previews nothing`);
    assert.equal(html.includes('Select an empty plot'), true);
  }
});

test('plot selection on a finished town is ignored', async () => {
  const probe = await session(fresh());
  const E = probe.context.AlibiClubEngines;
  let s = E.borough.initial('EVENING-01');
  const log = [];
  while (!s.done) {
    const cell = s.board.findIndex((v) => !v);
    log.push({ slot: 0, cell });
    s = E.borough.move(s, 0, cell);
  }
  assert.equal(s.done, true);
  const data = fresh();
  data.runs.borough = { seed: 'EVENING-01', log, redo: [] };
  const tab = await boroughTab(data);
  const empty = s.board.findIndex((v) => !v);
  assert.notEqual(empty, -1, 'a finished town still shows empty plots');
  await tab.action('plot', { cell: String(empty) });
  const html = tab.club.roomPage('borough');
  assert.equal(html.includes('plot-selected'), false);
  assert.match(html, /A little place of your own/);
});

test('valid plan and plot choices still persist and preview', async () => {
  const tab = await boroughTab();
  await tab.action('plan', { value: '2' });
  let html = tab.club.roomPage('borough');
  assert.equal(html.includes('data-value="2" aria-pressed="true"'), true);
  await tab.action('plot', { cell: '0' });
  html = tab.club.roomPage('borough');
  assert.equal(html.includes('plot-selected'), true);
  assert.match(html, /Build here/);
});
