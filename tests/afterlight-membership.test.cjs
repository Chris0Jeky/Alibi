'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { build } = require('../tools/curation/afterlight-pictures.cjs');
const blueprint = require('../content/curation/editorial/afterlight-blueprints.json');
const pack = require('../content/workshop/afterlight-pictures.json');

const invalid = [
  ['missing a study', (source) => source.studies.pop()],
  [
    'empty collection',
    (source) => {
      source.studies = [];
    },
  ],
  [
    'unexpected ID',
    (source) => {
      source.studies[9].id = 'afterlight-picture-99';
    },
  ],
  [
    'extra study',
    (source) => source.studies.push({ ...source.studies[0], id: 'afterlight-picture-11' }),
  ],
  [
    'sparse collection',
    (source) => {
      delete source.studies[5];
    },
  ],
  [
    'duplicate membership',
    (source) => {
      source.studies[9].id = source.studies[0].id;
    },
  ],
];
for (const [name, mutate] of invalid) {
  test(`Afterlight compiler refuses ${name} before reading pixel rows`, () => {
    const source = structuredClone(blueprint);
    mutate(source);
    for (const study of source.studies) {
      if (study)
        Object.defineProperty(study, 'rows', {
          get() {
            throw Error('PIXELS_READ_TOO_EARLY');
          },
        });
    }
    assert.throws(() => build(source), /complete ten-study Afterlight collection/);
  });
}

test('the fixed membership may be reordered without changing any puzzle definition', () => {
  const source = structuredClone(blueprint);
  source.studies.reverse();
  assert.deepEqual(build(source).puzzles, [...pack.puzzles].reverse());
});

test('--write leaves the existing pack byte-for-byte intact when a study is missing', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-afterlight-membership-'));
  try {
    const script = path.join(root, 'tools/curation/afterlight-pictures.cjs');
    const sourcePath = path.join(root, 'content/curation/editorial/afterlight-blueprints.json');
    const targetPath = path.join(root, 'content/workshop/afterlight-pictures.json');
    for (const file of [script, sourcePath, targetPath])
      fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.copyFileSync(require.resolve('../tools/curation/afterlight-pictures.cjs'), script);
    const original = fs.readFileSync(
      require.resolve('../content/workshop/afterlight-pictures.json'),
    );
    fs.writeFileSync(targetPath, original);
    const source = structuredClone(blueprint);
    source.studies.pop();
    fs.writeFileSync(sourcePath, JSON.stringify(source));
    const result = spawnSync(process.execPath, [script, '--write'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0, '--write must refuse an incomplete collection');
    assert.match(result.stderr, /complete ten-study Afterlight collection/);
    assert.deepEqual(
      fs.readFileSync(targetPath),
      original,
      'a failed compile must not touch the existing bytes',
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
