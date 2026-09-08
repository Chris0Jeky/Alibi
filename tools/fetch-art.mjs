/** Opt-in museum asset ingestion. Node 22. No credentials. Never assumes a museum's whole collection is public domain. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  dest = path.join(root, 'assets-source/quiet-wing/museum');
const records = {
  wave: {
    provider: 'met',
    id: 45434,
    record: 'https://www.metmuseum.org/art/collection/search/45434',
  },
  portrait: {
    provider: 'aic',
    id: 80607,
    record: 'https://www.artic.edu/artworks/80607/self-portrait',
  },
  bedroom: {
    provider: 'aic',
    id: 28560,
    record: 'https://www.artic.edu/artworks/28560/the-bedroom',
  },
  sunday: {
    provider: 'aic',
    id: 27992,
    record: 'https://www.artic.edu/artworks/27992/a-sunday-on-la-grande-jatte-1884',
  },
};
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(
    'node tools/fetch-art.mjs [wave portrait bedroom sunday]\nDownloads only explicitly public-domain museum records, with an 8 MB image cap. Stores source/rights receipts and SHA-256. Run npm run build afterwards to package offline images.',
  );
  process.exit(0);
}
const ids = args.length ? args : Object.keys(records);
for (const id of ids) if (!records[id]) throw Error('Unknown artwork ' + id);
const allowed = new Set([
  'collectionapi.metmuseum.org',
  'images.metmuseum.org',
  'www.metmuseum.org',
  'api.artic.edu',
  'www.artic.edu',
]);
async function limited(url, limit) {
  const u = new URL(url);
  if (u.protocol !== 'https:' || !allowed.has(u.hostname))
    throw Error('Unapproved source host ' + u.hostname);
  const response = await fetch(u, {
    signal: AbortSignal.timeout(20000),
    headers: {
      'User-Agent': 'Alibi-Quiet-Wing/1.0',
      'AIC-User-Agent': 'Alibi Quiet Wing (https://github.com/Chris0Jeky/Alibi)',
    },
    redirect: 'error',
  });
  if (!response.ok) throw Error('HTTP ' + response.status);
  if (Number(response.headers.get('content-length') || 0) > limit)
    throw Error('Asset exceeds size limit');
  const chunks = [];
  let n = 0;
  for await (const chunk of response.body) {
    n += chunk.length;
    if (n > limit) {
      await response.body.cancel?.().catch(() => {});
      throw Error('Asset exceeds streaming limit');
    }
    chunks.push(chunk);
  }
  return {
    bytes: Buffer.concat(chunks),
    type: (response.headers.get('content-type') || '').split(';')[0],
  };
}
await fs.mkdir(dest, { recursive: true });
let ledger = {};
try {
  ledger = JSON.parse(await fs.readFile(path.join(dest, 'rights.json'), 'utf8'));
} catch {}
for (const id of ids) {
  try {
    const rec = records[id],
      api =
        rec.provider === 'met'
          ? `https://collectionapi.metmuseum.org/public/collection/v1/objects/${rec.id}`
          : `https://api.artic.edu/api/v1/artworks/${rec.id}?fields=id,title,artist_display,date_display,credit_line,is_public_domain,image_id`;
    const raw = JSON.parse((await limited(api, 2_000_000)).bytes.toString('utf8')),
      data = rec.provider === 'met' ? raw : raw.data;
    if ((rec.provider === 'met' ? data.isPublicDomain : data.is_public_domain) !== true)
      throw Error('Explicit public-domain flag absent. Refusing download.');
    await fs.writeFile(path.join(dest, id + '.record.json'), JSON.stringify(raw, null, 2));
    const image =
      rec.provider === 'met'
        ? data.primaryImageSmall || data.primaryImage
        : data.image_id
          ? `https://www.artic.edu/iiif/2/${encodeURIComponent(data.image_id)}/full/843,/0/default.jpg`
          : null;
    if (!image) throw Error('No downloadable museum image');
    const out = await limited(image, 8_000_000);
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[out.type];
    if (!ext) throw Error('Unsupported image content type ' + out.type);
    const name = id + '.' + ext;
    await fs.writeFile(path.join(dest, name + '.tmp'), out.bytes);
    await fs.rename(path.join(dest, name + '.tmp'), path.join(dest, name));
    ledger[id] = {
      file: name,
      provider: rec.provider,
      objectID: rec.id,
      record: rec.record,
      api,
      image,
      retrievedAt: new Date().toISOString(),
      publicDomain: true,
      title: data.title,
      artist: data.artistDisplayName || data.artist_display,
      date: data.objectDate || data.date_display,
      credit: data.creditLine || data.credit_line,
      sha256: crypto.createHash('sha256').update(out.bytes).digest('hex'),
      bytes: out.bytes.length,
    };
    console.log(id + ': downloaded ' + out.bytes.length + ' bytes, rights verified.');
  } catch (e) {
    console.error(id + ': NOT downloaded. ' + e.message);
    process.exitCode = 1;
  }
}
await fs.writeFile(path.join(dest, 'rights.json'), JSON.stringify(ledger, null, 2));
