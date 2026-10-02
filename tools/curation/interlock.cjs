'use strict';
// Offline selection policy, never imported by the game or its hint/validation workers.
const Q = require('./study-quality.cjs');
const families = ['tents', 'aquarium', 'network', 'trail', 'bridges'];
function eligible(puzzle, proof) {
  if (!families.includes(puzzle?.type) || !proof) return false;
  try {
    const m = Q.metrics(puzzle);
    if (
      proof.semanticSolutions !== 1 ||
      proof.definitionSha256 !== Q.definitionHash(puzzle) ||
      proof.structuralKey !== Q.structuralKey(puzzle) ||
      !Number.isInteger(proof.nativeNodes) ||
      proof.nativeNodes < 1 ||
      proof.nativeNodes >= (puzzle.type === 'bridges' ? 100000 : 250000) ||
      !Number.isInteger(proof.independentNodes) ||
      proof.independentNodes < 1 ||
      proof.independentNodes > 500000 ||
      !Number.isInteger(proof.replayActions) ||
      proof.replayActions < 1
    )
      return false;
    if (puzzle.type === 'tents')
      return (
        m.size === 7 &&
        m.sharedCandidates >= 5 &&
        m.branchingTrees >= 10 &&
        m.multipleRows >= 3 &&
        m.multipleCols >= 3 &&
        puzzle.rowTargets.filter((v) => v === 0).length <= 1 &&
        puzzle.colTargets.filter((v) => v === 0).length <= 1
      );
    if (puzzle.type === 'aquarium')
      return (
        m.size === 7 &&
        m.tanks === 9 &&
        m.tallTanks >= 4 &&
        m.partialTanks >= 4 &&
        m.interiorRows >= 6 &&
        m.interiorCols >= 6
      );
    if (puzzle.type === 'network')
      return m.size === 7 && m.locked === 0 && m.junctions >= 8 && proof.independentNodes > 1;
    if (puzzle.type === 'trail')
      return m.size === 6 && m.givens <= 6 && m.maxGap >= 12 && m.turns >= 20 && m.detours >= 2;
    return (
      m.size === 9 &&
      m.islands === 16 &&
      m.routes === 19 &&
      m.crossings >= 2 &&
      m.unused >= 3 &&
      m.doubles >= 6
    );
  } catch {
    return false;
  }
}
function select(candidates, prior, count) {
  if (!Number.isInteger(count) || count < 1) throw Error('Invalid selection count');
  const seen = new Set(prior.filter((p) => families.includes(p.type)).map(Q.structuralKey));
  const pool = candidates
    .filter(
      ({ seed, p, proof }) =>
        Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff && eligible(p, proof),
    )
    .sort((a, b) => a.seed - b.seed)
    .filter(({ p }) => {
      const key = Q.structuralKey(p);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (pool.length < count)
    throw Error(`Insufficient distinct eligible candidates: ${pool.length}/${count}`);
  if (new Set(pool.map(({ p }) => p.type)).size !== 1) throw Error('Select one family at a time');
  // Farthest-first across normalized structural features, with seed-order ties. This chooses
  // varied interactions, not a spurious human difficulty ranking from solver node counts.
  const vectors = new Map(pool.map((entry) => [entry, Object.values(Q.metrics(entry.p))]));
  const spans = vectors
    .get(pool[0])
    .map((_, i) =>
      Math.max(
        1,
        Math.max(...pool.map((p) => vectors.get(p)[i])) -
          Math.min(...pool.map((p) => vectors.get(p)[i])),
      ),
    );
  const distance = (a, b) =>
    vectors
      .get(a)
      .reduce((sum, value, i) => sum + Math.abs(value - vectors.get(b)[i]) / spans[i], 0);
  const chosen = [pool.shift()];
  while (chosen.length < count) {
    let index = 0,
      best = -1;
    for (let i = 0; i < pool.length; i++) {
      const score = Math.min(...chosen.map((entry) => distance(pool[i], entry)));
      if (score > best) {
        best = score;
        index = i;
      }
    }
    chosen.push(pool.splice(index, 1)[0]);
  }
  return chosen;
}
module.exports = { families, eligible, select };
