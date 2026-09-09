/* Local production gallery. No game service worker or private repository endpoints. */
'use strict';
const http = require('node:http'),
  fs = require('node:fs'),
  path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.glb': 'model/gltf-binary',
  '.md': 'text/plain; charset=utf-8',
};
http
  .createServer((req, res) => {
    let name;
    try {
      name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (name === '/') name = '/assets-source/library/index.html';
    const file = path.resolve(root, '.' + name);
    const allowed = [
      'assets-source/library/',
      'assets-source/quiet-wing/',
      'src/artwork/',
      'src/quiet-wing/',
      'src/app.js',
      'src/presentation.js',
      'src/illustrations/',
      'docs/',
      'tools/assets/',
    ].some((prefix) => name.startsWith('/' + prefix));
    if (!allowed || !file.startsWith(root + path.sep)) {
      res.writeHead(403).end('Not a gallery asset');
      return;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end('Missing asset');
      return;
    }
    const size = fs.statSync(file).size;
    let start = 0,
      end = size - 1,
      status = 200;
    if (req.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if (!match) {
        res.writeHead(416).end();
        return;
      }
      start = Number(match[1]);
      end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      if (start > end || start >= size) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
        return;
      }
      status = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    }
    res.writeHead(status, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Content-Length': end - start + 1,
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(file, { start, end }).pipe(res);
  })
  .listen(Number(process.env.PORT || 8790), '127.0.0.1', () =>
    console.log('Asset gallery: http://127.0.0.1:' + (process.env.PORT || 8790)),
  );
