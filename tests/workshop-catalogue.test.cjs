'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'content/workshop');
const policy = JSON.parse(fs.readFileSync(path.join(source, 'catalogue.json')));
const { buildCatalogue, loadCatalogue } = require('../tools/workshop-catalogue.cjs');
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
function fixture() {
  return {
    policy: structuredClone(policy),
    bytes: new Map(
      policy.collections.map((entry) => [
        entry.source,
        fs.readFileSync(path.join(source, entry.source)),
      ]),
    ),
  };
}
function build(f, reserved = []) {
  return buildCatalogue(f.policy, (name) => f.bytes.get(name), reserved);
}
function changePack(f, edit) {
  const entry = f.policy.collections[0];
  const pack = JSON.parse(f.bytes.get(entry.source));
  edit(pack);
  const bytes = Buffer.from(JSON.stringify(pack));
  f.bytes.set(entry.source, bytes);
  entry.bytes = bytes.length;
  entry.sha256 = sha(bytes);
}

test('accepted collections expose 34 boards and exact content-addressed download bytes', () => {
  const f = fixture(),
    before = JSON.stringify(f.policy);
  const result = build(f);
  assert.equal(result.manifest.schemaVersion, 1);
  assert.deepEqual(
    result.manifest.collections.map((entry) => entry.count),
    [24, 10],
  );
  assert.deepEqual(
    result.manifest.collections.map((entry) => entry.difficultyStatus),
    ['provisional', 'provisional'],
  );
  assert.deepEqual(result.manifest.collections[0].families, [
    { type: 'futoshiki', count: 12 },
    { type: 'lightup', count: 12 },
  ]);
  for (const [i, entry] of result.manifest.collections.entries()) {
    const file = result.files[i];
    assert.equal(file.path, entry.download);
    assert.equal(entry.download, `${entry.id}.${entry.sha256}.json`);
    assert.deepEqual(file.data, f.bytes.get(f.policy.collections[i].source));
    assert.equal(entry.bytes, file.data.length);
    assert.equal(entry.sha256, sha(file.data));
    assert.notEqual(file.data, f.bytes.get(f.policy.collections[i].source));
    assert.deepEqual(
      Object.keys(entry).sort(),
      [
        'bytes',
        'count',
        'description',
        'difficultyStatus',
        'download',
        'families',
        'id',
        'packId',
        'packVersion',
        'sha256',
        'title',
      ].sort(),
    );
  }
  assert.equal(JSON.stringify(f.policy), before);
  assert.doesNotMatch(JSON.stringify(result.manifest), /"solution"|"rowClues"|"colClues"|"story"/);
  assert.deepEqual(build(f).manifest, result.manifest);
});

for (const [name, edit] of [
  [
    'future schema',
    (f) => {
      f.policy.schemaVersion = 2;
    },
  ],
  [
    'unknown policy field',
    (f) => {
      f.policy.url = 'https://invalid.test';
    },
  ],
  [
    'empty collections',
    (f) => {
      f.policy.collections = [];
    },
  ],
  [
    'too many collections',
    (f) => {
      f.policy.collections = Array(13).fill(f.policy.collections[0]);
    },
  ],
  [
    'sparse collections',
    (f) => {
      delete f.policy.collections[0];
    },
  ],
  [
    'unknown entry field',
    (f) => {
      f.policy.collections[0].url = '/evil.js';
    },
  ],
  [
    'traversal',
    (f) => {
      f.policy.collections[0].source = '../legacy.json';
    },
  ],
  [
    'absolute path',
    (f) => {
      f.policy.collections[0].source = '/tmp/pack.json';
    },
  ],
  [
    'URL path',
    (f) => {
      f.policy.collections[0].source = 'https://invalid.test/a.json';
    },
  ],
  [
    'backslash path',
    (f) => {
      f.policy.collections[0].source = 'sub\\pack.json';
    },
  ],
  [
    'invalid slug',
    (f) => {
      f.policy.collections[0].id = '<script>';
    },
  ],
  [
    'blank description',
    (f) => {
      f.policy.collections[0].description = ' ';
    },
  ],
  [
    'oversized description',
    (f) => {
      f.policy.collections[0].description = 'x'.repeat(601);
    },
  ],
  [
    'negative length',
    (f) => {
      f.policy.collections[0].bytes = -1;
    },
  ],
  [
    'fractional length',
    (f) => {
      f.policy.collections[0].bytes = 3.5;
    },
  ],
  [
    'oversized source claim',
    (f) => {
      f.policy.collections[0].bytes = 3 * 1024 * 1024 + 1;
    },
  ],
  [
    'wrong byte count',
    (f) => {
      f.policy.collections[0].bytes++;
    },
  ],
  [
    'wrong full hash',
    (f) => {
      f.policy.collections[0].sha256 = '0'.repeat(64);
    },
  ],
  [
    'short hash',
    (f) => {
      f.policy.collections[0].sha256 = f.policy.collections[0].sha256.slice(0, 12);
    },
  ],
  [
    'changed pack ID',
    (f) => {
      f.policy.collections[0].packId += '-other';
    },
  ],
  [
    'changed version',
    (f) => {
      f.policy.collections[0].packVersion = 2;
    },
  ],
  [
    'duplicate slug',
    (f) => {
      f.policy.collections[1].id = f.policy.collections[0].id;
    },
  ],
  [
    'duplicate pack source',
    (f) => {
      f.policy.collections[1] = { ...f.policy.collections[0], id: 'different' };
    },
  ],
  [
    'missing source',
    (f) => {
      f.bytes.delete(f.policy.collections[0].source);
    },
  ],
]) {
  test(`catalogue refuses ${name}`, () => {
    const f = fixture();
    edit(f);
    assert.throws(() => build(f));
  });
}

test('same-sized changed content fails its complete hash', () => {
  const f = fixture();
  const bytes = f.bytes.get(f.policy.collections[0].source);
  bytes[12] ^= 1;
  assert.throws(() => build(f), /digest/);
});
test('invalid UTF-8 is refused even with a matching digest', () => {
  const f = fixture(),
    entry = f.policy.collections[0];
  const bytes = Buffer.from([0xff, 0xfe]);
  entry.bytes = bytes.length;
  entry.sha256 = sha(bytes);
  f.bytes.set(entry.source, bytes);
  assert.throws(() => build(f), /UTF-8/);
});
test('invalid JSON is refused even with a matching digest', () => {
  const f = fixture(),
    entry = f.policy.collections[0];
  const bytes = Buffer.from('{');
  entry.bytes = bytes.length;
  entry.sha256 = sha(bytes);
  f.bytes.set(entry.source, bytes);
  assert.throws(() => build(f), /JSON/);
});
test('production validation rejects malformed puzzle content instead of blessing a digest', () => {
  const f = fixture();
  changePack(f, (pack) => {
    pack.puzzles[0].type = 'unimplemented';
  });
  assert.throws(() => build(f));
});
test('production uniqueness is checked, not just source metadata', () => {
  const f = fixture();
  changePack(f, (pack) => {
    pack.puzzles[0] = {
      id: 'ambiguous',
      revision: 1,
      type: 'nonogram',
      title: 'Ambiguous',
      subtitle: 'One filled cell in each line',
      difficulty: 'Tricky',
      difficultyStatus: 'provisional',
      size: 5,
      rowClues: Array.from({ length: 5 }, () => [1]),
      colClues: Array.from({ length: 5 }, () => [1]),
      solution: Array.from({ length: 25 }, (_, i) => Number(i % 6 === 0)),
    };
  });
  assert.throws(() => build(f), /unique|solution/i);
});
test('puzzle identities cannot collide with another collection or official content', () => {
  const f = fixture();
  const other = JSON.parse(f.bytes.get(f.policy.collections[1].source));
  changePack(f, (pack) => {
    pack.puzzles[0].id = other.puzzles[0].id;
  });
  assert.throws(() => build(f), /Duplicate puzzle/);
  const original = fixture();
  const id = JSON.parse(original.bytes.get(original.policy.collections[0].source)).puzzles[0].id;
  assert.throws(() => build(original, [id]), /Duplicate puzzle/);
});
test('only provisional definitions enter this first optional shelf', () => {
  const f = fixture();
  changePack(f, (pack) => {
    delete pack.puzzles[0].difficultyStatus;
  });
  assert.throws(() => build(f), /provisional/);
});
test('reader validates all manifests before opening any source', () => {
  const f = fixture();
  f.policy.collections[1].source = '../outside.json';
  let reads = 0;
  assert.throws(() =>
    buildCatalogue(
      f.policy,
      () => {
        reads++;
        return Buffer.alloc(0);
      },
      [],
    ),
  );
  assert.equal(reads, 0);
});
test('filesystem loader agrees with the pure compiler and the complete official registry', () => {
  assert.deepEqual(loadCatalogue(root).manifest, build(fixture()).manifest);
});
test('filesystem loader refuses symlink sources without following them', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-shelf-'));
  let outside = null;
  try {
    const dir = path.join(temp, 'content/workshop');
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(path.join(source, 'catalogue.json'), path.join(dir, 'catalogue.json'));
    const link = path.join(dir, policy.collections[0].source);
    try {
      fs.symlinkSync(path.join(source, policy.collections[0].source), link);
    } catch (error) {
      // A file symlink needs a privilege this Windows host may not have. A junction is
      // still not a regular file, so the loader must refuse it before reading the target.
      if (process.platform !== 'win32' || error?.code !== 'EPERM') throw error;
      outside = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-shelf-target-'));
      fs.symlinkSync(outside, link, 'junction');
    }
    assert.throws(() => loadCatalogue(temp), /regular|symlink/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
    if (outside) fs.rmSync(outside, { recursive: true, force: true });
  }
});

for (const kind of ['directory', 'oversized']) {
  test(`filesystem loader refuses a ${kind} source before reading pack bytes`, () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-shelf-'));
    try {
      const dir = path.join(temp, 'content/workshop');
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(path.join(source, 'catalogue.json'), path.join(dir, 'catalogue.json'));
      const filename = path.join(dir, policy.collections[0].source);
      if (kind === 'directory') fs.mkdirSync(filename);
      else {
        const fd = fs.openSync(filename, 'w');
        try {
          fs.ftruncateSync(fd, 3 * 1024 * 1024 + 1);
        } finally {
          fs.closeSync(fd);
        }
      }
      assert.throws(() => loadCatalogue(temp), /bounded regular file/);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
}
test('read-only CLI emits metadata, never the collection solution bytes', () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(process.execPath, ['tools/workshop-catalogue.cjs', '--check'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), loadCatalogue(root).manifest);
  assert.doesNotMatch(result.stdout, /"solution"|"rowClues"/);
  const bad = spawnSync(process.execPath, ['tools/workshop-catalogue.cjs', '--write'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /Usage/);
  assert.equal(bad.stdout, '');
});
