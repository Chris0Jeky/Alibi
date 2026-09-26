'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { load } = require('../tools/curation-editorial.cjs');
const catalogue = require('../tools/official-catalogue.cjs').load(undefined, false);
test('explicit editorial registry covers 208 puzzles in four standalone anthologies', () => {
  const data = load(path.resolve(__dirname, '..'), catalogue);
  assert.equal(data.entries.length, 208);
  assert.equal(data.collections.length, 4);
  assert.ok(data.collections.every((c) => c.puzzleIds.length === 52));
  for (const n of data.entries) {
    assert.ok(n.difficultyStatus.includes('provisional'));
    assert.ok(!('nativeDeductionTrace' in n));
    assert.ok(!('assets' in n));
    assert.ok(!('hints' in n));
  }
});
const fs = require('node:fs');
const vm = require('node:vm');
test('editorial presentation hides spoilers and never attaches to another revision', () => {
  const data = load(path.resolve(__dirname, '..'), catalogue);
  const ctx = { ALIBI_CURATION: data };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/curation.js'), 'utf8'), ctx);
  const p = catalogue.puzzles.find((p) => p.id === data.entries[0].id);
  assert.ok(!ctx.AlibiCuration.notes(p, false).includes('data-curation-answer'));
  assert.ok(ctx.AlibiCuration.notes(p, true).includes('data-curation-answer'));
  assert.equal(ctx.AlibiCuration.get({ ...p, revision: 2 }), undefined);
  assert.equal(ctx.AlibiCuration.get({ ...p, id: 'imported-puzzle' }), undefined);
  data.entries[0].goal = '<script>bad()</script>';
  assert.ok(ctx.AlibiCuration.notes(p, false).includes('&lt;script&gt;'));
});
const curationSource = fs.readFileSync(path.join(__dirname, '../src/curation.js'), 'utf8');
function loadCuration(config, media) {
  const ctx = { ALIBI_CURATION: config, ALIBI_CURATION_MEDIA: media || {} };
  vm.createContext(ctx);
  vm.runInContext(curationSource, ctx);
  return ctx.AlibiCuration;
}
test('notes returns exactly empty for unknown imported id even when completed', () => {
  const data = load(path.resolve(__dirname, '..'), catalogue);
  const AlibiCuration = loadCuration(data, {});
  const p = catalogue.puzzles.find((q) => q.id === data.entries[0].id);
  const imported = { ...p, id: 'imported-puzzle' };
  assert.equal(AlibiCuration.get(imported), undefined);
  assert.strictEqual(AlibiCuration.notes(imported, false), '');
  assert.strictEqual(AlibiCuration.notes(imported, true), '');
  assert.ok(!AlibiCuration.notes(imported, true).includes('data-curation-answer'));
});
test('notes returns exactly empty for stale revision even when completed', () => {
  const data = load(path.resolve(__dirname, '..'), catalogue);
  const AlibiCuration = loadCuration(data, {});
  const p = catalogue.puzzles.find((q) => q.id === data.entries[0].id);
  const stale = { ...p, revision: p.revision + 1 };
  assert.equal(AlibiCuration.get(stale), undefined);
  assert.strictEqual(AlibiCuration.notes(stale, false), '');
  assert.strictEqual(AlibiCuration.notes(stale, true), '');
  assert.ok(!AlibiCuration.notes(stale, true).includes('data-curation-answer'));
});
test('notes escapes goal, controls, rules, tactic and answer metacharacters with exact entities', () => {
  const config = {
    entries: [
      {
        id: 'esc-probe',
        revision: 7,
        venue: 'salt',
        goal: 'GOAL-&<>"\'',
        controls: 'CONTROLS-&<>"\'',
        rules: ['RULE-&<>"\'', '<script>RULE-TAG</script>'],
        tactic: 'TACTIC-&<>"\'',
        answer: ['ANSWER-&<>"\'', '<b>ANSWER-TAG</b>'],
        difficultyStatus: 'provisional; not calibrated',
      },
    ],
    collections: [
      {
        id: 'salt',
        title: 'The Salt Observatory',
        line: '',
        number: '01',
        puzzleIds: ['esc-probe'],
      },
    ],
  };
  const AlibiCuration = loadCuration(config, {});
  const html = AlibiCuration.notes({ id: 'esc-probe', revision: 7 }, true);
  assert.ok(html.includes('<p>GOAL-&amp;&lt;&gt;&quot;&#39;</p>'));
  assert.ok(html.includes('<p>CONTROLS-&amp;&lt;&gt;&quot;&#39;</p>'));
  assert.ok(html.includes('<li>RULE-&amp;&lt;&gt;&quot;&#39;</li>'));
  assert.ok(html.includes('&lt;script&gt;RULE-TAG&lt;/script&gt;'));
  assert.ok(html.includes('<h3>A general tactic</h3><p>TACTIC-&amp;&lt;&gt;&quot;&#39;</p>'));
  assert.ok(html.includes('<li>ANSWER-&amp;&lt;&gt;&quot;&#39;</li>'));
  assert.ok(html.includes('&lt;b&gt;ANSWER-TAG&lt;/b&gt;'));
  assert.ok(html.includes('<ul data-curation-answer>'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<b>ANSWER-TAG</b>'));
  assert.ok(!html.includes('GOAL-&<>"\''));
});
test('collectionPicker gallery escapes artwork text and attribute fields with exact entities', () => {
  const artId = 'probe-&<>"\'-art';
  const artSource = 'https://example.com/object?a=1&b=<>"\'';
  const artMedia = 'https://cdn.example.com/img?a=1&b=<>"\'';
  const config = {
    entries: [],
    collections: [
      { id: 'salt', title: 'The Salt Observatory', line: '', number: '01', puzzleIds: [] },
    ],
    artwork: [
      {
        id: artId,
        kind: 'museum-image',
        venue: 'salt',
        title: 'TITLE-&<>"\'',
        alt: 'ALT-&<>"\'',
        note: 'NOTE-&<>"\'<script>note</script>',
        credit: 'CREDIT-&<>"\'',
        source: artSource,
      },
    ],
  };
  const media = {};
  media[artId] = artMedia;
  const AlibiCuration = loadCuration(config, media);
  const html = AlibiCuration.collectionPicker('salt');
  assert.ok(html.includes('data-adaptive-image="probe-&amp;&lt;&gt;&quot;&#39;-art"'));
  assert.ok(html.includes('src="https://cdn.example.com/img?a=1&amp;b=&lt;&gt;&quot;&#39;"'));
  assert.ok(html.includes('alt="ALT-&amp;&lt;&gt;&quot;&#39;"'));
  assert.ok(html.includes('<strong>TITLE-&amp;&lt;&gt;&quot;&#39;</strong>'));
  assert.ok(html.includes('<p>NOTE-&amp;&lt;&gt;&quot;&#39;&lt;script&gt;note&lt;/script&gt;</p>'));
  assert.ok(html.includes('CREDIT-&amp;&lt;&gt;&quot;&#39;'));
  assert.ok(html.includes('href="https://example.com/object?a=1&amp;b=&lt;&gt;&quot;&#39;"'));
  assert.ok(!html.includes('<script>note</script>'));
  assert.ok(!html.includes('TITLE-&<>"\''));
});
test('collectionPicker gallery includes museum-image artwork for the selected venue only', () => {
  const data = load(path.resolve(__dirname, '..'), catalogue);
  data.artwork = [
    {
      id: 'salt-art',
      kind: 'museum-image',
      venue: 'salt',
      title: 'Salt Art',
      alt: 'Salt alt',
      note: 'Salt note',
      credit: 'Salt credit',
      source: 'https://example.com/salt',
    },
    {
      id: 'copper-art',
      kind: 'museum-image',
      venue: 'copper',
      title: 'Copper Art',
      alt: 'Copper alt',
      note: 'Copper note',
      credit: 'Copper credit',
      source: 'https://example.com/copper',
    },
    {
      id: 'salt-cover',
      kind: 'venue-cover',
      venue: 'salt',
      title: 'Salt Cover',
      alt: 'Salt cover alt',
      note: 'Salt cover note',
      credit: 'Salt cover credit',
      source: 'https://example.com/salt-cover',
    },
    {
      id: 'salt-icon',
      kind: 'family-icon',
      venue: 'salt',
      title: 'Salt Icon',
      alt: 'Salt icon alt',
      note: 'Salt icon note',
      credit: 'Salt icon credit',
      source: 'https://example.com/salt-icon',
    },
  ];
  const media = {
    'salt-art': './assets/curation-salt-art.webp',
    'copper-art': './assets/curation-copper-art.webp',
    'salt-cover': './assets/curation-salt-cover.svg',
    'salt-icon': './assets/curation-salt-icon.svg',
  };
  const AlibiCuration = loadCuration(data, media);
  const html = AlibiCuration.collectionPicker('salt');
  assert.ok(html.includes('Showing: <strong>The Salt Observatory</strong>'));
  assert.ok(html.includes('data-adaptive-image="salt-art"'));
  assert.ok(!html.includes('data-adaptive-image="copper-art"'));
  assert.ok(!html.includes('data-adaptive-image="salt-cover"'));
  assert.ok(!html.includes('data-adaptive-image="salt-icon"'));
  assert.equal((html.match(/<figure>/g) || []).length, 1);
  assert.equal((html.match(/data-adaptive-image="/g) || []).length, 1);
});
test('collectionPicker gallery with empty selection includes every museum-image but no other kinds', () => {
  const data = load(path.resolve(__dirname, '..'), catalogue);
  data.artwork = [
    {
      id: 'salt-art',
      kind: 'museum-image',
      venue: 'salt',
      title: 'Salt Art',
      alt: 'Salt alt',
      note: 'Salt note',
      credit: 'Salt credit',
      source: 'https://example.com/salt',
    },
    {
      id: 'copper-art',
      kind: 'museum-image',
      venue: 'copper',
      title: 'Copper Art',
      alt: 'Copper alt',
      note: 'Copper note',
      credit: 'Copper credit',
      source: 'https://example.com/copper',
    },
    {
      id: 'salt-cover',
      kind: 'venue-cover',
      venue: 'salt',
      title: 'Salt Cover',
      alt: 'Salt cover alt',
      note: 'Salt cover note',
      credit: 'Salt cover credit',
      source: 'https://example.com/salt-cover',
    },
  ];
  const AlibiCuration = loadCuration(data, {});
  const html = AlibiCuration.collectionPicker('');
  assert.ok(html.includes('data-adaptive-image="salt-art"'));
  assert.ok(html.includes('data-adaptive-image="copper-art"'));
  assert.ok(!html.includes('data-adaptive-image="salt-cover"'));
  assert.equal((html.match(/<figure>/g) || []).length, 2);
});
