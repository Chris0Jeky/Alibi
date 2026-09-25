'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, '..', 'observatory', 'browser.js'), 'utf8');

const STAT_ENDPOINT =
  'https://pulseboard-observatory.commit-atlas.workers.dev/v1/collect-stat/alibi';
const ALIBI_ORIGIN = 'https://alibi-after-hours-preview.commit-atlas.workers.dev';
const PREF_KEY = 'pulseboard:statistics:v1:alibi';
const OLD_PREFIX = 'pulseboard:consent:v1:alibi:';
const HARDCODED_LEGACY = 'https://pulseboard-observatory.commit-atlas.workers.dev/v1/collect/alibi';

function element(tag) {
  const node = {
    tag,
    children: [],
    listeners: {},
    attributes: {},
    textContent: '',
    checked: false,
    append: (...children) => node.children.push(...children),
    appendChild: (child) => node.children.push(child),
    prepend: (...children) => node.children.unshift(...children),
    setAttribute: (name, value) => {
      node.attributes[name] = value;
    },
    addEventListener: (type, listener) => {
      (node.listeners[type] ||= []).push(listener);
    },
    removeEventListener: (type, listener) => {
      node.listeners[type] = (node.listeners[type] || []).filter((item) => item !== listener);
    },
    remove: () => {
      node.removed = true;
    },
    emit: (type, event = {}) => {
      for (const listener of [...(node.listeners[type] || [])]) listener(event);
    },
  };
  return node;
}

function makeStorage(initial = {}, opts = {}) {
  const map = new Map(Object.entries(initial));
  const storage = {
    _map: map,
    getItem(key) {
      if (opts.failGet) throw new Error('storage denied');
      if (opts.wrongReadback && String(key).endsWith(':probe')) return '0';
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      if (opts.failSet) throw new Error('storage denied');
      map.set(key, String(value));
    },
    removeItem(key) {
      if (opts.failRemove) throw new Error('storage denied');
      map.delete(key);
    },
  };
  if (opts.noRemove) delete storage.removeItem;
  return storage;
}

function run({
  initial = {},
  storageOpts = {},
  locationOpts = {},
  navigatorOpts = {},
  standalone = false,
  fetchStatus = 202,
  contextRoute = 'home',
  contextRelease = '0.11.6',
} = {}) {
  const created = [];
  const order = [];
  const fetchCalls = [];
  const windowListeners = {};
  const storage = makeStorage(initial, storageOpts);
  const document = element('document');
  const body = element('body');
  const origPrepend = body.prepend.bind(body);
  const origAppend = body.append.bind(body);
  body.prepend = (...children) => {
    order.push('notice');
    return origPrepend(...children);
  };
  body.append = (...children) => {
    order.push('notice');
    return origAppend(...children);
  };
  body.appendChild = (child) => {
    order.push('notice');
    body.children.push(child);
    return child;
  };
  Object.assign(document, {
    readyState: 'complete',
    body,
    createElement(tag) {
      const node = element(tag);
      created.push(node);
      return node;
    },
    createTextNode: (text) => ({ text }),
  });
  let contextReads = 0;
  const context = {
    document,
    location: {
      origin: ALIBI_ORIGIN,
      protocol: 'https:',
      pathname: '/',
      ...locationOpts,
    },
    navigator: { ...navigatorOpts },
    crypto: webcrypto,
    TextEncoder,
    AbortController,
    Response,
    URL,
    Date,
    // Keep JSON and Object in the VM realm so generated plain-object guards see their own prototype.
    console,
    localStorage: storage,
    fetch: async (url, init) => {
      order.push('network');
      fetchCalls.push({ url, init, body: init && init.body });
      return new Response('{}', { status: fetchStatus });
    },
    setTimeout: () => 1,
    clearTimeout: () => {},
    addEventListener(type, listener) {
      (windowListeners[type] ||= []).push(listener);
    },
    removeEventListener(type, listener) {
      windowListeners[type] = (windowListeners[type] || []).filter((item) => item !== listener);
    },
    emit(type, event = {}) {
      for (const listener of [...(windowListeners[type] || [])]) listener(event);
    },
    ALIBI_CONFIG: { standalone },
    __testRoute: contextRoute,
    __testRelease: contextRelease,
    __markContextRead: () => {
      contextReads += 1;
    },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    'globalThis.ALIBI_OBSERVATORY_CONTEXT = () => { globalThis.__markContextRead(); return { route: globalThis.__testRoute, release: globalThis.__testRelease }; };',
    context,
  );
  vm.runInContext(source, context, { filename: 'observatory/browser.js' });
  return {
    context,
    document,
    storage,
    created,
    order,
    fetchCalls,
    checkbox: created.find((node) => node.type === 'checkbox'),
    details: created.find((node) => node.id === 'pulseboard-usage-sharing'),
    statusEl: created.find((node) => node.attributes && node.attributes.role === 'status'),
    note: created.find(
      (node) => node.tag === 'p' && String(node.textContent || '').includes('Help improve'),
    ),
    contextReads: () => contextReads,
  };
}

function parseBody(call) {
  return JSON.parse(call.body);
}

function assertAggregateBody(body, expectedEvents) {
  assert.equal(body.v, 1);
  assert.ok(Array.isArray(body.counts));
  assert.equal(body.counts.length, expectedEvents.length);
  for (let i = 0; i < body.counts.length; i += 1) {
    const count = body.counts[i];
    assert.deepEqual(Object.keys(count).sort(), ['event', 'n', 'release', 'route']);
    assert.equal(count.event, expectedEvents[i].event);
    assert.equal(count.route, expectedEvents[i].route);
    assert.equal(count.release, expectedEvents[i].release);
    assert.equal(count.n, 1);
  }
  const raw = JSON.stringify(body);
  for (const forbidden of [
    'session',
    'seq',
    'sessionId',
    'id',
    'puzzle',
    'answer',
    'solution',
    'save',
    'content',
    'board',
    'url',
    'href',
  ])
    assert.ok(!raw.includes(`"${forbidden}"`), `aggregate payload must not carry ${forbidden}`);
}

test('default-on: eligible visit mounts an open notice before the first aggregate page.view', async () => {
  const h = run();
  assert.ok(h.details, 'the sharing notice is mounted');
  assert.equal(h.details.id, 'pulseboard-usage-sharing');
  assert.equal(h.details.open, true, 'the notice starts open and visible');
  assert.ok(h.checkbox, 'the notice carries a checkbox');
  assert.equal(h.checkbox.type, 'checkbox');
  assert.equal(h.checkbox.checked, true, 'eligible visits default to sharing on');
  assert.ok(h.statusEl, 'the notice carries a status element');
  assert.match(h.statusEl.textContent, /Sharing is on/);
  assert.ok(h.note, 'the notice explains aggregate counts');
  assert.match(h.note.textContent, /closed event counts/);
  assert.match(h.note.textContent, /No puzzle content/);

  assert.ok(h.order.includes('notice'), 'the notice is mounted');
  assert.ok(h.order.includes('network'), 'the default page.view sends');
  assert.ok(
    h.order.indexOf('notice') < h.order.indexOf('network'),
    'the visible notice precedes the first network send',
  );

  assert.equal(h.fetchCalls.length, 1);
  assert.equal(h.fetchCalls[0].url, STAT_ENDPOINT);
  assert.equal(h.fetchCalls[0].init.method, 'POST');
  assert.equal(h.fetchCalls[0].init.credentials, 'omit');
  assert.equal(h.fetchCalls[0].init.referrerPolicy, 'no-referrer');
  assert.equal(h.fetchCalls[0].init.redirect, 'error');
  assert.equal(h.fetchCalls[0].init.cache, 'no-store');
  assertAggregateBody(parseBody(h.fetchCalls[0]), [
    { event: 'page.view', route: 'home', release: '0.11.6' },
  ]);
  assert.equal(h.contextReads(), 1, 'the consented initial view resolves host context once');
  assert.equal(h.context.PulseboardUsage.status().active, true);
  assert.equal(h.context.PulseboardUsage.status().requests, 1);
});

test('prior new off preference stays off and never reads host context', async () => {
  const h = run({ initial: { [PREF_KEY]: JSON.stringify({ allow: false }) } });
  assert.ok(h.details, 'the notice still mounts when sharing stays off');
  assert.equal(h.details.open, true);
  assert.equal(h.checkbox.checked, false);
  assert.match(h.statusEl.textContent, /Sharing is off/);
  assert.equal(h.fetchCalls.length, 0, 'no request occurs while sharing stays off');
  assert.equal(h.contextReads(), 0);

  let optionReads = 0;
  const options = {};
  Object.defineProperty(options, 'route', {
    get() {
      optionReads += 1;
      return 'home';
    },
  });
  assert.equal(h.context.PulseboardUsage.track('page.view', options), false);
  h.context.emit('error');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(optionReads, 0, 'options are not inspected without active consent');
  assert.equal(h.contextReads(), 0);
  assert.equal(h.fetchCalls.length, 0);
});

test('prior old opt-out stays off', () => {
  const h = run({
    initial: { [OLD_PREFIX + HARDCODED_LEGACY]: JSON.stringify({ allow: false }) },
  });
  assert.equal(h.checkbox.checked, false);
  assert.match(h.statusEl.textContent, /Sharing is off/);
  assert.equal(h.fetchCalls.length, 0);
  assert.equal(h.context.PulseboardUsage.status().active, false);
  assert.equal(h.context.PulseboardUsage.track('page.view'), false);
  assert.equal(h.contextReads(), 0);
});

test('corrupt new preferences fail closed', () => {
  for (const raw of [
    'not-json{',
    JSON.stringify({ allow: true, extra: 1 }),
    JSON.stringify({ allow: 'yes' }),
    JSON.stringify({ allow: false, extra: 1 }),
    JSON.stringify({}),
  ]) {
    const h = run({ initial: { [PREF_KEY]: raw } });
    assert.equal(h.checkbox.checked, false, `corrupt pref ${raw} stays off`);
    assert.equal(h.fetchCalls.length, 0, `corrupt pref ${raw} sends nothing`);
    assert.equal(h.context.PulseboardUsage.status().active, false);
    assert.equal(h.contextReads(), 0);
  }
});

test('storage denial and probe failure fail closed', () => {
  for (const storageOpts of [
    { failSet: true },
    { failGet: true },
    { wrongReadback: true },
    { noRemove: true },
  ]) {
    const h = run({ storageOpts });
    assert.equal(
      h.checkbox ? h.checkbox.checked : false,
      false,
      `unusable storage stays off (${JSON.stringify(storageOpts)})`,
    );
    assert.equal(h.fetchCalls.length, 0);
    assert.equal(h.contextReads(), 0);
    if (h.context.PulseboardUsage) assert.equal(h.context.PulseboardUsage.status().active, false);
  }
});

test('privacy and environment blocks fail closed without an active control', () => {
  const blocked = [
    { navigatorOpts: { globalPrivacyControl: true }, label: 'GPC' },
    { navigatorOpts: { doNotTrack: '1' }, label: 'DNT' },
    { navigatorOpts: { webdriver: true }, label: 'webdriver' },
    { standalone: true, label: 'standalone' },
    {
      locationOpts: { origin: 'https://example.com', protocol: 'https:', pathname: '/' },
      label: 'foreign origin',
    },
    {
      locationOpts: { origin: ALIBI_ORIGIN, protocol: 'http:', pathname: '/' },
      label: 'non-https page',
    },
  ];
  for (const { navigatorOpts = {}, standalone = false, locationOpts = {}, label } of blocked) {
    const h = run({ navigatorOpts, standalone, locationOpts });
    assert.equal(h.context.PulseboardUsage, null, `${label} mounts no adapter`);
    assert.equal(h.fetchCalls.length, 0, `${label} sends nothing`);
    assert.equal(h.contextReads(), 0, `${label} reads no host context`);
  }
});

test('explicit off aborts pending sends and clears the queue; re-on requires persistence', async () => {
  const h = run();
  assert.equal(h.context.PulseboardUsage.status().active, true);
  assert.equal(h.context.PulseboardUsage.track('puzzle.started'), true);
  assert.equal(h.context.PulseboardUsage.status().queued, 1);

  h.checkbox.checked = false;
  h.checkbox.emit('change');
  assert.equal(h.context.PulseboardUsage.status().queued, 0, 'explicit off clears pending sends');
  assert.equal(h.context.PulseboardUsage.status().active, false);
  assert.equal(h.context.PulseboardUsage.track('puzzle.started'), false);
  assert.equal(
    h.storage._map.get(PREF_KEY),
    JSON.stringify({ allow: false }),
    'explicit off persists',
  );

  // A failing store cannot re-enable collection.
  h.storage.setItem = () => {
    throw new Error('storage denied');
  };
  h.checkbox.checked = true;
  h.checkbox.emit('change');
  assert.equal(h.context.PulseboardUsage.status().active, false);
  assert.match(h.statusEl.textContent, /Sharing is off/);

  // Restoring persistence re-enables collection.
  const fresh = run({ initial: { [PREF_KEY]: JSON.stringify({ allow: false }) } });
  assert.equal(fresh.context.PulseboardUsage.status().active, false);
  fresh.checkbox.checked = true;
  fresh.checkbox.emit('change');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fresh.context.PulseboardUsage.status().active, true);
  assert.equal(fresh.storage._map.get(PREF_KEY), JSON.stringify({ allow: true }));
  assert.equal(fresh.fetchCalls.length, 1, 're-on reports one page.view');
  assertAggregateBody(parseBody(fresh.fetchCalls[0]), [
    { event: 'page.view', route: 'home', release: '0.11.6' },
  ]);
});

test('aggregate payloads carry only counts; extra option keys are dropped', async () => {
  const h = run();
  const queued = h.fetchCalls.length;
  assert.equal(
    h.context.PulseboardUsage.track('page.view', {
      route: 'home',
      release: '0.11.6',
      puzzle: 'sudoku-01',
    }),
    false,
    'payloads never accept puzzle identity',
  );
  assert.equal(h.context.PulseboardUsage.status().queued, 0);
  assert.equal(h.fetchCalls.length, queued);

  assert.equal(h.context.PulseboardUsage.track('puzzle.started'), true);
  assert.equal(h.context.PulseboardUsage.track('hint.requested'), true);
  await new Promise((resolve) => setImmediate(resolve));
  await h.context.PulseboardUsage.flush();
  assert.equal(h.fetchCalls.length, queued + 1);
  const body = parseBody(h.fetchCalls[h.fetchCalls.length - 1]);
  assertAggregateBody(body, [
    { event: 'puzzle.started', route: 'home', release: '0.11.6' },
    { event: 'hint.requested', route: 'home', release: '0.11.6' },
  ]);
  assert.ok(!JSON.stringify(body).includes('sudoku'), 'no puzzle IDs leak into the payload');
});
