/* Real source/engines, but NOT a release, origin durability or service-worker fixture. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = (p) => JSON.parse(read(p));
function preview(out = path.join(ROOT, 'house-preview.html')) {
  const catalog = require('./official-catalogue.cjs').load(ROOT, false);
  const editorial = require('./curation-editorial.cjs').load(ROOT, catalog);
  const image = (p) =>
    `data:${p.endsWith('.svg') ? 'image/svg+xml' : 'image/webp'};base64,${fs.readFileSync(path.join(ROOT, p)).toString('base64')}`;
  const media = {},
    curationMedia = {};
  for (const file of fs.readdirSync(path.join(ROOT, 'src/artwork')))
    if (/\.(webp|svg)$/.test(file)) media[path.parse(file).name] = image('src/artwork/' + file);
  media['club-reading-room'] = image('assets-source/library/editorial/reading-room.webp');
  for (const file of fs.readdirSync(path.join(ROOT, 'assets-source/library/editorial')))
    if (file.endsWith('.webp'))
      curationMedia[path.parse(file).name] = image('assets-source/library/editorial/' + file);
  editorial.artwork = [];
  const globals = {
    ALIBI_CONFIG: {
      version: '0.11.1-house-mobile-source-preview',
      build: 'source-preview',
      standalone: true,
    },
    ALIBI_CATALOG: catalog,
    ALIBI_CASEBOOKS: json('content/casebooks.json'),
    ALIBI_RELEASES: json('content/releases.json'),
    ALIBI_CURATION: editorial,
    ALIBI_MEDIA: media,
    ALIBI_CURATION_MEDIA: curationMedia,
    ALIBI_THEATRE: { scenes: json('content/theatre.json').scenes, audio: [], films: [] },
    ALIBI_CLUB_CONFIG: { engineSource: read('src/club-engines.js'), apiBase: '' },
    ALIBI_HOUSE_CONFIG: require('./build-house.cjs').sources(ROOT),
    ALIBI_DELIVERY: {},
  };
  const files = [
    'updates',
    'core',
    'engines',
    'bridges',
    'storage',
    'presentation',
    'asset-library',
    'asset-delivery',
    'theatre',
    'validator-loader',
    'curation',
    'network-hints',
    'insights',
    'assist',
    'atlas',
    'atmosphere',
    'backup-validation',
    'club',
    'house-loader',
    'castle-practice',
    'activities',
    'app',
    'observatory-loader',
  ];
  const script =
    Object.entries(globals)
      .map(([k, v]) => `globalThis.${k}=${JSON.stringify(v)};`)
      .join('\n') +
    '\nif (!location.hash) location.hash = "#/home?ux=house";\n' +
    files.map((f) => read('src/' + f + '.js')).join('\n');
  const css = [
    'app',
    'cabinet',
    'expedition',
    'club',
    'atmosphere',
    'curation',
    'after-hours',
    'theatre',
  ]
    .map((f) => read('src/' + f + '.css'))
    .join('\n');
  const notice =
    '<aside style="padding:6px 16px;background:#173c36;color:#fff;font:12px/1.5 system-ui;text-align:center">SOURCE PREVIEW · Cabinet games work. Optional castle packs require the full build.</aside>';
  const html = read('src/index.html')
    .replace('<!-- HEAD -->', () => '<style>' + css + '</style>')
    .replace('<body>', '<body>' + notice)
    .replace(
      '<!-- SCRIPTS -->',
      () => '<script>' + script.replace(/<\/script/gi, '<\\/script') + '</script>',
    );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`Source preview: ${out} (${Buffer.byteLength(html)} bytes)`);
  return out;
}
if (require.main === module) preview(process.argv[2]);
module.exports = { preview };
