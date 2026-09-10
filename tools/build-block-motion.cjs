/* Optional, hashed game surface. No runtime CDN or third-party asset requests. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const esbuild = require('esbuild');
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
module.exports = function buildBlockMotion(root, dist) {
  const source = esbuild.buildSync({
    entryPoints: [path.join(root, 'src/block-cabinet/integration.mjs')],
    bundle: true, minify: true, format: 'iife', target: 'es2022', write: false,
  }).outputFiles[0].text;
  const art = Buffer.from(fs.readFileSync(path.join(root, 'assets-source/block-cabinet/atelier.webp.base64'), 'utf8').trim(), 'base64');
  if (hash(art) !== 'd86585f9454add30a42ae113260234cc9fb469fe18c03a58a116a5f5e8997343')
    throw Error('Block Cabinet artwork checksum mismatch. Review provenance before replacing.');
  const artName = `block-atelier.${hash(art).slice(0, 12)}.webp`;
  const cssBase = fs.readFileSync(path.join(root, 'src/block-cabinet/style.css'), 'utf8');
  const css = esbuild.transformSync(cssBase + `\n.bc-studio{--bc-art:url('./${artName}')}`, { loader: 'css', minify: true }).code;
  const scriptURL = `./assets/block-motion.${hash(source).slice(0, 12)}.js`;
  const cssURL = `./assets/block-motion.${hash(css).slice(0, 12)}.css`;
  const artURL = './assets/' + artName;
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  for (const [file, bytes] of [[scriptURL, source], [cssURL, css], [artURL, art]]) fs.writeFileSync(path.join(dist, file), bytes);
  return {
    config: { build: hash(source + css).slice(0, 12), script: scriptURL, css: cssURL, files: [scriptURL, cssURL, artURL] },
    standalone: { source, cssSource: cssBase + `\n.bc-studio{--bc-art:url('data:image/webp;base64,${art.toString('base64')}')}` },
    bytes: Buffer.byteLength(source) + Buffer.byteLength(css) + art.length,
  };
};
