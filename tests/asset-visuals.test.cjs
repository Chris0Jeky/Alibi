'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const { scenes, glyphs } = require('../tools/assets/visuals.cjs');
const ctx = {};
vm.createContext(ctx);
for (const f of ['asset-library.js', 'quiet-wing/calm.js', 'quiet-wing/engine.js'])
  vm.runInContext(fs.readFileSync(path.join(root, 'src', f), 'utf8'), ctx);

test('Every puzzle family has distinct diagram art without reading answers', () => {
  vm.runInContext(fs.readFileSync(path.join(root, 'src/presentation.js'), 'utf8'), ctx);
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'content/catalog.json')));
  const art = Object.keys(ctx.AlibiUI.data).map((type) => {
    const puzzle = catalog.puzzles.find((p) => p.type === type);
    Object.defineProperty(puzzle, 'solution', {
      get() {
        throw Error('Answer accessed');
      },
    });
    const result = ctx.AlibiUI.art(type, puzzle, 0);
    assert.match(result, /<svg/);
    assert.doesNotMatch(result, /<img|<script|foreignObject/);
    return result;
  });
  assert.equal(new Set(art).size, 13);
});
test('Every real stamp gets a distinct silhouette without changing award logic', () => {
  const actual = ctx.QWEngine.BADGES.map(([id]) => id);
  assert.equal(actual.length, 25);
  assert.equal(Object.keys(glyphs).length, 31);
  assert.equal(new Set(Object.values(glyphs)).size, 31);
  for (const id of actual) {
    const earned = ctx.AlibiAssets.badge(id, true);
    const locked = ctx.AlibiAssets.badge(id, false);
    assert.match(earned, /aria-hidden="true"/);
    assert.notEqual(earned, locked);
    assert.match(locked, /M76 69/); // Visible lock; state never relies on colour alone.
  }
  assert.equal(ctx.AlibiAssets.badge('not-an-award', true), '');
});
test('Highlights reference twelve published puzzles and never read solutions', async () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'content/catalog.json')));
  assert.equal(scenes.length, 12);
  for (const [id] of scenes) {
    assert.ok(catalog.puzzles.some((p) => p.id === id));
    const data = await sharp(path.join(root, 'src/artwork/highlight-' + id + '.webp')).metadata();
    assert.equal(data.width, 320);
    assert.equal(data.height, 240);
    assert.equal(data.format, 'webp');
    const svg = fs.readFileSync(
      path.join(root, 'assets-source/library/visuals/highlight-' + id + '.svg'),
      'utf8',
    );
    assert.doesNotMatch(svg, /<text|<script|foreignObject|https?:\/\/(?!www\.w3\.org)|\bon\w+=/);
  }
  const source = fs.readFileSync(path.join(root, 'tools/assets/visuals.cjs'), 'utf8');
  assert.doesNotMatch(source, /\.solution\b|\[['"]solution['"]\]/);
});
test('Core release precaches the actual highlight bytes, never production masters', () => {
  const dist = path.join(root, 'dist');
  const serviceWorker = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
  for (const [id] of scenes) {
    const name = fs
      .readdirSync(path.join(dist, 'assets'))
      .find((p) => p.startsWith('highlight-' + id + '.'));
    assert.ok(name);
    assert.match(serviceWorker, new RegExp(name.replaceAll('.', '\\.')));
    assert.deepEqual(
      fs.readFileSync(path.join(dist, 'assets', name)),
      fs.readFileSync(path.join(root, 'src/artwork/highlight-' + id + '.webp')),
    );
  }
  assert.doesNotMatch(serviceWorker, /assets-source|\.mp4|\.wav|\.blend/);
});
