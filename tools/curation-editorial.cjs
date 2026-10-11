'use strict';
const fs = require('node:fs');
const path = require('node:path');
function load(root, catalogue) {
  const read = (name) =>
    JSON.parse(fs.readFileSync(path.join(root, 'content/curation/editorial', name), 'utf8'));
  const notes = read('puzzle-notes.json');
  const collections = read('collections.json');
  if (notes.schema !== 'alibi-editorial/v1' || collections.schema !== 'alibi-collections/v1')
    throw Error('Unsupported trusted editorial schema');
  if (!Array.isArray(notes.puzzles)) throw Error('Invalid editorial: puzzles missing puzzles');
  if (!Array.isArray(collections.collections))
    throw Error('Invalid editorial collection: collections missing collections');
  const known = new Map(catalogue.puzzles.map((p) => [p.id, p]));
  const seen = new Set();
  const entries = notes.puzzles.map((n) => {
    if (typeof n !== 'object' || n === null)
      throw Error('Invalid editorial: ' + (n?.id ?? n) + ' missing note');
    if (typeof n.provenance !== 'object' || n.provenance === null || Array.isArray(n.provenance))
      throw Error('Invalid editorial: ' + n.id + ' missing provenance');
    if (!Array.isArray(n.hints)) throw Error('Invalid editorial: ' + n.id + ' missing hints');
    if (typeof n.difficultyStatus !== 'string' && !Array.isArray(n.difficultyStatus))
      throw Error('Invalid editorial: ' + n.id + ' missing difficultyStatus');
    if (seen.has(n.id) || known.get(n.id)?.type !== n.family)
      throw Error('Invalid editorial ID: ' + n.id);
    seen.add(n.id);
    if (n.provenance.humanPlaytested !== false || !n.difficultyStatus.includes('provisional'))
      throw Error('Unverified calibration claim');
    return {
      id: n.id,
      revision: known.get(n.id).revision,
      venue: n.venue,
      goal: n.goal,
      rules: n.rules,
      controls: n.controls,
      tactic:
        n.hints.find((h) => h.applies === 'general tactic, not a claim of a forced move')?.text ||
        '',
      answer: n.answer,
      difficultyStatus: n.difficultyStatus,
    };
  });
  const assigned = new Set();
  for (const c of collections.collections) {
    if (typeof c !== 'object' || c === null)
      throw Error('Invalid editorial collection: ' + (c?.id ?? c) + ' missing collection');
    if (!/^[a-z]+$/.test(c.id)) throw Error('Invalid venue');
    if (!Array.isArray(c.puzzleIds))
      throw Error('Invalid editorial collection: ' + c.id + ' missing puzzleIds');
    for (const id of c.puzzleIds) {
      if (!seen.has(id) || assigned.has(id) || entries.find((n) => n.id === id).venue !== c.id)
        throw Error('Invalid anthology membership');
      assigned.add(id);
    }
  }
  if (assigned.size !== seen.size) throw Error('Missing anthology membership');
  return { entries, collections: collections.collections };
}
module.exports = { load };
