/* Explicit editorial acquisition, never run by the build. Existing inputs are not overwritten. */
'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
async function main() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'assets-source/online/after-hours.json')),
  );
  const output = path.join(root, 'assets-source/online/acquired');
  fs.mkdirSync(output, { recursive: true });
  const receipt = path.join(output, 'receipt.json');
  const records = fs.existsSync(receipt) ? JSON.parse(fs.readFileSync(receipt)).assets : [];
  for (const asset of manifest.assets) {
    const url = new URL(asset.remote.url);
    url.searchParams.delete('auto');
    url.searchParams.set('fm', 'webp');
    url.searchParams.set('w', '1400');
    url.searchParams.set('q', '76');
    const file = path.join(output, asset.id + '.webp');
    if (fs.existsSync(file)) {
      const previous = records.find((a) => a.id === asset.id);
      if (
        !previous ||
        previous.url !== url.href ||
        crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== previous.sha256
      )
        throw Error('Refusing to overwrite ' + file);
      continue;
    }
    const response = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: {
        Accept: 'image/webp',
        Origin: 'https://alibi-after-hours-preview.commit-atlas.workers.dev',
      },
    });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/webp'))
      throw Error('Unexpected image: ' + asset.id);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 1024 * 1024) throw Error('Image budget exceeded');
    const metadata = await require('sharp')(bytes).metadata();
    fs.writeFileSync(file, bytes);
    records.push({
      id: asset.id,
      url: url.href,
      file: path.relative(root, file).split(path.sep).join('/'),
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length,
      mime: 'image/webp',
      width: metadata.width,
      height: metadata.height,
      cors: response.headers.get('access-control-allow-origin'),
      sourcePage: asset.remote.sourcePage,
      photographer: asset.remote.photographer,
      provider: asset.remote.provider,
      license: asset.remote.license,
      acquired: new Date().toISOString(),
    });
    console.log(asset.id, bytes.length, metadata.width, metadata.height, records.at(-1).cors);
    fs.writeFileSync(
      path.join(output, 'receipt.json'),
      JSON.stringify({ schemaVersion: 1, assets: records }, null, 2) + '\n',
    );
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
