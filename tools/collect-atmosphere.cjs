'use strict';
// Explicit acquisition, then repeatable local conversion. The normal build never downloads art.
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  sharp = require('sharp');
const root = path.resolve(__dirname, '..'),
  source = path.join(root, 'assets-source/atmosphere');
const works = [
  { id: 'reading-room', object: 435991, width: 600 },
  { id: 'conservatory-study', object: 11393, width: 650 },
  { id: 'coastal-light', object: 11903, width: 1000 },
];
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`Acquisition failed: ${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}
(async () => {
  fs.mkdirSync(source, { recursive: true });
  const receipts = [];
  for (const work of works) {
    const api = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${work.object}`;
    const recordPath = path.join(source, work.id + '.record.json');
    if (process.argv.includes('--fetch')) fs.writeFileSync(recordPath, await get(api));
    const data = JSON.parse(fs.readFileSync(recordPath));
    if (
      data.objectID !== work.object ||
      data.isPublicDomain !== true ||
      !data.primaryImage?.startsWith('https://images.metmuseum.org/')
    )
      throw Error('Missing explicit public-domain image evidence.');
    const imageURL = data.primaryImage;
    const imagePath = path.join(source, work.id + '.jpg');
    if (process.argv.includes('--fetch')) fs.writeFileSync(imagePath, await get(imageURL));
    const original = fs.readFileSync(imagePath),
      originalMeta = await sharp(original).metadata();
    const optimized = await sharp(original)
      .rotate()
      .resize({ width: work.width, withoutEnlargement: true })
      .webp({ quality: 64, effort: 6 })
      .toBuffer();
    const meta = await sharp(optimized).metadata();
    await sharp(optimized).raw().toBuffer();
    fs.writeFileSync(path.join(root, 'src/artwork', work.id + '.webp'), optimized);
    receipts.push({
      id: work.id,
      artist: data.artistDisplayName,
      title: data.title,
      date: data.objectDate,
      record: api,
      imageURL,
      creditLine: data.creditLine,
      publicDomain: data.isPublicDomain,
      original: {
        sha256: hash(original),
        bytes: original.length,
        width: originalMeta.width,
        height: originalMeta.height,
      },
      optimized: {
        sha256: hash(optimized),
        bytes: optimized.length,
        width: meta.width,
        height: meta.height,
      },
      modifications:
        'Resized and encoded as WebP; no generative alteration or attribution as fictional evidence.',
    });
  }
  fs.writeFileSync(
    path.join(source, 'rights.json'),
    JSON.stringify(
      {
        institution: 'The Metropolitan Museum of Art',
        policy: 'https://www.metmuseum.org/hubs/open-access',
        works: receipts,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    JSON.stringify(
      receipts.map((r) => ({
        id: r.id,
        bytes: r.optimized.bytes,
        width: r.optimized.width,
        height: r.optimized.height,
      })),
      null,
      2,
    ),
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
