'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

module.exports = function buildCastle(root, dist) {
  const source = require('esbuild').buildSync({
    entryPoints: [path.join(root, 'src/castle/entry.mjs')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2022',
    write: false,
  }).outputFiles[0].text;
  const hash = crypto.createHash('sha256').update(source).digest('hex').slice(0, 12);
  const script = `./assets/quiet-castle.${hash}.js`;
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dist, script), source);
  return { config: { script }, standalone: { source }, bytes: Buffer.byteLength(source) };
};
