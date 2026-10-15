const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(path.join(root, 'dist/assets'));
const js = fs.readFileSync(
  path.join(
    root,
    'dist/assets',
    files.find((f) => /^alibi\..*\.js$/.test(f)),
  ),
  'utf8',
);
const content = fs.readFileSync(
  path.join(
    root,
    'dist/assets',
    files.find((f) => /^official-content\..*\.js$/.test(f)),
  ),
  'utf8',
);
const config = {};
// Execute only the generated official-data script in an isolated realm, never app code.
require('node:vm').runInNewContext(content, config, { timeout: 2000 });
assert.ok(config.ALIBI_THEATRE, 'official data installs theatre before the application');
assert.ok(config.ALIBI_CURATION, 'official data installs curation before the application');
// The unchanged application metadata retains named static JSON assignments.
for (const [name, source] of [
  ['ALIBI_CURATION_MEDIA', js],
  ['ALIBI_MEDIA', js],
]) {
  const assignment = source.match(new RegExp('globalThis\\.' + name + '=(.*);\\n'));
  assert.ok(assignment, name + ' has a static emitted assignment');
  config[name] = JSON.parse(assignment[1]);
}
assert.ok(js.includes('globalThis.ALIBI_DELIVERY=globalThis.ALIBI_CURATION.delivery;'));
config.ALIBI_DELIVERY = config.ALIBI_CURATION.delivery;
test('editorial theatre data is loaded before its consumer and fully counted', () => {
  const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json')));
  const zlib = require('node:zlib');
  assert.ok(!js.includes('globalThis.ALIBI_THEATRE='));
  const dataIndex = html.indexOf('src="./assets/official-content.');
  const codeIndex = html.indexOf('src="./assets/alibi.');
  assert.ok(dataIndex >= 0 && codeIndex > dataIndex);
  // Registry-deferred definitions are official content too, delivered after startup.
  assert.equal(
    info.officialContentBytes,
    Buffer.byteLength(content) + info.deferredContentBytes + info.curationMediaBytes,
  );
  assert.equal(info.officialContentGzipBytes, zlib.gzipSync(content).length);
  assert.equal(
    info.initialCodeAndContentGzipBytes,
    zlib.gzipSync(js).length +
      zlib.gzipSync(content).length +
      info.blockMotionLoaderGzipBytes +
      info.bootGzipBytes +
      info.platformGzipBytes,
  );
});
test('recorded ambience is traceable, compact and excluded from the automatic shell download', () => {
  const crypto = require('node:crypto');
  const catalogue = require('../assets-source/ambience/catalogue.json');
  const sw = fs.readFileSync(path.join(root, 'dist/sw.js'), 'utf8');
  assert.deepEqual(
    catalogue.assets.map((a) => a.id),
    ['rain', 'waves'],
  );
  let bytes = 0;
  for (const a of catalogue.assets) {
    const file = fs.readFileSync(path.join(root, a.file));
    assert.equal(crypto.createHash('sha256').update(file).digest('hex'), a.sha256);
    assert.equal(a.license, 'CC0-1.0');
    assert.ok(a.duration > 8);
    bytes += file.length;
    const emitted = config.ALIBI_THEATRE.audio.find((item) => item.id === a.id);
    assert.ok(emitted && !sw.includes(emitted.url), 'play gesture downloads optional recording');
    assert.deepEqual(fs.readFileSync(path.join(root, 'dist', emitted.url)), file);
  }
  assert.ok(bytes < 250 * 1024);
  const source = fs.readFileSync(path.join(root, 'src/theatre.js'), 'utf8');
  assert.ok(
    !/createOscillator|createBufferSource|AudioContext/.test(source),
    'no synthetic fallback or unsolicited game tones',
  );
});
test('every game family and Quiet Wing route has a complete offline room and existing optional media', () => {
  const theatre = config.ALIBI_THEATRE;
  assert.equal(theatre.scenes.length, 8);
  const types = new Set(
    JSON.parse(fs.readFileSync(path.join(root, 'content/catalog.json'))).puzzles.map((p) => p.type),
  );
  for (const scene of theatre.scenes) {
    const url = (scene.curation ? config.ALIBI_CURATION_MEDIA : config.ALIBI_MEDIA)[scene.art];
    assert.ok(
      url && fs.statSync(path.join(root, 'dist', url)).size > 1000,
      scene.id + ' complete local artwork',
    );
    assert.ok(scene.notes.length === 3 && scene.notes.every((n) => n >= 100 && n <= 600));
    assert.ok(
      theatre.audio.some(
        (a) => a.id === scene.ambience && a.loop && fs.existsSync(path.join(root, 'dist', a.url)),
      ),
    );
    if (scene.detail) assert.ok(config.ALIBI_DELIVERY[scene.detail], scene.id + ' approved detail');
    for (const type of scene.families) types.delete(type);
  }
  assert.deepEqual([...types], [], 'all thirteen actual family identities have mood coverage');
  for (const route of [
    'realm',
    'pets',
    'garden',
    'classics',
    'challenges',
    'gallery',
    'journal',
    'folio',
    'city',
    'calm',
  ])
    assert.ok(
      theatre.scenes.some((s) => s.quiet.includes(route)),
      route,
    );
  assert.equal(theatre.films.length, 4);
  for (const film of theatre.films)
    assert.ok(film.duration > 0 && fs.existsSync(path.join(root, 'dist', film.url)));
  const standalone = fs.readFileSync(path.join(root, 'alibi-deluxe-play.html'), 'utf8');
  assert.ok(
    standalone.includes('"audio":[],"films":[]'),
    'single-file edition makes no missing-media promises',
  );
});
test('the quiet room bar stays off castle pages, where its link would leave the castle', () => {
  const realm = {
    ALIBI_THEATRE: config.ALIBI_THEATRE,
    location: { hash: '#/quiet/journal' },
    document: { addEventListener() {} },
    addEventListener() {},
  };
  require('node:vm').runInNewContext(
    fs.readFileSync(path.join(root, 'src/theatre.js'), 'utf8'),
    realm,
    { timeout: 2000 },
  );
  assert.match(realm.AlibiTheatre.bar(true), /id="quiet-room-choice" href="#\/home"/);
  for (const hash of ['#/quiet/castle', '#/quiet/castle/map', '#/quiet/castle/room/library']) {
    realm.location.hash = hash;
    assert.equal(realm.AlibiTheatre.bar(true), '', hash);
    assert.match(realm.AlibiTheatre.bar(), /Room settings/, 'non-quiet bars are unchanged');
  }
  realm.location.hash = '#/quiet/castles';
  assert.match(realm.AlibiTheatre.bar(true), /quiet-room-choice/);
});

// The two pins below have no indirect coverage: no earlier test in this file calls
// escape() or choose() (the castle-guard test only exercises bar()'s hash check).
function theatreRealm({ scenes, storedChoice, hero, casebooks, delivery, media } = {}) {
  const store = new Map();
  if (storedChoice !== undefined) store.set('alibi-room', storedChoice);
  const realm = {
    ALIBI_THEATRE: { scenes, audio: [], films: [] },
    ALIBI_CASEBOOKS: casebooks || [],
    ALIBI_DELIVERY: delivery,
    ALIBI_MEDIA: media,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    },
    location: { hash: '#/home' },
    document: {
      addEventListener() {},
      querySelector: (sel) =>
        sel === '[data-theatre-story]' && hero ? { dataset: { theatreStory: hero } } : null,
    },
    addEventListener() {},
  };
  require('node:vm').runInNewContext(
    fs.readFileSync(path.join(root, 'src/theatre.js'), 'utf8'),
    realm,
    { timeout: 2000 },
  );
  return realm.AlibiTheatre;
}

test('escape() HTML-escapes scene titles, credits and sources in room strings', () => {
  const theatre = theatreRealm({
    scenes: [
      {
        id: 'reading-room',
        title: 'Storm <script>alert("room")</script> & friends',
        subtitle: 'Soft \'rain\' & "thunder" <low>',
        motif: 'book',
        motion: 'rain',
        families: [],
        quiet: [],
        art: 'poison-art',
        detail: 'poison-detail',
      },
    ],
    delivery: {
      mode: () => 'auto',
      'poison-detail': {
        credit: 'Curator <b>bold</b> & co',
        source: 'https://example.invalid/c?x=1&y=<z>',
      },
    },
    media: { 'poison-art': 'https://example.invalid/a?x=1&y="big"' },
  });
  for (const html of [theatre.room(), theatre.bar()]) {
    assert.ok(!html.includes('<script>'), 'a broken escape must fail, not render raw markup');
    assert.ok(html.includes('&lt;script&gt;'), 'the scene title is entity-escaped');
    assert.ok(html.includes('&amp;'), 'ampersands are escaped');
  }
  const html = theatre.room();
  assert.ok(html.includes('&quot;room&quot;'), 'double quotes are escaped');
  assert.ok(html.includes('&#39;rain&#39;'), 'single quotes are escaped');
  assert.ok(html.includes('&lt;low&gt;'), 'the subtitle is escaped');
  assert.ok(!html.includes('<b>bold</b>'), 'a broken credit escape must fail');
  assert.ok(html.includes('&lt;b&gt;bold&lt;/b&gt; &amp; co'), 'the credit is escaped');
  assert.ok(!html.includes('y=<z>'), 'a broken source escape must fail');
  assert.ok(html.includes('x=1&amp;y=&lt;z&gt;'), 'the credit source is escaped');
  assert.ok(html.includes('y=&quot;big&quot;'), 'the artwork source is escaped');
});

test('choose() follows the pinned, hero, casebook, wing and family precedence', () => {
  const scenes = [
    { id: 'reading-room', families: [], quiet: [] },
    { id: 'harbour', families: [], quiet: [] },
    { id: 'glasshouse', families: [], quiet: [] },
    { id: 'briar-house', families: [], quiet: [] },
    { id: 'hero-room', families: [], quiet: [] },
    { id: 'book-room', families: [], quiet: [] },
    { id: 'quiet-nook', families: [], quiet: ['journal'] },
    { id: 'family-room', families: ['sudoku'], quiet: [] },
  ];
  const id = (options, r, puzzle) => theatreRealm({ scenes, ...options }).choose(r, puzzle).id;
  assert.equal(
    id({ storedChoice: 'family-room', hero: 'hero-room' }, { page: 'home' }),
    'family-room',
    'a pinned room beats the hero story',
  );
  assert.equal(
    id({ hero: 'hero-room' }, { page: 'home' }),
    'hero-room',
    'home follows the hero story',
  );
  assert.equal(
    id({ hero: 'missing-room' }, { page: 'home', id: 'sudoku' }),
    'family-room',
    'an unknown hero story is ignored',
  );
  assert.equal(
    id({ hero: 'hero-room' }, { page: 'play', id: 'sudoku' }),
    'family-room',
    'the hero story only applies at home',
  );
  assert.equal(
    id({ casebooks: [{ id: 'case-1', artwork: 'book-room' }] }, { page: 'play', book: 'case-1' }),
    'book-room',
    'a casebook artwork match wins',
  );
  assert.equal(
    id(
      { casebooks: [{ id: 'case-9', artwork: 'missing-room' }] },
      { page: 'play', book: 'case-9', id: 'case-9' },
    ),
    'reading-room',
    'an unknown artwork falls through',
  );
  assert.equal(
    id({}, { page: 'quiet', id: 'journal' }),
    'quiet-nook',
    'quiet pages use the wing room',
  );
  assert.equal(
    id({}, { page: 'quiet', id: 'unmapped' }),
    'reading-room',
    'quiet pages without a match fall back',
  );
  assert.equal(id({}, { page: 'lab' }), 'harbour', 'the lab uses the harbour');
  assert.equal(id({}, { page: 'play', id: 'borough' }), 'harbour', 'the borough uses the harbour');
  assert.equal(id({}, { page: 'play', id: 'duel' }), 'glasshouse', 'duels use the glasshouse');
  assert.equal(
    id({}, { page: 'play', id: 'archive' }),
    'briar-house',
    'the archive uses Briar House',
  );
  assert.equal(
    id({}, { page: 'play', id: 'unrelated' }, { type: 'sudoku' }),
    'family-room',
    'the puzzle family decides otherwise',
  );
  assert.equal(
    id({}, { page: 'play', id: 'unrelated' }),
    'reading-room',
    'unknown routes rest in the reading room',
  );
});

test('desk attribution links keep a 24px target, their href and a visible focus ring', () => {
  const css = fs.readFileSync(path.join(root, 'src/theatre.css'), 'utf8');
  const rule = css.match(
    /\.theatre-stage \[data-adaptive-credit\],\s*\.club-hero \[data-adaptive-credit\] \{([^}]*)\}/,
  );
  assert.ok(rule, 'the shared credit rule still covers the desk hero and the stage');
  const minHeight = rule[1].match(/min-height:\s*(\d+)px/);
  assert.ok(minHeight && Number(minHeight[1]) >= 24, 'credit target is at least 24px tall');
  assert.ok(/display:\s*flex/.test(rule[1]), 'min-height applies to the credit box');
  assert.match(
    css,
    /\[data-adaptive-credit\]\[hidden\] \{[^}]*display:\s*none/,
    'pre-enhancement credits stay hidden once display is set',
  );
  assert.match(
    fs.readFileSync(path.join(root, 'src/app.css'), 'utf8'),
    /a:focus-visible \{[^}]*outline:\s*3px solid #[0-9a-f]{6}/,
    'keyboard focus keeps the shared visible ring over the artwork',
  );
  assert.ok(
    !/\[data-adaptive-credit\][^{]*\{[^}]*outline:\s*(none|0)/.test(css),
    'no credit rule suppresses the focus ring',
  );
  const theatre = theatreRealm({
    scenes: [
      {
        id: 'reading-room',
        title: 'Reading room',
        subtitle: 'A quiet corner',
        motif: 'book',
        motion: 'rain',
        families: [],
        quiet: [],
        art: 'room-art',
        detail: 'room-detail',
      },
    ],
    delivery: { 'room-detail': { credit: 'Photo source', source: 'https://example.invalid/p' } },
    media: { 'room-art': 'art.png' },
  });
  assert.match(
    theatre.room(),
    /<a data-adaptive-credit hidden href="https:\/\/example\.invalid\/p" target="_blank" rel="noopener noreferrer">Photo source<\/a>/,
    'the stage credit stays a real link to its source',
  );
  assert.match(
    fs.readFileSync(path.join(root, 'src/club.js'), 'utf8'),
    /<a data-adaptive-credit hidden href="\$\{esc\(root\.ALIBI_DELIVERY\?.*\?\.source\)\}" target="_blank" rel="noopener noreferrer">/,
    'the desk hero credit stays a real link to its source',
  );
});
