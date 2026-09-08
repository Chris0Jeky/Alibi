/* Decode every complete media stream, beyond container/header probing. */
'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const catalogue = JSON.parse(
  fs.readFileSync(path.join(root, 'assets-source/library/catalogue.json')),
);
const files = [...new Set(catalogue.assets.flatMap((a) => a.files.map((f) => f.path)))].filter(
  (p) => /\.(wav|ogg|opus|mp4)$/.test(p),
);
for (const relative of files) {
  const r = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-nostdin', '-i', path.join(root, relative), '-f', 'null', '-'],
    { encoding: 'utf8', timeout: 120000 },
  );
  if (r.status !== 0) throw Error(relative + ': ' + (r.error || r.stderr));
}
console.log(
  JSON.stringify({
    passed: true,
    fullyDecodedStreams: files.length,
    scope: 'Complete FFmpeg decode; no auditory quality claim',
  }),
);
