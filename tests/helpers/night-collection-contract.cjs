'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const Q = require('../../tools/curation/study-quality.cjs');
const { load } = require('../../tools/official-catalogue.cjs');
const C = globalThis.AlibiCore;
function verifyCollection(name, types) {
  const packPath = `content/extra/${name}.json`;
  const notesPath = `content/curation/editorial/${name}.json`;
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  const notes = JSON.parse(fs.readFileSync(notesPath, 'utf8'));
  test(`${name}: bounded, registered content with honest provisional editorial notes`, () => {
    assert.equal(pack.schemaVersion, 1);
    assert.equal(pack.puzzles.length, types.length * 6);
    assert.equal(pack.id, `alibi-${name}`);
    const registry = JSON.parse(fs.readFileSync('content/official-packs.json', 'utf8'));
    assert.ok(registry.packs.includes(`extra/${name}.json`));
    assert.equal(notes.packId, pack.id);
    assert.equal(notes.humanPlaytested, false);
    assert.equal(notes.studies.length, pack.puzzles.length);
    assert.equal(new Set(notes.studies.map((n) => n.profile)).size, pack.puzzles.length);
    for (const type of types) {
      const puzzles = pack.puzzles.filter((p) => p.type === type);
      assert.equal(puzzles.length, 6);
      assert.equal(puzzles.filter((p) => p.difficulty === 'Expert').length, 4);
      assert.equal(puzzles.filter((p) => p.difficulty === 'Master').length, 2);
    }
    for (const p of pack.puzzles) {
      assert.equal(p.revision, 1);
      assert.equal(p.difficultyStatus, 'provisional');
      assert.equal(Object.hasOwn(p, 'minutes'), false);
      assert.match(p.difficultyEvidence, /^.{30,240}$/s);
      const note = notes.studies.find((n) => n.id === p.id);
      assert.equal(note.revision, p.revision);
      assert.equal(note.humanPlaytested, false);
      assert.ok(Number.isInteger(note.provenance.seed));
      assert.equal(note.intendedReasoningPath.length, 3);
      assert.ok(note.intendedReasoningPath.every((step) => step.length >= 30));
      assert.ok(note.structuralDistinction.length >= 60);
      assert.equal(C.registry[p.type].complete(p, C.registry[p.type].initial(p)), false);
      C.validateDefinition(p);
    }
  });
  test(`${name}: independent unique answers, reducer replay and current proof receipts`, () => {
    for (const p of pack.puzzles) {
      const note = notes.studies.find((n) => n.id === p.id);
      assert.deepEqual(Q.certify(p), note.proof, p.id);
      const edited = { ...p, story: p.story + ' Changed.' };
      assert.notEqual(Q.definitionHash(edited), note.proof.definitionSha256);
    }
  });
  test(`${name}: no semantic reskins against prior content or sibling collections`, () => {
    const ids = new Set(pack.puzzles.map((p) => p.id));
    const supported = ['nonogram', 'binary', 'futoshiki', 'lightup', 'tents', 'aquarium', 'network', 'trail', 'bridges'];
    const other = load(process.cwd(), false).puzzles.filter((p) => !ids.has(p.id) && supported.includes(p.type));
    const seen = new Set(other.map(Q.structuralKey));
    for (const p of pack.puzzles) {
      const key = Q.structuralKey(p);
      assert.equal(seen.has(key), false, p.id);
      seen.add(key);
    }
  });
  test(`${name}: selected structures meet the documented reasoning constraints`, () => {
    for (const p of pack.puzzles) {
      const m = Q.metrics(p);
      if (p.type === 'lightup') assert.ok(m.white >= 31 && m.numbered >= 6 && m.numbered <= 11 && m.maxVisiblePeers >= 7);
      if (p.type === 'tents') {
        assert.ok(m.trees >= 10 && m.sharedCandidates >= 4 && m.branchingTrees >= 9);
        assert.ok(m.multipleRows >= 3 && m.multipleCols >= 3);
        assert.ok(p.rowTargets.filter((v) => v === 0).length <= 1);
        assert.ok(p.colTargets.filter((v) => v === 0).length <= 1);
      }
      if (p.type === 'aquarium') assert.ok(m.tanks === 9 && m.tallTanks >= 4 && m.partialTanks >= 4 && m.interiorRows >= 6 && m.interiorCols >= 6);
      if (p.type === 'network') {
        assert.equal(m.locked, 0);
        assert.ok(m.junctions >= 7);
        // In this oracle, >1 means local reciprocal propagation did not finish.
        // It is not a human difficulty score.
        assert.ok(notes.studies.find((n) => n.id === p.id).proof.independentNodes > 1);
      }
      if (p.type === 'trail') assert.ok(m.givens <= 6 && m.maxGap >= 11 && m.turns >= 18 && m.detours >= 2);
      if (p.type === 'bridges') assert.ok(m.islands === 16 && m.routes === 19 && m.crossings >= 2 && m.unused >= 3 && m.doubles >= 6);
      if (p.type === 'binary') {
        assert.ok(m.givens >= 12 && m.givens <= 18);
        assert.ok([...m.rowGivens, ...m.colGivens].every((n) => n >= 1 && n <= 4));
      }
      if (p.type === 'futoshiki') assert.ok(m.givens === 6 && m.horizontal >= 8 && m.vertical >= 8);
    }
  });
}
module.exports = { verifyCollection };
