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
