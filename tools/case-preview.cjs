'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readCase } = require('./case-authoring.cjs');
function buildPreview(file) {
  const parsed = readCase(file);
  const data = JSON.stringify(parsed).replace(/</g, '\\u003c');
  const session = fs.readFileSync(path.join(__dirname, 'case-session.cjs'), 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, 'cases/preview.js'), 'utf8');
  const style = fs.readFileSync(path.join(__dirname, 'cases/preview.css'), 'utf8');
  const hash = (text) => `'sha256-${crypto.createHash('sha256').update(text).digest('base64')}'`;
  const csp = `default-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; script-src ${[data, session, ui].map(hash).join(' ')}; style-src ${hash(style)}`;
  const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>Postern case workbench</title><style>${style}</style></head><body><div id="workbench"></div><script id="case-data" type="application/json">${data}</script><script>${session}</script><script>${ui}</script></body></html>\n`;
  return { html, receipt: parsed.receipt };
}
module.exports = { buildPreview };
if (require.main === module) {
  try {
    if (process.argv.length !== 4)
      throw new Error('Usage: node tools/case-preview.cjs <case.json> <new-preview.html>');
    const { html, receipt } = buildPreview(process.argv[2]);
    // Exclusive creation refuses both existing output and symlink aliases to the input.
    fs.writeFileSync(process.argv[3], html, { encoding: 'utf8', flag: 'wx' });
    console.log(
      JSON.stringify(
        { ...receipt, previewBytes: Buffer.byteLength(html), state: 'memory-only' },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
