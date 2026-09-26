/* Reproducible static build. Tooling dependencies never become runtime network dependencies. */
'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  zlib = require('node:zlib');
const {
  browserBundle,
  sourceIdentity,
  payloadDigest,
  writeIdentity,
  sha256,
} = require('./platform-identity.cjs');
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
/* Extensionless shared paths (/privacy, /about, /login) must resolve on a first
visit, before any service worker controls the page. Hosts serve the static
404-page for those paths, so the client-side path normalization in src/boot.js
never runs. These tiny redirect documents bridge that gap: unknown addresses
still land on 404.html, while each known alias forwards to its hash route.
Both the `<alias>.html` and `<alias>/index.html` forms are emitted because
static hosts differ on which convention answers an extensionless request.
The alias documents carry no directory-relative subresources, so they are
also the answer for service-worker-controlled navigations: the cached root
shell would resolve its `./assets/` URLs against the alias directory base
and fail to boot (issue #244). */
const PATH_ROUTE_ALIASES = { __proto__: null, privacy: 'privacy', about: 'about', login: 'login' };
function pathRouteAliasScript(target) {
  // Runs before the no-JavaScript meta refresh below can fire: drop the
  // refresh, then forward to the explicit fragment when one is present so a
  // shared `/about/#/library` address keeps its route. An outer query merges
  // into an existing fragment query with `&` instead of corrupting it.
  return `document.querySelector('meta[http-equiv="refresh"]').remove();var h=location.hash||'#/${target}',q=location.search;if(q)h+=(h.indexOf('?')>=0?'&':'?')+q.slice(1);location.replace('/'+h);`;
}
function pathRouteAliasDocument(alias, target) {
  const hash = `#/${target}`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="refresh" content="0;url=/${hash}"><title>Alibi · ${alias}</title><body><main style="font-family:system-ui;max-width:480px;margin:15vh auto;padding:24px"><p><a href="/${hash}">Continue to Alibi</a></p></main><script>${pathRouteAliasScript(target)}</script></body></html>`;
}
function pathRouteAliasCspHashes() {
  // The global Content-Security-Policy blocks inline scripts, which would
  // leave only the query-dropping meta refresh. Hash-allowlist the exact
  // redirect scripts instead of relaxing script-src (issue #244).
  return Object.values(PATH_ROUTE_ALIASES).map(
    (target) =>
      `'sha256-${crypto.createHash('sha256').update(pathRouteAliasScript(target)).digest('base64')}'`,
  );
}
function writePathRouteAliases(dist) {
  for (const alias of Object.keys(PATH_ROUTE_ALIASES)) {
    const document = pathRouteAliasDocument(alias, PATH_ROUTE_ALIASES[alias]);
    write(path.join(dist, `${alias}.html`), document);
    write(path.join(dist, alias, 'index.html'), document);
  }
}
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
  const source = sourceIdentity(ROOT);
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  const platformSource = browserBundle(
    ROOT,
    process.env.ALIBI_PLATFORM_ENTRY || 'src/platform/browser-entry.mjs',
  );
  const platformURL = `./assets/alibi-platform.${hash(platformSource)}.js`;
  write(path.join(DIST, platformURL), platformSource);
  const castleValidation = require('esbuild').buildSync({
    entryPoints: [path.join(SRC, 'castle/validation-entry.mjs')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2022',
    write: false,
  }).outputFiles[0].text;
  const officialParts = require('./official-catalogue.cjs').partition(ROOT),
    catalog = officialParts.catalog,
    books = JSON.parse(read(path.join(ROOT, 'content/casebooks.json'))),
    core = read(path.join(SRC, 'core.js')),
    engines = read(path.join(SRC, 'engines.js')),
    bridges = read(path.join(SRC, 'bridges.js')),
    workerSource = [
      core,
      engines,
      bridges,
      read(path.join(SRC, 'backup-validation.js')),
      read(path.join(SRC, 'club-engines.js')),
      ...['calm.js', 'engine.js', 'storage.js'].map((f) => read(path.join(SRC, 'quiet-wing', f))),
      `globalThis.ALIBI_CHALLENGE_DATA=${JSON.stringify(require('./challenge-catalogue.cjs').validation(require('./challenge-catalogue.cjs').load(ROOT)))};`,
      read(path.join(SRC, 'challenges.js')),
      castleValidation,
      `globalThis.ALIBI_CATALOG=${JSON.stringify({ puzzles: catalog.puzzles.map((p) => ({ id: p.id })) })};`,
      read(path.join(SRC, 'validator-worker.js')),
    ].join('\n'),
    worker = require('esbuild').transformSync(workerSource, {
      minify: true,
      target: 'es2022',
    }).code,
    css = require('esbuild').transformSync(
      read(path.join(SRC, 'app.css')) +
        '\n' +
        read(path.join(SRC, 'cabinet.css')) +
        '\n' +
        read(path.join(SRC, 'expedition.css')) +
        '\n' +
        read(path.join(SRC, 'club.css')) +
        '\n' +
        read(path.join(SRC, 'atmosphere.css')) +
        '\n' +
        read(path.join(SRC, 'curation.css')) +
        '\n' +
        read(path.join(SRC, 'after-hours.css')) +
        '\n' +
        read(path.join(SRC, 'theatre.css')),
      { loader: 'css', minify: true, target: ['chrome100', 'safari15.4'] },
    ).code,
    template = read(path.join(SRC, 'index.html'));
  const media = {},
    inlineMedia = {};
  for (const p of files(path.join(SRC, 'artwork'))) {
    const data = fs.readFileSync(p),
      name = path.parse(p).name;
    media[name] = `./assets/${name}.${hash(data)}${path.extname(p)}`;
    const mime = path.extname(p) === '.svg' ? 'image/svg+xml' : 'image/webp';
    inlineMedia[name] = `data:${mime};base64,${data.toString('base64')}`;
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
  const theatreSource = JSON.parse(read(path.join(ROOT, 'content/theatre.json')));
  const ambience = JSON.parse(
    read(path.join(ROOT, 'assets-source/ambience/catalogue.json')),
  ).assets.map((a) => {
    const bytes = fs.readFileSync(path.join(ROOT, a.file));
    const url = `./assets/ambience-${a.id}.${hash(bytes)}.mp3`;
    write(path.join(DIST, url), bytes);
    return { id: a.id, title: a.title, url, loop: true, author: a.author, source: a.source };
  });
  const theatre = {
    scenes: theatreSource.scenes,
    audio: ambience,
    films: experience.manifest.films.filter((a) => theatreSource.films.includes(a.id)),
  };
  const quiet = require('./build-quiet.cjs')(ROOT, DIST, media, inlineMedia, experience);
  const curation = require('./build-curation.cjs')(ROOT, DIST);
  const house = require('./build-house.cjs').build(ROOT, DIST);
  const delivery = require('./build-delivery.cjs')(ROOT, DIST, curation.media, media);
  const clubEngine = read(path.join(SRC, 'club-engines.js')),
    clubEngineBundle = require('esbuild').transformSync(clubEngine, {
      minify: true,
      target: 'es2022',
    }).code,
    engineURL = `./assets/club-engines.${hash(clubEngineBundle)}.js`,
    workerURL = `./assets/validator.${hash(worker)}.js`,
    boot = read(path.join(SRC, 'boot.js')),
    bootURL = `./assets/boot.${hash(boot)}.js`;
  // The Observatory adapter is emitted verbatim as its own asset and loaded after the page's load event by
  // src/observatory-loader.js. It is an online-only control: not in the initial bundle, not in the offline shell.
  // Discovery storage is likewise emitted as a deferred distribution asset. It remains unwired,
  // so it is neither advertised by the initial bootstrap nor installed in the core offline shell.
  const observatory = read(path.join(ROOT, 'observatory/browser.js')),
    observatoryURL = `./assets/observatory.${hash(observatory)}.js`,
    discoveryStorage = require('esbuild').transformSync(
      read(path.join(SRC, 'discovery-storage.js')),
      { minify: true, target: 'es2022' },
    ).code,
    discoveryStorageURL = `./assets/discovery-storage.${hash(discoveryStorage)}.js`;
  write(path.join(DIST, observatoryURL), observatory);
  write(path.join(DIST, discoveryStorageURL), discoveryStorage);
  write(path.join(DIST, bootURL), boot);
  write(path.join(DIST, engineURL), clubEngineBundle);
  write(path.join(DIST, workerURL), worker);
  const editorial = require('./curation-editorial.cjs').load(ROOT, catalog);
  editorial.artwork = curation.assets;
  editorial.delivery = delivery.entries;
  // Authored scene/media metadata belongs with the other official editorial data.
  // This is still an initial download, counted in combined and offline delivery budgets.
  // Registry-deferred definitions ship in one precached chunk. Startup carries listing entries,
  // and the chunk swaps in the full definitions after validating each against its entry.
  const officialContent = require('./build-official-content.cjs'),
    officialSplit = officialContent.split(catalog, officialParts.deferred),
    deferredSource = officialContent.serializeDeferred(
      officialSplit.keys,
      officialSplit.positions,
      officialSplit.definitions,
    ),
    deferredURL = `./assets/official-deferred.${hash(deferredSource)}.js`;
  write(path.join(DIST, deferredURL), deferredSource);
  const contentSource =
    officialContent.serialize({
      ALIBI_RELEASES: JSON.parse(read(path.join(ROOT, 'content/releases.json'))),
      ALIBI_CATALOG: officialSplit.catalog,
      ALIBI_CASEBOOKS: books,
      ALIBI_CURATION: editorial,
      ALIBI_THEATRE: theatre,
    }) + officialContent.deferredRuntime(deferredURL, officialSplit.keys);
  const contentURL = `./assets/official-content.${hash(contentSource)}.js`;
  write(path.join(DIST, contentURL), contentSource);
  const base = [
    read(path.join(SRC, 'updates.js')),
    core,
    engines,
    bridges,
    read(path.join(SRC, 'storage.js')),
    read(path.join(SRC, 'presentation.js')),
    read(path.join(SRC, 'asset-library.js')),
    read(path.join(SRC, 'asset-delivery.js')),
    read(path.join(SRC, 'theatre.js')),
    read(path.join(SRC, 'validator-loader.js')),
    read(path.join(SRC, 'curation.js')),
    read(path.join(SRC, 'network-hints.js')),
    read(path.join(SRC, 'insights.js')),
    read(path.join(SRC, 'assist.js')),
    read(path.join(SRC, 'atlas.js')),
    read(path.join(SRC, 'atmosphere.js')),
    read(path.join(SRC, 'backup-validation.js')),
    read(path.join(SRC, 'club.js')),
    read(path.join(SRC, 'house-loader.js')),
    read(path.join(SRC, 'castle-practice.js')),
    read(path.join(SRC, 'activities.js')),
    read(path.join(SRC, 'app.js')),
    read(path.join(SRC, 'observatory-loader.js')),
  ].join('\n');
  const targetGuard = '!globalThis.ALIBI_BUILD_TARGET &&';
  if (base.split(targetGuard).length !== 2)
    throw new Error('Expected exactly one Android target guard in the application source.');
  const webBase = base.replace(targetGuard, '!cfg.standalone &&');
  const blockMotion = require('./build-block-motion.cjs')(ROOT, DIST);
  const blockLoader = require('esbuild').transformSync(
    `globalThis.ALIBI_BLOCK_MOTION=${JSON.stringify(blockMotion.config)};\n` +
      read(path.join(SRC, 'block-motion-loader.js')),
    { minify: true, target: 'es2022' },
  ).code;
  const blockLoaderURL = `./assets/block-motion-loader.${hash(blockLoader)}.js`;
  write(path.join(DIST, blockLoaderURL), blockLoader);
  const fingerprint = files(path.join(SRC, 'icons'))
      .map((p) => hash(fs.readFileSync(p)))
      .join(''),
    release = hash(
      JSON.stringify(source) +
        platformSource +
        contentSource +
        deferredSource +
        blockLoader +
        webBase +
        boot +
        worker +
        clubEngineBundle +
        observatory +
        discoveryStorage +
        css +
        VERSION +
        template +
        read(__filename) +
        read(require.resolve('./platform-identity.cjs')) +
        fingerprint +
        JSON.stringify(media) +
        JSON.stringify(quiet.config) +
        JSON.stringify(curation.media) +
        JSON.stringify(delivery.entries) +
        JSON.stringify(theatre) +
        JSON.stringify(house.config),
    ),
    cfg = { version: VERSION, build: release, standalone: false };
  const js =
      `globalThis.ALIBI_HOUSE_CONFIG=${JSON.stringify(house.config)};\nglobalThis.ALIBI_DELIVERY=globalThis.ALIBI_CURATION.delivery;\nglobalThis.ALIBI_CURATION_MEDIA=${JSON.stringify(curation.media)};\nglobalThis.ALIBI_CONFIG=${JSON.stringify(cfg)};\nglobalThis.ALIBI_QUIET_CONFIG=${JSON.stringify(quiet.config)};\nglobalThis.ALIBI_MEDIA=${JSON.stringify(media)};\nglobalThis.ALIBI_WORKER_URL=${JSON.stringify(workerURL)};\nglobalThis.ALIBI_CLUB_CONFIG=${JSON.stringify({ engine: engineURL, apiBase: '' })};\nglobalThis.ALIBI_OBSERVATORY_URL=${JSON.stringify(observatoryURL)};\n` +
      require('esbuild').transformSync(webBase, { minify: true, target: 'es2022' }).code,
    jsName = `assets/alibi.${hash(js)}.js`,
    cssName = `assets/alibi.${hash(css)}.css`;
  write(path.join(DIST, jsName), js);
  write(path.join(DIST, cssName), css);
  for (const p of files(path.join(SRC, 'icons')))
    write(path.join(DIST, 'icons', path.basename(p)), fs.readFileSync(p));
  const platformBuild = {
    target: 'web',
    ...source,
    payloadSha256: payloadDigest(DIST),
    appVersion: VERSION,
    contentManifestRevision: sha256(contentSource),
    rulesCompatibility: {},
  };
  const platformIdentity = writeIdentity(DIST, platformBuild);
  const identityURL = './' + platformIdentity.path;
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
  // Must equal the origin of the collect endpoint compiled into observatory/browser.js; observatory/check.mjs asserts both.
  const OBSERVATORY_ORIGIN = 'https://pulseboard-observatory.commit-atlas.workers.dev';
  const connectOrigins = [...delivery.origins, OBSERVATORY_ORIGIN];
  const documentPolicy = `default-src 'self'; script-src 'self' ${pathRouteAliasCspHashes().join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ${connectOrigins.join(' ')}; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'`;
  const head = `<meta http-equiv="Content-Security-Policy" content="${documentPolicy}"><meta name="referrer" content="no-referrer"><link rel="manifest" href="./manifest.webmanifest"><link rel="icon" href="./icons/icon-192.png"><link rel="apple-touch-icon" href="./icons/icon-192.png"><link rel="stylesheet" href="./${cssName}">`;
  write(
    path.join(DIST, 'index.html'),
    template
      .replace('<!-- HEAD -->', head)
      .replace(
        '<!-- SCRIPTS -->',
        `<script src="${bootURL}" defer></script><script src="${identityURL}" defer></script><script src="${platformURL}" defer></script><script src="${contentURL}" defer></script><script src="./${jsName}" defer></script><script src="${blockLoaderURL}" defer></script>`,
      ),
  );
  const aliasShellDocuments = Object.keys(PATH_ROUTE_ALIASES).flatMap((alias) => [
    `./${alias}.html`,
    `./${alias}/index.html`,
  ]);
  const assets = [
    './',
    './index.html',
    ...aliasShellDocuments,
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable.png',
    './' + jsName,
    './' + cssName,
    engineURL,
    blockLoaderURL,
    bootURL,
    identityURL,
    platformURL,
    workerURL,
    contentURL,
    deferredURL,
    ...Object.values(curation.media),
    ...Object.values(media),
  ];
  // Hosts may canonicalize cached alias URLs through an HTTP redirect. A
  // manual-mode navigation cannot consume that followed-redirect response;
  // rewrap only those cache hits while preserving their bytes and headers.
  const sw = `/* One coherent offline release. Save data lives in IndexedDB, never this cache. */
const BUILD=${JSON.stringify(release)},PREFIX='alibi-shell-',CACHE=PREFIX+BUILD,SHELL=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(CACHE);try{await c.addAll(SHELL.map(url=>new Request(url,{cache:'reload'})));}catch(error){await caches.delete(CACHE);throw error;}})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=(await caches.keys()).filter(k=>k.startsWith(PREFIX)),keep=new Set([CACHE,...keys.filter(k=>k!==CACHE).slice(-1)]);await Promise.all(keys.filter(k=>!keep.has(k)).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE')self.skipWaiting();});
const OWNED=['alibi-shell-','alibi-block-motion-','alibi-quiet-wing-pack-','alibi-castle-pack-','alibi-house-pack-','alibi-folio-','alibi-ambience-'];
async function priorRelease(request){const keys=(await caches.keys()).filter(key=>key!==CACHE&&OWNED.some(prefix=>key.startsWith(prefix)));for(const key of keys){const hit=await (await caches.open(key)).match(request);if(hit)return hit;}return null;}
const ALIAS_ROUTES=${JSON.stringify(Object.keys(PATH_ROUTE_ALIASES))};
function aliasRoute(pathname){const clean=String(pathname||'').replace(/\\/+$/,'').toLowerCase();const leaf=clean.charAt(0)==='/'?clean.slice(1):clean;return leaf&&leaf.indexOf('/')<0&&ALIAS_ROUTES.indexOf(leaf)>=0?leaf:null;}
self.addEventListener('fetch',event=>{const r=event.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin||(u.pathname.endsWith('/sw.js')||u.pathname.startsWith('/api/')))return;event.respondWith((async()=>{const c=await caches.open(CACHE);if(/^quiet-wing-sources(?:\\.[a-f0-9]{12})?\\.html$/.test(u.pathname.slice(self.registration.scope.replace(self.location.origin,'').length)))return await c.match(r)||await priorRelease(r)||fetch(r);if(r.mode==='navigate'){const alias=aliasRoute(u.pathname);if(alias){const hit=await c.match(new URL('./'+alias+'.html',self.registration.scope).href);return hit?.redirected?new Response(hit.body,{status:hit.status,statusText:hit.statusText,headers:hit.headers}):hit||fetch(r);}return await c.match(new URL('./',self.registration.scope).href)||fetch(r);}const hit=await c.match(r);if(hit)return hit;if(u.pathname.includes('/assets/')){const prior=await priorRelease(r);if(prior)return prior;}return fetch(r);})());});
`;
  write(path.join(DIST, 'sw.js'), sw);
  write(
    path.join(DIST, '_headers'),
    `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: ${documentPolicy}; frame-ancestors 'none'
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
  writePathRouteAliases(DIST);
  const standalone = `globalThis.ALIBI_BUILD_TARGET='standalone';\nglobalThis.ALIBI_HOUSE_CONFIG=${JSON.stringify(house.standalone)};\nglobalThis.ALIBI_BLOCK_MOTION=${JSON.stringify(blockMotion.standalone)};\nglobalThis.ALIBI_THEATRE=${JSON.stringify({ ...theatre, audio: [], films: [] })};\nglobalThis.ALIBI_CURATION_MEDIA=${JSON.stringify(curation.inlineMedia)};\n globalThis.ALIBI_QUIET_CONFIG=${JSON.stringify(quiet.standalone)};\nglobalThis.ALIBI_CONFIG=${JSON.stringify({ ...cfg, standalone: true })};\nglobalThis.ALIBI_MEDIA=${JSON.stringify(inlineMedia)};\nglobalThis.ALIBI_WORKER_SOURCE=${JSON.stringify(worker)};\nglobalThis.ALIBI_CLUB_CONFIG=${JSON.stringify({ engineSource: clubEngine, apiBase: '' })};\n${base}\n${read(path.join(SRC, 'block-motion-loader.js'))}`;
  write(
    path.join(ROOT, 'alibi-deluxe-play.html'),
    template
      .replace('<!-- HEAD -->', () => '<style>' + css + '</style>')
      .replace(
        '<!-- SCRIPTS -->',
        () =>
          '<script>' +
          boot +
          '\n' +
          (
            `globalThis.ALIBI_BUILD_TARGET='standalone';\n` +
            platformIdentity.source +
            platformSource +
            contentSource +
            deferredSource +
            standalone
          ).replace(/<\/script/gi, '<\\/script') +
          '</script>',
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
    castleBytes: quiet.castleBytes,
    experienceBytes: experience.bytes,
    enhancementBytes: delivery.bytes,
    ambienceBytes: ambience.reduce((n, a) => n + fs.statSync(path.join(DIST, a.url)).size, 0),
    experienceOfflineBytes: experience.manifest.bytes,
    coreOfflineBytes:
      files(DIST).reduce((n, p) => n + fs.statSync(p).size, 0) -
      quiet.bytes -
      quiet.castleBytes -
      experience.bytes -
      delivery.bytes -
      ambience.reduce((n, a) => n + fs.statSync(path.join(DIST, a.url)).size, 0) -
      Buffer.byteLength(observatory) -
      Buffer.byteLength(discoveryStorage) -
      blockMotion.bytes -
      house.bytes,
    houseBytes: house.bytes,
    houseScriptGzipBytes: house.scriptGzipBytes,
    houseCssGzipBytes: house.cssGzipBytes,
    blockMotionBytes: blockMotion.bytes,
    blockMotionLoaderGzipBytes: zlib.gzipSync(blockLoader).length,
    observatoryBytes: Buffer.byteLength(observatory),
    discoveryStorageBytes: Buffer.byteLength(discoveryStorage),
    discoveryStorageGzipBytes: zlib.gzipSync(discoveryStorage).length,
    officialContentBytes:
      Buffer.byteLength(contentSource) + Buffer.byteLength(deferredSource) + curation.bytes,
    curationMediaBytes: curation.bytes,
    officialContentGzipBytes: zlib.gzipSync(contentSource).length,
    deferredContentBytes: Buffer.byteLength(deferredSource),
    deferredContentGzipBytes: zlib.gzipSync(deferredSource).length,
    deferredPuzzles: officialSplit.keys.length,
    initialCodeAndContentGzipBytes:
      zlib.gzipSync(js).length +
      zlib.gzipSync(contentSource).length +
      zlib.gzipSync(blockLoader).length +
      zlib.gzipSync(boot).length +
      zlib.gzipSync(platformSource).length +
      zlib.gzipSync(platformIdentity.source).length,
    javascriptGzipBytes: zlib.gzipSync(js).length,
    bootGzipBytes: zlib.gzipSync(boot).length,
    platformGzipBytes:
      zlib.gzipSync(platformSource).length + zlib.gzipSync(platformIdentity.source).length,
    platformBuild,
    observatoryGzipBytes: zlib.gzipSync(observatory).length,
    uploadZipBytes: fs.statSync(path.join(ROOT, 'alibi-deluxe-cloudflare.zip')).size,
  };
  write(path.join(ROOT, 'build-info.json'), JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info, null, 2));
}
if (require.main === module) build();
module.exports = {
  build,
  zip,
  files,
  PATH_ROUTE_ALIASES,
  pathRouteAliasDocument,
  writePathRouteAliases,
};
