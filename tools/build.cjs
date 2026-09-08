/* Reproducible zero-dependency build and ZIP creation, using Node's standard library. */
'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  zlib = require('node:zlib');
const ROOT = path.resolve(__dirname, '..'),
  SRC = path.join(ROOT, 'src'),
  DIST = path.join(ROOT, 'dist'),
  VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const read = (p) => fs.readFileSync(p, 'utf8'),
  hash = (x) => crypto.createHash('sha256').update(x).digest('hex').slice(0, 12),
  write = (p, x) => {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, x);
  };
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]))
    .sort();
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(b) {
  let c = 0xffffffff;
  for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zip(entries, out) {
  let offset = 0;
  const chunks = [],
    central = [];
  for (const [name, data] of entries) {
    const n = Buffer.from(name),
      b = Buffer.isBuffer(data) ? data : Buffer.from(data),
      compressed = zlib.deflateRawSync(b, { level: 9 }),
      crc = crc32(b),
      local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0x2121, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(b.length, 22);
    local.writeUInt16LE(n.length, 26);
    chunks.push(local, n, compressed);
    const ce = Buffer.alloc(46);
    ce.writeUInt32LE(0x02014b50);
    ce.writeUInt16LE(20, 4);
    ce.writeUInt16LE(20, 6);
    ce.writeUInt16LE(0x800, 8);
    ce.writeUInt16LE(8, 10);
    ce.writeUInt16LE(0x2121, 14);
    ce.writeUInt32LE(crc, 16);
    ce.writeUInt32LE(compressed.length, 20);
    ce.writeUInt32LE(b.length, 24);
    ce.writeUInt16LE(n.length, 28);
    ce.writeUInt32LE(offset, 42);
    central.push(ce, n);
    offset += local.length + n.length + compressed.length;
  }
  const cd = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  write(out, Buffer.concat([...chunks, cd, end]));
}
function build() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  const catalog = JSON.parse(read(path.join(ROOT, 'content/catalog.json'))),
    books = JSON.parse(read(path.join(ROOT, 'content/casebooks.json'))),
    core = read(path.join(SRC, 'core.js')),
    engines = read(path.join(SRC, 'engines.js')),
    bridges = read(path.join(SRC, 'bridges.js')),
    worker = [
      core,
      engines,
      bridges,
      read(path.join(SRC, 'backup-validation.js')),
      read(path.join(SRC, 'club-engines.js')),
      ...['calm.js', 'engine.js', 'storage.js'].map((f) => read(path.join(SRC, 'quiet-wing', f))),
      `globalThis.ALIBI_CATALOG=${JSON.stringify({ puzzles: catalog.puzzles.map((p) => ({ id: p.id })) })};`,
      read(path.join(SRC, 'validator-worker.js')),
    ].join('\n'),
    css =
      read(path.join(SRC, 'app.css')) +
      '\n' +
      read(path.join(SRC, 'cabinet.css')) +
      '\n' +
      read(path.join(SRC, 'expedition.css')) +
      '\n' +
      read(path.join(SRC, 'club.css')) +
      '\n' +
      read(path.join(SRC, 'atmosphere.css')),
    template = read(path.join(SRC, 'index.html'));
  const media = {},
    inlineMedia = {};
  for (const p of files(path.join(SRC, 'artwork'))) {
    const data = fs.readFileSync(p),
      name = path.parse(p).name;
    media[name] = `./assets/${name}.${hash(data)}${path.extname(p)}`;
    inlineMedia[name] = `data:image/webp;base64,${data.toString('base64')}`;
    write(path.join(DIST, media[name]), data);
  }
  // A single small editorial invitation belongs to the core; the full folio remains optional.
  const readingRoom = fs.readFileSync(
    path.join(ROOT, 'assets-source/library/editorial/reading-room.webp'),
  );
  media['club-reading-room'] = `./assets/club-reading-room.${hash(readingRoom)}.webp`;
  inlineMedia['club-reading-room'] = 'data:image/webp;base64,' + readingRoom.toString('base64');
  write(path.join(DIST, media['club-reading-room']), readingRoom);
  const experience = require('./build-experience.cjs')(ROOT, DIST);
  const quiet = require('./build-quiet.cjs')(ROOT, DIST, media, inlineMedia, experience);
  const clubEngine = read(path.join(SRC, 'club-engines.js')),
    engineURL = `./assets/club-engines.${hash(clubEngine)}.js`,
    workerURL = `./assets/validator.${hash(worker)}.js`,
    boot = read(path.join(SRC, 'boot.js')),
    bootURL = `./assets/boot.${hash(boot)}.js`;
  write(path.join(DIST, bootURL), boot);
  write(path.join(DIST, engineURL), clubEngine);
  write(path.join(DIST, workerURL), worker);
  const base =
    `globalThis.ALIBI_CATALOG=${JSON.stringify(catalog)};\nglobalThis.ALIBI_CASEBOOKS=${JSON.stringify(books)};\n` +
    [
      core,
      engines,
      bridges,
      read(path.join(SRC, 'storage.js')),
      read(path.join(SRC, 'presentation.js')),
      read(path.join(SRC, 'asset-library.js')),
      read(path.join(SRC, 'insights.js')),
      read(path.join(SRC, 'assist.js')),
      read(path.join(SRC, 'atlas.js')),
      read(path.join(SRC, 'atmosphere.js')),
      read(path.join(SRC, 'backup-validation.js')),
      read(path.join(SRC, 'club.js')),
      read(path.join(SRC, 'activities.js')),
      read(path.join(SRC, 'app.js')),
    ].join('\n');
  const fingerprint = files(path.join(SRC, 'icons'))
      .map((p) => hash(fs.readFileSync(p)))
      .join(''),
    release = hash(
      base +
        boot +
        worker +
        clubEngine +
        css +
        VERSION +
        template +
        read(__filename) +
        fingerprint +
        JSON.stringify(media) +
        JSON.stringify(quiet.config),
    ),
    cfg = { version: VERSION, build: release, standalone: false };
  const js =
      `globalThis.ALIBI_CONFIG=${JSON.stringify(cfg)};\nglobalThis.ALIBI_QUIET_CONFIG=${JSON.stringify(quiet.config)};\nglobalThis.ALIBI_MEDIA=${JSON.stringify(media)};\nglobalThis.ALIBI_WORKER_URL=${JSON.stringify(workerURL)};\nglobalThis.ALIBI_CLUB_CONFIG=${JSON.stringify({ engine: engineURL, apiBase: '' })};\n` +
      require('esbuild').transformSync(base, { minify: true, target: 'es2022' }).code,
    jsName = `assets/alibi.${hash(js)}.js`,
    cssName = `assets/alibi.${hash(css)}.css`;
  write(path.join(DIST, jsName), js);
  write(path.join(DIST, cssName), css);
  for (const p of files(path.join(SRC, 'icons')))
    write(path.join(DIST, 'icons', path.basename(p)), fs.readFileSync(p));
  const manifest = {
    id: './',
    name: 'Alibi · A little room to think',
    short_name: 'Alibi',
    description: `${catalog.puzzles.length} original mystery, logic and visual puzzles. Offline play and a puzzle workshop.`,
    lang: 'en',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f5f4ef',
    theme_color: '#294937',
    categories: ['games', 'entertainment'],
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Continue playing', short_name: 'Your desk', url: './#/home' },
      { name: 'Mystery casebooks', short_name: 'Casebooks', url: './#/casebooks' },
    ],
  };
  write(path.join(DIST, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));
  const head = `<link rel="manifest" href="./manifest.webmanifest"><link rel="icon" href="./icons/icon-192.png"><link rel="apple-touch-icon" href="./icons/icon-192.png"><link rel="stylesheet" href="./${cssName}">`;
  write(
    path.join(DIST, 'index.html'),
    template
      .replace('<!-- HEAD -->', head)
      .replace(
        '<!-- SCRIPTS -->',
        `<script src="${bootURL}" defer></script><script src="./${jsName}" defer></script>`,
      ),
  );
  const assets = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable.png',
    './' + jsName,
    './' + cssName,
    engineURL,
    bootURL,
    workerURL,
    ...Object.values(media),
  ];
  const sw = `/* One coherent offline release. Save data lives in IndexedDB, never this cache. */
const BUILD=${JSON.stringify(release)},PREFIX='alibi-shell-',CACHE=PREFIX+BUILD,SHELL=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(CACHE);try{await c.addAll(SHELL.map(url=>new Request(url,{cache:'reload'})));}catch(error){await caches.delete(CACHE);throw error;}})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=(await caches.keys()).filter(k=>k.startsWith(PREFIX)),keep=new Set([CACHE,...keys.filter(k=>k!==CACHE).slice(-1)]);await Promise.all(keys.filter(k=>!keep.has(k)).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{const r=event.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin||(u.pathname.endsWith('/sw.js')||u.pathname.startsWith('/api/')))return;event.respondWith((async()=>{const c=await caches.open(CACHE);if(/^quiet-wing-sources(?:\\.[a-f0-9]{12})?\\.html$/.test(u.pathname.slice(self.registration.scope.replace(self.location.origin,'').length)))return await caches.match(r)||fetch(r);if(r.mode==='navigate')return await c.match(new URL('./',self.registration.scope).href)||fetch(r);const hit=await c.match(r);if(hit)return hit;if(u.pathname.includes('/assets/')){const prior=await caches.match(r);if(prior)return prior;}return fetch(r);})());});
`;
  write(path.join(DIST, 'sw.js'), sw);
  write(
    path.join(DIST, '_headers'),
    `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
/manifest.webmanifest
  Cache-Control: no-cache
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`,
  );
  write(
    path.join(DIST, '404.html'),
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Alibi · No clue here</title><body><main style="font-family:system-ui;max-width:480px;margin:15vh auto;padding:24px"><h1>This clue leads nowhere.</h1><p><a href="/">Return to Alibi</a></p></main></body></html>',
  );
  const standalone = `globalThis.ALIBI_QUIET_CONFIG=${JSON.stringify(quiet.standalone)};\nglobalThis.ALIBI_CONFIG=${JSON.stringify({ ...cfg, standalone: true })};\nglobalThis.ALIBI_MEDIA=${JSON.stringify(inlineMedia)};\nglobalThis.ALIBI_WORKER_SOURCE=${JSON.stringify(worker)};\nglobalThis.ALIBI_CLUB_CONFIG=${JSON.stringify({ engineSource: clubEngine, apiBase: '' })};\n${base}`;
  write(
    path.join(ROOT, 'alibi-deluxe-play.html'),
    template
      .replace('<!-- HEAD -->', () => '<style>' + css + '</style>')
      .replace(
        '<!-- SCRIPTS -->',
        () =>
          '<script>' + boot + '\n' + standalone.replace(/<\/script/gi, '<\\/script') + '</script>',
      ),
  );
  zip(
    files(DIST).map((p) => [path.relative(DIST, p).split(path.sep).join('/'), fs.readFileSync(p)]),
    path.join(ROOT, 'alibi-deluxe-cloudflare.zip'),
  );
  const info = {
    version: VERSION,
    build: release,
    puzzles: catalog.puzzles.length,
    types: new Set(catalog.puzzles.map((p) => p.type)).size,
    casebooks: books.length,
    files: files(DIST).length,
    uncompressedBytes: files(DIST).reduce((n, p) => n + fs.statSync(p).size, 0),
    quietWingBytes: quiet.bytes,
    experienceBytes: experience.bytes,
    experienceOfflineBytes: experience.manifest.bytes,
    coreOfflineBytes:
      files(DIST).reduce((n, p) => n + fs.statSync(p).size, 0) - quiet.bytes - experience.bytes,
    javascriptGzipBytes: zlib.gzipSync(js).length,
    uploadZipBytes: fs.statSync(path.join(ROOT, 'alibi-deluxe-cloudflare.zip')).size,
  };
  write(path.join(ROOT, 'build-info.json'), JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info, null, 2));
}
if (require.main === module) build();
module.exports = { build, zip, files };
