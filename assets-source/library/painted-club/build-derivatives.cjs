'use strict';
// Reproduce the reviewed derivatives with the repository's pinned Sharp version.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = __dirname;
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');

function verifyFingerprint(item) {
  let bytes;
  try {
    bytes = fs.readFileSync(path.join(root, item.file));
  } catch (error) {
    if (error.code === 'ENOENT') throw Error('Changed input: ' + item.file);
    throw error;
  }
  if (bytes.length !== item.bytes || hash(bytes) !== item.sha256)
    throw Error('Changed input: ' + item.file);
}

function derivativePath(item) {
  if (!/^[a-z0-9-]+\.webp$/.test(item.file)) throw Error('Unsafe asset filename');
  return path.join(root, item.file);
}

function inspectDerivative(item, checkOnly) {
  const outputPath = derivativePath(item);
  let stat;
  try {
    stat = fs.lstatSync(outputPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (checkOnly) throw Error('Changed input: ' + item.file);
      return false;
    }
    throw error;
  }
  if (!stat.isFile() || stat.nlink !== 1) throw Error('Unsafe output: ' + item.file);
  const bytes = fs.readFileSync(outputPath);
  const valid = bytes.length === item.bytes && hash(bytes) === item.sha256;
  if (checkOnly && !valid) throw Error('Changed input: ' + item.file);
  return valid;
}

function replaceDerivative(item, bytes) {
  const outputPath = derivativePath(item);
  const tempPath = path.join(
    root,
    `.${item.file}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`,
  );
  try {
    fs.writeFileSync(tempPath, bytes, { flag: 'wx' });
    try {
      const current = fs.lstatSync(outputPath);
      if (!current.isFile() || current.nlink !== 1) throw Error('Unsafe output: ' + item.file);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    // Replace only a rechecked regular, single-link output. Atomic rename avoids
    // exposing a partial derivative; links are refused under the upstream policy.
    fs.renameSync(tempPath, outputPath);
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const entries = manifest.assets;
  const checkOnly = process.argv.includes('--check');

  for (const item of entries) {
    if (!/^[a-z0-9-]+\.webp$/.test(item.file)) throw Error('Unsafe asset filename');
  }

  // Validate every master and other non-runtime input before examining or
  // generating any derivatives, so no damaged master can cause a partial repair.
  for (const item of entries.filter((entry) => entry.kind !== 'runtime')) verifyFingerprint(item);

  const runtime = entries.filter((entry) => entry.kind === 'runtime');
  const repairs = [];
  const tasks = runtime.map((item) => {
    const match = item.file.match(/^(.*)-(280|320|560|640)\.webp$/);
    if (!match) throw Error('Unsupported derivative: ' + item.file);
    const master = entries.find(
      (entry) => entry.kind === 'source-webp' && entry.file === match[1] + '.webp',
    );
    if (!master) throw Error('Missing master: ' + item.file);
    const preset = manifest.processing.presetsByWave[item.wave];
    if (!preset || typeof preset.fastShrinkOnLoad !== 'boolean')
      throw Error('Missing resize preset');

    const valid = inspectDerivative(item, checkOnly);
    if (!valid && !checkOnly) repairs.push(item);
    return { item, master, width: Number(match[2]), preset };
  });

  const generated = [];
  for (const task of tasks) {
    if (!checkOnly && !repairs.includes(task.item)) continue;
    const bytes = await sharp(path.join(root, task.master.file))
      .resize({ width: task.width, fastShrinkOnLoad: task.preset.fastShrinkOnLoad })
      .webp({ quality: 85, alphaQuality: 95, effort: 6 })
      .toBuffer();
    if (bytes.length !== task.item.bytes || hash(bytes) !== task.item.sha256)
      throw Error('Non-reproducible derivative: ' + task.item.file);
    generated.push({ item: task.item, bytes });
  }

  if (!checkOnly) {
    for (const output of generated) replaceDerivative(output.item, output.bytes);
  }

  const label = repairs.length === 1 ? 'derivative' : 'derivatives';
  console.log(
    checkOnly
      ? `Verified ${entries.length} asset hashes and reproduced ${generated.length} derivatives without writing.`
      : `Verified ${entries.length} asset hashes and checked ${runtime.length} derivatives; restored ${repairs.length} ${label}.`,
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
