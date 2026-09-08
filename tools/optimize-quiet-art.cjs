'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  sharp = require('sharp');
const root = path.resolve(__dirname, '..'),
  input = path.join(root, 'assets-source/quiet-wing/museum'),
  output = path.join(root, 'src/quiet-wing/assets/museum');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
(async () => {
  const ledger = JSON.parse(fs.readFileSync(path.join(input, 'rights.json')));
  fs.mkdirSync(output, { recursive: true });
  const receipt = {};
  for (const [id, record] of Object.entries(ledger)) {
    if (!['wave', 'portrait', 'bedroom', 'sunday'].includes(id) || record.publicDomain !== true)
      throw Error('Unverified record');
    if (!new RegExp('^' + id + '\\.(jpg|png|webp)$').test(record.file))
      throw Error('Unexpected source file');
    const bytes = fs.readFileSync(path.join(input, record.file));
    if (sha(bytes) !== record.sha256) throw Error('Source hash mismatch: ' + id);
    const source = await sharp(bytes).metadata();
    if (!source.width || !source.height || source.width * source.height > 40000000)
      throw Error('Invalid image dimensions');
    const optimized = await sharp(bytes)
      .rotate()
      .resize({ width: 960, height: 960, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toBuffer();
    const decoded = await sharp(optimized).metadata();
    await sharp(optimized).raw().toBuffer();
    fs.writeFileSync(path.join(output, id + '.webp'), optimized);
    receipt[id] = {
      ...record,
      sourceWidth: source.width,
      sourceHeight: source.height,
      optimizedFile: id + '.webp',
      optimizedSha256: sha(optimized),
      optimizedBytes: optimized.length,
      width: decoded.width,
      height: decoded.height,
      recipe: 'sharp rotate; fit inside 960x960 without enlargement; WebP quality 82 effort 6',
    };
  }
  fs.writeFileSync(path.join(output, 'rights.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
