'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { validateCase, parseCase, readCase } = require('../tools/case-authoring.cjs');
const prose = (text = 'A fictional source.') => ({ storyOn: text, storyOff: text });
function fixture() {
  return {
    format: 'postern-case-1',
    id: 'sample',
    revision: 1,
    title: 'A small case',
    intro: prose(),
    ending: prose(),
    provenance: 'Original fictional test fixture.',
    records: [
      {
        id: 'note',
        title: 'The note',
        kind: 'record',
        source: 'Fixture A',
        at: 'first',
        text: prose(),
      },
    ],
    steps: [
      {
        id: 'first',
        title: 'Inspect',
        prompt: prose(),
        requires: [],
        claims: [{ id: 'claim', text: prose(), answer: 'supported', evidence: [['note']] }],
        hints: ['orientation', 'constraint', 'method'].map((level) => ({
          level,
          text: prose(),
          records: ['note'],
        })),
        workedAnswer: { text: prose(), records: ['note'] },
      },
    ],
  };
}
function branching() {
  const d = fixture();
  for (const [id, requires] of [
    ['left', ['first']],
    ['right', ['first']],
    ['last', ['left', 'right']],
  ]) {
    const step = structuredClone(d.steps[0]);
    step.id = id;
    step.requires = requires;
    step.claims[0].id = `claim-${id}`;
    d.steps.push(step);
  }
  return d;
}
test('valid case returns a structure-only report without mutating frozen input', () => {
  const d = fixture();
  const before = JSON.stringify(d);
  const freeze = (v) => {
    if (v && typeof v === 'object') {
      Object.values(v).forEach(freeze);
      Object.freeze(v);
    }
  };
  freeze(d);
  assert.deepEqual(validateCase(d), {
    caseId: 'sample',
    revision: 1,
    records: 1,
    steps: 1,
    claims: 1,
    scope: 'structure-only',
  });
  assert.equal(JSON.stringify(d), before);
});
test('valid branching graph allows an ancestor citation through either AND prerequisite', () => {
  assert.equal(validateCase(branching()).steps, 4);
});
const invalid = [
  ['null case', () => null, /case/],
  [
    'future format',
    (d) => {
      d.format = 'postern-case-2';
    },
    /format/,
  ],
  [
    'unknown top-level field',
    (d) => {
      d.future = true;
    },
    /future/,
  ],
  [
    'unknown nested field',
    (d) => {
      d.steps[0].claims[0].script = 'run';
    },
    /script/,
  ],
  [
    'unsafe id',
    (d) => {
      d.id = '__proto__';
    },
    /id/,
  ],
  [
    'empty title',
    (d) => {
      d.title = '  ';
    },
    /title/,
  ],
  [
    'oversized title',
    (d) => {
      d.title = 'x'.repeat(121);
    },
    /title/,
  ],
  [
    'oversized prose',
    (d) => {
      d.intro.storyOff = 'x'.repeat(1801);
    },
    /storyOff/,
  ],
  [
    'missing story-off',
    (d) => {
      delete d.records[0].text.storyOff;
    },
    /storyOff/,
  ],
  [
    'zero revision',
    (d) => {
      d.revision = 0;
    },
    /revision/,
  ],
  [
    'fractional revision',
    (d) => {
      d.revision = 1.5;
    },
    /revision/,
  ],
  [
    'unsafe revision',
    (d) => {
      d.revision = Number.MAX_SAFE_INTEGER + 1;
    },
    /revision/,
  ],
  [
    'empty records',
    (d) => {
      d.records = [];
    },
    /records/,
  ],
  [
    'too many records',
    (d) => {
      d.records = Array(65).fill(d.records[0]);
    },
    /records/,
  ],
  [
    'too many steps',
    (d) => {
      d.steps = Array(17).fill(d.steps[0]);
    },
    /steps/,
  ],
  [
    'duplicate record',
    (d) => {
      d.records.push(structuredClone(d.records[0]));
    },
    /duplicate/,
  ],
  [
    'duplicate step',
    (d) => {
      d.steps.push(structuredClone(d.steps[0]));
    },
    /duplicate/,
  ],
  [
    'duplicate claim',
    (d) => {
      d.steps[0].claims.push(structuredClone(d.steps[0].claims[0]));
    },
    /duplicate/,
  ],
  [
    'unknown record type',
    (d) => {
      d.records[0].kind = 'rumour';
    },
    /kind/,
  ],
  [
    'unknown owner',
    (d) => {
      d.records[0].at = 'missing';
    },
    /at/,
  ],
  [
    'unknown prerequisite',
    (d) => {
      d.steps[0].requires = ['missing'];
    },
    /requires/,
  ],
  [
    'duplicate prerequisite',
    (d) => {
      d.steps[0].requires = ['first', 'first'];
    },
    /duplicate/,
  ],
  [
    'self cycle',
    (d) => {
      d.steps[0].requires = ['first'];
    },
    /cycle/,
  ],
  [
    'invalid verdict',
    (d) => {
      d.steps[0].claims[0].answer = 'probably';
    },
    /answer/,
  ],
  [
    'missing citations',
    (d) => {
      d.steps[0].claims[0].evidence = [];
    },
    /evidence/,
  ],
  [
    'empty citation bundle',
    (d) => {
      d.steps[0].claims[0].evidence = [[]];
    },
    /evidence/,
  ],
  [
    'duplicate citation',
    (d) => {
      d.steps[0].claims[0].evidence = [['note', 'note']];
    },
    /duplicate/,
  ],
  [
    'unknown citation',
    (d) => {
      d.steps[0].claims[0].evidence = [['missing']];
    },
    /unknown/,
  ],
  [
    'too many alternative bundles',
    (d) => {
      d.steps[0].claims[0].evidence = Array(9).fill(['note']);
    },
    /evidence/,
  ],
  [
    'duplicate alternative bundles',
    (d) => {
      d.steps[0].claims[0].evidence = [['note'], ['note']];
    },
    /duplicate/,
  ],
  [
    'hint order',
    (d) => {
      d.steps[0].hints.reverse();
    },
    /level/,
  ],
  [
    'missing hint',
    (d) => {
      d.steps[0].hints.pop();
    },
    /hints/,
  ],
  [
    'unknown hint source',
    (d) => {
      d.steps[0].hints[0].records = ['missing'];
    },
    /unknown/,
  ],
  [
    'unknown worked source',
    (d) => {
      d.steps[0].workedAnswer.records = ['missing'];
    },
    /unknown/,
  ],
];
for (const [name, mutate, pattern] of invalid) {
  test(`rejects ${name} with a field-path diagnostic`, () => {
    const d = fixture();
    const result = mutate(d);
    assert.throws(() => validateCase(result === null ? null : d), pattern);
  });
}
test('rejects a multi-step cycle, rather than accepting existing IDs as reachability', () => {
  const d = branching();
  d.steps[0].requires = ['last'];
  assert.throws(() => validateCase(d), /cycle/);
});
test('rejects a source hidden in a sibling or future step for claims, hints and reveals', () => {
  for (const owner of ['right', 'last'])
    for (const surface of ['claim', 'hint', 'worked']) {
      const d = branching();
      d.records.push({ ...structuredClone(d.records[0]), id: 'hidden', at: owner });
      const step = d.steps[1];
      if (surface === 'claim') step.claims[0].evidence = [['hidden']];
      if (surface === 'hint') step.hints[0].records = ['hidden'];
      if (surface === 'worked') step.workedAnswer.records = ['hidden'];
      assert.throws(() => validateCase(d), /not visible/);
    }
});
test('enforces total claim bound across steps', () => {
  const d = branching();
  d.steps.forEach((s, i) => {
    s.claims = Array.from({ length: 17 }, (_, j) => ({
      ...structuredClone(s.claims[0]),
      id: `c-${i}-${j}`,
    }));
  });
  assert.throws(() => validateCase(d), /total claims/);
});
test('source receipt binds exact UTF-8 bytes and changes for deferred prose changes', () => {
  const text = JSON.stringify(fixture());
  const result = parseCase(text);
  assert.equal(result.receipt.sourceSha256, crypto.createHash('sha256').update(text).digest('hex'));
  assert.equal(result.definition.id, 'sample');
  assert.notEqual(parseCase(`${text}\n`).receipt.sourceSha256, result.receipt.sourceSha256);
});
test('accepts byte boundary, rejects excess bytes and measures multibyte text correctly', () => {
  const text = JSON.stringify(fixture());
  assert.equal(parseCase(text.padEnd(262144)).receipt.sourceBytes, 262144);
  assert.throws(() => parseCase(text.padEnd(262145)), /bytes/);
  assert.throws(() => parseCase('é'.repeat(131073)), /bytes/);
});
test('rejects invalid JSON and non-string input', () => {
  assert.throws(() => parseCase('{'), /JSON/);
  assert.throws(() => parseCase(null), /text/);
});
test('bounded regular-file reader rejects oversized and invalid UTF-8 files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-case-'));
  try {
    const file = path.join(dir, 'case.json');
    fs.writeFileSync(file, JSON.stringify(fixture()));
    assert.equal(readCase(file).definition.id, 'sample');
    fs.writeFileSync(file, Buffer.alloc(262145));
    assert.throws(() => readCase(file), /bytes/);
    fs.writeFileSync(file, Buffer.from([0xff]));
    assert.throws(() => readCase(file), /UTF-8/);
    assert.throws(() => readCase(dir), /regular file/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test('CLI prints structure receipt and exits nonzero for malformed input or usage', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-case-cli-'));
  const cli = path.join(__dirname, '../tools/case-authoring.cjs');
  try {
    const file = path.join(dir, 'case.json');
    fs.writeFileSync(file, JSON.stringify(fixture()));
    const good = spawnSync(process.execPath, [cli, file], { encoding: 'utf8' });
    assert.equal(good.status, 0, good.stderr);
    assert.equal(JSON.parse(good.stdout).scope, 'structure-only');
    fs.writeFileSync(file, '{');
    const bad = spawnSync(process.execPath, [cli, file], { encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /JSON/);
    assert.equal(bad.stdout, '');
    assert.equal(spawnSync(process.execPath, [cli]).status, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects sparse arrays rather than silently skipping a malformed claim', () => {
  const d = fixture();
  d.steps[0].claims = new Array(1);
  assert.throws(() => validateCase(d), /sparse/);
});
test('rejects duplicate evidence bundles irrespective of citation order', () => {
  const d = fixture();
  d.records.push({ ...structuredClone(d.records[0]), id: 'note-two' });
  d.steps[0].claims[0].evidence = [
    ['note', 'note-two'],
    ['note-two', 'note'],
  ];
  assert.throws(() => validateCase(d), /duplicate/);
});
test('bounds reference bundles and accepts all three verdicts', () => {
  for (const answer of ['supported', 'contradicted', 'not-established']) {
    const d = fixture();
    d.steps[0].claims[0].answer = answer;
    assert.equal(validateCase(d).claims, 1);
  }
  const d = fixture();
  d.steps[0].claims[0].evidence = [Array(9).fill('note')];
  assert.throws(() => validateCase(d), /evidence/);
});
