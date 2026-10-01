'use strict';
// Reproduce the reviewed derivatives with the repository's pinned Sharp version.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = __dirname;
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const entries = manifest.assets;
  const checkOnly = process.argv.includes('--check');
  for (const item of entries) {
    if (!/^[a-z0-9-]+\.webp$/.test(item.file)) throw Error('Unsafe asset filename');
    const bytes = fs.readFileSync(path.join(root, item.file));
    if (bytes.length !== item.bytes || hash(bytes) !== item.sha256) throw Error('Changed input: ' + item.file);
  }
  let count = 0;
  for (const item of entries.filter((entry) => entry.kind === 'runtime')) {
    const match = item.file.match(/^(.*)-(280|320|560|640)\.webp$/);
    if (!match) throw Error('Unsupported derivative: ' + item.file);
    const master = entries.find((entry) => entry.kind === 'source-webp' && entry.file === match[1] + '.webp');
    if (!master) throw Error('Missing master: ' + item.file);
    const preset = manifest.processing.presetsByWave[item.wave];
    if (!preset || typeof preset.fastShrinkOnLoad !== 'boolean') throw Error('Missing resize preset');
    const bytes = await sharp(path.join(root, master.file))
      .resize({ width: Number(match[2]), fastShrinkOnLoad: preset.fastShrinkOnLoad })
      .webp({ quality: 85, alphaQuality: 95, effort: 6 })
      .toBuffer();
    if (hash(bytes) !== item.sha256) throw Error('Non-reproducible derivative: ' + item.file);
    if (!checkOnly) fs.writeFileSync(path.join(root, item.file), bytes);
    count++;
  }
  console.log(`Verified ${entries.length} asset hashes and reproduced ${count} derivatives${checkOnly ? ' without writing' : ''}.`);
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
