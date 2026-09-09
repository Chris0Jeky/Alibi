'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

test('content generation preserves the published catalogue and casebook framing', () => {
  const sourceFiles = [
      'tools/generate-content.cjs',
      'src/core.js',
      'src/engines.js',
      'content/legacy.json',
      'content/catalog.json',
      'content/casebooks.json',
    ],
    activeSnapshots = new Map(
      ['content/catalog.json', 'content/casebooks.json'].map((file) => [
        file,
        fs.readFileSync(path.join(ROOT, file), 'utf8'),
      ]),
    ),
    fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-generator-'));
  try {
    for (const file of sourceFiles) {
      const destination = path.join(fixture, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(ROOT, file), destination);
    }

    // Published editorial corrections and additions must survive even when the seed is stale.
    const editedBooks = readJson(path.join(fixture, 'content/casebooks.json'));
    editedBooks[0].chapters[0].brief = 'A reviewed correction made after the seeded release.';
    editedBooks.push({
      ...structuredClone(editedBooks[1]),
      id: 'later-anthology',
      title: 'Later records',
    });
    fs.writeFileSync(path.join(fixture, 'content/casebooks.json'), JSON.stringify(editedBooks));

    const beforeCatalog = readJson(path.join(fixture, 'content/catalog.json')),
      beforeBooks = readJson(path.join(fixture, 'content/casebooks.json')),
      run = spawnSync(process.execPath, ['tools/generate-content.cjs'], {
        cwd: fixture,
        encoding: 'utf8',
      });
    assert.equal(run.status, 0, run.stderr || run.stdout);

    const afterCatalog = readJson(path.join(fixture, 'content/catalog.json')),
      afterBooks = readJson(path.join(fixture, 'content/casebooks.json'));
    assert.deepEqual(afterCatalog, beforeCatalog, 'generation must preserve published puzzle data');
    assert.deepEqual(afterBooks, beforeBooks, 'generation must preserve reviewed casebook copy');
    assert.equal(afterCatalog.puzzles.length, 116, 'all published puzzles remain present');
    assert.equal(
      new Set(afterCatalog.puzzles.map((puzzle) => puzzle.id)).size,
      afterCatalog.puzzles.length,
      'generated catalogue IDs remain unique',
    );
    assert.equal(
      afterBooks.length,
      5,
      'all published casebooks and later additions remain present',
    );
    assert.equal(afterBooks[0].format, 'continuous', 'Bellweather remains the continuous casebook');
    assert.equal(afterBooks[0].chapters.length, 6, 'Bellweather chronology remains six chapters');
    assert.ok(
      afterBooks.slice(1).every((book) => book.format === 'anthology'),
      'the earlier and added anthologies retain their format',
    );

    const reportDir = path.join(ROOT, 'test-results', 'generator');
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(
      path.join(reportDir, 'generator-results.json'),
      JSON.stringify(
        {
          passed: true,
          scope: 'Disposable generator run; checked-in catalogue and casebooks are unchanged',
          puzzles: afterCatalog.puzzles.length,
          casebooks: afterBooks.length,
          catalogueDigest: digest(afterCatalog),
          casebooksDigest: digest(afterBooks),
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
    for (const [file, snapshot] of activeSnapshots)
      assert.equal(
        fs.readFileSync(path.join(ROOT, file), 'utf8'),
        snapshot,
        `${file} was not changed`,
      );
  }
});
