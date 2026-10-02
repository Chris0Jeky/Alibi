'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const Q = require('../../tools/curation/study-quality.cjs');
const { eligible, families } = require('../../tools/curation/interlock.cjs');
const R = require('../../tools/curation/night-recipes.cjs');
const { load } = require('../../tools/official-catalogue.cjs');
function verifyCollection(name, types) {
  const source = `content/extra/${name}.json`;
  test(`${name}: all selected studies exist and are registered without silent omissions`, () => {
    assert.ok(fs.existsSync(source), 'curated pack exists');
    const pack = JSON.parse(fs.readFileSync(source));
    const notes = JSON.parse(fs.readFileSync(`content/curation/editorial/${name}.json`));
    assert.equal(pack.schemaVersion, 1);
    assert.equal(pack.id, `alibi-${name}`);
    assert.equal(pack.puzzles.length, types.length * 12);
    assert.ok(require('../../content/official-packs.json').packs.includes(`extra/${name}.json`));
    assert.equal(notes.packId, pack.id);
    assert.equal(notes.humanPlaytested, false);
    assert.equal(notes.studies.length, pack.puzzles.length);
    for (const type of types) assert.equal(pack.puzzles.filter(p => p.type === type).length, 12);
    for (const field of ['id', 'title']) assert.equal(new Set(pack.puzzles.map(p => p[field])).size, pack.puzzles.length);
    assert.equal(new Set(notes.studies.map(n => n.profile)).size, pack.puzzles.length);
    for (const p of pack.puzzles) {
      const note = notes.studies.find(n => n.id === p.id);
      assert.ok(note, p.id);
      assert.equal(p.revision, 1);
      assert.equal(p.difficultyStatus, 'provisional');
      assert.ok(['Expert', 'Master'].includes(p.difficulty));
      assert.equal(Object.hasOwn(p, 'minutes'), false);
      assert.equal(note.humanPlaytested, false);
      assert.equal(note.revision, p.revision);
      assert.equal(note.intendedReasoningPath.length, 3);
      assert.ok(note.intendedReasoningPath.every(s => s.length >= 30));
      assert.ok(note.temptingMistake.length >= 40);
      assert.ok(note.structuralDistinction.length >= 60);
      assert.equal(eligible(p, note.proof), true, p.id);
    }
  });
  test(`${name}: original seeds reproduce mechanics; independent proofs bind final definitions`, () => {
    if (!fs.existsSync(source)) return assert.fail('curated pack exists');
    const pack = JSON.parse(fs.readFileSync(source));
    const notes = JSON.parse(fs.readFileSync(`content/curation/editorial/${name}.json`));
    for (const p of pack.puzzles) {
      const note = notes.studies.find(n => n.id === p.id);
      assert.deepEqual(Q.certify(p), note.proof, p.id);
      const original = R.candidate(p.type, note.provenance.seed);
      assert.ok(original, p.id);
      // Compare all mechanical fields, not metadata authored after selection.
      const metadata = new Set(['id', 'revision', 'title', 'subtitle', 'difficulty', 'difficultyStatus', 'story', 'difficultyEvidence']);
      for (const key of Object.keys(original).filter(k => !metadata.has(k)))
        assert.deepEqual(p[key], original[key], `${p.id}: ${key}`);
      assert.equal(globalThis.AlibiCore.registry[p.type].complete(p, globalThis.AlibiCore.registry[p.type].initial(p)), false);
      assert.notEqual(Q.definitionHash({ ...p, title: p.title + ' changed' }), note.proof.definitionSha256);
    }
  });
  test(`${name}: no symmetric reskins of the published catalogue or siblings`, () => {
    if (!fs.existsSync(source)) return assert.fail('curated pack exists');
    const puzzles = JSON.parse(fs.readFileSync(source)).puzzles;
    const ids = new Set(puzzles.map(p => p.id));
    const prior = load(process.cwd(), false).puzzles.filter(p => !ids.has(p.id) && families.includes(p.type));
    const seen = new Set(prior.map(Q.structuralKey));
    for (const p of puzzles) {
      const key = Q.structuralKey(p);
      assert.equal(seen.has(key), false, p.id);
      seen.add(key);
    }
  });
}
module.exports = { verifyCollection };
