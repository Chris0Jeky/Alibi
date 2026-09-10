'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
function buildDelivery(root, dist, fallback, baseMedia = {}) {
  const policy = JSON.parse(fs.readFileSync(path.join(root, 'content/asset-delivery.json')));
  const registry = JSON.parse(
    fs.readFileSync(path.join(root, 'assets-source/curation/registry.json')),
  );
  const entries = {},
    origins = new Set();
  let bytes = 0;
  if (policy.schemaVersion !== 1 || !policy.mirrors || Array.isArray(policy.mirrors))
    throw Error('Invalid delivery policy');
  for (const a of registry.assets.filter((a) => a.kind === 'museum-image')) {
    const data = fs.readFileSync(path.join(root, a.derivative.file));
    const sha256 = crypto.createHash('sha256').update(data).digest('hex');
    if (sha256 !== a.derivative.sha256 || data.length > 1024 * 1024)
      throw Error('Invalid enhancement: ' + a.id);
    const url = `./assets/enhanced-${a.id}.${sha256.slice(0, 12)}.webp`;
    fs.writeFileSync(path.join(dist, url), data);
    const mirrors = policy.mirrors[a.id] || [];
    if (!Array.isArray(mirrors) || mirrors.length > 1) throw Error('At most one mirror per image');
    for (const value of mirrors) {
      const remote = new URL(value);
      if (
        remote.protocol !== 'https:' ||
        remote.username ||
        remote.password ||
        remote.hash ||
        remote.search
      )
        throw Error('Mirror must be a credential-free, immutable HTTPS URL');
      origins.add(remote.origin);
    }
    entries[a.id] = {
      fallback: fallback[a.id],
      urls: [...mirrors, url],
      sha256,
      bytes: data.length,
      mime: 'image/webp',
      credit: a.artist + ' / The Metropolitan Museum of Art',
      source: a.source.objectPage,
    };
    bytes += data.length;
  }
  if (Object.keys(policy.mirrors).some((id) => !entries[id])) throw Error('Unknown mirror asset');
  const receiptPath = path.join(root, 'assets-source/online/acquired/receipt.json');
  if (fs.existsSync(receiptPath)) {
    const photos = JSON.parse(fs.readFileSync(receiptPath)).assets;
    const catalogue = JSON.parse(
      fs.readFileSync(path.join(root, 'assets-source/online/after-hours.json')),
    ).assets;
    for (const photo of photos) {
      const approved = catalogue.find((a) => a.id === photo.id);
      const remote = new URL(photo.url);
      if (
        !approved ||
        !['images.unsplash.com', 'images.pexels.com'].includes(remote.hostname) ||
        remote.protocol !== 'https:' ||
        remote.username ||
        remote.password ||
        remote.hash
      )
        throw Error('Unapproved photo');
      if (
        remote.origin + remote.pathname !==
        new URL(approved.remote.url).origin + new URL(approved.remote.url).pathname
      )
        throw Error('Photo source changed');
      if (
        [...remote.searchParams.keys()].some((key) => !['fm', 'fit', 'w', 'q', 'cs'].includes(key))
      )
        throw Error('Unapproved image transform');
      const local = baseMedia[approved.story || 'club-reading-room'];
      if (!local) throw Error('Missing meaningful photo fallback');
      const file = path.resolve(root, photo.file);
      if (!file.startsWith(path.join(root, 'assets-source/online/acquired') + path.sep))
        throw Error('Photo escaped source directory');
      const data = fs.readFileSync(file);
      if (
        data.length > 1024 * 1024 ||
        crypto.createHash('sha256').update(data).digest('hex') !== photo.sha256
      )
        throw Error('Photo fingerprint mismatch');
      const url = `./assets/enhanced-${photo.id}.${photo.sha256.slice(0, 12)}.webp`;
      fs.writeFileSync(path.join(dist, url), data);
      entries[photo.id] = {
        fallback: local,
        urls: [photo.url, url],
        sha256: photo.sha256,
        bytes: data.length,
        mime: 'image/webp',
        credit: `${photo.photographer} / ${photo.provider}`,
        source: photo.sourcePage,
      };
      bytes += data.length;
      origins.add(remote.origin);
    }
  }
  return { entries, origins: [...origins].sort(), bytes };
}
module.exports = buildDelivery;
