/* Local development only. Bind to localhost, never expose a development server publicly. */
const http = require('node:http'),
  fs = require('node:fs'),
  path = require('node:path');
function readSecurityPolicy(root, fsLib = fs) {
  let headers;
  try {
    headers = fsLib.readFileSync(path.join(root, '_headers'), 'utf8');
  } catch {
    return null;
  }
  try {
    if (typeof headers !== 'string') return null;
    const match = headers.match(/Content-Security-Policy: (.+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}
let warnedMissingPolicy = false;
const root = path.resolve(__dirname, '../dist'),
  port = Number(process.env.PORT || 8787),
  types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.glb': 'model/gltf-binary',
    '.ogg': 'audio/ogg',
    '.opus': 'audio/ogg',
    '.mp4': 'video/mp4',
    '.vtt': 'text/vtt; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
    '.json': 'application/json',
  };
function pipeFile(res, fsLib, file, options) {
  const stream = options ? fsLib.createReadStream(file, options) : fsLib.createReadStream(file);
  stream.on('error', () => {
    try {
      res.destroy();
    } catch {
      // Already tearing down; never crash the dev server.
    }
  });
  stream.pipe(res);
}
function createHandler(rootDir, fsLib = fs) {
  // Load and validate _headers once at startup. A missing or CSP-less file
  // is a controlled fallback (serve without CSP), never an uncaught throw.
  let cachedCsp = null;
  try {
    cachedCsp = readSecurityPolicy(rootDir, fsLib);
  } catch {
    cachedCsp = null;
  }
  if (!cachedCsp && !warnedMissingPolicy) {
    warnedMissingPolicy = true;
    console.error(
      'Alibi: dist/_headers is missing a Content-Security-Policy; serving without CSP',
    );
  }
  return (req, res) => {
    let name;
    try {
      name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end('Bad request');
      return;
    }
    try {
      let file = path.resolve(rootDir, '.' + name);
      if (file !== rootDir && !file.startsWith(rootDir + path.sep)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      if (name.endsWith('/')) file = path.join(file, 'index.html');
      // Mirror the primary host: an extensionless shared path answers its
      // `<alias>.html` redirect document instead of 404ing (issue #244).
      if ((!fsLib.existsSync(file) || !fsLib.statSync(file).isFile()) && !path.extname(file)) {
        const sibling = file + '.html';
        if (fsLib.existsSync(sibling) && fsLib.statSync(sibling).isFile()) file = sibling;
      }
      let status = 200;
      if (!fsLib.existsSync(file) || !fsLib.statSync(file).isFile()) {
        // Mirror the primary host's `not_found_handling: "404-page"` (wrangler.jsonc).
        file = path.join(rootDir, '404.html');
        status = 404;
        if (!fsLib.existsSync(file)) {
          res.writeHead(404).end('Not found');
          return;
        }
      }
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-cache');
      if (cachedCsp) {
        res.setHeader('Content-Security-Policy', cachedCsp);
      }
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405).end();
        return;
      }
      const size = fsLib.statSync(file).size;
      res.statusCode = status;
      res.setHeader('Accept-Ranges', 'bytes');
      if (req.headers.range && status === 200) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        let start = match?.[1] ? Number(match[1]) : 0;
        let end = match?.[2] ? Number(match[2]) : size - 1;
        if (match && !match[1] && match[2]) {
          start = Math.max(0, size - Number(match[2]));
          end = size - 1;
        }
        if (
          !match ||
          (!match[1] && !match[2]) ||
          start > end ||
          start >= size ||
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end)
        ) {
          res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
          return;
        }
        end = Math.min(end, size - 1);
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': end - start + 1,
        });
        if (req.method === 'HEAD') res.end();
        else pipeFile(res, fsLib, file, { start, end });
        return;
      }
      res.setHeader('Content-Length', size);
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      pipeFile(res, fsLib, file);
    } catch {
      try {
        if (res.headersSent) {
          res.destroy();
        } else {
          res.writeHead(500).end('Internal error');
        }
      } catch {
        try {
          res.destroy();
        } catch {
          // Last resort: nothing left to tear down.
        }
      }
    }
  };
}
const server = http.createServer(createHandler(root, fs));
if (require.main === module) {
  server.listen(port, '127.0.0.1', () =>
    console.log(`Alibi: http://127.0.0.1:${port} (Ctrl+C to stop)`),
  );
}
module.exports = { readSecurityPolicy, createHandler };
