/* Curated runtime exports. Masters, recipes and production evidence remain in source. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
module.exports = function buildExperience(root, dist) {
  const base = 'assets-source/library/';
  const read = (p) => JSON.parse(fs.readFileSync(path.join(root, base, p), 'utf8'));
  const files = new Map();
  const offline = new Set();
  function emit(source, cache = true) {
    if (files.has(source)) return files.get(source).url;
    const bytes = fs.readFileSync(path.join(root, source));
    const id = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    const url = `./assets/folio-${path.parse(source).name}.${id}${path.extname(source)}`;
    fs.writeFileSync(path.join(dist, url), bytes);
    files.set(source, { url, bytes: bytes.length });
    if (cache) offline.add(url);
    return url;
  }
  const realm = read('realm/catalogue.json');
  const model = (a) => ({
    id: a.id,
    title: a.title,
    model: emit(a.derivatives.find((p) => p.endsWith('.glb'))),
    image: emit(a.derivatives.find((p) => p.endsWith('.png'))),
    credit: a.design === 'reused' ? 'Kenney · CC0' : 'Alibi · original design',
  });
  const manifest = {
    scenes: realm.scenes.map(model),
    modules: [...realm.assets, ...read('realm/details/catalogue.json').assets].map(model),
    companions: read('companions/catalogue.json').assets.map((a) => ({
      id: a.id,
      title: a.title,
      states: Object.fromEntries(
        a.derivatives
          .filter((p) => p.endsWith('.svg'))
          .map((p) => [path.parse(p).name.slice(a.id.length + 1), emit(p)]),
      ),
    })),
    audio: read('audio/catalogue.json').assets.map((a) => ({
      id: a.id,
      title: a.description,
      url: emit(a.derivatives.ogg),
      loop: a.id.startsWith('ambience-'),
    })),
    films: read('motion/catalogue.json').items.map((a) => ({
      id: a.id,
      title: a.title,
      url: emit(base + 'motion/' + a.derivatives.find((d) => d.type === 'mp4').path, false),
      image: emit(base + 'motion/' + a.derivatives.find((d) => d.type === 'poster').path),
      duration: a.metadata.durationSec,
    })),
    editorial: [],
  };
  const editorial = path.join(root, base, 'editorial/catalogue.json');
  if (fs.existsSync(editorial)) {
    const data = JSON.parse(fs.readFileSync(editorial, 'utf8'));
    manifest.editorial = (Array.isArray(data) ? data : data.assets).map((a) => ({
      id: a.id,
      title: a.title,
      image: emit(a.derivatives.find((p) => p.endsWith('.webp'))),
    }));
  }
  manifest.files = [...offline];
  manifest.bytes = [...files.values()]
    .filter((f) => offline.has(f.url))
    .reduce((n, f) => n + f.bytes, 0);
  manifest.build = crypto
    .createHash('sha256')
    .update(JSON.stringify(manifest))
    .digest('hex')
    .slice(0, 12);
  return { manifest, bytes: [...files.values()].reduce((n, f) => n + f.bytes, 0) };
};
