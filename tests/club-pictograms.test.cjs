'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const masters = require('../assets-source/library/club-pictograms/pictograms.json');
const { compact } = require('../tools/assets/club-pictograms.cjs');
function ui() {
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'src/presentation.js'), 'utf8'), ctx);
  return ctx.AlibiUI;
}
test('All thirteen families use distinct club masters, including dedicated bridges', () => {
  const presentation = ui();
  const icons = Object.entries(presentation.data).map(([family, meta]) => {
    assert.equal(meta.icon, family);
    const rendered = presentation.icon(meta.icon);
    assert.ok(rendered.includes(compact(masters[family])), family);
    return rendered;
  });
  assert.equal(new Set(icons).size, 13);
});
test('Club icons remain decorative, inherit colour and keep their existing dimensions', () => {
  const presentation = ui();
  for (const name of ['home', 'library', 'bridges', 'castle', 'quiet', 'table', 'plant']) {
    const icon = presentation.icon(name, 'fixture');
    assert.match(icon, /class="icon fixture"/);
    assert.match(icon, /viewBox="0 0 24 24" width="20" height="20"/);
    assert.match(icon, /stroke="currentColor" stroke-width="1.6"/);
    assert.match(icon, /aria-hidden="true"/);
    assert.doesNotMatch(icon, /<title|aria-label|tabindex|<script|on\w+=|href=/i);
  }
  assert.equal(presentation.icon('unrecognised-key'), presentation.icon('sudoku'));
  assert.match(presentation.icon('undo'), /M8 4 3 9l5 5/);
  assert.match(presentation.icon('sun'), /M12 1v2/);
  assert.match(presentation.icon('plant'), new RegExp('^<svg'));
  assert.ok(presentation.icon('plant').includes(compact(masters.seedling)));
});
test('Reproducible standalone exports and runtime fragments match the reviewed source', async () => {
  const generator = require('../tools/assets/club-pictograms.cjs');
  assert.equal(Object.keys(masters).length, 29);
  for (const [name, fragment] of Object.entries(masters)) {
    assert.equal(generator.validate(name, fragment), fragment);
    const actual = fs.readFileSync(
      path.join(root, 'assets-source/library/club-pictograms', name + '.svg'),
      'utf8',
    );
    assert.equal(actual, generator.svg(fragment));
  }
  await generator.sync(root, true);
});
test('Pictogram generator rejects executable SVG, external content and unsafe keys', () => {
  const { validate } = require('../tools/assets/club-pictograms.cjs');
  for (const fragment of [
    '<script>alert(1)</script>',
    '<image href="https://example.com/a"/>',
    '<path onload="alert(1)" d="M1 2"/>',
    '<path fill="url(#remote)" d="M1 2"/>',
    '<foreignObject/>',
    '<path d="M1 2"/>trailing',
  ]) {
    assert.throws(() => validate('fixture', fragment), /Unsafe/);
  }
  assert.throws(() => validate('../escape', '<path d="M1 2"/>'), /Unsafe/);
});
test('Runtime compaction joins only adjacent equally styled open contours', () => {
  assert.equal(compact('<path d="M1 2"/><path d="M3 4"/>'), '<path d="M1 2 M3 4"/>');
  const filled = '<path d="M1 2"/><path d="M3 4" fill="currentColor"/>';
  assert.equal(compact(filled), filled);
});
