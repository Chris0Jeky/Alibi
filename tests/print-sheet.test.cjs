'use strict';
// #830: the play route prints a clean pen-and-paper sheet. Source-level contract; the printed
// layout, page count and DOM are proven by tests/browser_print_sheet.py.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'src/app.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');

// Split a selector list on top-level commas only (commas inside :not()/:is() stay together).
function selectors(list) {
  const out = [];
  let depth = 0,
    start = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === '(') depth++;
    else if (list[i] === ')') depth--;
    else if (list[i] === ',' && depth === 0) {
      out.push(list.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(list.slice(start).trim());
  return out;
}

const printStart = css.indexOf('@media print {');
assert.ok(printStart > 0, 'src/app.css has an @media print block');
const print = css.slice(printStart);
const hideRule = print.match(/([^{}]+)\{\s*display:\s*none\s*!important;\s*\}/);
assert.ok(hideRule, 'the print block hides interface furniture');
const hidden = selectors(hideRule[1]);

test('print stylesheet sets the page and hides the interface by structure', () => {
  assert.match(css, /@page\s*\{\s*margin:\s*12mm;?\s*\}/);
  const chrome = {
    sidebar: '.shell.playing > :not(.main-wrap)',
    'topbar, banners, theatre bar': '.main-wrap > :not(.main)',
    'footer and practice banner': '.main > :not(.play-head, .player-grid)',
    'back and help buttons': '.play-head > :not(.play-title)',
    'evidence column': '.player-grid > :not(.board-column)',
    'play-secondary, accusation, play-end': '.board-column > :not(.board-card)',
    'board heading, instruction, controls, main-tools, feedback':
      '.board-card > :not(.board-wrap, [inert])',
    'paused cover and paused furniture': '[inert] > :not(.board-wrap)',
    'pan and control rows': '.board-wrap :is(.toolrow, .control-note)',
  };
  for (const [what, selector] of Object.entries(chrome))
    assert.ok(
      hidden.some((h) => h.replace(/\s+/g, ' ').endsWith(selector)),
      `${what} is hidden by ${selector}`,
    );
  for (const selector of ['dialog', '.toast-container', '.skip-link'])
    assert.ok(hidden.includes(selector), `${selector} is hidden`);
  assert.match(hideRule[1], /\.play-title :is\(\.save-state, #timer\)/);
});

test('print stylesheet never hides the title, board or clues', () => {
  // The subject (last compound) of every hiding selector must be a :not() complement or a
  // furniture class, never one of the printed containers themselves.
  const kept = [
    '.play-head',
    '.play-title',
    '.player-grid',
    '.board-column',
    '.board-card',
    '.board-wrap',
    '.board-scroll',
    '.grid-shell',
    '.nono-clue',
    '.nono-cell',
    '.axis',
    '.cell',
    '.print-only',
    '.main',
    '.main-wrap',
  ];
  for (const selector of hidden) {
    const subject = selector.split(/\s+/).pop();
    for (const name of kept) assert.notEqual(subject, name, `${selector} must not hide ${name}`);
  }
  assert.match(print, /\.print-only\s*\{\s*display:\s*inline;?\s*\}/, 'print-only shows in print');
  assert.match(
    css,
    /\n\.print-only\s*\{\s*display:\s*none;?\s*\}/,
    'print-only is hidden on screen',
  );
});

test('print renders marks black on white and sizes the board for one page', () => {
  assert.match(print, /--bg:\s*#fff[\s\S]*--ink:\s*#000/);
  assert.match(print, /print-color-adjust:\s*exact/);
  assert.match(print, /\.nono-cell\.filled\s*\{\s*background:\s*#000/);
  assert.match(print, /\.board-wrap\s*\{[^}]*max-width:\s*170mm/);
  assert.match(print, /\.board-scroll\s*\{[^}]*overflow:\s*visible/);
  assert.match(print, /break-inside:\s*avoid/);
});

test('print resets the night theme and clears check tints', () => {
  const shell = print.match(/\.shell\.playing\s*\{[^}]*\}/)[0];
  assert.match(shell, /color-scheme:\s*light/);
  for (const name of ['--green-soft', '--water', '--room-0', '--room-7'])
    assert.match(shell, new RegExp(`${name}: #`), `${name} is reset for paper`);
  assert.match(
    print,
    /:is\(\.scene-cell, \.furniture, \.room-label i, \.tank-code[^)]*\)\s*\{\s*color:\s*#000\s*!important/,
  );
  assert.match(print, /\.light-floor\.lit\s*\{\s*background:\s*#f4e7b8\s*!important/);
  assert.match(
    print,
    /\.cell:is\(\.error, \.selected\):not\(\.light-wall\)\s*\{\s*background:\s*#fff\s*!important/,
  );
  // Axis target tints (met/over) are already cleared by the existing axis rule.
  assert.match(print, /:is\(\.axis, \.nono-clue\)\s*\{[^}]*background:\s*none\s*!important/);
});

test('print draws Lantern walls black with white numbers', () => {
  assert.match(
    print,
    /\.playing \.light-wall\s*\{\s*background:\s*#000\s*!important;\s*color:\s*#fff\s*!important/,
  );
});

test('print keeps the clue list of scenes and Alibi files and drops the rest of the column', () => {
  assert.match(
    print,
    /\.player-grid:has\(\.evidence-list\) > \.evidence-column\s*\{\s*display:\s*block\s*!important/,
  );
  const drop = print.match(/([^{}]*\.evidence-tabs[^{}]*)\{\s*display:\s*none\s*!important/);
  assert.ok(drop, 'tabs and notes are hidden inside the evidence column');
  for (const name of [
    '.play-context',
    '.info-note',
    '.checkbox',
    ':not(.evidence-list, h2, .case-intro)',
  ])
    assert.ok(drop[1].includes(name), `${name} is hidden`);
  // The clue list, its heading and intro are never hidden; Alibi-file grid cells are not buttons to drop.
  assert.doesNotMatch(drop[1], /logic-cell|\.clue(?!-)/);
  assert.match(print, /\.clue \.clue-text\s*\{\s*text-decoration:\s*none/);
});

test('the play head carries a print-only id and revision', () => {
  assert.match(
    js,
    /<span class="print-only">\$\{esc\(p\.id\)\} · revision \$\{p\.revision\}<\/span><\/div><\/div>/,
  );
});

test('no solution value is interpolated into play or board markup', () => {
  for (const name of ['boardCell', 'board', 'boardLegend', 'controls', 'playPageInner']) {
    const from = js.indexOf(`  function ${name}(`);
    assert.ok(from >= 0, `${name} exists`);
    const to = js.indexOf('\n  function ', from + 1);
    assert.doesNotMatch(js.slice(from, to), /solution/i, `${name} never reads the solution`);
  }
});
