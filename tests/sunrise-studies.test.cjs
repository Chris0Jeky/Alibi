'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');

test('Sunrise Studies are registered as one deferred, 30-plus-12 content pack', () => {
  const source = 'content/extra/sunrise-studies.json';
  assert.ok(fs.existsSync(source), 'Sunrise Studies pack exists');
  const pack = JSON.parse(fs.readFileSync(source, 'utf8'));
  const registry = JSON.parse(fs.readFileSync('content/official-packs.json', 'utf8'));
  assert.equal(pack.id, 'alibi-sunrise-studies');
  assert.equal(pack.puzzles.length, 42);
  assert.ok(registry.packs.includes('extra/sunrise-studies.json'));
  assert.ok(registry.deferred.includes('extra/sunrise-studies.json'));
  assert.equal(pack.puzzles.filter((p) => p.type === 'binary').length, 30);
  assert.equal(pack.puzzles.filter((p) => p.type === 'futoshiki').length, 12);
});

test('authoring selection rejects missing, exhausted and structurally repeated evidence', () => {
  const R = require('../tools/curation/night-recipes.cjs');
  const Q = require('../tools/curation/study-quality.cjs');
  const Sunrise = require('../tools/curation/sunrise.cjs');
  const puzzle = R.candidate('binary', 11092026, { size: 6 });
  const proof = Q.certify(puzzle);
  assert.equal(Sunrise.eligible(puzzle, proof), true);
  assert.equal(Sunrise.eligible(puzzle, null), false);
  assert.equal(Sunrise.eligible(puzzle, { ...proof, semanticSolutions: 2 }), false);
  assert.equal(Sunrise.eligible(puzzle, { ...proof, independentNodes: 500001 }), false);
  assert.throws(
    () =>
      Sunrise.select(
        [
          { seed: 1, puzzle },
          { seed: 2, puzzle },
        ],
        [puzzle],
        1,
      ),
    /Insufficient distinct eligible candidates/,
  );
});

test('the seeded recipes preserve the existing 8×8 path and add deterministic 6×6 binary boards', () => {
  const { candidate } = require('../tools/curation/night-recipes.cjs');
  const Q = require('../tools/curation/study-quality.cjs');
  for (const size of [6, 8]) {
    const first = candidate('binary', 11092026, { size });
    assert.ok(first, `${size}×${size} candidate exists`);
    assert.deepEqual(first, candidate('binary', 11092026, { size }));
    assert.equal(first.size, size);
    if (size === 6)
      assert.ok(
        [...Q.metrics(first).rowGivens, ...Q.metrics(first).colGivens].every((count) => count >= 2),
        'the 6×6 progression starts with at least two printed symbols in each line',
      );
    assert.equal(Q.certify(first).semanticSolutions, 1);
  }
  assert.throws(() => candidate('binary', 11092026, { size: 5 }), /must be 6 or 8/);
  assert.throws(() => candidate('futoshiki', 11092026, { size: 7 }), /only available for binary/);
});

test('independent grid proofs distinguish zero, one, multiple and exhausted searches', () => {
  const { countBinary, countFutoshiki } = require('./helpers/family-studies-grid-oracle.cjs');
  const binary = require('../content/extra/binary-large.json').puzzles[0];
  const futoshiki = require('../content/extra/vault-futoshiki.json').puzzles[0];
  const badBinary = structuredClone(binary);
  badBinary.givens = badBinary.solution.slice();
  badBinary.givens[0] = 1 - badBinary.givens[0];
  const binaryZero = countBinary(badBinary, 2);
  const binaryOne = countBinary(binary, 2);
  const binaryMultiple = countBinary({ ...binary, givens: Array(binary.size ** 2).fill(-1) }, 2);
  assert.deepEqual([binaryZero.count, binaryZero.exhausted], [0, false]);
  assert.deepEqual([binaryOne.count, binaryOne.exhausted], [1, false]);
  assert.deepEqual([binaryMultiple.count, binaryMultiple.exhausted], [2, false]);
  const badFutoshiki = structuredClone(futoshiki);
  badFutoshiki.givens = badFutoshiki.solution.slice();
  badFutoshiki.givens[0] = badFutoshiki.givens[1];
  const futoshikiZero = countFutoshiki(badFutoshiki, 2);
  const futoshikiOne = countFutoshiki(futoshiki, 2);
  const futoshikiMultiple = countFutoshiki(
    { ...futoshiki, givens: Array(futoshiki.size ** 2).fill(0), inequalities: [] },
    2,
  );
  const edge = futoshiki.inequalities[0];
  const left = futoshiki.solution[edge.a];
  const right = futoshiki.solution[edge.b];
  const contradictedFutoshiki = structuredClone(futoshiki);
  contradictedFutoshiki.givens = futoshiki.solution.map((value) =>
    value === left ? right : value === right ? left : value,
  );
  const fixedInequalityConflict = countFutoshiki(contradictedFutoshiki, 2);
  assert.deepEqual([futoshikiZero.count, futoshikiZero.exhausted], [0, false]);
  assert.deepEqual([futoshikiOne.count, futoshikiOne.exhausted], [1, false]);
  assert.deepEqual([futoshikiMultiple.count, futoshikiMultiple.exhausted], [2, false]);
  assert.deepEqual([fixedInequalityConflict.count, fixedInequalityConflict.exhausted], [0, false]);
  assert.equal(countBinary(binary, 2, 1).exhausted, true);
  assert.equal(countFutoshiki(futoshiki, 2, 1).exhausted, true);
});

test('the existing published catalogue and compatibility definitions are unchanged', () => {
  const crypto = require('node:crypto');
  const Q = require('../tools/curation/study-quality.cjs');
  const { load } = require('../tools/official-catalogue.cjs');
  const baseline = require('../content/curation/editorial/sunrise-baseline.json');
  const registry = require('../content/official-packs.json');
  const earlier = registry.packs.filter((file) => file !== 'extra/sunrise-studies.json');
  const existing = load(process.cwd(), false).puzzles.filter((p) => !p.id.startsWith('sunrise-'));
  assert.deepEqual(earlier, baseline.packPaths);
  assert.equal(existing.length, baseline.puzzleCount);
  assert.equal(Q.definitionHash(existing), baseline.definitionsSha256);
  assert.equal(
    crypto.createHash('sha256').update(fs.readFileSync('content/legacy.json')).digest('hex'),
    baseline.legacySha256,
  );
});

test('every study binds a seeded definition, an independent proof and an answer-free reasoning path', () => {
  const pack = JSON.parse(fs.readFileSync('content/extra/sunrise-studies.json', 'utf8'));
  const notes = JSON.parse(
    fs.readFileSync('content/curation/editorial/sunrise-studies.json', 'utf8'),
  );
  const Q = require('../tools/curation/study-quality.cjs');
  const R = require('../tools/curation/night-recipes.cjs');
  const { load } = require('../tools/official-catalogue.cjs');
  const existingIds = new Set(
    load(process.cwd(), false)
      .puzzles.filter((p) => !p.id.startsWith('sunrise-'))
      .map((p) => `${p.id}@${p.revision}`),
  );
  assert.equal(notes.humanPlaytested, false);
  assert.equal(notes.noGuessCertificate, false);
  assert.equal(notes.studies.length, 42);
  assert.equal(new Set(pack.puzzles.map((p) => p.id)).size, 42);
  assert.equal(new Set(pack.puzzles.map((p) => p.title)).size, 42);
  for (const puzzle of pack.puzzles) {
    const note = notes.studies.find((entry) => entry.id === puzzle.id);
    assert.ok(note, puzzle.id);
    assert.equal(puzzle.revision, 1);
    assert.equal(puzzle.difficultyStatus, 'provisional');
    assert.ok(['Steady', 'Tricky', 'Expert', 'Master'].includes(puzzle.difficulty));
    assert.equal(Object.hasOwn(puzzle, 'minutes'), false);
    assert.equal(note.humanPlaytested, false);
    assert.equal(note.revision, puzzle.revision);
    assert.equal(note.intendedReasoningPath.length, 3);
    assert.ok(
      note.intendedReasoningPath.every((step) => step.length >= 36),
      puzzle.id,
    );
    assert.ok(note.temptingMistake.length >= 40, puzzle.id);
    assert.ok(note.structuralDistinction.length >= 60, puzzle.id);
    assert.equal(note.proof.semanticSolutions, 1, puzzle.id);
    assert.ok(note.proof.independentNodes >= 1 && note.proof.independentNodes <= 500000, puzzle.id);
    assert.deepEqual(Q.certify(puzzle), note.proof, puzzle.id);
    assert.equal(existingIds.has(`${puzzle.id}@${puzzle.revision}`), false);
    const regenerated =
      puzzle.type === 'binary'
        ? R.candidate(puzzle.type, note.provenance.seed, { size: puzzle.size })
        : R.candidate(puzzle.type, note.provenance.seed);
    assert.ok(regenerated, puzzle.id);
    const editorialFields = new Set([
      'id',
      'revision',
      'title',
      'subtitle',
      'difficulty',
      'difficultyStatus',
      'story',
      'difficultyEvidence',
    ]);
    for (const key of Object.keys(regenerated).filter((name) => !editorialFields.has(name)))
      assert.deepEqual(puzzle[key], regenerated[key], `${puzzle.id}: ${key}`);
  }
});

test('Sunrise structures progress across 6×6 and 8×8 Binary and 7×7 Futoshiki', () => {
  const pack = JSON.parse(fs.readFileSync('content/extra/sunrise-studies.json', 'utf8'));
  const notes = JSON.parse(
    fs.readFileSync('content/curation/editorial/sunrise-studies.json', 'utf8'),
  );
  const Q = require('../tools/curation/study-quality.cjs');
  const { load } = require('../tools/official-catalogue.cjs');
  const binary = pack.puzzles.filter((p) => p.type === 'binary');
  const futoshiki = pack.puzzles.filter((p) => p.type === 'futoshiki');
  assert.equal(binary.filter((p) => p.size === 6).length, 15);
  assert.equal(binary.filter((p) => p.size === 8).length, 15);
  assert.ok(futoshiki.every((p) => p.size === 7));
  assert.ok(binary.slice(0, 5).every((p) => p.difficulty === 'Steady'));
  assert.ok(binary.slice(5, 15).every((p) => p.difficulty === 'Tricky'));
  assert.ok(binary.slice(15, 25).every((p) => p.difficulty === 'Expert'));
  assert.ok(binary.slice(25).every((p) => p.difficulty === 'Master'));
  assert.ok(futoshiki.slice(0, 8).every((p) => p.difficulty === 'Expert'));
  assert.ok(futoshiki.slice(8).every((p) => p.difficulty === 'Master'));
  assert.ok(
    Math.min(...futoshiki.slice(0, 8).map((p) => p.inequalities.length)) >=
      Math.max(...futoshiki.slice(8).map((p) => p.inequalities.length)),
    'Futoshiki provisional tiers follow visible clue density rather than search nodes',
  );
  const prior = load(process.cwd(), false).puzzles.filter(
    (p) => !p.id.startsWith('sunrise-') && ['binary', 'futoshiki'].includes(p.type),
  );
  const seen = new Set(prior.map(Q.structuralKey));
  for (const puzzle of pack.puzzles) {
    const key = Q.structuralKey(puzzle);
    assert.equal(seen.has(key), false, `${puzzle.id}: structural/complement duplicate`);
    seen.add(key);
    const metric = Q.metrics(puzzle);
    const note = notes.studies.find((entry) => entry.id === puzzle.id);
    assert.deepEqual(note.proof.metrics, metric, puzzle.id);
    if (puzzle.type === 'binary') {
      assert.ok(metric.givens >= (puzzle.size === 6 ? 12 : 12));
      assert.ok(metric.givens <= (puzzle.size === 6 ? 20 : 20));
      assert.ok(
        [...metric.rowGivens, ...metric.colGivens].every(
          (count) => count >= (puzzle.size === 6 ? 2 : 1),
        ),
      );
    } else {
      assert.equal(metric.givens, 6);
      assert.ok(metric.horizontal >= 8 && metric.vertical >= 8);
    }
  }
});

test('the catalogue news links both Sunrise tracks and reflects their live family totals', () => {
  const vm = require('node:vm');
  const source = fs.readFileSync('src/curation.js', 'utf8');
  const { load } = require('../tools/official-catalogue.cjs');
  const context = {
    ALIBI_CURATION: { entries: [], collections: [] },
    ALIBI_CURATION_MEDIA: {},
    ALIBI_CATALOG: { puzzles: load(process.cwd(), false).puzzles },
  };
  vm.runInNewContext(source, context, { filename: 'src/curation.js' });
  const html = context.AlibiCuration.news();
  assert.match(html, /SUNRISE STUDIES · TWO BOARD SIZES/);
  assert.match(html, /Fifteen 6 × 6 boards open the sequence, followed by fifteen 8 × 8 studies/);
  assert.match(html, /data-page="library" data-id="binary"/);
  assert.match(html, /TWELVE NEW 7 × 7 STUDIES/);
  assert.match(html, /data-page="library" data-id="futoshiki"/);
  assert.match(html, /Explore all 85 Sun & Moon puzzles/);
  assert.match(html, /Explore all 63 Futoshiki puzzles/);
});
