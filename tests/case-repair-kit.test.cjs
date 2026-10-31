'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readCase, validateCase } = require('../tools/case-authoring.cjs');
const { buildPreview } = require('../tools/case-preview.cjs');
const session = require('../tools/case-session.cjs');
const root = path.resolve(__dirname, '..');
const source = (name) => path.join(root, 'examples/cases/repair-kit', name + '.json');
const raw = (name) => JSON.parse(fs.readFileSync(source(name), 'utf8'));
const control = raw('repaired');
// Worked-example oracle, independent of the authored answer key. This is not a prose solver.
const trueArrival = 18 * 60 + 2 - 4;
const custodyWorlds = ['Rowan', 'Nell'].map((mover) => mover === 'Rowan');
const expected = [
  {
    id: 'before-bell',
    verdict: trueArrival < 18 * 60 ? 'supported' : 'contradicted',
    citations: ['receiving-slip', 'clock-test'],
  },
  {
    id: 'north-entrance',
    verdict: 'south' === 'north' ? 'supported' : 'contradicted',
    citations: ['entrance-register'],
  },
  {
    id: 'rowan-stored',
    verdict: custodyWorlds.every(Boolean)
      ? 'supported'
      : custodyWorlds.every((v) => !v)
        ? 'contradicted'
        : 'not-established',
    citations: ['handover-note', 'custody-rule'],
  },
];
const repairs = [
  [
    'bad-record-id',
    'case.steps[0].claims[0].evidence[0]: unknown record receiving-slpi',
    (d) => {
      d.steps[0].claims[0].evidence[0][0] = 'receiving-slip';
    },
  ],
  [
    'hidden-future-premise',
    'case.steps[0].claims[0].evidence[0]: record clock-test is not visible in this step',
    (d) => {
      d.records[1].at = 'arrival';
    },
  ],
  [
    'prerequisite-cycle',
    'case.steps.arrival.requires: prerequisite cycle',
    (d) => {
      d.steps[0].requires = [];
    },
  ],
  [
    'missing-story-off',
    'case.records[0].text.storyOff: missing field',
    (d) => {
      d.records[0].text.storyOff = control.records[0].text.storyOff;
    },
  ],
];

test('repair control validates as a small structural specimen', () => {
  const { receipt } = readCase(source('repaired'));
  assert.deepEqual(
    [receipt.records, receipt.steps, receipt.claims, receipt.scope],
    [5, 3, 3, 'structure-only'],
  );
  assert.equal(trueArrival, 17 * 60 + 58);
  assert.deepEqual(custodyWorlds, [true, false]);
});

for (const [name, diagnostic, repair] of repairs) {
  test(`${name}: exact diagnostic, refused preview, single repair restores control`, () => {
    assert.throws(
      () => readCase(source(name)),
      (error) => error.message === diagnostic,
    );
    assert.throws(
      () => buildPreview(source(name)),
      (error) => error.message === diagnostic,
    );
    const fixed = raw(name);
    repair(fixed);
    assert.deepEqual(fixed, control);
    assert.equal(validateCase(fixed).scope, 'structure-only');
  });
}

test('unsupported verdict passes structure but rejects the defensible answer', () => {
  const { definition, receipt } = readCase(source('unsupported-verdict'));
  assert.equal(receipt.scope, 'structure-only');
  assert.ok(buildPreview(source('unsupported-verdict')).html.includes('parcel-before-the-bell'));
  const result = session.submit(definition, ['arrival', 'route'], 'custody', [expected[2]]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [{ claimId: 'rowan-stored', code: 'verdict' }]);
  definition.steps[2].claims[0].answer = expected[2].verdict;
  assert.deepEqual(definition, control);
});

test('repaired case accepts independently worked answers in both story modes', () => {
  for (const story of [true, false]) {
    let completed = [];
    for (const [index, step] of control.steps.entries()) {
      const view = session.project(control, completed, step.id, story);
      for (const citation of expected[index].citations)
        assert.ok(view.records.some((r) => r.id === citation));
      const result = session.submit(control, completed, step.id, [expected[index]]);
      assert.equal(result.ok, true);
      completed = result.completed;
    }
    assert.deepEqual(completed, ['arrival', 'route', 'custody']);
  }
});

test('documented CLI refuses broken outputs and generates the repaired portable preview', (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-repair-kit-'));
  t.after(() => {
    assert.equal(path.dirname(temp), path.resolve(os.tmpdir()));
    fs.rmSync(temp, { recursive: true });
  });
  for (const [name, diagnostic] of repairs) {
    const output = path.join(temp, name + '.html');
    const result = spawnSync(process.execPath, ['tools/case-preview.cjs', source(name), output], {
      cwd: root,
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.equal(result.status, 1, result.stderr);
    assert.ok(result.stderr.includes(diagnostic), result.stderr);
    assert.equal(fs.existsSync(output), false);
  }
  const output = path.join(temp, 'repaired.html');
  const result = spawnSync(
    process.execPath,
    ['tools/case-preview.cjs', source('repaired'), output],
    { cwd: root, encoding: 'utf8', timeout: 5000 },
  );
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.state, 'memory-only');
  assert.equal(receipt.sourceSha256, readCase(source('repaired')).receipt.sourceSha256);
  assert.match(fs.readFileSync(output, 'utf8'), /connect-src 'none'/);
});
