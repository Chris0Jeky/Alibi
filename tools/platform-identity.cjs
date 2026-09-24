'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const IDENTITY_ASSET = /^assets\/alibi-platform-identity\.[0-9a-f]{12}\.js$/;
const IDENTITY_PREFIX = 'globalThis.ALIBI_PLATFORM_BUILD=';
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function browserBundle(root, entry = 'src/platform/browser-entry.mjs') {
  return require('esbuild').buildSync({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2022',
    write: false,
  }).outputFiles[0].text;
}

function files(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Platform payload must not contain symlinks.');
    return entry.isDirectory() ? files(filename) : [filename];
  });
}

function sourceIdentity(root) {
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const sourceSha = git(['rev-parse', 'HEAD']);
  if (!/^[0-9a-f]{40}$/.test(sourceSha)) throw new Error('A full Git source commit is required.');
  return {
    sourceSha,
    sourceDirty: !!git(['status', '--porcelain=v1', '--untracked-files=all']),
  };
}

/** Bounded dirty-path sample for failure diagnostics. Never throws. */
function dirtyPaths(root, limit = 5) {
  try {
    const out = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000,
    });
    // Latin-1 keeps each byte intact while splitting Git's NUL records.
    const entries = out.toString('latin1').split('\0');
    const maximum = Number.isFinite(limit) ? Math.max(0, Math.min(5, Math.trunc(limit))) : 5;
    const shown = [];
    let total = 0;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;
      total++;
      if (shown.length < maximum) {
        const raw = entry.slice(3),
          bytes = Buffer.from(raw, 'latin1'),
          text = bytes.toString('utf8'),
          validText = Buffer.from(text, 'utf8').equals(bytes);
        let display = JSON.stringify(validText ? text : raw);
        if (!validText)
          display = display.replace(
            /[\u0080-\u00ff]/g,
            (char) => `\\x${char.charCodeAt(0).toString(16).padStart(2, '0')}`,
          );
        display = display.replace(
          /[\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g,
          (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
        );
        shown.push(display.length > 240 ? display.slice(0, 237) + '...' : display);
      }
      // Porcelain -z puts a rename/copy destination first, then its source path.
      if (/[RC]/.test(entry.slice(0, 2))) i++;
    }
    return { shown, total };
  } catch {
    return { shown: [], total: 0 };
  }
}

/** Canonical runtime graph: normalized assets/ and icons/ paths, excluding the identity itself.
 * HTML, service worker and receipts are release metadata; Android's separate artifact SHA covers
 * the complete tree. The graph includes all bundled optional code and media, not just startup.
 */
function payloadDigest(directory) {
  const entries = ['assets', 'icons']
    .flatMap((name) => files(path.join(directory, name)))
    .map((filename) => ({
      filename,
      name: path.relative(directory, filename).split(path.sep).join('/'),
    }))
    .filter((entry) => !IDENTITY_ASSET.test(entry.name))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  if (!entries.length) throw new Error('Platform payload graph is empty.');
  const hash = crypto.createHash('sha256');
  for (const entry of entries)
    hash.update(entry.name).update('\0').update(fs.readFileSync(entry.filename)).update('\0');
  return hash.digest('hex');
}

function identitySource(identity) {
  return `${IDENTITY_PREFIX}${JSON.stringify(identity)};\n`;
}

function identityAssets(directory) {
  return files(path.join(directory, 'assets'))
    .map((filename) => path.relative(directory, filename).split(path.sep).join('/'))
    .filter((name) => IDENTITY_ASSET.test(name));
}

function readIdentity(directory) {
  const names = identityAssets(directory);
  if (names.length !== 1)
    throw new Error(`Expected one platform identity asset; found ${names.length}.`);
  const source = fs.readFileSync(path.join(directory, names[0]), 'utf8');
  if (!source.startsWith(IDENTITY_PREFIX) || !source.endsWith(';\n'))
    throw new Error('Invalid platform identity framing.');
  const identity = JSON.parse(source.slice(IDENTITY_PREFIX.length, -2));
  if (source !== identitySource(identity)) throw new Error('Invalid platform identity encoding.');
  if (names[0] !== `assets/alibi-platform-identity.${sha256(source).slice(0, 12)}.js`)
    throw new Error('Platform identity filename hash is stale.');
  return { identity, source, path: names[0] };
}

function writeIdentity(directory, identity, { replace = false } = {}) {
  const previous = identityAssets(directory);
  if (previous.length !== (replace ? 1 : 0))
    throw new Error('Unexpected existing platform identity.');
  const source = identitySource(identity);
  const name = `assets/alibi-platform-identity.${sha256(source).slice(0, 12)}.js`;
  if (replace) {
    const index = path.join(directory, 'index.html');
    const html = fs.readFileSync(index, 'utf8');
    const reference = `src="./${previous[0]}"`;
    if (html.split(reference).length !== 2)
      throw new Error('Expected one platform identity reference.');
    fs.writeFileSync(index, html.replace(reference, `src="./${name}"`));
    fs.rmSync(path.join(directory, previous[0]));
  }
  fs.writeFileSync(path.join(directory, name), source);
  return { source, path: name };
}

module.exports = {
  browserBundle,
  dirtyPaths,
  IDENTITY_ASSET,
  identityAssets,
  identitySource,
  payloadDigest,
  readIdentity,
  sha256,
  sourceIdentity,
  writeIdentity,
};
