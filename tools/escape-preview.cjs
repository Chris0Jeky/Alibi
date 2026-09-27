'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const A = require('./escape-authoring.cjs');
function build(files) {
  if (!Array.isArray(files) || files.length < 1 || files.length > 12)
    throw new TypeError('rooms: expected 1..12 source paths');
  for (let i = 0; i < files.length; i++)
    if (!Object.hasOwn(files, i)) throw new TypeError('rooms: expected dense source paths');
  const ids = new Set();
  const rooms = files.map((file) => {
    if (typeof file !== 'string') throw new TypeError('rooms: expected source paths');
    const parsed = A.read(file);
    if (ids.has(parsed.definition.id)) throw new TypeError('rooms: duplicate room ID');
    ids.add(parsed.definition.id);
    const model = A.analyze(parsed.definition);
    if (model.status !== 'verified')
      throw new TypeError('Room is not proven recoverable: ' + parsed.definition.id);
    return { ...parsed, model };
  });
  // Model solutions are author evidence, not data needed by the player UI.
  const data = JSON.stringify(
    rooms.map(({ definition, receipt }) => ({ definition, receipt })),
  ).replace(/</g, '\\u003c');
  const read = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8').replace(/\r\n?/g, '\n');
  const scripts = [read('escape-state.cjs'), read('escape-session.cjs'), read('escape-ui/view.js')];
  const css = read('escape-ui/style.css');
  const hash = (text) =>
    "'sha256-" + crypto.createHash('sha256').update(text).digest('base64') + "'";
  const csp = `default-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; script-src ${[data, ...scripts].map(hash).join(' ')}; style-src ${hash(css)}`;
  const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>Postern · Rooms after closing</title><style>${css}</style></head><body><div id="escape-root"><p>Loading the room anthology. JavaScript is required for its controls.</p></div><script id="room-data" type="application/json">${data}</script>${scripts.map((s) => '<script>' + s + '</script>').join('')}</body></html>\n`;
  return { html, receipts: rooms.map(({ receipt, model }) => ({ ...receipt, model })) };
}
module.exports = { build };
if (require.main === module) {
  try {
    if (process.argv.length < 4)
      throw new Error('Usage: node tools/escape-preview.cjs <new-output.html> <room.json> ...');
    const { html, receipts } = build(process.argv.slice(3));
    fs.writeFileSync(process.argv[2], html, { encoding: 'utf8', flag: 'wx' });
    console.log(
      JSON.stringify(
        { rooms: receipts, previewBytes: Buffer.byteLength(html), persistence: 'memory-only' },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
