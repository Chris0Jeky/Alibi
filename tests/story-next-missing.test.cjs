'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src', 'app.js'), 'utf8');
const chapterStart = app.indexOf('  function nextChapter(b, id) {');
const puzzleStart = app.indexOf('  function nextPuzzle() {', chapterStart);
const lessonStart = app.indexOf('  function startLesson(', puzzleStart);
assert.ok(
  chapterStart >= 0 && puzzleStart > chapterStart && lessonStart > puzzleStart,
  'the real nextChapter/nextPuzzle must be present',
);
const helpers = app.slice(chapterStart, lessonStart);

function harness() {
  const navigations = [];
  const toasts = [];
  const catalogue = [{ id: 'ch-1', revision: 1, type: 'scene' }];
  const records = new Map([['ch-1@1', { firstCompletedAt: '2026-09-01' }]]);
  const context = {
    books: [{ id: 'case-1', chapters: [{ id: 'ch-1' }, { id: 'ch-2' }] }],
    route: { book: 'case-1' },
    current: { puzzle: { id: 'ch-1', revision: 1, type: 'scene' } },
    navigations,
    toasts,
    closeDialog() {},
    toast(message, error) {
      toasts.push({ message, error });
    },
    navigate(page, id, book) {
      navigations.push({ page, id, book });
    },
    keyFor(p) {
      return p.id + '@' + p.revision;
    },
    all() {
      return catalogue;
    },
    find(id) {
      return catalogue.find((p) => p.id === id);
    },
    rec(p) {
      return p ? records.get(p.id + '@' + p.revision) : undefined;
    },
    solved(r) {
      return !!(r?.firstCompletedAt || r?.completedAt);
    },
  };
  vm.createContext(context);
  vm.runInContext(`${helpers};this.nextPuzzle = nextPuzzle;`, context);
  return { context, navigations, toasts };
}

test('missing next-chapter definition does not loop back to the just-finished chapter', () => {
  const h = harness();
  h.context.nextPuzzle();
  assert.ok(h.navigations.length > 0, 'nextPuzzle navigates somewhere');
  for (const n of h.navigations)
    assert.notEqual(n.id, 'ch-1@1', 'must not navigate back to the just-finished chapter');
});

test('missing next-chapter definition toasts and returns to the casebook page', () => {
  const h = harness();
  h.context.nextPuzzle();
  assert.match(h.toasts.map((t) => t.message).join('\n'), /next chapter.*missing/i);
  assert.ok(
    h.toasts.some((t) => t.error),
    'the missing-definition toast is an error',
  );
  assert.ok(
    h.navigations.some((n) => n.page === 'casebooks' && n.id === 'case-1'),
    'navigates to the casebook page',
  );
});
