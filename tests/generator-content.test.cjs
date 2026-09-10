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

test('content generation preserves published order, headers and casebook framing', () => {
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

    // A normal run must leave the checked-in content byte-for-byte equivalent.
    const baselineCatalog = readJson(path.join(fixture, 'content/catalog.json')),
      baselineBooks = readJson(path.join(fixture, 'content/casebooks.json')),
      baselineRun = spawnSync(process.execPath, ['tools/generate-content.cjs'], {
        cwd: fixture,
        encoding: 'utf8',
      });
    assert.equal(baselineRun.status, 0, baselineRun.stderr || baselineRun.stdout);
    assert.deepEqual(
      readJson(path.join(fixture, 'content/catalog.json')),
      baselineCatalog,
      'a normal generation run must preserve the checked-in catalogue',
    );
    assert.deepEqual(
      readJson(path.join(fixture, 'content/casebooks.json')),
      baselineBooks,
      'a normal generation run must preserve the checked-in casebooks',
    );

    // Editorial corrections, deliberate reordering and additions must survive even when the seed
    // is stale. Removing a seeded entry models a genuinely new seed that should append at the end.
    const editedCatalog = readJson(path.join(fixture, 'content/catalog.json')),
      missingPuzzleId = 'scene-13',
      missingPuzzleIndex = editedCatalog.puzzles.findIndex(
        (puzzle) => puzzle.id === missingPuzzleId,
      );
    assert.notEqual(missingPuzzleIndex, -1, 'fixture must contain a generated seed to remove');
    editedCatalog.schemaVersion = 9;
    editedCatalog.id = 'alibi-reviewed';
    editedCatalog.version = 99;
    editedCatalog.title = 'Reviewed cabinet';
    editedCatalog.author = 'Editorial desk';
    editedCatalog.catalogueNote = 'Retain this checked-in metadata.';
    editedCatalog.puzzles.splice(missingPuzzleIndex, 1);
    const movedPuzzle = editedCatalog.puzzles.pop();
    editedCatalog.puzzles.splice(1, 0, movedPuzzle);
    fs.writeFileSync(path.join(fixture, 'content/catalog.json'), JSON.stringify(editedCatalog));

    const editedBooks = readJson(path.join(fixture, 'content/casebooks.json')),
      missingBookId = 'night-train',
      missingBookIndex = editedBooks.findIndex((book) => book.id === missingBookId);
    assert.notEqual(missingBookIndex, -1, 'fixture must contain a generated casebook to remove');
    editedBooks[0].chapters[0].brief = 'A reviewed correction made after the seeded release.';
    editedBooks.splice(missingBookIndex, 1);
    const movedBook = editedBooks.pop();
    editedBooks.splice(1, 0, movedBook);
    editedBooks.splice(2, 0, {
      ...structuredClone(editedBooks[1]),
      id: 'later-anthology',
      title: 'Later records',
      format: 'anthology',
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
    const newPuzzles = afterCatalog.puzzles.filter(
        (puzzle) => !beforeCatalog.puzzles.some((before) => before.id === puzzle.id),
      ),
      newBooks = afterBooks.filter((book) => !beforeBooks.some((before) => before.id === book.id));
    assert.deepEqual(
      afterCatalog.puzzles.filter((puzzle) =>
        beforeCatalog.puzzles.some((before) => before.id === puzzle.id),
      ),
      beforeCatalog.puzzles,
      'generation must preserve published puzzle data and order',
    );
    assert.equal(newPuzzles.length, 1, 'only the absent seeded puzzle is appended');
    assert.equal(newPuzzles[0].id, missingPuzzleId, 'the absent seeded puzzle is appended');
    assert.deepEqual(
      { ...afterCatalog, puzzles: beforeCatalog.puzzles },
      { ...beforeCatalog, puzzles: beforeCatalog.puzzles },
      'generation must preserve every checked-in catalogue header field',
    );
    assert.deepEqual(
      afterBooks.filter((book) => beforeBooks.some((before) => before.id === book.id)),
      beforeBooks,
      'generation must preserve reviewed casebook copy and order',
    );
    assert.equal(newBooks.length, 1, 'only the absent seeded casebook is appended');
    assert.equal(newBooks[0].id, missingBookId, 'the absent seeded casebook is appended');
    assert.equal(beforeBooks[2].id, 'later-anthology', 'the extra casebook stays in the middle');
    assert.equal(afterBooks[2].id, 'later-anthology', 'the extra casebook order is preserved');
    assert.equal(
      new Set(afterCatalog.puzzles.map((puzzle) => puzzle.id)).size,
      afterCatalog.puzzles.length,
      'generated catalogue IDs remain unique',
    );
    assert.equal(afterBooks[0].format, 'continuous', 'Bellweather remains the continuous casebook');
    assert.equal(afterBooks[0].chapters.length, 6, 'Bellweather chronology remains six chapters');
    assert.ok(
      afterBooks
        .filter(
          (book) => !['last-light-at-bellweather', 'the-unfinished-invitation'].includes(book.id),
        )
        .every((book) => book.format === 'anthology'),
      'the earlier and added anthologies retain their format',
    );

    const reportDir = path.join(ROOT, 'test-results', 'generator');
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(
      path.join(reportDir, 'generator-results.json'),
      JSON.stringify(
        {
          passed: true,
          scope:
            'Disposable generator runs preserve checked-in order and headers, then append absent seeds',
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
