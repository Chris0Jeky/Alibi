'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

module.exports = function buildTimeline(root, dist) {
  const source = require('esbuild').buildSync({
    entryPoints: [path.join(root, 'src/timeline-lab/entry.mjs')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2022',
    loader: { '.css': 'text' },
    write: false,
  }).outputFiles[0].text;
  const bytes = Buffer.from(source);
  if (bytes.length > 48 * 1024)
    throw Error('Timeline Desk exceeds its separate 48 KiB asset budget.');
  const build = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  const script = `./assets/timeline-lab.${build}.js`;
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dist, script), bytes);
  return {
    config: { build, script, files: [script] },
    standalone: { source, build },
    bytes: bytes.length,
    gzipBytes: zlib.gzipSync(bytes).length,
  };
};
