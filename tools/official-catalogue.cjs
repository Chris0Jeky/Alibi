'use strict';
const fs = require('node:fs');
const path = require('node:path');
require('../src/core.js');
require('../src/engines.js');
const C = require('../src/bridges.js');

// Build-only trust boundary. Player imports continue through the bounded worker.
function aggregate(packs, checkUnique = true) {
  const ids = new Set();
  const packIds = new Set();
  const puzzles = [];
  for (const input of packs) {
    const pack = C.validatePack(input, checkUnique);
    if (packIds.has(pack.id)) throw Error('Duplicate official pack ID: ' + pack.id);
    packIds.add(pack.id);
    for (const p of pack.puzzles) {
      if (ids.has(p.id)) throw Error('Duplicate official puzzle ID: ' + p.id);
      ids.add(p.id);
    }
    // Validation is a check, not permission to rewrite published definitions.
    puzzles.push(...input.puzzles);
  }
  if (!packs.length) throw Error('Official catalogue is empty');
  return { ...packs[0], puzzles };
}
function registry(root) {
  const value = JSON.parse(
    fs.readFileSync(path.join(root, 'content', 'official-packs.json'), 'utf8'),
  );
  if (value.schemaVersion !== 1 || !Array.isArray(value.packs))
    throw Error('Unsupported official pack registry');
  const deferred = value.deferred ?? [];
  // Deferred packs are still official content: delivered after startup, never omitted.
  if (
    !Array.isArray(deferred) ||
    new Set(deferred).size !== deferred.length ||
    deferred.some((file) => !value.packs.includes(file))
  )
    throw Error('Deferred official packs must be distinct registered packs');
  return { packs: value.packs, deferred };
}
function readPacks(root, files) {
  const dir = path.join(root, 'content');
  return files.map((file) => {
    if (!/^[a-z0-9/-]+\.json$/.test(file) || file.includes('..'))
      throw Error('Invalid official pack path');
    const bytes = fs.readFileSync(path.join(dir, file));
    if (bytes.length > 3 * 1024 * 1024) throw Error('Official source pack exceeds 3 MB');
    return JSON.parse(bytes.toString('utf8'));
  });
}
function load(root = path.resolve(__dirname, '..'), checkUnique = true) {
  return aggregate(readPacks(root, registry(root).packs), checkUnique);
}
// The full catalogue plus the keys (id@revision) whose definitions ship in the deferred chunk.
function partition(root = path.resolve(__dirname, '..'), checkUnique = true) {
  const { packs, deferred } = registry(root);
  const sources = readPacks(root, packs);
  const deferredKeys = new Set(
    sources
      .filter((_, i) => deferred.includes(packs[i]))
      .flatMap((pack) => pack.puzzles.map((p) => p.id + '@' + p.revision)),
  );
  return { catalog: aggregate(sources, checkUnique), deferred: deferredKeys };
}
module.exports = { load, aggregate, partition };
