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
const cityReceipt = JSON.parse(
  fs.readFileSync(path.join(root, 'assets-source/quiet-wing/city/receipt.json')),
);
const townDownload = JSON.parse(
  fs.readFileSync(path.join(root, 'assets-source/quiet-wing/city/town/download-receipt.json')),
);
const cityReceiptByModel = new Map(cityReceipt.models.map((entry) => [entry.model, entry]));
function rightsFor(asset) {
  if (asset.status !== 'current') return { author: 'Alibi', licenceVersion: 'Original work' };
  const receipt = cityReceiptByModel.get(asset.id);
  return {
    author: 'Kenney',
    sourcePage:
      asset.source.includes('/town/') ? townDownload.source : 'https://kenney.nl/assets/castle-kit',
    licenceVersion: receipt?.licence === 'CC0-1.0' ? 'CC0 1.0' : receipt?.licence,
    receipt: 'assets-source/quiet-wing/city/receipt.json',
  };
}
const master = {
  id: 'realm-kit-master',
  title: 'Realm kit Blender master',
  category: 'realm',
  status: 'proposed',
  design: 'original',
  source: 'tools/assets/build-realm-library.py',
  derivatives: [
    'assets-source/library/realm/realm-kit.blend',
    'assets-source/library/realm/scenes/harbour.glb',
    'assets-source/library/realm/thumbnails/scene-harbour.png',
  ],
  metadata: realm.master,
  provenance: 'Original Alibi editable master containing the three composed reference collections.',
  accessibility: 'Harbour GLB and static thumbnail accompany the editable Blender master.',
  integration: 'Candidate library only; no runtime import.',
  qa: 'Master opens with populated scene collections; the companion GLB is structure-checked.',
};
write(path.join(realmDir, 'catalogue.json'), {
  schemaVersion: 2,
  master,
  assets: realm.assets.map((asset) => ({
    id: asset.id,
    title: title(asset.id),
    category: 'realm',
    status: asset.status,
    design: asset.status === 'current' ? 'reused' : 'original',
    source: asset.source,
    derivatives: asset.derivatives.map((file) => 'assets-source/library/realm/' + file),
    metadata: { ...asset.metadata, palette: realm.palette, rights: rightsFor(asset) },
    provenance: asset.provenance,
    accessibility:
      'Measured GLB with a static PNG thumbnail; use the thumbnail when WebGL or motion is unavailable.',
    integration: asset.integrationReference || asset.integration,
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
    metadata: { views: ['isometric', 'alternate isometric'], rights: { author: 'Alibi', licenceVersion: 'Original work' } },
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
    design: 'reused',
    source: asset.source,
    derivatives: asset.derivatives.map(
      (file) =>
        'assets-source/library/companions/' +
        file.replace(/^(assets-source\/library\/companions\/)+/, ''),
    ),
    metadata: asset.metadata,
    provenance: asset.provenance,
    accessibility:
      'Named, layered SVG rig plus a PNG fallback for every practical state; reduced motion remains static.',
    integration: asset.integrationReference || asset.integration || 'src/quiet-wing/pets.js and src/quiet-wing/pet-view.js',
    qa: 'All eight named practical states, layer identifiers and static thumbnails are checked by tests/asset-models.test.cjs.',
  })),
});
