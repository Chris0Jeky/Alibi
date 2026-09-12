/* Optional presentation assets. Runtime URLs stay local and content-addressed. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
function sources(root) {
  const read = (file) => fs.readFileSync(path.join(root, 'src', 'house', file), 'utf8');
  return { source: ['model.js', 'components.js', 'view.js', 'controller.js', 'bootstrap.js'].map(read).join('\n'), cssSource: read('style.css') };
}
function build(root, dist) {
  const input = sources(root), esbuild = require('esbuild');
  const source = esbuild.transformSync(input.source, { minify: true, target: 'es2022' }).code;
  const cssSource = esbuild.transformSync(input.cssSource, { loader: 'css', minify: true, target: ['chrome100', 'safari15.4'] }).code;
  const emit = (text, ext) => {
    const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
    const url = `./assets/house.${hash}.${ext}`;
    fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(dist, url), text);
    return url;
  };
  const script = emit(source, 'js'), css = emit(cssSource, 'css');
  const build = crypto.createHash('sha256').update(source + cssSource).digest('hex').slice(0,12);
  return { config: { script, css, build, files: [script, css] }, standalone: { source, cssSource }, bytes: Buffer.byteLength(source) + Buffer.byteLength(cssSource), scriptGzipBytes: zlib.gzipSync(source).length, cssGzipBytes: zlib.gzipSync(cssSource).length };
}
module.exports = { build, sources };
