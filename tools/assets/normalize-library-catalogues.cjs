'use strict';
// Normalizes source-generator metadata into the gallery's deliberately small contract.
const fs = require('node:fs'),
  path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const title = (id) => id.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
function write(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
const realmDir = path.join(root, 'assets-source/library/realm');
const realm = JSON.parse(fs.readFileSync(path.join(realmDir, 'export-metadata.json')));
write(path.join(realmDir, 'catalogue.json'), {
  schemaVersion: 2,
  assets: realm.assets.map((asset) => ({
    id: asset.id,
    title: title(asset.id),
    category: 'realm',
    status: asset.status,
    design: asset.status === 'current' ? 'reused' : 'original',
    source: asset.source,
    derivatives: asset.derivatives.map((file) => 'assets-source/library/realm/' + file),
    metadata: { ...asset.metadata, palette: realm.palette },
    provenance: asset.provenance,
    accessibility:
      'Measured GLB with a static PNG thumbnail; use the thumbnail when WebGL or motion is unavailable.',
    integration: asset.integrationReference,
    qa: 'Validated as a GLB 2.0 container with embedded buffer/material definitions and finite measured bounds.',
  })),
  scenes: realm.scenes.map((id) => ({
    id,
    title: title(id),
    category: 'realm',
    status: 'proposed',
    design: 'original',
    source: 'tools/assets/build-realm-library.py',
    derivatives: [
      `assets-source/library/realm/scenes/${id}.glb`,
      `assets-source/library/realm/thumbnails/scene-${id}.png`,
      `assets-source/library/realm/thumbnails/scene-${id}-alt.png`,
    ],
    metadata: { views: ['isometric', 'alternate isometric'] },
    provenance: 'Original Alibi composition from retained and original library modules.',
    accessibility: 'Two static rendered views accompany the GLB.',
    integration: 'Candidate library only; no runtime import.',
    qa: 'GLB structure and both preview PNGs are checked by tests/asset-models.test.cjs.',
  })),
});
const companionDir = path.join(root, 'assets-source/library/companions');
const companions = JSON.parse(fs.readFileSync(path.join(companionDir, 'catalogue.json')));
write(path.join(companionDir, 'catalogue.json'), {
  schemaVersion: 2,
  assets: companions.assets.map((asset) => ({
    id: asset.id,
    title: asset.id === 'dragon' ? 'Nimbus' : { cat: 'Miso', fox: 'Fern', owl: 'Pip' }[asset.id],
    category: 'companions',
    status: asset.status,
    design: 'original',
    source: asset.source,
    derivatives: asset.derivatives.map((file) => 'assets-source/library/companions/' + file),
    metadata: asset.metadata,
    provenance: asset.provenance,
    accessibility:
      'Named, layered SVG rig plus a PNG fallback for every practical state; reduced motion remains static.',
    integration: asset.integrationReference,
    qa: 'All eight named practical states, layer identifiers and static thumbnails are checked by tests/asset-models.test.cjs.',
  })),
});
