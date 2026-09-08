'use strict';

// Build and check the small, local runtime tier from the retained original bytes.
// The 1600px curation masters and their registry are never rewritten by this tool.
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const masterRegistryPath = path.join(root, 'assets-source', 'curation', 'registry.json');
const runtimeRegistryPath = path.join(root, 'assets-source', 'curation', 'runtime.json');
const runtimeRoot = path.join(root, 'src', 'curation-assets', 'runtime');
const maxBytes = 220 * 1024;
const museumIds = ['met-melencolia', 'met-celestial', 'met-kanbara', 'met-irises'];
const settings = [
  { maxDimension: 600, quality: 70 },
  { maxDimension: 560, quality: 68 },
  { maxDimension: 520, quality: 66 },
  { maxDimension: 480, quality: 64 },
  { maxDimension: 440, quality: 62 },
  { maxDimension: 400, quality: 60 },
  { maxDimension: 360, quality: 58 },
];

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function repoFile(file) {
  if (typeof file !== 'string' || !file.startsWith('assets-source/curation/')) {
    throw new Error(`Unexpected source path: ${file}`);
  }
  const resolved = path.resolve(root, file);
  if (!resolved.startsWith(`${root}${path.sep}`))
    throw new Error(`Source path escaped repo: ${file}`);
  return resolved;
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

async function writeAtomic(file, bytes) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}`;
  await fsp.writeFile(temp, bytes);
  await fsp.rename(temp, file);
}

async function loadMasters() {
  const registry = JSON.parse(await fsp.readFile(masterRegistryPath, 'utf8'));
  const byId = new Map(registry.assets.map((asset) => [asset.id, asset]));
  return museumIds.map((id) => {
    const asset = byId.get(id);
    if (!asset || asset.kind !== 'museum-image') throw new Error(`Missing museum master: ${id}`);
    return asset;
  });
}

async function render(masters, option) {
  const rendered = [];
  for (const master of masters) {
    const sourcePath = repoFile(master.source.file);
    const sourceBytes = await fsp.readFile(sourcePath);
    const sourceHash = sha256(sourceBytes);
    if (sourceHash !== master.source.sha256) throw new Error(`Master hash changed: ${master.id}`);
    const sourceMetadata = await sharp(sourceBytes).metadata();
    const bytes = await sharp(sourceBytes)
      .rotate()
      .resize({
        width: option.maxDimension,
        height: option.maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .removeAlpha()
      .webp({ quality: option.quality, effort: 6 })
      .toBuffer();
    const metadata = await sharp(bytes).metadata();
    rendered.push({
      master,
      sourceBytes,
      sourceMetadata,
      bytes,
      metadata,
    });
  }
  return rendered;
}

function makeRegistry(rendered, option) {
  const assets = rendered.map(({ master, sourceBytes, sourceMetadata, bytes, metadata }) => ({
    id: master.id,
    venue: master.venue,
    source: {
      registry: relative(masterRegistryPath),
      path: master.source.file,
      sha256: sha256(sourceBytes),
      bytes: sourceBytes.length,
      width: sourceMetadata.width,
      height: sourceMetadata.height,
      mime: 'image/jpeg',
    },
    runtime: {
      path: relative(path.join(runtimeRoot, `${master.id}.webp`)),
      sha256: sha256(bytes),
      bytes: bytes.length,
      width: metadata.width,
      height: metadata.height,
      mime: 'image/webp',
    },
    originalSha256: sha256(sourceBytes),
    derivation: {
      maxDimension: option.maxDimension,
      quality: option.quality,
      transform:
        'Decode retained JPEG; apply EXIF orientation; RGB conversion; aspect-preserving fit inside the runtime cap; WebP encode; no crop or generative alteration.',
    },
  }));
  return {
    schemaVersion: 1,
    sourceRegistry: relative(masterRegistryPath),
    budget: {
      maxBytes,
      totalBytes: assets.reduce((total, asset) => total + asset.runtime.bytes, 0),
      totalKiB: Number(
        (assets.reduce((total, asset) => total + asset.runtime.bytes, 0) / 1024).toFixed(2),
      ),
    },
    settings: option,
    assets,
  };
}

async function generate() {
  const masters = await loadMasters();
  let chosen;
  let rendered;
  for (const option of settings) {
    const attempt = await render(masters, option);
    const total = attempt.reduce((sum, asset) => sum + asset.bytes.length, 0);
    if (total <= maxBytes) {
      chosen = option;
      rendered = attempt;
      break;
    }
    console.log(
      `runtime candidate ${option.maxDimension}px/q${option.quality}: ${total} bytes; over ${maxBytes}`,
    );
  }
  if (!chosen || !rendered) throw new Error(`No runtime candidate fits ${maxBytes} bytes`);
  await Promise.all(
    rendered.map((asset) =>
      writeAtomic(path.join(runtimeRoot, `${asset.master.id}.webp`), asset.bytes),
    ),
  );
  const registry = makeRegistry(rendered, chosen);
  await writeAtomic(
    runtimeRegistryPath,
    Buffer.from(`${JSON.stringify(registry, null, 2)}\n`, 'utf8'),
  );
  console.log(
    `runtime ${chosen.maxDimension}px/q${chosen.quality}: ${registry.budget.totalBytes} bytes (${registry.budget.totalKiB} KiB)`,
  );
}

async function check() {
  const registry = JSON.parse(await fsp.readFile(runtimeRegistryPath, 'utf8'));
  if (registry.schemaVersion !== 1) throw new Error('Unexpected runtime registry schema');
  if (registry.budget.maxBytes !== maxBytes) throw new Error('Runtime budget changed');
  if (registry.assets.length !== museumIds.length) throw new Error('Runtime museum count changed');
  if (registry.budget.totalBytes > maxBytes) throw new Error(`Runtime exceeds ${maxBytes} bytes`);
  const masters = await loadMasters();
  const masterById = new Map(masters.map((asset) => [asset.id, asset]));
  let total = 0;
  for (const asset of registry.assets) {
    if (!masterById.has(asset.id)) throw new Error(`Unexpected runtime id: ${asset.id}`);
    if (asset.runtime.mime !== 'image/webp')
      throw new Error(`Unexpected runtime MIME: ${asset.id}`);
    if (asset.runtime.width > 600 || asset.runtime.height > 600)
      throw new Error(`Runtime dimensions exceed cap: ${asset.id}`);
    const runtimePath = path.resolve(root, asset.runtime.path);
    if (!runtimePath.startsWith(`${runtimeRoot}${path.sep}`))
      throw new Error(`Runtime path escaped output root: ${asset.id}`);
    const bytes = await fsp.readFile(runtimePath);
    const metadata = await sharp(bytes).metadata();
    await sharp(bytes).raw().toBuffer();
    if (metadata.format !== 'webp') throw new Error(`Runtime did not decode as WebP: ${asset.id}`);
    if (sha256(bytes) !== asset.runtime.sha256 || bytes.length !== asset.runtime.bytes)
      throw new Error(`Runtime hash/size mismatch: ${asset.id}`);
    const master = masterById.get(asset.id);
    const sourceBytes = await fsp.readFile(repoFile(master.source.file));
    if (
      sha256(sourceBytes) !== asset.originalSha256 ||
      asset.originalSha256 !== master.source.sha256
    )
      throw new Error(`Original hash mismatch: ${asset.id}`);
    total += bytes.length;
  }
  if (total !== registry.budget.totalBytes) throw new Error('Runtime total mismatch');
  console.log(`runtime check passed: ${registry.assets.length} assets, ${total} bytes`);
}

(process.argv.includes('--check') ? check() : generate()).catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
