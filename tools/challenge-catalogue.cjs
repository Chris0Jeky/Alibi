'use strict';
// One release-owned source list for both the optional launcher and backup worker.
const fs = require('node:fs');
const path = require('node:path');
function load(root = path.resolve(__dirname, '..')) {
  const dir = path.join(root, 'content/challenges');
  const registry = JSON.parse(fs.readFileSync(path.join(dir, 'registry.json'), 'utf8'));
  const packs = registry.packs;
  if (
    registry.schema !== 1 ||
    !Array.isArray(packs) ||
    !packs.length ||
    packs.length > 16 ||
    packs.some((p) => typeof p !== 'string' || !/^[a-z][a-z0-9-]*\.json$/.test(p)) ||
    new Set(packs).size !== packs.length
  )
    throw Error('Invalid challenge source registry.');
  const entries = packs.flatMap((p) => {
    const bytes = fs.readFileSync(path.join(dir, p));
    if (bytes.length > 512 * 1024) throw Error('Challenge source exceeds its byte bound.');
    const pack = JSON.parse(bytes.toString('utf8'));
    if (
      pack.schema !== 'alibi-curation-challenges/v1' ||
      pack.notASchema1ImportPack !== true ||
      !Array.isArray(pack.challenges)
    )
      throw Error('Invalid challenge source pack.');
    return pack.challenges;
  });
  if (
    !entries.length ||
    entries.length > 128 ||
    new Set(entries.map((c) => c?.id)).size !== entries.length
  )
    throw Error('Invalid challenge source count or duplicate ID.');
  return entries;
}
function runtime(entries) {
  const authoring = new Set([
    'verification',
    'status',
    'sourceKind',
    'humanPlaytested',
    'provenance',
    'referenceScore',
    'rootMoveValues',
    'greedyScore',
    'greedyActions',
  ]);
  return entries.map((c) =>
    Object.fromEntries(Object.entries(c).filter(([key]) => !authoring.has(key))),
  );
}
module.exports = { load, runtime };
