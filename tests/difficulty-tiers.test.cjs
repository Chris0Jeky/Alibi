'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../src/core.js');
const Model = require('../src/house/model.js');
require('../src/house/components.js');
require('../src/house/view.js');

const TIERS = ['Gentle', 'Steady', 'Tricky', 'Expert', 'Master', 'Grandmaster'];
const View = globalThis.AlibiHouseView;

test('difficulty tiers have one canonical order across runtime and pack schema', () => {
  assert.deepEqual(Core.DIFFICULTIES, TIERS);
  assert.deepEqual(Model.levels, TIERS);
  const schema = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../schemas/pack.schema.json'), 'utf8'),
  );
  assert.deepEqual(schema.$defs.puzzle.properties.difficulty.enum, TIERS);
});

test('house routes accept the two advanced tiers and reject unknown values', () => {
  for (const level of ['Master', 'Grandmaster']) {
    assert.equal(Model.locationState(`#/home?ux=house&view=puzzles&level=${level}`).level, level);
  }
  assert.equal(Model.locationState('#/home?ux=house&view=puzzles&level=Impossible').level, '');
});

test('house filters expose every ordered tier and filter advanced studies exactly', () => {
  const html = View.filters({
    route: { q: '', family: '', progress: '', level: 'Master' },
    names: {},
  });
  const labels = [...html.matchAll(/<option(?: selected)?>([^<]+)<\/option>/g)].map(
    (match) => match[1],
  );
  for (const tier of TIERS) assert.equal(labels.includes(tier), true, `${tier} option`);
  assert.ok(labels.indexOf('Expert') < labels.indexOf('Master'));
  assert.ok(labels.indexOf('Master') < labels.indexOf('Grandmaster'));
  assert.match(html, /<option selected>Master<\/option>/);

  const puzzles = TIERS.map((difficulty, index) => ({
    id: `tier-${index}`,
    revision: 1,
    title: difficulty,
    subtitle: '',
    type: 'sudoku',
    collection: 'Tier contract',
    difficulty,
  }));
  const filtered = Model.catalogue(
    puzzles,
    [],
    { q: '', family: '', progress: '', level: 'Grandmaster' },
    {},
  );
  assert.deepEqual(
    filtered.map((puzzle) => puzzle.difficulty),
    ['Grandmaster'],
  );
});
