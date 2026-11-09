'use strict';

// Build only the checked-in Mirror Ledger prototype; no arbitrary inputs or output paths.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'prototypes/mirror-ledger');
const output = path.join(root, 'test-results/mirror-ledger');
const htmlPath = path.join(source, 'index.html');
const cssPath = path.join(source, 'style.css');
const entry = path.join(source, 'app.mjs');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const bundle = esbuild.buildSync({
  absWorkingDir: root,
  entryPoints: [entry],
  bundle: true,
  write: false,
  metafile: true,
  format: 'iife',
  target: 'es2022',
  minify: true,
});
if (
  bundle.outputFiles.length !== 1 ||
  Object.values(bundle.metafile.outputs).some((x) => x.imports.length)
)
  throw Error('Mirror Ledger bundle must be a single self-contained script.');
const inputs = Object.keys(bundle.metafile.inputs).sort();
if (inputs.some((x) => !x.startsWith('prototypes/mirror-ledger/')))
  throw Error('Unexpected Mirror Ledger bundle input.');
const css = fs.readFileSync(cssPath, 'utf8');
if (/@import\b|url\s*\(/i.test(css)) throw Error('External CSS assets are not supported.');
const script = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const style = css.replace(/<\/style/gi, '<\\/style');
const template = fs.readFileSync(htmlPath, 'utf8');
const cssTag = '<link rel="stylesheet" href="style.css" />';
const jsTag = '<script type="module" src="app.mjs"></script>';
function replaceExactlyOnce(text, needle, replacement) {
  if (text.split(needle).length !== 2) throw Error(`Expected exactly one ${needle}`);
  return text.replace(needle, () => replacement);
}
let html = replaceExactlyOnce(template, cssTag, `<style>\n${style}\n</style>`);
html = replaceExactlyOnce(html, jsTag, `<script>\n${script}\n</script>`);
// Refuse unbundled scripts/styles or other fetched HTML assets if the template changes.
if (/<(?:script|link|img|iframe|audio|video|source)\b[^>]*\b(?:src|href)\s*=/i.test(html))
  throw Error('Unexpected external asset in Mirror Ledger HTML.');
fs.mkdirSync(output, { recursive: true });
const file = path.join(output, 'mirror-ledger.html');
fs.writeFileSync(file, html);
const sourceFiles = [
  'prototypes/mirror-ledger/index.html',
  'prototypes/mirror-ledger/style.css',
  ...inputs,
  'tools/build-mirror-preview.cjs',
  'package-lock.json',
].sort();
const receipt = {
  format: 'mirror-ledger-preview-build-1',
  esbuild: esbuild.version,
  sources: Object.fromEntries(
    [...new Set(sourceFiles)].map((p) => [p, sha256(fs.readFileSync(path.join(root, p)))]),
  ),
  output: { file: 'mirror-ledger.html', bytes: Buffer.byteLength(html), sha256: sha256(html) },
};
fs.writeFileSync(path.join(output, 'build-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
