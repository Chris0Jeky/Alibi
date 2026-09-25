'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const Q = require('../tools/curation/vault-quality.cjs');
const { load } = require('../tools/official-catalogue.cjs');
for (const type of ['binary', 'sudoku', 'lightup', 'futoshiki']) {
  const name = 'vault-' + type;
  const types = [type];
  test(`${name}: twenty additive advanced studies carry exact independent evidence`, () => {
    const file = `content/extra/${name}.json`;
    assert.ok(fs.existsSync(file), 'selected collection is present');
    const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
    const notes = JSON.parse(fs.readFileSync(`content/curation/editorial/${name}.json`, 'utf8'));
    assert.equal(pack.puzzles.length, 20);
    assert.equal(notes.studies.length, 20);
    const catalogue = load(process.cwd(), false).puzzles;
    for (const type of types) assert.equal(pack.puzzles.filter((p) => p.type === type).length, 20);
    for (const p of pack.puzzles) {
      assert.equal(p.revision, 1);
      assert.equal(p.difficultyStatus, 'provisional');
      assert.ok(['Expert', 'Master'].includes(p.difficulty));
      assert.equal(Object.hasOwn(p, 'minutes'), false);
      assert.deepEqual(
        catalogue.find((c) => c.id === p.id),
        p,
      );
      const note = notes.studies.find((n) => n.id === p.id);
      assert.equal(notes.humanPlaytested, false);
      assert.equal(notes.noGuessCertificate, false);
      assert.equal(note.revision, p.revision);
      assert.ok(note.opening.length >= 60);
      assert.equal(notes.sharedMethods[p.type].length, 2);
      const { structuralKey, ...proof } = Q.certify(p);
      assert.deepEqual(
        {
          definitionSha256: proof.definitionSha256,
          nativeNodes: proof.nativeNodes,
          independentNodes: proof.independentNodes,
          basicUnresolved: proof.profile.unresolved,
        },
        note.proof,
        p.id,
      );
      assert.equal(proof.semanticSolutions, 1);
      assert.ok(proof.replayActions > 0);
      assert.ok(
        proof.profile.unresolved >= (p.type === 'lightup' ? 6 : p.type === 'sudoku' ? 18 : 12),
        p.id,
      );
      assert.notEqual(proof.profile.complete, true);
    }
  });
}
test('Vault structures are distinct from every earlier puzzle and each other', () => {
  const catalogue = load(process.cwd(), false).puzzles;
  const types = ['binary', 'sudoku', 'lightup', 'futoshiki'];
  const prior = catalogue.filter((p) => !p.id.startsWith('vault-') && types.includes(p.type));
  const seen = new Set(prior.map(Q.identity));
  const added = catalogue.filter((p) => p.id.startsWith('vault-'));
  assert.equal(added.length, 80);
  for (const p of added) {
    const key = Q.identity(p);
    assert.equal(seen.has(key), false, p.id);
    seen.add(key);
  }
  const baseline = require('../content/curation/editorial/vault-baseline.json');
  const original = catalogue.slice(0, 430);
  assert.equal(original.length, 430);
  assert.equal(Q.definitionHash(original), baseline.canonicalDefinitionsSha256);
});
