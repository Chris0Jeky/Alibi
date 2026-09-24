'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the actual browser predicates, not a second copy of the wait logic.
function readiness(file, marker, locals) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `Missing action marker in ${file}`);
  const match = source.slice(start).match(/wait_js\(page,\s*"([^"\n]+)"(?:,\s*arg=([^\n]+))?\)/);
  assert.ok(match, `Missing readiness predicate in ${file}`);
  // These calls use strings or a plain literal with shared JS/Python syntax.
  const arg = match[2] ? vm.runInNewContext(`(${match[2]})`, locals, { timeout: 1000 }) : undefined;
  return (state) => {
    const before = JSON.stringify(state);
    const result = vm.runInNewContext(`(${match[1]})(arg)`, { ...state, arg }, { timeout: 1000 });
    assert.equal(JSON.stringify(state), before, 'a wait must not mutate route or focus');
    return result;
  };
}

const cases = [
  {
    name: 'finder return',
    file: 'browser_house.py',
    marker: 'page.locator("#hx-return a").click()\n            wait_js',
    hash: '#/home?ux=house&view=puzzles',
    previousHash: '#/play/binary-01@1',
    focus: 'hx-action-play-binary-01',
  },
  {
    name: 'filter apply',
    file: 'browser_house_mobile.py',
    marker: "page.locator('#hx-filter-form').get_by_role('button',name='Apply filters').click()",
    hash: '#/home?ux=house&view=puzzles&family=binary&level=Gentle',
    previousHash: '#/home?ux=house&view=puzzles',
    focus: 'hx-filters-open',
  },
  {
    name: 'filter reset',
    file: 'browser_house_mobile.py',
    marker: "page.locator('[data-house-action=filter-reset]').click()",
    hash: '#/home?ux=house&view=puzzles',
    previousHash: '#/home?ux=house&view=puzzles&family=binary',
    focus: 'hx-filters-open',
  },
];

for (const entry of cases) {
  test(`${entry.name} waits for deferred focus, not just the route`, () => {
    const ready = readiness(entry.file, entry.marker, {
      browse_hash: entry.hash,
      origin_id: entry.focus,
    });
    const state = {
      location: { hash: entry.previousHash },
      document: { activeElement: { id: entry.focus } },
    };
    assert.equal(ready(state), false, 'focus alone must not satisfy the route guard');
    state.location.hash = entry.hash;
    state.document.activeElement.id = 'main';
    const frames = [
      () => {
        state.document.activeElement.id = entry.focus;
      },
    ];
    assert.equal(ready(state), false, 'the route can settle before its focus frame');
    frames.shift()();
    assert.equal(ready(state), true, 'ready once the intended opener has focus');
  });
}
