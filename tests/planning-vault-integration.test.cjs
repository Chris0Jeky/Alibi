'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const Q = require('../src/quiet-wing/engine.js');
const E = require('../src/club-engines.js');
const A = require('../src/challenges.js');
const loader = require('../tools/challenge-catalogue.cjs');
const old = ['classics', 'warehouse', 'reversi', 'borough'].flatMap(
  (name) => require('../content/challenges/' + name + '.json').challenges,
);
const added = ['archive-vaults', 'borough-contracts'].flatMap(
  (name) => require('../content/challenges/' + name + '.json').challenges,
);
const hash = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const create = (entries) => A.create(entries, { quiet: Q, club: E });
test('one registered 95-challenge source feeds both consumers and preserves old identities', () => {
  assert.ok(fs.existsSync('content/challenges/registry.json'), 'source registry is published');
  const data = loader.load();
  assert.deepEqual(data, [...old, ...added]);
  assert.equal(data.length, 95);
  const registry = create(data);
  assert.equal(hash(old), '9cda5be353ce79e2e0d67634231caef52764ea815584d08722069466afdf1d6c');
  assert.equal(
    hash(old.map((c) => registry.begin(c.id))),
    '1ea6ca0c5b9fbe60cf16e693b1891e7e83b3042b0dcdb95f57ad78cfbd59b788',
  );
  const projected = create(loader.runtime(data));
  for (const c of data) {
    const run = registry.begin(c.id);
    assert.deepEqual(projected.begin(c.id), run, c.id);
    const source = c.solutionActions || c.solutionPath || c.principalVariation;
    run.log = typeof source === 'string' ? [...source] : source;
    assert.equal(registry.replay(run).complete, true, c.id);
    assert.equal(projected.replay(run).complete, true, c.id);
  }
  const builder = fs.readFileSync('tools/build.cjs', 'utf8');
  assert.match(builder, /challenge-catalogue/);
  assert.doesNotMatch(builder, /\['classics', 'warehouse', 'reversi', 'borough'\]/);
});
test('Borough score and neighbourhood requirements are bounded, distinct and identity-pinned', () => {
  const c = added.find((x) => x.family === 'borough');
  const registry = create([c]),
    run = registry.begin(c.id);
  const missing = structuredClone(run);
  delete missing.objective.requirements;
  assert.throws(() => registry.validateRun(missing), /does not match/);
  for (const value of [NaN, Infinity, -1, 1001, '90']) {
    const edited = { ...c, targetScore: value };
    assert.throws(() => create([edited]), /score requirement/i);
  }
  assert.throws(
    () => create([{ ...c, requirements: [c.requirements[0], c.requirements[0]] }]),
    /duplicate/i,
  );
  for (const value of [
    null,
    [],
    {},
    { building: 'constructor', neighbor: 'home', minimumNeighbors: 1, count: 1 },
  ])
    assert.throws(() => create([{ ...c, requirements: [value] }]), /requirement/i);
});
test('the expanded challenge library offers an accessible family filter', () => {
  const source = fs.readFileSync('src/quiet-wing/app.js', 'utf8');
  assert.match(source, /id="challenge-family"/);
  assert.match(source, /for="challenge-family"/);
  assert.match(source, /button\.hidden = family !== 'all'/);
});
test('source projection omits only authoring receipts and preserves objective progress', () => {
  const data = [...old, ...added],
    runtime = loader.runtime(data);
  for (const c of runtime) {
    for (const key of [
      'verification',
      'provenance',
      'referenceScore',
      'greedyScore',
      'greedyActions',
      'humanPlaytested',
    ])
      assert.equal(Object.hasOwn(c, key), false, `${c.id}: ${key}`);
  }
  const towns = added.filter((c) => c.family === 'borough');
  assert.equal(towns.length, 12);
  assert.equal(new Set(towns.map((c) => JSON.stringify(c.requirements))).size, 12);
  // Ten river footprints recur across twelve distinct seeded decks and briefs.
  assert.equal(new Set(towns.map((c) => E.borough.initial(c.seed).fixed.join(','))).size, 10);
  assert.equal(new Set(towns.map((c) => JSON.stringify(E.borough.initial(c.seed)))).size, 12);
  const registry = create(towns);
  for (const c of towns) {
    const run = registry.begin(c.id);
    run.log = c.solutionActions;
    const good = registry.replay(run);
    assert.equal(good.complete, true, c.id);
    assert.equal(E.borough.score(good.state), c.referenceScore, c.id);
    assert.ok(A.boroughRequirements(c, good.state).every((r) => r.actual >= r.count));
    run.log = c.greedyActions;
    const greedy = registry.replay(run);
    assert.equal(greedy.complete, false, c.id);
    assert.equal(E.borough.score(greedy.state), c.greedyScore, c.id);
  }
});
test('backup-worker projection removes duplicated presentation, not replay identities', () => {
  assert.equal(typeof loader.validation, 'function');
  const data = loader.load(),
    projected = loader.validation(data);
  const full = create(data),
    worker = create(projected);
  for (let i = 0; i < data.length; i++) {
    const c = data[i],
      run = full.begin(c.id);
    for (const key of ['title', 'instruction', 'hint', 'difficulty', 'difficultyStatus'])
      assert.equal(Object.hasOwn(projected[i], key), false, key);
    assert.equal(loader.runtime([c])[0].title, c.title, 'visible title remains in UI data');
    assert.deepEqual(worker.begin(c.id), run, c.id);
    const solution = c.solutionActions || c.solutionPath || c.principalVariation;
    run.log = typeof solution === 'string' ? [...solution] : solution;
    assert.equal(worker.replay(run).complete, true, c.id);
  }
});

test('actual built validation worker accepts all retained and new reference saves', () => {
  const vm = require('node:vm');
  const file = fs
    .readdirSync('dist/assets')
    .find((name) => /^validator\.[a-f0-9]+\.js$/.test(name));
  assert.ok(file, 'built validation worker exists');
  const results = [],
    context = { console, setTimeout, clearTimeout, TextEncoder, TextDecoder, URL };
  context.self = context;
  context.postMessage = (value) => results.push(value);
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('dist/assets/' + file, 'utf8'), context, { timeout: 5000 });
  const data = loader.load(),
    registry = create(data);
  for (const c of data) {
    const run = registry.begin(c.id),
      solution = c.solutionActions || c.solutionPath || c.principalVariation;
    run.log = typeof solution === 'string' ? [...solution] : solution;
    context.onmessage({ data: { type: 'challenge-run', text: JSON.stringify(run) } });
    const result = results.at(-1);
    assert.equal(result.ok, true, `${c.id}: ${result.error}`);
    assert.deepEqual(JSON.parse(JSON.stringify(result.value)), run);
  }
  const invalid = registry.begin(added.find((c) => c.family === 'borough').id);
  delete invalid.objective.requirements;
  context.onmessage({ data: { type: 'challenge-run', text: JSON.stringify(invalid) } });
  assert.equal(results.at(-1).ok, false);
});
