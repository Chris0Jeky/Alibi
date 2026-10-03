'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
module.exports = function (root, dist) {
  const registry = JSON.parse(
    fs.readFileSync(path.join(root, 'assets-source/curation/registry.json'), 'utf8'),
  );
  const runtime = JSON.parse(
    fs.readFileSync(path.join(root, 'assets-source/curation/runtime.json'), 'utf8'),
  );
  const media = {},
    inlineMedia = {},
    assets = [];
  let bytes = 0;
  for (const a of registry.assets) {
    if (!['museum-image', 'venue-cover', 'family-icon'].includes(a.kind)) continue;
    if (a.kind !== 'museum-image')
      for (const key of ['file', 'sha256', 'format'])
        if (typeof a.derivative?.[key] !== 'string' || a.derivative[key].length === 0)
          throw Error('Invalid curation derivative for ' + a.id);
    if (typeof a.source !== 'object' || a.source === null)
      throw Error('Invalid curation source for ' + a.id);
    const r =
      a.kind === 'museum-image'
        ? runtime.assets.find((r) => r.id === a.id)?.runtime
        : { path: a.derivative.file, sha256: a.derivative.sha256, mime: a.derivative.format };
    if (typeof r?.mime !== 'string' || r.mime.length === 0)
      throw Error('Invalid curation derivative for ' + a.id);
    if (a.kind !== 'museum-image')
      for (const key of ['file', 'sha256', 'format'])
        if (typeof a.derivative?.[key] !== 'string' || a.derivative[key].length === 0)
          throw Error('Invalid curation derivative for ' + a.id);
    if (!r || !/^src\/curation-assets\/[a-z/-]+\.(webp|svg)$/.test(r.path))
      throw Error('Invalid trusted artwork path');
    const data = fs.readFileSync(path.join(root, r.path));
    const digest = crypto.createHash('sha256').update(data).digest('hex');
    if (digest !== r.sha256) throw Error('Artwork hash mismatch: ' + a.id);
    const url = `./assets/curation-${a.id}.${digest.slice(0, 12)}${path.extname(r.path)}`;
    fs.writeFileSync(path.join(dist, url), data);
    media[a.id] = url;
    inlineMedia[a.id] = `data:${r.mime};base64,${data.toString('base64')}`;
    bytes += data.length;
    assets.push({
      id: a.id,
      kind: a.kind,
      venue: a.venue,
      title: a.title,
      alt: a.alt,
      credit: a.rights?.credit,
      source: a.source.objectPage,
      note: a.editorialNote,
    });
  }
  return { media, inlineMedia, assets, bytes };
};
