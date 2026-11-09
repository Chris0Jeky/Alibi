'use strict';
// Offline study selection and editorial evidence. Never imported by the game or its workers.
const assert = require('node:assert/strict');
const Q = require('./study-quality.cjs');
const C = require('../../src/bridges.js');
const seeds = require('./night-recipes.cjs');
const { load } = require('../official-catalogue.cjs');

const limits = { binary: 60000, futoshiki: 6000, independent: 500000 };
const specs = [
  { type: 'binary', size: 6, count: 15, pool: 40, firstSeed: 11092026 },
  { type: 'binary', size: 8, count: 15, pool: 40, firstSeed: 21092026 },
  { type: 'futoshiki', size: 7, count: 12, pool: 28, firstSeed: 31092026 },
];
const binaryTitles = [
  'The first pane of morning',
  'A sun between the hedges',
  'The balcony ledger',
  'Clock face at six',
  'Two bands of shade',
  'The half-lit greenhouse',
  'The quiet north row',
  'A narrow crescent of clues',
  "The gardener's compass",
  'Five symbols at noon',
  'The last balanced bed',
  'Crosswind over the orchard',
  'A row before sunrise',
  'The paired glasshouse',
  'A small sky of equal halves',
  'The long eastern roof',
  'Eight bells before dawn',
  "The observatory's double pane",
  'Two constellations apart',
  'The narrow moonpath',
  'Four clues along the beam',
  'A balanced weather chart',
  'The roof with no twins',
  'A lattice in long light',
  'Noon through the high windows',
  'The quiet western column',
  'The tilted sundial',
  'A moon at the garden gate',
  'The shadow ledgers',
  'The last window of morning',
];
const futoshikiTitles = [
  'The ladder across the courtyard',
  'A rank for every window',
  'Steps above the fountain',
  'The turning stair',
  'Seven shelves of glass',
  "The archivist's inequality",
  'A low mark meets a high row',
  'The crooked inventory',
  'The stairway of seven',
  'Ranks under the pergola',
  'The crossing ascent',
  "The conservator's grid",
];

function candidateEligible(puzzle) {
  if (!puzzle || !['binary', 'futoshiki'].includes(puzzle.type)) return false;
  try {
    C.validateDefinition(puzzle);
    const m = Q.metrics(puzzle);
    if (puzzle.type === 'binary') {
      const minimum = puzzle.size === 6 ? 2 : 1;
      return (
        [6, 8].includes(m.size) &&
        m.givens >= 12 &&
        m.givens <= 26 &&
        [...m.rowGivens, ...m.colGivens].every((count) => count >= minimum && count <= 4)
      );
    }
    return (
      m.size === 7 &&
      m.givens === 6 &&
      m.horizontal >= 8 &&
      m.vertical >= 8 &&
      m.horizontal <= 24 &&
      m.vertical <= 24 &&
      crossingEdges(puzzle).length > 0
    );
  } catch {
    return false;
  }
}

function eligible(puzzle, proof) {
  if (!candidateEligible(puzzle) || !proof) return false;
  try {
    const nativeBudget = limits[puzzle.type];
    return (
      proof.semanticSolutions === 1 &&
      proof.definitionSha256 === Q.definitionHash(puzzle) &&
      proof.structuralKey === Q.structuralKey(puzzle) &&
      Number.isSafeInteger(proof.nativeNodes) &&
      proof.nativeNodes > 0 &&
      proof.nativeNodes < nativeBudget &&
      Number.isSafeInteger(proof.independentNodes) &&
      proof.independentNodes > 0 &&
      proof.independentNodes <= limits.independent &&
      Number.isSafeInteger(proof.replayActions) &&
      proof.replayActions > 0
    );
  } catch {
    return false;
  }
}

function crossingEdges(puzzle) {
  const horizontal = [];
  const vertical = [];
  for (const edge of puzzle.inequalities) {
    if (Math.floor(edge.a / puzzle.size) === Math.floor(edge.b / puzzle.size))
      horizontal.push(edge);
    else vertical.push(edge);
  }
  const crossings = [];
  for (const across of horizontal)
    for (const down of vertical) {
      const shared = [across.a, across.b].find((cell) => cell === down.a || cell === down.b);
      if (shared !== undefined) crossings.push({ across, down, shared });
    }
  return crossings;
}

function featureVector(puzzle) {
  const m = Q.metrics(puzzle);
  if (puzzle.type === 'binary')
    return [
      m.givens,
      ...m.rowGivens.slice().sort((a, b) => a - b),
      ...m.colGivens.slice().sort((a, b) => a - b),
      Math.abs(m.rowGivens.reduce((a, b) => a + b, 0) - m.colGivens.reduce((a, b) => a + b, 0)),
    ];
  const degrees = Array(puzzle.size ** 2).fill(0);
  for (const edge of puzzle.inequalities) {
    degrees[edge.a]++;
    degrees[edge.b]++;
  }
  const histogram = [0, 1, 2, 3, 4].map(
    (degree) => degrees.filter((value) => value === degree).length,
  );
  return [m.horizontal, m.vertical, ...histogram, crossingEdges(puzzle).length];
}

function select(candidates, prior, count) {
  if (!Number.isInteger(count) || count < 1) throw Error('Invalid selection count');
  const seen = new Set(
    prior.filter((puzzle) => ['binary', 'futoshiki'].includes(puzzle.type)).map(Q.structuralKey),
  );
  const pool = candidates
    .filter(
      ({ seed, puzzle }) =>
        Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff && candidateEligible(puzzle),
    )
    .sort((a, b) => a.seed - b.seed)
    .filter(({ puzzle }) => {
      const key = Q.structuralKey(puzzle);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (pool.length < count)
    throw Error(`Insufficient distinct eligible candidates: ${pool.length}/${count}`);
  if (new Set(pool.map(({ puzzle }) => `${puzzle.type}:${puzzle.size}`)).size !== 1)
    throw Error('Select one family and size at a time');

  const vectors = new Map(pool.map((entry) => [entry, featureVector(entry.puzzle)]));
  const spans = vectors
    .get(pool[0])
    .map((_, i) =>
      Math.max(
        1,
        Math.max(...pool.map((entry) => vectors.get(entry)[i])) -
          Math.min(...pool.map((entry) => vectors.get(entry)[i])),
      ),
    );
  const distance = (a, b) =>
    vectors
      .get(a)
      .reduce((sum, value, i) => sum + Math.abs(value - vectors.get(b)[i]) / spans[i], 0);
  const selected = [pool.shift()];
  while (selected.length < count) {
    let bestIndex = 0;
    let bestDistance = -1;
    for (let i = 0; i < pool.length; i++) {
      const score = Math.min(...selected.map((entry) => distance(pool[i], entry)));
      if (score > bestDistance) {
        bestDistance = score;
        bestIndex = i;
      }
    }
    selected.push(pool.splice(bestIndex, 1)[0]);
  }
  return selected;
}

function buildPool(spec, prior) {
  const pool = [];
  const seen = new Set(
    prior.filter((puzzle) => ['binary', 'futoshiki'].includes(puzzle.type)).map(Q.structuralKey),
  );
  const attemptLimit = spec.type === 'futoshiki' ? 360 : 180;
  for (let attempt = 0; attempt < attemptLimit && pool.length < spec.pool; attempt++) {
    const seed = spec.firstSeed + attempt * 7919;
    const options = spec.type === 'binary' ? { size: spec.size } : undefined;
    const puzzle = options
      ? seeds.candidate(spec.type, seed, options)
      : seeds.candidate(spec.type, seed);
    if (!puzzle || !candidateEligible(puzzle)) continue;
    const key = Q.structuralKey(puzzle);
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push({ seed, puzzle });
  }
  if (pool.length < spec.pool)
    throw Error(
      `Insufficient seeded ${spec.type}/${spec.size} candidates: ${pool.length}/${spec.pool}`,
    );
  return pool;
}

function coordinate(cell, size) {
  return `${String.fromCharCode(65 + (cell % size))}${Math.floor(cell / size) + 1}`;
}

function inequalityText(edge, size) {
  return `${coordinate(edge.a, size)} ${edge.op} ${coordinate(edge.b, size)}`;
}

function binaryEditorial(puzzle) {
  const m = Q.metrics(puzzle);
  const rows = m.rowGivens.map((count, row) => ({ row, count })).sort((a, b) => b.count - a.count);
  const cols = m.colGivens.map((count, col) => ({ col, count })).sort((a, b) => a.count - b.count);
  const fullRow = rows[0];
  const sparseCol = cols[0];
  const titleLine = `Row ${fullRow.row + 1} has ${fullRow.count} printed symbols; column ${String.fromCharCode(65 + sparseCol.col)} has ${sparseCol.count}.`;
  return {
    opening: `${titleLine} Compare their remaining sun and moon quotas with the no-three rule before extending either line.`,
    structuralDistinction: `${titleLine} The asymmetry between a more-clued row and a lightly marked crossing column shapes this board's opening.`,
    intendedReasoningPath: [
      `${titleLine} Start with equal line totals and no three identical neighbors, checking both axes at every shared cell.`,
      'Compare the balanced line patterns allowed by each row with the crossing column marks, then carry each exclusion into its perpendicular line.',
      'Before accepting a completed line, check that it differs from every other row or column on that axis; local legality is not enough.',
    ],
    temptingMistake:
      'A row pattern can satisfy its own balance and triple rules while making the crossing column impossible or duplicating another complete line.',
  };
}

function futoshikiEditorial(puzzle) {
  const [crossing] = crossingEdges(puzzle).sort((a, b) => a.shared - b.shared);
  assert.ok(crossing, `${puzzle.id}: a perpendicular comparison crossing exists`);
  const first = inequalityText(crossing.across, puzzle.size);
  const second = inequalityText(crossing.down, puzzle.size);
  const m = Q.metrics(puzzle);
  return {
    opening: `Begin where ${first} meets ${second}; keep the shared rank inside both comparison bounds while respecting the row and column sets.`,
    structuralDistinction: `This 7×7 Latin square has ${m.horizontal} horizontal and ${m.vertical} vertical inequalities; ${first} and ${second} meet at ${coordinate(crossing.shared, puzzle.size)}.`,
    intendedReasoningPath: [
      `Start at the crossing ${first} and ${second}. Translate adjacent comparisons into ranges, then carry those bounds through their connected chains.`,
      'Remove ranks already used in the same row and column, and revisit each incident comparison whenever a neighboring value is placed.',
      'Use the perpendicular bounds together before settling a rank; a value available in one line can still violate an inequality or its crossing line.',
    ],
    temptingMistake:
      'Checking a rank against its row and column alone overlooks the comparison at the crossing and can leave a locally plausible but impossible value.',
  };
}

function tierFor(puzzle, rank) {
  if (puzzle.type === 'binary' && puzzle.size === 6) return rank < 5 ? 'Steady' : 'Tricky';
  if (puzzle.type === 'binary' && puzzle.size === 8) return rank < 10 ? 'Expert' : 'Master';
  return rank < 8 ? 'Expert' : 'Master';
}

function editorialOrder(a, b) {
  if (a.puzzle.type === 'futoshiki') {
    const left = Q.metrics(a.puzzle);
    const right = Q.metrics(b.puzzle);
    return right.horizontal + right.vertical - left.horizontal - left.vertical || a.seed - b.seed;
  }
  return Q.metrics(b.puzzle).givens - Q.metrics(a.puzzle).givens || a.seed - b.seed;
}

function titleFor(puzzle, index) {
  return puzzle.type === 'binary' ? binaryTitles[index] : futoshikiTitles[index];
}

function build() {
  const prior = load(process.cwd(), false).puzzles.filter(
    (puzzle) => !puzzle.id.startsWith('sunrise-'),
  );
  const selected = specs.map((spec) => select(buildPool(spec, prior), prior, spec.count));

  const puzzles = [];
  const studies = [];
  for (const [blockIndex, block] of selected.entries()) {
    const spec = specs[blockIndex];
    const sorted = block.slice().sort(editorialOrder);
    for (const [index, entry] of sorted.entries()) {
      const id =
        entry.puzzle.type === 'binary'
          ? `sunrise-binary-${String(spec.size === 6 ? index + 1 : index + 16).padStart(2, '0')}`
          : `sunrise-futoshiki-${String(index + 1).padStart(2, '0')}`;
      const titleIndex = entry.puzzle.type === 'binary' ? Number(id.slice(-2)) - 1 : index;
      const difficulty = tierFor(entry.puzzle, index);
      const subtitle =
        entry.puzzle.type === 'binary'
          ? `Sunrise Studies · Sun & Moon · ${spec.size}×${spec.size}`
          : 'Sunrise Studies · Futoshiki';
      const puzzle = {
        ...entry.puzzle,
        id,
        revision: 1,
        title: titleFor(entry.puzzle, titleIndex),
        subtitle,
        difficulty,
        difficultyStatus: 'provisional',
        story:
          entry.puzzle.type === 'binary'
            ? 'Balance the suns and moons in every row and column. No line may hold three identical symbols together, and completed rows and columns must all be distinct.'
            : 'Place each rank from 1 to 7 once in every row and column. Follow the pointed inequalities between neighboring squares to complete the ledger.',
        difficultyEvidence:
          entry.puzzle.type === 'binary'
            ? `A ${spec.size}×${spec.size} board combines line balance, no-three and distinct-line checks. The ${difficulty} label is a provisional editorial placement based on board scale and clue pattern, not measured solve time.`
            : `Crossing 7×7 inequality chains interact with Latin row and column constraints. This ${difficulty} grouping uses visible clue density as an editorial guide, not measured solve time.`,
      };
      const proof = Q.certify(puzzle);
      assert.ok(eligible(puzzle, proof), `${id}: final proof meets selection policy`);
      const editorial =
        puzzle.type === 'binary' ? binaryEditorial(puzzle) : futoshikiEditorial(puzzle);
      puzzles.push(puzzle);
      studies.push({
        id,
        revision: puzzle.revision,
        profile: `${puzzle.type}-${puzzle.size}-${String(index + 1).padStart(2, '0')}`,
        humanPlaytested: false,
        provenance: {
          method:
            'Seeded offline candidate, selected for structural variety and supplied with coordinate-specific intended notes',
          recipe: 'tools/curation/night-recipes.cjs',
          seed: entry.seed,
        },
        proof,
        ...editorial,
      });
    }
  }

  const pack = {
    schemaVersion: 1,
    id: 'alibi-sunrise-studies',
    version: 1,
    title: 'Alibi · Sunrise Studies',
    author: 'Alibi',
    puzzles,
  };
  const notes = {
    schemaVersion: 1,
    packId: pack.id,
    humanPlaytested: false,
    noGuessCertificate: false,
    selection: {
      source: 'Seeded offline recipes with farthest-first selection over structure metrics.',
      counts: { binary6x6: 15, binary8x8: 15, futoshiki7x7: 12 },
      humanPlaytested: false,
      tierBasis:
        'Provisional editorial steps reflect board size, visible clue pattern and constraint spread. Solver node counts prove work bounds only; they do not set a human difficulty label.',
      proofBudgets: {
        binaryNativeNodes: limits.binary,
        futoshikiNativeNodes: limits.futoshiki,
        independentNodes: limits.independent,
      },
    },
    studies,
  };
  return { pack, notes };
}

module.exports = {
  limits,
  specs,
  candidateEligible,
  eligible,
  crossingEdges,
  select,
  build,
};
