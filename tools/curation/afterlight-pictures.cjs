'use strict';
// Compile fixed authored pixels, not random seeds or runtime-generated boards.
const fs = require('node:fs');
const path = require('node:path');
const { validatePack } = require('../../src/core.js');
const root = path.resolve(__dirname, '../..');
const sourcePath = path.join(root, 'content/curation/editorial/afterlight-blueprints.json');
const packPath = path.join(root, 'content/workshop/afterlight-pictures.json');

function runs(line) {
  const groups = [];
  let length = 0;
  for (const bit of line) {
    if (bit !== 0 && bit !== 1) throw Error('Pixels must be zero or one');
    if (bit) length++;
    else if (length) {
      groups.push(length);
      length = 0;
    }
  }
  if (length) groups.push(length);
  return groups.length ? groups : [0];
}

function build(source) {
  const invalidCollection = () => Error('Expected a complete ten-study Afterlight collection');
  if (source?.schemaVersion !== 1 || !Array.isArray(source.studies) || source.studies.length !== 10)
    throw invalidCollection();
  const expectedIds = new Set(
    Array.from(
      { length: 10 },
      (_, index) => `afterlight-picture-${String(index + 1).padStart(2, '0')}`,
    ),
  );
  // Check the complete fixed membership before reading pixels or constructing output.
  for (const study of source.studies) {
    if (!expectedIds.delete(study?.id)) throw invalidCollection();
  }
  const puzzles = source.studies.map((study) => {
    if (study.rows?.length !== 15 || !Array.from(study.rows).every((row) => /^[.#]{15}$/.test(row)))
      throw Error('Expected fifteen complete rows of fifteen pixels');
    const solution = study.rows
      .join('')
      .split('')
      .map((pixel) => Number(pixel === '#'));
    return {
      id: study.id,
      revision: 1,
      type: 'nonogram',
      title: study.title,
      subtitle: 'Afterlight workshop pictures · difficulty provisional',
      difficulty: study.difficulty,
      difficultyStatus: 'provisional',
      difficultyEvidence:
        'Fixed authored 15×15 drawing with independently checked uniqueness and a complete answer-independent line-deduction route. Editorial tier only; not a measured human difficulty or solve-time claim.',
      size: 15,
      story: study.story,
      solution,
      rowClues: Array.from({ length: 15 }, (_, row) =>
        runs(solution.slice(row * 15, row * 15 + 15)),
      ),
      colClues: Array.from({ length: 15 }, (_, col) =>
        runs(Array.from({ length: 15 }, (_, row) => solution[row * 15 + col])),
      ),
    };
  });
  const pack = {
    schemaVersion: 1,
    id: source.packId,
    version: 1,
    title: 'Alibi · Afterlight workshop pictures',
    author: 'Alibi',
    puzzles,
  };
  // Use the same bounded metadata, rule and uniqueness checks as Workshop import.
  // Keep authored bytes unchanged, and refuse before --write can touch the old pack.
  validatePack(pack, true);
  return pack;
}

function serialize(pack) {
  // Compact data is reviewable one puzzle per line and does not join the starter bundle.
  const { puzzles, ...header } = pack;
  return (
    JSON.stringify(header).slice(0, -1) +
    ',"puzzles":[\n' +
    puzzles.map((p) => JSON.stringify(p)).join(',\n') +
    '\n]}\n'
  );
}

if (require.main === module) {
  const output = serialize(build(JSON.parse(fs.readFileSync(sourcePath, 'utf8'))));
  if (process.argv.length === 3 && process.argv[2] === '--write')
    fs.writeFileSync(packPath, output);
  else if (process.argv.length === 3 && process.argv[2] === '--check') {
    if (fs.readFileSync(packPath, 'utf8') !== output)
      throw Error('Afterlight pack is stale; regenerate and review the definition changes');
  } else throw Error('Usage: node tools/curation/afterlight-pictures.cjs --write|--check');
}
module.exports = { runs, build, serialize };
