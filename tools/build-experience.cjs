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
  const details = read('realm/details/catalogue.json');
  const companions = read('companions/catalogue.json');
  const audio = read('audio/catalogue.json');
  const motion = read('motion/catalogue.json');
  const editorialPath = path.join(root, base, 'editorial/catalogue.json');
  const editorialData = fs.existsSync(editorialPath)
    ? JSON.parse(fs.readFileSync(editorialPath, 'utf8'))
    : null;
  const editorialAssets = editorialData
    ? Array.isArray(editorialData)
      ? editorialData
      : editorialData.assets
    : [];
  function invalidCatalogue(id, kind) {
    throw new Error(
      `invalid catalogue: asset "${id ?? 'unknown'}" missing ${kind} derivative`,
    );
  }
  function findSuffix(asset, suffix) {
    const found = Array.isArray(asset?.derivatives)
      ? asset.derivatives.find((p) => typeof p === 'string' && p.endsWith(suffix))
      : undefined;
    if (!found) invalidCatalogue(asset?.id, suffix);
    return found;
  }
  function findMotion(asset, type) {
    const found = Array.isArray(asset?.derivatives)
      ? asset.derivatives.find(
          (d) => d?.type === type && typeof d?.path === 'string' && d.path.length > 0,
        )
      : undefined;
    if (!found) invalidCatalogue(asset?.id, type);
    return found;
  }
  function audioOgg(asset) {
    const ogg = asset?.derivatives?.ogg;
    if (typeof ogg !== 'string' || !ogg.endsWith('.ogg'))
      invalidCatalogue(asset?.id, '.ogg');
    return ogg;
  }
  if (editorialData && !Array.isArray(editorialAssets)) {
    throw new Error('invalid catalogue: editorial catalogue missing assets');
  }
  for (const a of [...realm.scenes, ...realm.assets, ...details.assets]) {
    findSuffix(a, '.glb');
    findSuffix(a, '.png');
  }
  for (const a of audio.assets) audioOgg(a);
  for (const a of motion.items) {
    findMotion(a, 'mp4');
    findMotion(a, 'poster');
  }
  for (const a of editorialAssets) findSuffix(a, '.webp');
  const model = (a) => ({
    id: a.id,
    title: a.title,
    model: emit(findSuffix(a, '.glb')),
    image: emit(findSuffix(a, '.png')),
    credit: a.design === 'reused' ? 'Kenney · CC0' : 'Alibi · original design',
  });
  const manifest = {
    scenes: realm.scenes.map(model),
    modules: [...realm.assets, ...details.assets].map(model),
    companions: companions.assets.map((a) => ({
      id: a.id,
      title: a.title,
      states: Object.fromEntries(
        a.derivatives
          .filter((p) => p.endsWith('.svg'))
          .map((p) => [path.parse(p).name.slice(a.id.length + 1), emit(p)]),
      ),
    })),
    audio: audio.assets.map((a) => ({
      id: a.id,
      title: a.description,
      url: emit(audioOgg(a)),
      loop: a.id.startsWith('ambience-'),
    })),
    films: motion.items.map((a) => ({
      id: a.id,
      title: a.title,
      url: emit(base + 'motion/' + findMotion(a, 'mp4').path, false),
      image: emit(base + 'motion/' + findMotion(a, 'poster').path),
      duration: a.metadata.durationSec,
    })),
    editorial: [],
  };
  if (editorialData) {
    manifest.editorial = editorialAssets.map((a) => ({
      id: a.id,
      title: a.title,
      image: emit(findSuffix(a, '.webp')),
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
