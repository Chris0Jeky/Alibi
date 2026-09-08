'use strict';

// Bounded, opt-in acquisition for the object-level museum candidates. The normal
// app/build never calls this tool and never fetches museum hosts.
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const candidatesPath = path.join(root, 'alibi-curation', 'provenance', 'museum-candidates.json');
const sourceRoot = path.join(root, 'assets-source', 'curation');
const derivativeRoot = path.join(root, 'src', 'curation-assets');
const museumSourceRoot = path.join(sourceRoot, 'museum');
const museumDerivativeRoot = path.join(derivativeRoot, 'museum');
const suppliedSourceRoot = path.join(sourceRoot, 'supplied');
const suppliedDerivativeRoot = path.join(derivativeRoot, 'supplied');
const MAX_API_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
const ALLOWED_HOSTS = new Set(['collectionapi.metmuseum.org', 'images.metmuseum.org']);
const POLICY_URL = 'https://www.metmuseum.org/hubs/open-access';

const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

async function fetchBounded(url, maxBytes) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(`Unapproved museum host: ${url}`);
  }
  const response = await fetch(parsed, {
    signal: AbortSignal.timeout(30000),
    headers: { 'User-Agent': 'AlibiCurationAssetAcquisition/1.0 (Open Access artwork)' },
    redirect: 'error',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new Error(`Response exceeds ${maxBytes} byte limit`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maxBytes) {
      await response.body.cancel?.().catch(() => {});
      throw new Error(`Response exceeds ${maxBytes} byte limit`);
    }
    chunks.push(chunk);
  }
  return {
    bytes: Buffer.concat(chunks),
    contentType: (response.headers.get('content-type') || '').split(';')[0],
  };
}

async function writeNew(file, bytes) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    const existing = await fsp.readFile(file);
    if (!existing.equals(bytes)) throw new Error(`Refusing to overwrite changed file: ${file}`);
    return;
  }
  const temp = `${file}.tmp-${process.pid}`;
  await fsp.writeFile(temp, bytes);
  await fsp.rename(temp, file);
}

async function copyNew(source, destination) {
  return writeNew(destination, await fsp.readFile(source));
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function fileReceipt(file, bytes, dimensions = undefined) {
  return {
    file: relative(file),
    sha256: hash(bytes),
    bytes: bytes.length,
    ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {}),
  };
}

async function acquireMuseum(candidate) {
  const apiResponse = await fetchBounded(candidate.apiRecord, MAX_API_BYTES);
  const record = JSON.parse(apiResponse.bytes.toString('utf8'));
  if (record.objectID !== candidate.objectId || record.isPublicDomain !== true) {
    throw new Error('Object identity or explicit isPublicDomain=true check failed');
  }
  const imageUrl = record.primaryImage;
  if (!imageUrl?.startsWith('https://images.metmuseum.org/')) {
    throw new Error('Current API record did not provide an approved primary image URL');
  }
  const imageResponse = await fetchBounded(imageUrl, MAX_IMAGE_BYTES);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(imageResponse.contentType)) {
    throw new Error(`Unsupported image content type: ${imageResponse.contentType || '(missing)'}`);
  }
  const original = imageResponse.bytes;
  const originalMeta = await sharp(original).metadata();
  await sharp(original).raw().toBuffer();
  const optimized = await sharp(original)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .webp({ quality: 88, effort: 6 })
    .toBuffer();
  const optimizedMeta = await sharp(optimized).metadata();
  await sharp(optimized).raw().toBuffer();

  const originalPath = path.join(museumSourceRoot, `${candidate.id}.jpg`);
  const recordPath = path.join(museumSourceRoot, `${candidate.id}.record.json`);
  const derivativePath = path.join(museumDerivativeRoot, `${candidate.id}.webp`);
  await writeNew(originalPath, original);
  await writeNew(recordPath, Buffer.from(`${JSON.stringify(record, null, 2)}\n`, 'utf8'));
  await writeNew(derivativePath, optimized);

  return {
    id: candidate.id,
    kind: 'museum-image',
    venue: candidate.venue,
    title: record.title,
    artist: record.artistDisplayName,
    date: record.objectDate,
    alt: candidate.alt,
    editorialNote: candidate.editorialNote,
    source: {
      institution: 'The Metropolitan Museum of Art',
      objectId: record.objectID,
      accession: record.accessionNumber,
      objectPage: candidate.sourcePage,
      apiRecord: candidate.apiRecord,
      imageUrl,
      contentType: imageResponse.contentType,
      publicDomain: record.isPublicDomain,
      apiRightsFlag: 'isPublicDomain === true',
      creditLine: record.creditLine,
      ...fileReceipt(originalPath, original, {
        width: originalMeta.width,
        height: originalMeta.height,
      }),
    },
    rights: {
      policy: POLICY_URL,
      licence: 'CC0 for designated Met Open Access public-domain images',
      credit: `${record.artistDisplayName}. ${record.title}, ${record.objectDate}. The Metropolitan Museum of Art, ${record.creditLine}. Public Domain / Open Access.`,
    },
    derivative: {
      ...fileReceipt(derivativePath, optimized, {
        width: optimizedMeta.width,
        height: optimizedMeta.height,
      }),
      format: 'image/webp',
      transform:
        'RGB decode; EXIF orientation; aspect-preserving fit within 1600×1600; WebP quality 88; no crop',
    },
  };
}

async function includeSupplied(file, kind, id) {
  const originalBytes = await fsp.readFile(file);
  const sourcePath = path.join(suppliedSourceRoot, path.basename(file));
  const derivativePath = path.join(suppliedDerivativeRoot, path.basename(file));
  await writeNew(sourcePath, originalBytes);
  await writeNew(derivativePath, originalBytes);
  return {
    id,
    kind,
    source: {
      catalogue: relative(file),
      ...fileReceipt(sourcePath, originalBytes),
      rights:
        'Supplied original Alibi curation vector; repository-owned input retained for integration.',
    },
    derivative: {
      ...fileReceipt(derivativePath, originalBytes),
      format: 'image/svg+xml',
      transform: 'Copied byte-for-byte; vector source is already the delivery form.',
      sameBytesAsSource: true,
    },
  };
}

async function main() {
  const manifest = JSON.parse(await fsp.readFile(candidatesPath, 'utf8'));
  const assets = [];
  for (const candidate of manifest.assets) {
    const asset = await acquireMuseum(candidate);
    assets.push(asset);
    console.log(
      `${candidate.id}: acquired object ${candidate.objectId} with current isPublicDomain=true`,
    );
  }
  const covers = ['copper', 'nocturne', 'salt', 'winter'];
  for (const name of covers) {
    assets.push(
      await includeSupplied(
        path.join(root, 'alibi-curation', 'assets', 'covers', `${name}.svg`),
        'venue-cover',
        `cover-${name}`,
      ),
    );
  }
  const icons = [
    'aquarium',
    'binary',
    'bridges',
    'dossier',
    'futoshiki',
    'lightup',
    'network',
    'nonogram',
    'scene',
    'sudoku',
    'tents',
    'trail',
    'witness',
  ];
  for (const name of icons) {
    assets.push(
      await includeSupplied(
        path.join(root, 'alibi-curation', 'assets', 'icons', `${name}.svg`),
        'family-icon',
        `icon-${name}`,
      ),
    );
  }
  const unavailable = (manifest.excluded || []).map((item) => ({
    ...item,
    status: 'excluded',
    reason: `${item.reason} No bytes were acquired or referenced by the app.`,
  }));
  const registry = {
    schemaVersion: 1,
    generatedAt: '2026-09-08',
    purpose:
      'Trusted source and derivative registry for curation artwork. This registry contains no answer art.',
    policy: {
      noHotlinks: true,
      museumApiFlag: 'isPublicDomain === true',
      museumPolicy: POLICY_URL,
      sourceRoot: 'assets-source/curation',
      derivativeRoot: 'src/curation-assets',
    },
    assets,
    reused: [],
    unavailable,
  };
  const registryPath = path.join(sourceRoot, 'registry.json');
  await writeNew(registryPath, Buffer.from(`${JSON.stringify(registry, null, 2)}\n`, 'utf8'));
  await writeNew(
    path.join(sourceRoot, 'README.md'),
    Buffer.from(
      '# Curation artwork\n\nThis directory retains the original bytes and object-level provenance for curation artwork. The matching optimized delivery files are in src/curation-assets.\n\nMuseum images were acquired only after rechecking each Met API record and requiring isPublicDomain: true plus an approved images.metmuseum.org image URL. The registry records source and derivative SHA-256 hashes, credits, transforms and local paths. The registry contains no answer art and no hotlinks are required at runtime.\n\nThe excluded Monet candidate remains recorded as unavailable in registry.json; its object page withheld image download, so no substitute or placeholder was added.\n',
      'utf8',
    ),
  );
  console.log(`Wrote ${assets.length} trusted registry entries to ${relative(registryPath)}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
