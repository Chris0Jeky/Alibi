'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { buildParityReceipt } = require('../tools/case-parity.cjs');
const S = require('../tools/case-session.cjs');
const file = path.join(__dirname, '../content/cases/reading-room-blackout.json');
const fixture = () => JSON.parse(fs.readFileSync(file, 'utf8'));
function withSource(definition, action) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-parity-'));
  try {
    const source = path.join(dir, 'case.json');
    fs.writeFileSync(source, JSON.stringify(definition));
    return action(source);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('receipt binds bytes, revision and locale while separating mechanical and editorial results', () => {
  const r = buildParityReceipt(file);
  assert.equal(r.caseId, 'reading-room-blackout');
  assert.equal(r.revision, 1);
  assert.equal(r.locale, 'en');
  assert.equal(
    r.sourceSha256,
    crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  );
  assert.equal(r.mechanical.status, 'pass');
  assert.deepEqual(r.mechanical.differences, []);
  assert.deepEqual(r.mechanical.modes.storyOn, r.mechanical.modes.storyOff);
  assert.equal(r.editorial.status, 'required');
  assert.equal(r.editorial.semanticEquivalence, 'not-certified');
  assert.equal(r.editorial.rows.length, 32);
  assert.deepEqual(r.editorial.rows[0], { path: 'intro', ...fixture().intro });
});

test('contract covers IDs, graph, verdicts, sufficient citation sets, hint levels and reveal sources', () => {
  const { contract, modes } = buildParityReceipt(file).mechanical;
  assert.deepEqual(
    contract.records.map((r) => [r.id, r.at]),
    fixture().records.map((r) => [r.id, r.at]),
  );
  assert.deepEqual(contract.verdicts, ['supported', 'contradicted', 'not-established']);
  assert.deepEqual(
    contract.steps.map((s) => [s.id, s.requires]),
    [
      ['window', []],
      ['alarm', ['window']],
      ['attribution', ['alarm']],
    ],
  );
  assert.deepEqual(contract.steps[0].claims[0], {
    id: 'bounded-window',
    answer: 'supported',
    evidence: [['checks', 'model']],
  });
  const [window, alarm] = modes.storyOn;
  assert.deepEqual(window.beforeCompletion.claims[0].citationChoices, ['checks', 'model']);
  assert.deepEqual(
    window.beforeCompletion.hints.map((h) => h.level),
    ['orientation', 'constraint', 'method'],
  );
  assert.deepEqual(window.beforeCompletion.workedAnswer, {
    accessible: true,
    records: ['checks', 'model'],
  });
  assert.deepEqual(alarm.initialAccess, { projection: false, workedAnswer: false });
  assert.deepEqual(alarm.beforeCompletion.completed, ['window']);
});

test('branching prerequisites preserve source scope even after a sibling completes', () => {
  const d = fixture();
  d.steps[2].requires = ['window'];
  withSource(d, (source) => {
    const r = buildParityReceipt(source);
    const view = r.mechanical.modes.storyOff[1].afterCompletion;
    assert.equal(r.mechanical.status, 'pass');
    assert.deepEqual(
      view.records.map((record) => record.id),
      ['checks', 'model', 'bell-log', 'maintenance'],
    );
    assert.ok(!view.claims[0].citationChoices.includes('custody'));
  });
});

for (const [name, mutate] of [
  ['record visibility', (v) => v.records.pop()],
  [
    'claim ID',
    (v) => {
      v.claims[0].id = 'changed';
    },
  ],
  [
    'hint level',
    (v) => {
      v.hints[0].level = 'method';
    },
  ],
  [
    'hint sources',
    (v) => {
      v.hints[0].records = [];
    },
  ],
]) {
  test(`detects an actual story-off projection regression: ${name}`, (t) => {
    const original = S.project;
    t.mock.method(S, 'project', (...args) => {
      const view = original(...args);
      if (!args[3]) mutate(view);
      return view;
    });
    const r = buildParityReceipt(file);
    assert.equal(r.mechanical.status, 'fail');
    assert.ok(r.mechanical.differences.includes('window'));
  });
}

test('detects story-off worked-answer access drift', (t) => {
  const original = S.worked;
  t.mock.method(S, 'worked', (...args) => {
    if (!args[3] && args[1].length === 0) return { text: 'leaked', records: [] };
    return original(...args);
  });
  const r = buildParityReceipt(file);
  assert.equal(r.mechanical.status, 'fail');
  assert.ok(r.mechanical.differences.includes('alarm'));
});

test('detects story-off refusal of an available worked answer', (t) => {
  const original = S.worked;
  t.mock.method(S, 'worked', (...args) => {
    if (!args[3]) throw new TypeError('Unknown or locked step');
    return original(...args);
  });
  assert.equal(buildParityReceipt(file).mechanical.status, 'fail');
});

for (const [name, mutate] of [
  [
    'prerequisites',
    (d) => {
      d.steps[2].requires = ['window'];
    },
  ],
  [
    'citation bundles',
    (d) => {
      d.steps[0].claims[0].evidence = [['checks']];
    },
  ],
  [
    'verdict',
    (d) => {
      d.steps[0].claims[0].answer = 'contradicted';
    },
  ],
]) {
  test(`a future locale must reject changed non-prose ${name}`, () => {
    const baseline = buildParityReceipt(file).mechanical.contract;
    const d = fixture();
    mutate(d);
    withSource(d, (source) =>
      assert.notDeepEqual(buildParityReceipt(source).mechanical.contract, baseline),
    );
  });
}

for (const [name, before, after] of [
  ['number', '18:08', '18:01'],
  ['negation', 'it was absent', 'it was not absent'],
  ['uncertainty', 'it was absent', 'it might have been absent'],
]) {
  test(`${name} mutation changes evidence meaning yet passes mechanical parity`, () => {
    const d = fixture();
    const baseline = buildParityReceipt(file);
    const text = d.records[0].text;
    assert.ok(text.storyOff.includes(before));
    text.storyOff = text.storyOff.replace(before, after);
    assert.notEqual(text.storyOn, text.storyOff);
    withSource(d, (source) => {
      const r = buildParityReceipt(source);
      assert.equal(r.mechanical.status, 'pass');
      assert.deepEqual(r.mechanical, baseline.mechanical);
      assert.notEqual(r.sourceSha256, baseline.sourceSha256);
      assert.equal(r.editorial.semanticEquivalence, 'not-certified');
      assert.deepEqual(
        r.editorial.rows.find((row) => row.path === 'records.checks.text'),
        {
          path: 'records.checks.text',
          ...text,
        },
      );
    });
  });
}

test('CLI exports the separate results and refuses malformed or missing source', () => {
  const run = (...args) =>
    spawnSync(process.execPath, [path.join(__dirname, '../tools/case-parity.cjs'), ...args], {
      encoding: 'utf8',
    });
  const result = run(file);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).editorial.status, 'required');
  assert.equal(run().status, 1);
  withSource({ format: 'future' }, (source) => assert.equal(run(source).status, 1));
});
