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
function load(root = path.resolve(__dirname, '..'), checkUnique = true) {
  const dir = path.join(root, 'content');
  const registry = JSON.parse(fs.readFileSync(path.join(dir, 'official-packs.json'), 'utf8'));
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.packs))
    throw Error('Unsupported official pack registry');
  return aggregate(
    registry.packs.map((file) => {
      if (!/^[a-z0-9/-]+\.json$/.test(file) || file.includes('..'))
        throw Error('Invalid official pack path');
      const bytes = fs.readFileSync(path.join(dir, file));
      if (bytes.length > 3 * 1024 * 1024) throw Error('Official source pack exceeds 3 MB');
      return JSON.parse(bytes.toString('utf8'));
    }),
    checkUnique,
  );
}
module.exports = { load, aggregate };
