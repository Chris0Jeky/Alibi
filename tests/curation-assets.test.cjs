'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const registryPath = path.join(root, 'assets-source', 'curation', 'registry.json');
const approvedImageHosts = new Set([
  'collectionapi.metmuseum.org',
  'images.metmuseum.org',
  'www.metmuseum.org',
]);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const absoluteFromRepoPath = (file) => {
  assert.equal(typeof file, 'string');
  assert.ok(file.startsWith('assets-source/curation/') || file.startsWith('src/curation-assets/'));
  const resolved = path.resolve(root, file);
  assert.ok(resolved.startsWith(`${root}${path.sep}`), `path escaped repository root: ${file}`);
  return resolved;
};

test('curation registry is local, hash-verified and decodable', async () => {
  const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));
  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.policy.noHotlinks, true);
  assert.equal(registry.assets.length, 21);
  assert.deepEqual(registry.reused, []);
  assert.ok(registry.unavailable.some((asset) => asset.objectId === 438007));

  const ids = new Set();
  for (const asset of registry.assets) {
    assert.ok(!ids.has(asset.id), `duplicate asset id: ${asset.id}`);
    ids.add(asset.id);
    const sourcePath = absoluteFromRepoPath(asset.source.file);
    const derivativePath = absoluteFromRepoPath(asset.derivative.file);
    const [sourceBytes, derivativeBytes] = await Promise.all([
      fs.readFile(sourcePath),
      fs.readFile(derivativePath),
    ]);
    assert.equal(sha256(sourceBytes), asset.source.sha256, `source hash mismatch: ${asset.id}`);
    assert.equal(
      sha256(derivativeBytes),
      asset.derivative.sha256,
      `derivative hash mismatch: ${asset.id}`,
    );
    assert.equal(sourceBytes.length, asset.source.bytes, `source byte count mismatch: ${asset.id}`);
    assert.equal(
      derivativeBytes.length,
      asset.derivative.bytes,
      `derivative byte count mismatch: ${asset.id}`,
    );
    assert.ok(!asset.derivative.file.includes('http'));

    if (asset.kind === 'museum-image') {
      assert.equal(asset.source.publicDomain, true);
      assert.equal(asset.source.apiRightsFlag, 'isPublicDomain === true');
      for (const field of ['objectPage', 'apiRecord', 'imageUrl']) {
        const url = new URL(asset.source[field]);
        assert.equal(url.protocol, 'https:');
        assert.ok(approvedImageHosts.has(url.hostname), `${asset.id} uses an unapproved host`);
      }
      const metadata = await sharp(sourceBytes).metadata();
      const derivativeMetadata = await sharp(derivativeBytes).metadata();
      assert.ok(metadata.width > 0 && metadata.height > 0, `source did not decode: ${asset.id}`);
      assert.equal(derivativeMetadata.format, 'webp');
      assert.ok(
        derivativeMetadata.width > 0 && derivativeMetadata.height > 0,
        `derivative did not decode: ${asset.id}`,
      );
      assert.ok(derivativeMetadata.width <= 1600 && derivativeMetadata.height <= 1600);
    } else {
      assert.equal(asset.derivative.sameBytesAsSource, true);
      assert.match(sourceBytes.toString('utf8'), /^\s*<svg\b/);
      assert.match(derivativeBytes.toString('utf8'), /^\s*<svg\b/);
    }
  }
  assert.equal([...ids].filter((id) => id.startsWith('met-')).length, 4);
  assert.equal([...ids].filter((id) => id.startsWith('cover-')).length, 4);
  assert.equal([...ids].filter((id) => id.startsWith('icon-')).length, 13);
});
