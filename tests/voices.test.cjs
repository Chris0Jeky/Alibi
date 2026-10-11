'use strict';
// Voices wiring: the emitted chunk and configuration, eligibility, flush triggers and the
// catalogue's fit with the contract enums. Payloads and delivery: tests/voices-queue.test.cjs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');
const glue = read(root, 'src/voices.js');
const queueSource = read(root, 'src/voices-queue.js');
const info = JSON.parse(read(root, 'build-info.json'));
const assets = fs.readdirSync(path.join(dist, 'assets'));
const PRIMARY = 'https://alibi-after-hours-preview.commit-atlas.workers.dev';
const COLLECTOR = 'https://pulseboard-observatory.commit-atlas.workers.dev';
const sdkConfig = JSON.parse(
  read(root, 'observatory/pulseboard.js').match(/const config = (\{.*\});/)[1],
);

test('the sheet, survey and delivery ship as one deferred chunk in the offline shell', () => {
  const chunks = assets.filter((n) => /^voices\.[0-9a-f]{12}\.js$/.test(n));
  assert.equal(chunks.length, 1);
  const chunk = read(dist, 'assets', chunks[0]);
  assert.equal(Buffer.byteLength(chunk), info.voicesChunkBytes, 'the chunk is reported');
  assert.match(chunk, /AlibiVoicesQueue/);
  assert.match(chunk, /AlibiVoicesSheet/);
  assert.match(chunk, /alibi-taste-1/);
  assert.ok(read(dist, 'sw.js').includes(`"./assets/${chunks[0]}"`), 'the chunk is precached');
  assert.ok(!read(dist, 'index.html').includes(chunks[0]), 'the chunk is not a startup script');
  const app = read(
    dist,
    'assets',
    assets.find((n) => /^alibi\.[0-9a-f]{12}\.js$/.test(n)),
  );
  assert.doesNotMatch(
    app,
    /alibi-taste-1|voices-sheet|AlibiVoicesQueue=/,
    'no form or delivery at startup',
  );
  const config = JSON.parse(app.match(/globalThis\.ALIBI_VOICES=(\{[^\n]*\});\n/)[1]);
  assert.deepEqual(config, {
    origin: PRIMARY,
    collector: COLLECTOR,
    chunk: `./assets/${chunks[0]}`,
  });
  assert.equal(config.origin, sdkConfig.origin, 'the eligible origin is the SDK registered origin');
  assert.equal(config.collector, sdkConfig.collector, 'the collector is the SDK collector');
  assert.match(
    read(dist, '_headers'),
    new RegExp(`connect-src 'self'[^;]* ${COLLECTOR.replace(/\./g, '\\.')}`),
    'the CSP already allows the collector',
  );
});

test('the standalone file carries the chunk inline and no chunk URL', () => {
  const html = read(root, 'alibi-deluxe-play.html');
  assert.match(html, /globalThis\.ALIBI_VOICES=\{[^\n]*"chunk":null\}/);
  assert.match(html, /G\.AlibiVoicesSheet = \{/);
  assert.match(html, /"standalone":true/);
});

test('the application decorates after every render, before focus is restored', () => {
  const app = read(root, 'src/app.js');
  assert.match(
    app,
    /\$\('#app'\)\.innerHTML = shell\([^;]+;\s*globalThis\.AlibiUsageSlot\?\.\(\);\s*globalThis\.AlibiVoices\?\.\(current, records\);/,
  );
  assert.equal(
    app.match(/AlibiVoices/g).length,
    1,
    'one call site, no other Voices code in app.js',
  );
});

// A tiny DOM: enough for the glue's listeners, the chunk loader and a flush trigger.
function page({ origin = PRIMARY, standalone = false, voices, queued = false } = {}) {
  const listeners = { window: {}, document: {} };
  const store = new Map(queued ? [['alibi:voices:queue:v1', '[{"payload":{}}]']] : []);
  const appended = [];
  const document = {
    visibilityState: 'visible',
    head: { append: (el) => appended.push(el) },
    createElement: (tag) => ({ tag, remove() {} }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (type, fn) => (listeners.document[type] ||= []).push(fn),
  };
  const idle = [];
  const context = {
    document,
    location: { origin, hash: '#/home' },
    ALIBI_CONFIG: { standalone, version: '0.15.0' },
    ALIBI_VOICES: voices ?? {
      origin: PRIMARY,
      collector: COLLECTOR,
      chunk: './assets/voices.x.js',
    },
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
  const fire = (target, type) => (listeners[target][type] || []).forEach((fn) => fn({ type }));
  return { context, store, appended, idle, fire };
}

test('only the primary origin with a known collector is eligible to send', () => {
  assert.equal(page().context.AlibiVoices.eligible, true);
  assert.equal(
    page({ origin: 'https://alibi.example-sites.app' }).context.AlibiVoices.eligible,
    false,
    'Sites fallback',
  );
  assert.equal(page({ standalone: true }).context.AlibiVoices.eligible, false, 'standalone file');
  assert.equal(
    page({ origin: 'https://localhost' }).context.AlibiVoices.eligible,
    false,
    'Android preview',
  );
  assert.equal(
    page({ voices: { origin: PRIMARY, collector: '' } }).context.AlibiVoices.eligible,
    false,
    'no collector',
  );
  assert.equal(page({ voices: {} }).context.AlibiVoices.eligible, false);
});

test('loading the glue sends nothing, stores nothing and loads no chunk', () => {
  const h = page();
  assert.equal(h.store.size, 0);
  assert.equal(h.appended.length, 0);
  h.fire('window', 'online');
  h.fire('document', 'visibilitychange');
  assert.equal(h.appended.length, 0, 'an empty queue never loads the chunk');
});

test('waiting messages flush after the first render, on online and when shown again', async () => {
  const h = page({ queued: true });
  let flushes = 0;
  h.context.AlibiVoicesSheet = { flush: () => flushes++ };
  const settle = () => new Promise((r) => setImmediate(r));
  assert.equal(h.idle.length, 0, 'nothing is scheduled before the first render');
  h.context.AlibiVoices(null, new Map());
  h.context.AlibiVoices(null, new Map());
  assert.equal(h.idle.length, 1, 'one idle flush after the first render only');
  h.idle[0]();
  await settle();
  assert.equal(flushes, 1);
  h.fire('window', 'online');
  await settle();
  assert.equal(flushes, 2);
  h.context.document.visibilityState = 'hidden';
  h.fire('document', 'visibilitychange');
  await settle();
  assert.equal(flushes, 2, 'hiding the page does not flush');
  h.context.document.visibilityState = 'visible';
  h.fire('document', 'visibilitychange');
  await settle();
  assert.equal(flushes, 3);
  const other = page({ queued: true, origin: 'https://alibi.example-sites.app' });
  other.context.AlibiVoicesSheet = { flush: () => flushes++ };
  other.fire('window', 'online');
  await settle();
  assert.equal(flushes, 3, 'an ineligible origin never flushes');
});

test('without the chunk loaded, a trigger loads the precached chunk by its URL', () => {
  const h = page({ queued: true });
  h.fire('window', 'online');
  assert.equal(h.appended.length, 1);
  assert.equal(h.appended[0].src, './assets/voices.x.js');
});

test('every official puzzle maps into the contract family and tier enums and subject pattern', () => {
  const context = {};
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(queueSource, context);
  const q = context.AlibiVoicesQueue({ storage: null, uuid: () => null });
  const catalogue = require('../tools/official-catalogue.cjs').partition(root).catalog.puzzles;
  assert.ok(catalogue.length > 400);
  for (const p of catalogue) {
    assert.match(p.id, /^[a-z0-9][a-z0-9-]{0,63}$/, p.id);
    assert.ok(q.FAMILIES.includes(p.type), `${p.id} family ${p.type}`);
    assert.ok(q.TIERS.includes(String(p.difficulty).toLowerCase()), `${p.id} tier ${p.difficulty}`);
  }
});

test('a loaded chunk flushes on every trigger, even with nothing in storage (memory queue)', async () => {
  const h = page();
  let flushes = 0;
  h.context.AlibiVoicesSheet = { flush: () => flushes++ };
  h.fire('window', 'online');
  h.fire('document', 'visibilitychange');
  assert.equal(flushes, 2);
  assert.equal(h.appended.length, 0, 'no chunk load is needed');
});

const sheetSource = read(root, 'src/voices-sheet.js');

// The pins below have no indirect coverage: no earlier test in this file loads
// src/voices-sheet.js (where deliver/route/tap live) or calls decorate() — the render
// test above only matches the call site in src/app.js. The harnesses reuse the same
// vm-and-stub style as page(), extended only with the elements each target reads.
function sheetPage({ hash = '#/home', online = true, queued = null, replies = [] } = {}) {
  const listeners = { document: {} };
  const store = new Map();
  if (queued) store.set('alibi:voices:queue:v1', JSON.stringify(queued));
  const calls = { fetch: [] };
  const dialog = {
    open: false,
    innerHTML: '',
    listeners: {},
    addEventListener(type, fn) {
      (this.listeners[type] ||= []).push(fn);
    },
    setAttribute() {},
    showModal() {
      this.open = true;
    },
    close() {
      this.open = false;
    },
    querySelector: () => null,
  };
  const titleStub = { focus() {} };
  const context = {
    innerWidth: 500,
    location: { origin: PRIMARY, hash },
    navigator: { onLine: online },
    ALIBI_CONFIG: { standalone: false, version: '0.15.0' },
    ALIBI_VOICES: { origin: PRIMARY, collector: COLLECTOR, chunk: './assets/voices.x.js' },
    ALIBI_CATALOG: { puzzles: [{ id: 'scene-01', type: 'scene', difficulty: 'Gentle' }] },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
    fetch: async (...args) => {
      calls.fetch.push(args);
      const reply = replies.length ? replies.shift() : 202;
      if (reply === 'network') throw new TypeError('Failed to fetch');
      return { status: reply, headers: { get: () => null } };
    },
    setTimeout,
    clearTimeout,
    document: {
      head: { append() {} },
      body: { append() {} },
      activeElement: null,
      createElement: (tag) => (tag === 'dialog' ? dialog : {}),
      querySelector: (sel) => (sel === '#vo-title' ? titleStub : null),
      querySelectorAll: () => [],
      addEventListener: (type, fn) => (listeners.document[type] ||= []).push(fn),
    },
    addEventListener() {},
  };
  const voices = (...args) => voices.calls.push(args);
  voices.calls = [];
  voices.eligible = true;
  voices.run = { puzzle: { id: 'scene-01' } };
  voices.records = new Map();
  voices.official = () => ({ subject: 'scene-01', family: 'scene', tier: 'gentle' });
  context.AlibiVoices = voices;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(queueSource, context, { filename: 'voices-queue.js' });
  vm.runInContext(sheetSource, context, { filename: 'voices-sheet.js' });
  const fire = (type, event) => (listeners.document[type] || []).forEach((fn) => fn(event));
  return { context, store, calls, dialog, fire };
}

test('route() maps the location hash to the contract route vocabulary', () => {
  const h = sheetPage();
  const sheet = h.context.AlibiVoicesSheet;
  const vocabulary = ['home', 'puzzle', 'castle', 'quiet-wing', 'games', 'settings', 'other'];
  const screen = (hash) => {
    h.context.location.hash = hash;
    sheet.open('bug', '');
    const match = h.dialog.innerHTML.match(/this screen \(([a-z-]+)\)/);
    assert.ok(match, `the form names its screen for ${hash}`);
    return match[1];
  };
  const seen = {};
  const check = (hash, want) => {
    seen[hash] = screen(hash);
    assert.equal(seen[hash], want, hash);
  };
  check('#/home', 'home');
  check('#/', 'home');
  check('#/play/sudoku-01', 'puzzle');
  check('#/story/scene-01', 'puzzle');
  check('#/quiet/castle', 'castle');
  check('#/quiet/castle/map', 'castle');
  check('#/quiet/journal', 'quiet-wing');
  check('#/quiet/garden', 'quiet-wing');
  check('#/salon', 'games');
  check('#/club/night', 'games');
  check('#/lab/bridges', 'games');
  check('#/settings', 'settings');
  check('#/privacy', 'settings');
  check('#/workshop', 'other');
  check('#/casebooks', 'other');
  assert.deepEqual(
    [...new Set(Object.values(seen))].sort(),
    [...vocabulary].sort(),
    'every route is contract vocabulary (the queue ROUTES enum)',
  );
});

test('deliver() reports sent only for a 202, refused for a 400, waiting otherwise', async () => {
  const source = read(root, 'src/voices-sheet.js');
  assert.match(source, /async function deliver\(payload\)/, 'deliver() exists');
  assert.match(
    source,
    /await Promise\.race\(\[Q\.flush\(\), new Promise\(\(r\) => setTimeout\(r, 4e3\)\)\]/,
    'a four-second race bounds the flush',
  );
  assert.match(
    source,
    /return status === 202 \? 1 : status === 400 \? 3 : 2;/,
    '202 is sent, 400 is refused, anything else is waiting',
  );
  // Behaviour under that mapping: the queue outcome deliver() reads only records a real
  // collector answer, so anything but a 202 can never become "sent".
  const h = sheetPage();
  let n = 100;
  const data = new Map();
  const storage = {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
  let status = 202;
  const queue = h.context.AlibiVoicesQueue({
    storage,
    uuid: () => `00000000-0000-4000-8000-${String(n++).padStart(12, '0')}`,
    collector: COLLECTOR,
    online: () => true,
    fetch: async () => ({ status, headers: { get: () => null } }),
  });
  const note = (text) =>
    queue.feedback({
      kind: 'bug',
      route: 'home',
      subject: '',
      text,
      release: '0.15.0',
      device: 'mobile',
    });
  const first = note('first');
  assert.ok(first);
  assert.equal(queue.enqueue(first), true);
  await queue.flush();
  assert.equal(queue.outcome(first), 202, 'a 202 is the only sent answer');
  const second = note('second');
  queue.enqueue(second);
  status = 400;
  await queue.flush();
  assert.equal(queue.outcome(second), 400, 'a 400 is refused');
  const third = note('third');
  queue.enqueue(third);
  status = 500;
  await queue.flush();
  assert.equal(queue.outcome(third), undefined, 'anything else is still waiting, never sent');
});

function decorateHarness(runId = 'scene-01', standalone = false) {
  const listeners = { window: {}, document: {} };
  const store = new Map();
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
  const sheet = {
    flush() {},
    'vo-rate': (el) => filled.push(['vo-rate', el]),
    'vo-offer': (el) => filled.push(['vo-offer', el]),
    'vo-panel': (el) => filled.push(['vo-panel', el]),
    'vo-privacy': (el) => filled.push(['vo-privacy', el]),
  };
  const document = {
    visibilityState: 'visible',
    head: { append: () => {} },
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
    location: { origin: PRIMARY, hash: '#/play/scene-01' },
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
  const run = { puzzle: { id: runId } };
  const render = () => context.AlibiVoices(run, new Map());
  return { inserted, filled, voEls, idle, render };
}

test('decorate() injects the Feedback and report buttons with every slot after each render', () => {
  const h = decorateHarness();
  h.render();
  const open = h.inserted.find((i) => i.html.includes('vo-open'));
  assert.ok(open, 'a Feedback button is injected');
  assert.match(open.html, /data-voice="open"/);
  assert.match(open.html, /aria-label="Feedback"/);
  assert.equal(open.where, 'beforebegin');
  const report = h.inserted.find((i) => i.html.includes('vo-report'));
  assert.ok(report, 'a puzzle report button is injected');
  assert.match(report.html, /Report a problem with this puzzle/);
  assert.equal(report.where, 'beforeend');
  assert.deepEqual(
    h.filled.map(([slot]) => slot).sort(),
    ['vo-offer', 'vo-panel', 'vo-privacy', 'vo-rate'],
    'rating, survey and panel slots are all filled',
  );
  const first = [...h.voEls];
  assert.equal(first.length, 4);
  h.render();
  assert.ok(
    first.every((el) => el.removed),
    'a new render removes the previous places first',
  );
  assert.equal(h.filled.length, 8, 'a new render fills every slot again');
  assert.equal(h.idle.length, 1, 'one idle kick after the first render only');
});

test('decorate() adds no rating or survey places to a standalone official completion', () => {
  const h = decorateHarness('scene-01', true);
  h.render();
  assert.deepEqual(h.filled.map(([slot]) => slot).sort(), ['vo-panel', 'vo-privacy']);
  assert.ok(h.inserted.every((i) => !i.html.includes('vo-rate') && !i.html.includes('vo-offer')));
});

test('decorate() only offers rating and survey places on official completion screens', () => {
  const h = decorateHarness('not-a-puzzle');
  h.render();
  assert.ok(
    h.inserted.some((i) => i.html.includes('vo-open')),
    'Feedback stays available',
  );
  assert.ok(
    h.inserted.some((i) => i.html.includes('vo-report')),
    'reporting stays available',
  );
  assert.deepEqual(
    h.filled.map(([slot]) => slot).sort(),
    ['vo-panel', 'vo-privacy'],
    'no rating row or survey invitation off official screens',
  );
});

function ratingRow() {
  const statusEl = { textContent: '' };
  const makeButton = (act, value) => {
    const button = {
      dataset: { voAct: act, value },
      active: null,
      pressed: null,
      classList: {
        toggle: (name, on) => {
          button.active = on;
        },
      },
      setAttribute: (name, val) => {
        button.pressed = val;
      },
    };
    return button;
  };
  const difficulty = ['too-easy', 'just-right', 'too-hard'].map((value) =>
    makeButton('rate', value),
  );
  const more = makeButton('more', 'yes');
  const row = { querySelector: () => statusEl, querySelectorAll: () => [...difficulty, more] };
  const click = (h, act, value) =>
    h.fire('click', {
      target: { closest: () => ({ dataset: { voAct: act, value }, closest: () => row }) },
    });
  return { statusEl, difficulty, more, click };
}

const settleSheet = async (h) => {
  await h.context.AlibiVoicesSheet.flush();
  for (let i = 0; i < 25; i++) await new Promise((r) => setImmediate(r));
};

test('tap() keeps rating state locally and sends it once it has a difficulty', async () => {
  const h = sheetPage();
  const row = ratingRow();
  const rated = () => JSON.parse(h.store.get('alibi:voices:state:v1') || '{}').rated || {};
  const [tooEasy, justRight, tooHard] = row.difficulty;
  row.click(h, 'more', 'yes');
  assert.equal(row.statusEl.textContent, 'Choose how it felt to send this.');
  assert.deepEqual(rated()['scene-01'], { more: 'yes' }, 'a difficulty-free tap is kept, not sent');
  assert.equal(h.calls.fetch.length, 0);
  row.click(h, 'rate', 'just-right');
  await settleSheet(h);
  assert.equal(row.statusEl.textContent, 'Thanks, sent.');
  assert.deepEqual(rated()['scene-01'], { difficulty: 'just-right', more: 'yes' });
  assert.equal(h.calls.fetch.length, 1);
  assert.equal(justRight.active, true);
  assert.equal(justRight.pressed, true);
  assert.equal(tooEasy.active, false);
  assert.equal(tooHard.pressed, false);
  assert.equal(row.more.active, true);
  row.click(h, 'rate', 'just-right');
  await settleSheet(h);
  assert.equal(h.calls.fetch.length, 1, 'repeating the same tap sends nothing new');
  row.click(h, 'more', 'yes');
  await settleSheet(h);
  assert.deepEqual(
    rated()['scene-01'],
    { difficulty: 'just-right' },
    'More toggles off, rating stays',
  );
  assert.equal(row.more.active, false);
  assert.equal(row.statusEl.textContent, 'Thanks, sent.');
  assert.equal(h.calls.fetch.length, 2);
});

test('tap() reports a refused or waiting delivery without ever claiming it was sent', async () => {
  const row = ratingRow();
  const refused = sheetPage({ replies: [400] });
  row.click(refused, 'rate', 'just-right');
  await settleSheet(refused);
  assert.equal(row.statusEl.textContent, 'Not sent.');
  assert.deepEqual(
    JSON.parse(refused.store.get('alibi:voices:state:v1')).rated['scene-01'],
    { difficulty: 'just-right' },
    'a refused tap is still kept locally',
  );
  const offline = sheetPage({ online: false });
  row.click(offline, 'rate', 'too-hard');
  await settleSheet(offline);
  assert.equal(row.statusEl.textContent, 'Saved. It sends when online.');
  assert.equal(offline.calls.fetch.length, 0, 'an offline tap makes no attempt');
  assert.deepEqual(
    JSON.parse(offline.store.get('alibi:voices:state:v1')).rated['scene-01'],
    { difficulty: 'too-hard' },
    'a waiting tap is still kept locally',
  );
});

test('tap() forgets an unqueued choice so the same tap can retry', async () => {
  const queued = Array.from({ length: 20 }, (_, i) => ({
    payload: { id: `queued-${i}`, text: 'waiting' },
    attempts: 0,
    next: 0,
    queued: Date.now(),
  }));
  const h = sheetPage({ queued });
  const row = ratingRow();
  row.click(h, 'rate', 'just-right');
  assert.equal(row.statusEl.textContent, 'Not sent. Try again later.');
  assert.equal(h.store.has('alibi:voices:state:v1'), false, 'an unqueued choice is not remembered');
  h.store.delete('alibi:voices:queue:v1');
  row.click(h, 'rate', 'just-right');
  await settleSheet(h);
  assert.equal(row.statusEl.textContent, 'Thanks, sent.');
  assert.deepEqual(
    JSON.parse(h.store.get('alibi:voices:state:v1')).rated['scene-01'],
    { difficulty: 'just-right' },
    'the same tap retries once room is free',
  );
});
