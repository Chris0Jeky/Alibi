/* Assemble real production files into a portable catalogue. No remote jobs. */
'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..'),
  BASE = 'assets-source/library/';
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
function checked(p) {
  if (
    typeof p !== 'string' ||
    p.includes('..') ||
    path.isAbsolute(p) ||
    p.includes(':') ||
    p.includes('\\')
  )
    throw Error('Non-portable asset path ' + p);
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || !fs.statSync(f).isFile()) throw Error('Missing asset ' + p);
  return { path: p, bytes: fs.statSync(f).size, sha256: hash(fs.readFileSync(f)) };
}
function main() {
  const assets = read(BASE + 'visuals/catalogue.json');
  const ap = BASE + 'audio/catalogue.json';
  if (fs.existsSync(path.join(ROOT, ap)))
    for (const a of read(ap).assets)
      assets.push({
        id: a.id,
        title: a.id.replace(/^(ui|pet|amb)-/, '').replaceAll('-', ' '),
        category: 'audio',
        status: a.status,
        design: 'original',
        source: a.source.recipe,
        derivatives: Object.values(a.derivatives),
        metadata: a.metadata,
        provenance: {
          author: 'Alibi project',
          method: a.provenance,
          license: 'Project original; no separate public reuse grant',
          generator: a.source.generator,
        },
        accessibility: 'Explicit playback only; auditory/device-volume review pending.',
        integration: a.integration_ref,
        qa: { machine: 'Decoded and level/seam tested', auditory: 'pending' },
      });
  for (const folder of ['realm', 'companions', 'motion']) {
    const p = BASE + folder + '/catalogue.json';
    if (fs.existsSync(path.join(ROOT, p))) {
      const v = read(p);
      if (folder === 'motion' && v.items) {
        const groups = new Map();
        for (const item of v.items) {
          const id = item.id.replace(/-(landscape|portrait)$/, '');
          const prefix = BASE + 'motion/';
          let a = groups.get(id);
          if (!a) {
            a = {
              id,
              title: item.title.replace(/ \((landscape|portrait)\)$/, ''),
              category: 'motion',
              status: 'proposed',
              design: 'original',
              source: prefix + item.source,
              derivatives: [],
              metadata: { cuts: [] },
              provenance: item.provenance,
              accessibility:
                'Silent authored film with editable on-screen text, poster and explicit playback; no autoplay.',
              integration:
                'Local promotional composition only; excluded from app runtime and offline pack.',
              qa: item.qa,
            };
            groups.set(id, a);
          } else a.derivatives.push(prefix + item.source);
          a.derivatives.push(...item.derivatives.map((d) => prefix + d.path));
          a.metadata.cuts.push({ id: item.id, ...item.metadata });
        }
        assets.push(...groups.values());
        continue;
      }
      assets.push(...(Array.isArray(v) ? v : v.assets));
      if (v.scenes) assets.push(...v.scenes);
      if (v.master && v.scenes?.length)
        v.scenes[0].derivatives.push(...v.master.derivatives.filter((p) => p.endsWith('.blend')));
    }
  }
  for (const [id, work] of Object.entries(read('src/quiet-wing/assets/museum/rights.json')))
    assets.push({
      id: 'museum-' + id,
      title: work.title,
      category: 'existing-art',
      status: 'current',
      design: 'reused',
      source: 'src/quiet-wing/assets/museum/' + id + '.webp',
      derivatives: [],
      dimensions: [work.width, work.height],
      provenance: work,
      accessibility: 'Visible title, artist and public-domain record retained',
      integration: 'src/quiet-wing/app.js:museum',
      qa: { scope: 'Unchanged existing production file; original rights receipt retained' },
    });
  const rights = read('assets-source/atmosphere/rights.json');
  const works = Array.isArray(rights) ? rights : rights.assets || rights.works;
  for (const work of works) {
    const source = `src/artwork/${work.id}.webp`;
    assets.push({
      id: 'existing-' + work.id,
      title: work.title || work.id,
      category: 'existing-art',
      status: 'current',
      design: 'reused',
      source,
      derivatives: [],
      dimensions: [work.optimized.width, work.optimized.height],
      provenance: work,
      accessibility: 'Existing visible museum attribution retained',
      integration: 'src/atmosphere.js',
      qa: { scope: 'Unchanged existing production file; existing source receipt retained' },
    });
  }
  for (const id of [
    'briar-house',
    'night-train',
    'glasshouse',
    'bellweather',
    'evidence',
    'cartographer',
    'quiet-town',
  ])
    assets.push({
      id: 'existing-' + id,
      title: id.replaceAll('-', ' '),
      category: 'existing-art',
      status: 'current',
      design: 'reused',
      source: `src/artwork/${id}.webp`,
      derivatives: [],
      spoiler: id === 'evidence',
      provenance: {
        author: 'Alibi project',
        method:
          'Existing OpenAI-generated original; generation job/seed not present in original receipt',
        source: 'docs/ASSETS.md',
        license: 'Existing project rights unchanged',
      },
      accessibility: 'Existing decorative placement and empty alt retained',
      integration: 'src/presentation.js; src/club.js; src/app.js',
      qa: { scope: 'Untouched baseline image' },
    });
  const tutorials = BASE + 'teaching/catalogue.json';
  if (fs.existsSync(path.join(ROOT, tutorials))) assets.push(...read(tutorials));
  const ids = new Set();
  for (const a of assets) {
    if (ids.has(a.id)) throw Error('Duplicate ID ' + a.id);
    ids.add(a.id);
    a.derivatives ??= [];
    if (!['original', 'reused'].includes(a.design)) throw Error('Design classification ' + a.id);
    if (!['current', 'proposed'].includes(a.status)) throw Error('State classification ' + a.id);
    a.files = [
      checked(a.source),
      ...a.derivatives.map((p) => checked(typeof p === 'string' ? p : p.path)),
    ];
    a.qa ??= {
      scope: 'Produced; representative visual review, catalogue hashes and browser decode checks',
    };
  }
  const counts = {
    original: assets.filter((x) => x.design === 'original').length,
    reused: assets.filter((x) => x.design === 'reused').length,
    derivatives: new Set(
      assets.flatMap((x) => x.derivatives.map((p) => (typeof p === 'string' ? p : p.path))),
    ).size,
    uniqueFiles: new Set(assets.flatMap((x) => x.files.map((f) => f.path))).size,
  };
  const output = {
    schemaVersion: 1,
    baselineCommit: '897651e53a27b29e2b9a0a55d75b474ee0de88dc',
    counts,
    creditUse: {
      remoteSubmissions: 0,
      newCharges: 0,
      basis: 'Local production and unchanged existing assets only',
    },
    assets,
  };
  fs.writeFileSync(path.join(ROOT, BASE, 'catalogue.json'), JSON.stringify(output, null, 2) + '\n');
  const coveragePath = path.join(ROOT, BASE, 'coverage.json');
  if (fs.existsSync(coveragePath)) {
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8')),
      puzzles = read('content/catalog.json').puzzles;
    coverage.families = assets
      .filter((a) => a.category === 'families')
      .map((a) => {
        const type = a.id.slice(7),
          published = puzzles.filter((p) => p.type === type);
        return {
          type,
          title: a.title,
          puzzles: published.length,
          icon: a.source,
          card: a.derivatives[0],
          teachingCapture: 'assets-source/library/teaching/' + type + '.png',
          highlights: assets
            .filter(
              (h) =>
                h.category === 'highlights' && published.some((p) => h.id === 'highlight-' + p.id),
            )
            .map((h) => h.id),
          states: [
            'unstarted',
            'selected',
            'invalid',
            'hint',
            'solved',
            'disabled',
            'keyboard focus',
            'Zen',
          ],
          delivery:
            'Existing exact rules/controls retained; exported category and lesson assets; curated highlights only where listed',
          priority: 1,
        };
      });
    fs.writeFileSync(coveragePath, JSON.stringify(coverage, null, 2) + '\n');
  }
  console.log(JSON.stringify(counts));
  return output;
}
if (require.main === module) main();
module.exports = { main, checked };
