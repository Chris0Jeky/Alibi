'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const masters = require('../assets-source/library/club-pictograms/pictograms.json');
// Frozen from d1c56e3 plus the reviewed masters and explicit family aliases before source compaction.
const runtimeBaseline = require('./club-icon-runtime-baseline.json');
function ui() {
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'src/presentation.js'), 'utf8'), ctx);
  return ctx.AlibiUI;
}
function pathTable() {
  const source = fs.readFileSync(path.join(root, 'src/presentation.js'), 'utf8');
  const match = source.match(/  const paths = (\{[\s\S]*?\n  \});/);
  assert.ok(match);
  const helperStart = source.indexOf('  const shape = '),
    helperEnd = source.indexOf('  const paths = ', helperStart);
  assert.ok(helperStart >= 0 && helperEnd > helperStart);
  const shape = source.slice(helperStart, helperEnd);
  return vm.runInNewContext(`(() => { ${shape}; return (${match[1]}); })()`);
}
function fragment(presentation, name) {
  const match = presentation.icon(name).match(/^<svg\b[^>]*>([\s\S]*)<\/svg>$/);
  assert.ok(match, name);
  return match[1];
}
test('All thirteen families use distinct club masters, including dedicated bridges', () => {
  const presentation = ui();
  const icons = Object.entries(presentation.data).map(([family, meta]) => {
    assert.equal(meta.icon, family);
    const rendered = fragment(presentation, meta.icon);
    assert.equal(rendered, masters[family], family);
    return rendered;
  });
  assert.equal(new Set(icons).size, 13);
});
test('Every compiled pictogram keeps its byte-identical runtime SVG fragment', () => {
  const presentation = ui();
  for (const name of Object.keys(pathTable())) {
    if (Object.hasOwn(masters, name))
      assert.equal(fragment(presentation, name), masters[name], name);
  }
  assert.equal(fragment(presentation, 'plant'), masters.seedling);
});
test('All 56 runtime icons match the frozen pre-compaction SVG fragments', () => {
  const presentation = ui();
  assert.equal(Object.keys(runtimeBaseline).length, 56);
  for (const [name, expected] of Object.entries(runtimeBaseline))
    assert.equal(fragment(presentation, name), expected, name);
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
  assert.equal(fragment(presentation, 'plant'), masters.seedling);
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
