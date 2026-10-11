const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/theatre.js'), 'utf8');

const SCENES = [
  { id: 'reading-room', title: 'Reading room', subtitle: 'Quiet', motif: 'book', motion: 'dust', families: [], quiet: ['journal'], art: 'reading' },
];
const AUDIO = [
  { id: 'rain', url: 'assets/rain.ogg', title: 'Rain', loop: true },
  { id: 'waves', url: 'assets/waves.ogg', title: 'Beach waves', loop: true },
];

function createHarness({ seedKeys = [], openThrows = false } = {}) {
  const statusNode = { textContent: '' };
  const button = {
    textContent: 'Room sound off',
    ariaPressed: null,
    closest() {
      return this;
    },
    hasAttribute(name) {
      return name === 'data-theatre-sound';
    },
    setAttribute(name, value) {
      if (name === 'aria-pressed') this.ariaPressed = String(value);
    },
  };
  const handlers = {};
  const document = {
    hidden: false,
    documentElement: { dataset: { reduced: '' } },
    body: {
      dataset: {},
      classList: { contains() { return false; } },
    },
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-theatre-sound-status]') return [statusNode];
      if (selector === '[data-theatre-sound]') return [button];
      return [];
    },
    addEventListener(type, fn) {
      handlers[type] = fn;
    },
  };
  const reducedMotion = {
    matches: false,
    _listener: null,
    addEventListener(_type, fn) {
      this._listener = fn;
    },
    fire() {
      if (this._listener) this._listener();
    },
  };
  const dummyMedia = { matches: false, addEventListener() {} };

  const audios = [];
  let playCalls = 0;
  function MockAudio(url) {
    const self = {
      url,
      paused: false,
      loop: false,
      volume: 1,
      preload: '',
      onplaying: null,
      onerror: null,
      onwaiting: null,
      onstalled: null,
      play() {
        playCalls += 1;
        return Promise.resolve();
      },
      pause() {
        self.paused = true;
      },
      removeAttribute() {},
      load() {},
    };
    audios.push(self);
    return self;
  }

  let keys = seedKeys.map((url) => ({ url }));
  const deleted = [];
  const putUrls = [];
  const fetchUrls = [];
  const caches = {
    open() {
      if (openThrows) throw new Error('cache down');
      return {
        keys: async () => keys.slice(),
        delete: async (key) => {
          deleted.push(key.url);
          keys = keys.filter((k) => k.url !== key.url);
          return true;
        },
        match: async (url) => {
          const hit = keys.find((k) => k.url === url || k.url.endsWith('/' + url));
          return hit ? { ok: true, url: hit.url } : null;
        },
        put: async (url) => {
          putUrls.push(url);
        },
      };
    },
  };
  async function mockFetch(url) {
    fetchUrls.push(url);
    return { ok: true };
  }

  const realm = {
    ALIBI_THEATRE: { scenes: SCENES, audio: AUDIO, films: [] },
    location: { href: 'https://alibi.example/', hash: '#/home' },
    localStorage: { getItem: () => null, setItem: () => {} },
    document,
    addEventListener() {},
    matchMedia(query) {
      if (query === '(prefers-reduced-motion: reduce)') return reducedMotion;
      return dummyMedia;
    },
    caches,
    fetch: mockFetch,
    Audio: MockAudio,
    URL,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(source, realm, { timeout: 2000 });
  return {
    realm,
    statusNode,
    button,
    handlers,
    reducedMotion,
    audios,
    get playCalls() {
      return playCalls;
    },
    deleted,
    putUrls,
    fetchUrls,
    getKeys: () => keys.slice(),
    setOpenThrows(v) {
      openThrows = v;
    },
    click() {
      handlers.click({ target: button });
    },
    flush() {
      return new Promise((resolve) => setTimeout(resolve, 0));
    },
  };
}

test('room sound does not start until the sound control is clicked', () => {
  const h = createHarness();
  assert.equal(h.audios.length, 0);
  assert.equal(h.realm.AlibiTheatre.diagnostics().sound, false);
  assert.equal(h.realm.AlibiTheatre.diagnostics().streamingAudio, false);
});

test('ambience cache keeps only the current recording urls', async () => {
  const h = createHarness({
    seedKeys: ['https://alibi.example/assets/stale.ogg', 'https://alibi.example/assets/rain.ogg'],
  });
  h.click();
  assert.equal(h.audios.length, 1);
  assert.equal(h.playCalls, 1);
  assert.equal(h.audios[0].url, 'assets/rain.ogg');
  assert.equal(h.statusNode.textContent, 'Loading recording…');
  h.audios[0].onplaying();
  await h.flush();
  assert.equal(h.statusNode.textContent, 'Playing rain.');
  assert.equal(h.realm.AlibiTheatre.diagnostics().streamingAudio, true);
  assert.deepEqual(h.deleted, ['https://alibi.example/assets/stale.ogg']);
  assert.ok(h.getKeys().some((k) => k.url === 'https://alibi.example/assets/rain.ogg'));
  assert.equal(h.fetchUrls.length, 0);
});

test('a cache miss is fetched only after playback starts', async () => {
  const h = createHarness({ seedKeys: [] });
  h.click();
  assert.equal(h.playCalls, 1);
  h.audios[0].onplaying();
  await h.flush();
  assert.deepEqual(h.fetchUrls, ['assets/rain.ogg']);
  assert.deepEqual(h.putUrls, ['assets/rain.ogg']);
  assert.equal(h.realm.AlibiTheatre.diagnostics().streamingAudio, true);
});

test('caches.open rejection does not stop playback', async () => {
  const h = createHarness({ openThrows: true });
  h.click();
  h.audios[0].onplaying();
  await h.flush();
  assert.equal(h.playCalls, 1);
  assert.equal(h.realm.AlibiTheatre.diagnostics().sound, true);
  assert.equal(h.realm.AlibiTheatre.diagnostics().streamingAudio, true);
  assert.equal(h.statusNode.textContent, 'Playing rain.');
  assert.deepEqual(h.deleted, []);
});

test('reduced motion clears playback and the status text', async () => {
  const h = createHarness({ seedKeys: ['https://alibi.example/assets/rain.ogg'] });
  h.click();
  h.audios[0].onplaying();
  await h.flush();
  assert.equal(h.statusNode.textContent, 'Playing rain.');
  h.reducedMotion.matches = true;
  h.reducedMotion.fire();
  assert.equal(h.realm.AlibiTheatre.diagnostics().sound, false);
  assert.equal(h.realm.AlibiTheatre.diagnostics().streamingAudio, false);
  assert.equal(h.realm.AlibiTheatre.diagnostics().still, true);
  assert.equal(h.statusNode.textContent, '');
  assert.equal(h.button.ariaPressed, 'false');
  h.click();
  assert.equal(h.audios.length, 1);
  assert.equal(h.realm.AlibiTheatre.diagnostics().sound, false);
  assert.equal(h.realm.AlibiTheatre.diagnostics().streamingAudio, false);
});

test('an ambience change during reduced motion does not start audio', async () => {
  const h = createHarness({ seedKeys: ['https://alibi.example/assets/rain.ogg'] });
  h.click();
  h.audios[0].onplaying();
  await h.flush();
  h.reducedMotion.matches = true;
  h.handlers.change({
    target: {
      value: 'waves',
      matches(sel) {
        return sel === '[data-theatre-ambience]';
      },
    },
  });
  assert.equal(h.realm.AlibiTheatre.diagnostics().ambience, 'waves');
  assert.equal(h.realm.AlibiTheatre.diagnostics().streamingAudio, false);
  assert.equal(h.audios.length, 1);
  assert.equal(h.audios[0].paused, true);
});

test('hiding the document stops sound until a new gesture', async () => {
  const h = createHarness({ seedKeys: ['https://alibi.example/assets/rain.ogg'] });
  h.click();
  h.audios[0].onplaying();
  await h.flush();
  h.realm.document.hidden = true;
  h.handlers.visibilitychange();
  assert.equal(h.realm.AlibiTheatre.diagnostics().sound, false);
  assert.equal(h.realm.AlibiTheatre.diagnostics().streamingAudio, false);
  assert.equal(h.statusNode.textContent, '');
  h.click();
  assert.equal(h.audios.length, 1);
});

test('a quiet route stops sound and does not resume it', async () => {
  const h = createHarness({ seedKeys: ['https://alibi.example/assets/rain.ogg'] });
  h.click();
  h.audios[0].onplaying();
  await h.flush();
  h.realm.AlibiTheatre.attach({ page: 'quiet', id: 'journal' });
  assert.equal(h.audios[0].paused, true);
  assert.equal(h.realm.AlibiTheatre.diagnostics().sound, false);
  assert.equal(h.realm.AlibiTheatre.diagnostics().streamingAudio, false);
  h.realm.AlibiTheatre.attach({ page: 'home', id: 'home' });
  assert.equal(h.audios.length, 1);
  assert.equal(h.realm.AlibiTheatre.diagnostics().sound, false);
});
