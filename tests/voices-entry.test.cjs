'use strict';
// Voices entry-gate pinning: off the primary origin/standalone nothing is sent.
// decorate() adds no rating/survey places when ineligible, never flushes, and
// official() yields no subject for unknown puzzle ids (src/voices.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const glue = fs.readFileSync(path.join(root, 'src/voices.js'), 'utf8');

const PRIMARY = 'https://alibi-after-hours-preview.commit-atlas.workers.dev';
const COLLECTOR = 'https://pulseboard-observatory.commit-atlas.workers.dev';

// Minimal render surface the glue reads: buttons, completion end, panels.
function entryPage({ standalone = true, origin = PRIMARY } = {}) {
  const listeners = { window: {}, document: {} };
  const store = new Map();
  const appended = [];
  const inserted = [];
  const voEls = [];
  const track = (name, where, html) => {
    inserted.push({ name, where, html });
    const match = html.match(/<section id="([^"]+)" data-vo><\/section>/);
    if (match) {
      const el = {
        id: match[1],
        removed: false,
        remove() {
          this.removed = true;
        },
      };
      voEls.push(el);
    }
  };
  const anchor = (name) => ({ name, insertAdjacentHTML: (w, html) => track(name, w, html) });
  const topActions = { lastElementChild: anchor('top-actions-tail') };
  const playSecondary = anchor('play-secondary');
  const playEnd = {
    querySelector: () => anchor('play-end-p'),
    insertAdjacentHTML: (where, html) => track('play-end', where, html),
  };
  const settingsGrid = { children: [anchor('settings-first'), anchor('settings-second')] };
  const privacyH2 = {
    textContent: 'Data removal.',
    insertAdjacentHTML: (where, html) => track('privacy-h2', where, html),
  };
  const slotStubs = { 'vo-rate': {}, 'vo-offer': {}, 'vo-panel': {}, 'vo-privacy': {} };
  const filled = [];
  let flushes = 0;
  const sheet = {
    flush() {
      flushes += 1;
    },
    'vo-rate': (el) => filled.push(['vo-rate', el]),
    'vo-offer': (el) => filled.push(['vo-offer', el]),
    'vo-panel': (el) => filled.push(['vo-panel', el]),
    'vo-privacy': (el) => filled.push(['vo-privacy', el]),
  };
  const document = {
    visibilityState: 'visible',
    head: { append: (el) => appended.push(el) },
    createElement: () => ({ remove() {} }),
    querySelector: (sel) => {
      if (sel === '.top-actions') return topActions;
      if (sel === '.play-secondary') return playSecondary;
      if (sel === '.play-end') return playEnd;
      if (sel === '.settings-grid') return settingsGrid;
      return slotStubs[sel.slice(1)] || null;
    },
    querySelectorAll: (sel) => {
      if (sel === '[data-vo]') return voEls;
      if (sel === '.privacy-copy h2') return [privacyH2];
      return [];
    },
    addEventListener: (type, fn) => (listeners.document[type] ||= []).push(fn),
  };
  const idle = [];
  const context = {
    document,
    location: { origin, hash: '#/play/scene-01' },
    ALIBI_CONFIG: { standalone, version: '0.15.0' },
    ALIBI_VOICES: { origin: PRIMARY, collector: COLLECTOR, chunk: './assets/voices.x.js' },
    ALIBI_CATALOG: { puzzles: [{ id: 'scene-01', type: 'scene', difficulty: 'Gentle' }] },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    },
    addEventListener: (type, fn) => (listeners.window[type] ||= []).push(fn),
    requestIdleCallback: (fn) => idle.push(fn),
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(glue, context, { filename: 'voices.js' });
  context.AlibiVoicesSheet = sheet;
  const fire = (target, type) => (listeners[target][type] || []).forEach((fn) => fn({ type }));
  const flushCount = () => flushes;
  return { context, inserted, filled, idle, fire, appended, flushCount };
}

test('ineligible-origin-sends-nothing: standalone decorate adds no rate/offer and never flushes', async () => {
  const h = entryPage({ standalone: true });
  assert.equal(h.context.AlibiVoices.eligible, false);
  const settle = () => new Promise((r) => setImmediate(r));
  h.context.AlibiVoices({ puzzle: { id: 'scene-01' } }, new Map());
  for (const kick of h.idle) kick();
  await settle();
  h.fire('window', 'online');
  await settle();
  h.fire('document', 'visibilitychange');
  await settle();
  assert.ok(
    h.inserted.some((i) => i.html.includes('vo-open')),
    'Feedback stays available off the primary origin',
  );
  assert.equal(
    h.filled.filter(([slot]) => slot === 'vo-rate' || slot === 'vo-offer').length,
    0,
    'no vo-rate/vo-offer slots are added when ineligible',
  );
  assert.ok(
    h.inserted.every((i) => !i.html.includes('vo-rate') && !i.html.includes('vo-offer')),
    'no vo-rate/vo-offer markup is inserted when ineligible',
  );
  assert.equal(h.flushCount(), 0, 'flush is never called when ineligible');
});

test('official() returns falsy for unknown ids', () => {
  const h = entryPage({ standalone: true });
  assert.ok(h.context.AlibiVoices.official({ puzzle: { id: 'scene-01' } }), 'known id has a subject');
  assert.ok(!h.context.AlibiVoices.official({ puzzle: { id: 'not-a-puzzle' } }), 'unknown id');
  assert.ok(!h.context.AlibiVoices.official({ puzzle: { id: '' } }), 'empty id');
  assert.ok(!h.context.AlibiVoices.official({}), 'missing puzzle');
  assert.ok(!h.context.AlibiVoices.official(null), 'missing run');
});
