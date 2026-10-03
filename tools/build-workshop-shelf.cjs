'use strict';
// Pure build stage: validate the complete catalogue before returning files to the build writer.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { loadCatalogue } = require('./workshop-catalogue.cjs');
const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char],
  );
const familyName = (type) =>
  ({ futoshiki: 'Futoshiki', lightup: 'Lanterns', nonogram: 'Picture Logic' })[type] || type;
function renderShelf(manifest, stylesheet) {
  if (!/^collections\.[a-f0-9]{12}\.css$/.test(stylesheet)) throw Error('Invalid shelf stylesheet');
  const cards = manifest.collections
    .map((entry) => {
      if (
        !/^[a-z][a-z0-9-]{0,59}$/.test(entry.id) ||
        !/^[a-f0-9]{64}$/.test(entry.sha256) ||
        entry.download !== `${entry.id}.${entry.sha256}.json`
      )
        throw Error('Invalid download identity');
      return `<article aria-labelledby="${entry.id}-title"><p class="eyebrow">${entry.count} puzzles · optional collection</p><h2 id="${entry.id}-title">${escape(entry.title)}</h2><p>${escape(entry.description)}</p><p class="families">${entry.families.map(({ type, count }) => `${count} ${escape(familyName(type))}`).join(' · ')}</p><a class="button" href="../assets/workshop/${entry.download}" download="${entry.id}.json">Download ${escape(entry.id === 'lattice' ? 'Lattice' : entry.id === 'afterlight' ? 'Afterlight' : entry.id)} JSON</a><details><summary>Source identity and size</summary><p>Pack version ${entry.packVersion} · ${entry.bytes.toLocaleString('en-GB')} bytes</p><p class="digest">SHA-256<br><code>${entry.sha256}</code></p></details></article>`;
    })
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"><title>Alibi · Optional puzzle collections</title><link rel="stylesheet" href="../assets/workshop/${stylesheet}"></head><body><a class="skip" href="#collections">Skip to collections</a><main><header><a class="brand" href="../#/workshop">alibi:</a><p class="eyebrow">The workshop · optional studies</p><h1>More room to think.</h1><p class="intro">Original collections for a longer evening of deduction. Choose a pack, then add it through Alibi's existing Workshop.</p></header><section class="instructions" aria-labelledby="import-title"><h2 id="import-title">A download is not an installation.</h2><ol><li>Download a JSON pack below and keep the file.</li><li>Return to your Alibi tab, open <strong>Workshop → Puzzle packs</strong>, then <strong>Choose a JSON pack</strong>.</li><li>Select the downloaded file. Alibi validates it before adding anything.</li></ol><p>Downloads need a connection. Imported puzzles and progress stay on this device; offline play requires Alibi's offline setup to be ready. This page cannot tell which packs you have installed.</p><p>Difficulty labels are provisional, not measured player ratings. JSON files contain solutions for validation and optional reveals; reading the files directly can spoil answers.</p></section><section id="collections" class="collections" aria-label="Optional collections">${cards}</section><footer><a class="button secondary" href="../#/workshop">Return to the Workshop</a><p>Adding a pack never changes your existing puzzle IDs or saved definitions. An already installed pack is refused rather than overwritten.</p></footer></main></body></html>\n`;
}
function buildShelf(root = path.resolve(__dirname, '..')) {
  const catalogue = loadCatalogue(root);
  const css = require('esbuild').transformSync(
    fs.readFileSync(path.join(root, 'src/workshop-collections.css'), 'utf8'),
    {
      loader: 'css',
      minify: true,
      target: ['chrome100', 'safari15.4'],
    },
  ).code;
  const stylesheet = `collections.${createHash('sha256').update(css).digest('hex').slice(0, 12)}.css`;
  const files = [
    ...catalogue.files.map((file) => ({ path: 'assets/workshop/' + file.path, data: file.data })),
    {
      path: 'assets/workshop/catalogue.json',
      data: Buffer.from(JSON.stringify(catalogue.manifest, null, 2) + '\n'),
    },
    { path: 'assets/workshop/' + stylesheet, data: Buffer.from(css) },
    {
      path: 'collections/index.html',
      data: Buffer.from(renderShelf(catalogue.manifest, stylesheet)),
    },
  ];
  return { files, bytes: files.reduce((total, file) => total + file.data.length, 0) };
}
module.exports = { renderShelf, buildShelf };
