'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOM_IDS = [
  'cartography',
  'conservatory',
  'estate-1911',
  'estate-today',
  'gatehouse',
  'library',
  'museum',
  'observatory',
  'orangery',
  'study',
  'west-stair',
  'workshop',
];
const SCENE_BUDGET = 180 * 1024;
const FILM_BUDGET = 1024 * 1024;
const SCRIPT_BUDGET = 96 * 1024;

const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);

function writeAsset(dist, prefix, bytes, extension, label = '') {
  const suffix = label ? `.${label}` : '';
  const url = `./assets/${prefix}.${hash(bytes)}${suffix}.${extension}`;
  fs.writeFileSync(path.join(dist, url), bytes);
  return url;
}

function hideUnresolvedRoute(bytes, id) {
  if (id !== 'estate-1911') return bytes;
  const source = bytes.toString('utf8');
  // The supplied 1911 master contains a second dashed line that names the
  // service stair. The deduction owns that reveal, so keep it in the master
  // but remove it from the automatically delivered pre-reveal scene.
  const safe = source.replace(
    /<path d="M367 483l8-38 90-31 22 31"[^>]*stroke-dasharray="4 4"[^>]*\/>/g,
    '',
  );
  return Buffer.from(safe);
}

module.exports = function buildCastle(root, dist) {
  const source = require('esbuild').buildSync({
    entryPoints: [path.join(root, 'src/castle/entry.mjs')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2022',
    write: false,
  }).outputFiles[0].text;
  const scriptBytes = Buffer.from(source);
  const bytes = scriptBytes.byteLength;
  if (bytes > SCRIPT_BUDGET) throw Error('Castle activity exceeds its separate 96 KiB budget.');
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  const script = writeAsset(dist, 'quiet-castle', scriptBytes, 'js');

  const roomDir = path.join(root, 'assets-source/castle/rooms');
  const roomBytes = new Map();
  for (const id of ROOM_IDS) {
    const original = fs.readFileSync(path.join(roomDir, `${id}.svg`));
    const delivered = hideUnresolvedRoute(original, id);
    roomBytes.set(id, { original, delivered });
  }
  const originalSceneBytes = [...roomBytes.values()].reduce(
    (total, value) => total + value.original.length,
    0,
  );
  if (originalSceneBytes > SCENE_BUDGET)
    throw Error('Castle scene SVGs exceed their separate 180 KiB budget.');

  const media = {};
  const files = [script];
  for (const id of ROOM_IDS) {
    const url = writeAsset(dist, 'quiet-castle', roomBytes.get(id).delivered, 'svg', id);
    media[id] = url;
    files.push(url);
  }

  const prologueDir = path.join(root, 'assets-source/castle/prologue');
  const filmBytes = fs.readFileSync(path.join(prologueDir, 'wrenmere-prologue.mp4'));
  if (filmBytes.length > FILM_BUDGET)
    throw Error('Wrenmere prologue film exceeds its 1 MiB budget.');
  const posterBytes = fs.readFileSync(path.join(prologueDir, 'prologue-poster.png'));
  const captionsBytes = fs.readFileSync(path.join(prologueDir, 'prologue.vtt'));
  const transcriptBytes = fs.readFileSync(path.join(prologueDir, 'prologue-transcript.txt'));
  const film = {
    src: writeAsset(dist, 'quiet-castle', filmBytes, 'mp4'),
    poster: writeAsset(dist, 'quiet-castle', posterBytes, 'png'),
    captions: writeAsset(dist, 'quiet-castle', captionsBytes, 'vtt'),
    transcript: writeAsset(dist, 'quiet-castle', transcriptBytes, 'txt'),
  };
  const optionalBytes =
    filmBytes.length + posterBytes.length + captionsBytes.length + transcriptBytes.length;
  const totalBytes =
    bytes +
    [...roomBytes.values()].reduce((total, value) => total + value.delivered.length, 0) +
    optionalBytes;
  return {
    config: { script, files, build: hash(scriptBytes), media, film },
    // The self-contained preview has no network origin, so embed only the
    // bounded scene set. The film remains explicitly on-demand there too.
    standalone: {
      source,
      media: Object.fromEntries(
        [...roomBytes.entries()].map(([id, value]) => [
          id,
          `data:image/svg+xml;base64,${value.delivered.toString('base64')}`,
        ]),
      ),
      film: null,
    },
    bytes: totalBytes,
    scriptBytes: bytes,
    sceneBytes: [...roomBytes.values()].reduce((total, value) => total + value.delivered.length, 0),
    originalSceneBytes,
    filmBytes: optionalBytes,
  };
};

module.exports.ROOM_IDS = ROOM_IDS;
module.exports.SCENE_BUDGET = SCENE_BUDGET;
module.exports.FILM_BUDGET = FILM_BUDGET;
