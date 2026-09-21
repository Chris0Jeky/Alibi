'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');

function metaContent(html, key, value) {
  for (const match of html.matchAll(/<meta\s+([^>]+)>/gis)) {
    const attributes = Object.fromEntries(
      [...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((attribute) => [
        attribute[1],
        attribute[2],
      ]),
    );
    if (attributes[key] === value) return attributes.content;
  }
  return null;
}

test('public page descriptions use expansion-safe current copy', () => {
  const html = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
  const description = metaContent(html, 'name', 'description');
  assert.equal(
    description,
    'A thoughtful collection of 300+ mystery, logic and visual puzzles. Thirteen ways to think, original casebooks, offline play and your own puzzle workshop.',
  );
  assert.equal(metaContent(html, 'property', 'og:description'), description);
  assert.equal(metaContent(html, 'name', 'twitter:description'), description);
  assert.equal(metaContent(html, 'property', 'og:title'), 'Alibi · After hours at the puzzle club');
  assert.equal(
    metaContent(html, 'name', 'twitter:title'),
    'Alibi · After hours at the puzzle club',
  );
});

test('install metadata retains the exact build-time catalogue count', () => {
  const registry = JSON.parse(
    fs.readFileSync(path.join(root, 'content/official-packs.json'), 'utf8'),
  );
  const puzzleCount = registry.packs.reduce((count, relativePath) => {
    const pack = JSON.parse(fs.readFileSync(path.join(root, 'content', relativePath), 'utf8'));
    return count + pack.puzzles.length;
  }, 0);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'dist/manifest.webmanifest'), 'utf8'),
  );
  assert.equal(
    manifest.description,
    `${puzzleCount} original mystery, logic and visual puzzles. Offline play and a puzzle workshop.`,
  );
});
