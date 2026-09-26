'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
test('the production challenge audit includes all 95 registered definitions', () => {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'alibi-audit-'));
  try {
    const out = path.join(dir, 'report.json');
    require('node:child_process').execFileSync(
      process.execPath,
      [
        'tools/curation/replay_challenges.cjs',
        'src/quiet-wing/engine.js',
        'src/club-engines.js',
        out,
      ],
      { timeout: 20000 },
    );
    const report = JSON.parse(fs.readFileSync(out, 'utf8'));
    const entries = ['classic', 'warehouse', 'reversi', 'borough'].flatMap((k) => report[k]);
    assert.equal(entries.length, 95);
    assert.equal(new Set(entries.map((c) => c.id)).size, 95);
    assert.equal(report.allPassed, true);
    const expected = require('../tools/challenge-catalogue.cjs')
      .load()
      .map((c) => c.id)
      .sort();
    assert.deepEqual(entries.map((c) => c.id).sort(), expected);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
