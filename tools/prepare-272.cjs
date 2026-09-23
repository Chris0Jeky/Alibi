'use strict';
const fs = require('node:fs'), assert = require('node:assert/strict'), crypto = require('node:crypto');
function read(path, expected) {
  const source = fs.readFileSync(path, 'utf8');
  if (expected) assert.equal(crypto.createHash('sha1').update('blob ' + Buffer.byteLength(source) + '\0').update(source).digest('hex'), expected, path);
  return source;
}
function replace(source, before, after) {
  assert.equal(source.split(before).length, 2, before);
  return source.replace(before, () => after);
}
let app = read('src/app.js', 'bc6ceda30715bd6c43fb836cfe7cb1b0fd3c0a73');
const marker = app.indexOf("      const mark = e.target.closest?.('[data-action=\"mark\"][data-cell]');");
const start = app.lastIndexOf('    if (', marker), end = app.indexOf('    const d = { ArrowLeft:', marker);
assert.ok(marker > 0 && start > 0 && end > marker);
app = app.slice(0, start) + app.slice(end);
app = replace(app, "    if (t === 'dossier')\n      return '<p class=\"control-note\">Arrow keys move within the current evidence table. Enter cycles a mark; Tab reaches the other controls.</p>';\n", '');
app = replace(app, 'Arrow keys move between accounts; Enter cycles a mark.', 'Arrows move focus; Enter marks.');
app = replace(app, 'Use both category tabs.</p>', 'Use both category tabs. Arrows move focus; Enter marks.</p>');
const anchor = "    const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -p.size, ArrowDown: p.size }[e.key];";
app = replace(app, anchor, anchor + `
    if (d && ['dossier', 'witness'].includes(p.type)) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const marks = [...document.querySelectorAll('.board-card [data-action="mark"]')],
        index = marks.indexOf(e.target.closest?.('[data-action="mark"]')),
        n = p.type === 'dossier' ? p.size : 1,
        step = n === 1 ? (d < 0 ? -1 : 1) : d;
      if (index < 0 || marks[index].disabled) return;
      let next = index + step;
      if (next < 0 || next >= marks.length ||
          (Math.abs(step) < n && Math.floor(next / n) !== Math.floor(index / n)))
        next = index;
      e.preventDefault();
      selectedCell = Number(marks[next].dataset.cell);
      marks[next].focus();
      return;
    }`);
fs.writeFileSync('src/app.js', app);
let presentation = read('src/presentation.js', 'f193b4c04fb0fb5894f9373be8bb5a66c21bf05d');
for (const name of ['help', 'chevron', 'volume', 'compass']) {
  const pattern = new RegExp('^    ' + name + ': [^\\n]+\\n', 'm');
  assert.ok(pattern.test(presentation), name);
  presentation = presentation.replace(pattern, '');
}
fs.writeFileSync('src/presentation.js', presentation);
let test = read('tests/mark-grid-navigation.test.cjs');
test = replace(test, '  let handler;', `  let handler;
  const offset = type === 'dossier' ? tab * 9 : 0;
  const marks = Array.from({ length: type === 'dossier' ? 9 : 5 }, (_, i) => {
    const target = {
      tagName: 'BUTTON', disabled: false, dataset: { cell: String(offset + i) },
      focus: () => focused.push('mark-' + (offset + i)),
    };
    target.closest = () => target;
    return target;
  });`);
test = replace(test, '      addEventListener: (_type, fn) => (handler = fn),', '      addEventListener: (_type, fn) => (handler = fn),\n      querySelectorAll: () => marks,');
test = replace(test, "      const target = {\n        tagName:", "      const target = marks.find(mark => Number(mark.dataset.cell) === index) || {\n        tagName:");
test += `\n\ntest('Dossier keyboard guidance retains every existing marking tool', () => {
  const start = source.indexOf('  function controls(p, s) {');
  const end = source.indexOf('  function evidence(p, s) {', start);
  assert.ok(start >= 0 && end > start);
  const context = {
    brush: 'cycle',
    AlibiClub: { assistance: () => 'off' },
    tool: (label, action) => '<button data-action="' + action + '">' + label + '</button>',
  };
  vm.runInNewContext(source.slice(start, end) + '; result = controls({type:"dossier"}, {});', context);
  for (const label of ['Yes', 'No', 'Cycle', 'Erase'])
    assert.ok(context.result.includes('>' + label + '</button>'), label);
});\n`;
fs.writeFileSync('tests/mark-grid-navigation.test.cjs', test);
let helper = read('tests/mark_grid_cases.py');
helper = replace(helper, "    size = puzzle['size']\n", "    size = puzzle['size']\n    if dossier:\n        for name in ['Yes', 'No', 'Cycle', 'Erase']:\n            expect(page.locator('.controls').get_by_role('button', name=name, exact=True)).to_be_visible()\n        page.locator('.controls').get_by_role('button', name='Cycle', exact=True).click()\n");
fs.writeFileSync('tests/mark_grid_cases.py', helper);
let state = read('docs/STATE.md');
state = replace(state, 'Four focused handler tests', 'Five focused handler tests');
state = replace(state, 'The shared browser helper runs in the existing UI suite.', 'The shared browser helper runs in the existing UI suite and asserts that Yes/No/Cycle/Erase remain usable. Four unused UI icon paths are removed to keep the new navigation inside the unchanged JavaScript budget; the theatre compass emblem is independent and retained.');
fs.writeFileSync('docs/STATE.md', state);
