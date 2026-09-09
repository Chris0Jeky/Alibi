'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
function buildDelivery(root, dist, fallback) {
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
    };
    bytes += data.length;
  }
  if (Object.keys(policy.mirrors).some((id) => !entries[id])) throw Error('Unknown mirror asset');
  return { entries, origins: [...origins].sort(), bytes };
}
module.exports = buildDelivery;
