'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
const example = 'Row 3 clue: 2 1. Column B clue: 4.';

function slice(start, end) {
  const i = source.indexOf(start);
  assert.ok(i >= 0, start);
  const j = source.indexOf(end, i + start.length);
  assert.ok(j > i, end);
  return source.slice(i, j);
}

function player() {
  const region = { innerHTML: '' },
    dialog = { open: false },
    cell = { id: 'cell-11', tagName: 'BUTTON' },
    timers = [],
    document = {
      activeElement: cell,
      addEventListener: (type, handler) => {
        assert.equal(type, 'keydown');
        document.keydown = handler;
      },
    };
  const ctx = vm.createContext({
    document,
    $: (selector) => (selector === '#toasts' ? region : dialog),
    esc: String,
    toastTimer: null,
    clearTimeout() {},
    setTimeout: (callback, delay) => timers.push({ callback, delay }),
    current: {
      puzzle: {
        type: 'nonogram',
        size: 5,
        rowClues: [[1], [0], [2, 1], [1], [1]],
        colClues: [[1], [4], [0], [1], [1]],
      },
      state: { cells: Array(25).fill(-1) },
    },
    selectedCell: 11,
    paused: false,
    updateRequested: false,
    restoreBusy: false,
    brush: 1,
    AlibiClub: { assistance: () => 'off' },
    icon: () => '',
  });
  vm.runInContext(slice('  function toast(', '  function closeDialog('), ctx);
  if (source.includes('  function readClues('))
    vm.runInContext(slice('  function readClues(', '  function controls('), ctx);
  vm.runInContext(slice('  const tool =', '  const store ='), ctx);
  vm.runInContext(slice('  function controls(', '  function evidence('), ctx);
  vm.runInContext(slice('  async function handleAction(', '  let sceneHold ='), ctx);
  vm.runInContext(
    slice(
      "  document.addEventListener('keydown', (e) => {",
      "  $('#dialog').addEventListener('keydown'",
    ),
    ctx,
  );
  return {
    ctx,
    region,
    dialog,
    cell,
    timers,
    press(options = {}) {
      const e = {
        key: 'c',
        target: cell,
        preventDefault() {
          this.defaultPrevented = true;
        },
        ...options,
      };
      document.keydown(e);
      return e;
    },
  };
}

for (const key of ['c', 'C'])
  test(`${key} announces the selected square without focus, selection or state changes`, () => {
    const p = player(),
      before = JSON.stringify(p.ctx.current);
    assert.equal(p.press({ key, shiftKey: key === 'C' }).defaultPrevented, true);
    assert.equal(p.region.innerHTML, `<div class="toast ">${example}</div>`);
    assert.equal(p.ctx.document.activeElement, p.cell);
    assert.equal(p.ctx.selectedCell, 11);
    assert.equal(JSON.stringify(p.ctx.current), before);
    assert.equal(p.timers[0].delay, 5500);
    p.timers[0].callback();
    assert.equal(p.region.innerHTML, '');
  });

test('blank-line clues are read as zero', () => {
  const p = player();
  p.ctx.selectedCell = 7;
  p.press();
  assert.match(p.region.innerHTML, /Row 2 clue: 0\. Column C clue: 0\./);
});

test('repeat, modifiers, pause, editing, dialogs and other families do not announce', () => {
  for (const options of [
    { repeat: true },
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { defaultPrevented: true },
    ...['INPUT', 'TEXTAREA', 'SELECT', 'SUMMARY'].map((tagName) => ({ target: { tagName } })),
  ]) {
    const p = player();
    assert.equal(!!p.press(options).defaultPrevented, !!options.defaultPrevented);
    assert.equal(p.region.innerHTML, '');
  }
  for (const setup of [
    (p) => (p.ctx.paused = true),
    (p) => (p.ctx.updateRequested = true),
    (p) => (p.dialog.open = true),
    (p) => (p.ctx.current.puzzle.type = 'binary'),
    (p) => (p.ctx.current = null),
  ]) {
    const p = player();
    setup(p);
    assert.equal(!!p.press().defaultPrevented, false);
    assert.equal(p.region.innerHTML, '');
  }
});

test('Read clues action shares the announcement and preserves button focus and state', async () => {
  const p = player(),
    button = { dataset: { action: 'read-clues' } },
    before = JSON.stringify(p.ctx.current);
  p.ctx.document.activeElement = button;
  await p.ctx.handleAction(button, {});
  assert.equal(p.region.innerHTML, `<div class="toast ">${example}</div>`);
  assert.equal(p.ctx.document.activeElement, button);
  assert.equal(p.ctx.selectedCell, 11);
  assert.equal(JSON.stringify(p.ctx.current), before);
});

test('only Picture logic controls expose Read clues and its shortcut', () => {
  const p = player();
  const html = p.ctx.controls(p.ctx.current.puzzle, p.ctx.current.state);
  assert.match(
    html,
    /data-action="read-clues"[^>]*aria-keyshortcuts="C"[^>]*>Read clues<\/button>/,
  );
  assert.match(html, /C reads clues/);
  for (const type of ['tents', 'lightup'])
    assert.doesNotMatch(p.ctx.controls({ type }, {}), /read-clues|C reads clues/);
});

test('toast announcements use the existing polite status region', () => {
  const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
  assert.match(html, /id="toasts"[^>]*role="status"[^>]*aria-live="polite"/);
});
