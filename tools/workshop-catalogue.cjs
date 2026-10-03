'use strict';
// Build-time source policy only. Installation still belongs to the Workshop worker.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
require('../src/core.js');
require('../src/engines.js');
const C = require('../src/bridges.js');
const { load: officialCatalogue } = require('./official-catalogue.cjs');
const ROOT = path.resolve(__dirname, '..');
const PACK_LIMIT = 3 * 1024 * 1024;
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const fail = (message) => {
  throw Error('Workshop catalogue: ' + message);
};
function fields(value, keys, label) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    fail('invalid ' + label + ' fields');
}
function policyEntries(policy) {
  fields(policy, ['schemaVersion', 'collections'], 'policy');
  if (
    policy.schemaVersion !== 1 ||
    !Array.isArray(policy.collections) ||
    policy.collections.length < 1 ||
    policy.collections.length > 12
  )
    fail('expected schema 1 with 1–12 collections');
  const slugs = new Set(),
    packs = new Set(),
    sources = new Set();
  for (const entry of policy.collections) {
    fields(
      entry,
      ['id', 'source', 'packId', 'packVersion', 'bytes', 'sha256', 'description'],
      'entry',
    );
    if (
      typeof entry.id !== 'string' ||
      !/^[a-z][a-z0-9-]{0,59}$/.test(entry.id) ||
      typeof entry.source !== 'string' ||
      !/^[a-z][a-z0-9-]{0,79}\.json$/.test(entry.source) ||
      typeof entry.packId !== 'string' ||
      !/^[a-z][a-z0-9-]{0,79}$/.test(entry.packId) ||
      !Number.isSafeInteger(entry.packVersion) ||
      entry.packVersion < 1 ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 1 ||
      entry.bytes > PACK_LIMIT ||
      typeof entry.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      typeof entry.description !== 'string' ||
      !entry.description.trim() ||
      entry.description.length > 600
    )
      fail('invalid entry metadata');
    if (slugs.has(entry.id) || packs.has(entry.packId) || sources.has(entry.source))
      fail('duplicate collection identity or source');
    slugs.add(entry.id);
    packs.add(entry.packId);
    sources.add(entry.source);
  }
  return policy.collections;
}
function json(data, label) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    fail(label + ' is not valid UTF-8');
  }
  try {
    return JSON.parse(text);
  } catch {
    fail(label + ' is not valid JSON');
  }
}
function buildCatalogue(policy, readSource, officialIds = []) {
  const entries = policyEntries(policy);
  if (
    typeof readSource !== 'function' ||
    !Array.isArray(officialIds) ||
    officialIds.some((id) => typeof id !== 'string')
  )
    fail('invalid build inputs');
  const seen = new Set(officialIds),
    collections = [],
    files = [];
  for (const entry of entries) {
    const source = readSource(entry.source);
    if (!Buffer.isBuffer(source) || source.length !== entry.bytes)
      fail('source byte count mismatch');
    if (sha256(source) !== entry.sha256) fail('source digest mismatch');
    const pack = json(source, 'collection');
    C.validatePack(pack, true);
    if (pack.id !== entry.packId || pack.version !== entry.packVersion)
      fail('pack identity mismatch');
    const families = new Map();
    for (const puzzle of pack.puzzles) {
      if (seen.has(puzzle.id)) fail('Duplicate puzzle identity: ' + puzzle.id);
      if (puzzle.difficultyStatus !== 'provisional') fail('this shelf requires provisional labels');
      seen.add(puzzle.id);
      families.set(puzzle.type, (families.get(puzzle.type) || 0) + 1);
    }
    const download = `${entry.id}.${entry.sha256}.json`;
    collections.push({
      id: entry.id,
      packId: pack.id,
      packVersion: pack.version,
      title: pack.title,
      description: entry.description,
      count: pack.puzzles.length,
      families: [...families]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([type, count]) => ({ type, count })),
      difficultyStatus: 'provisional',
      download,
      bytes: source.length,
      sha256: entry.sha256,
    });
    files.push({ path: download, data: Buffer.from(source) });
  }
  return { manifest: { schemaVersion: 1, collections }, files };
}
function readRegular(filename, maxBytes) {
  const before = fs.lstatSync(filename);
  if (!before.isFile() || before.size > maxBytes)
    fail('source must be a bounded regular file, not a symlink');
  const fd = fs.openSync(
    filename,
    fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0),
  );
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > maxBytes) fail('source must be a bounded regular file');
    const data = Buffer.alloc(stat.size + 1);
    let offset = 0;
    while (offset < data.length) {
      const count = fs.readSync(fd, data, offset, data.length - offset, null);
      if (!count) break;
      offset += count;
    }
    if (offset !== stat.size) fail('source changed during bounded read');
    return data.subarray(0, offset);
  } finally {
    fs.closeSync(fd);
  }
}
function loadCatalogue(root = ROOT) {
  const directory = path.join(root, 'content/workshop');
  const policy = json(readRegular(path.join(directory, 'catalogue.json'), 64 * 1024), 'policy');
  const entries = policyEntries(policy);
  const sources = new Map(
    entries.map((entry) => [
      entry.source,
      readRegular(path.join(directory, entry.source), PACK_LIMIT),
    ]),
  );
  const ids = officialCatalogue(root, false).puzzles.map((puzzle) => puzzle.id);
  return buildCatalogue(policy, (name) => sources.get(name), ids);
}
if (require.main === module) {
  if (process.argv.length !== 3 || process.argv[2] !== '--check')
    fail('Usage: node tools/workshop-catalogue.cjs --check');
  console.log(JSON.stringify(loadCatalogue().manifest, null, 2));
}
module.exports = { buildCatalogue, loadCatalogue };
