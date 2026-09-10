'use strict';

const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');

require('../src/core.js');
const C = require('../src/engines.js'),
  root = path.join(__dirname, '..'),
  pack = JSON.parse(fs.readFileSync(path.join(root, 'content/extra/case-invitation.json'))),
  books = JSON.parse(fs.readFileSync(path.join(root, 'content/casebooks.json'))),
  book = books.find((entry) => entry.id === 'the-unfinished-invitation');

function lineRuns(line) {
  const out = [];
  let count = 0;
  for (const value of [...line, 0]) {
    if (value) count++;
    else if (count) {
      out.push(count);
      count = 0;
    }
  }
  return out.length ? out : [0];
}

function independentWitness(puzzle) {
  const matches = [];
  for (let person = 0; person < puzzle.people.length; person++) {
    const truths = puzzle.statements.filter((statement) => {
      if (statement.kind === 'is') return statement.suspects[0] === person;
      if (statement.kind === 'not') return statement.suspects[0] !== person;
      return statement.suspects.includes(person);
    }).length;
    if (truths === puzzle.trueCount) matches.push(person);
  }
  return matches;
}

function independentDossier(puzzle) {
  const out = [];
  function permute(values, prefix = []) {
    if (!values.length) {
      out.push(prefix);
      return;
    }
    values.forEach((value, index) =>
      permute(
        values.filter((_, candidate) => candidate !== index),
        [...prefix, value],
      ),
    );
  }
  const permutations = [];
  permute([0, 1, 2, 3]);
  permutations.push(...out.splice(0));
  const matches = [];
  const clueMatches = (assignment, clue) => {
    if (clue.kind === 'link') {
      const person = assignment.slice(0, puzzle.size).indexOf(clue.a);
      return assignment[puzzle.size + person] === clue.b;
    }
    const value = assignment[clue.cat * puzzle.size + clue.who];
    return clue.kind === 'eq' ? value === clue.value : value !== clue.value;
  };
  for (const first of permutations)
    for (const second of permutations) {
      const assignment = [...first, ...second];
      if (puzzle.clues.every((clue) => clueMatches(assignment, clue))) matches.push(assignment);
    }
  return matches;
}

function independentNonogram(puzzle) {
  const options = puzzle.rowClues.map((clues) => {
    const rows = [];
    for (let mask = 0; mask < 2 ** puzzle.size; mask++) {
      const line = Array.from({ length: puzzle.size }, (_, i) => (mask >> i) & 1);
      if (JSON.stringify(lineRuns(line)) === JSON.stringify(clues)) rows.push(line);
    }
    return rows;
  });
  const matches = [];
  function visit(rows) {
    if (rows.length === puzzle.size) {
      const columns = Array.from({ length: puzzle.size }, (_, col) => rows.map((row) => row[col]));
      if (
        columns.every(
          (column, col) =>
            JSON.stringify(lineRuns(column)) === JSON.stringify(puzzle.colClues[col]),
        )
      )
        matches.push(rows.flat());
      return;
    }
    for (const row of options[rows.length]) visit([...rows, row]);
  }
  visit([]);
  return matches;
}

function independentScene(puzzle) {
  const n = puzzle.size;
  const ids = puzzle.people.map((person) => person.id);
  const blocked = new Set(puzzle.objects.map((object) => object.cell));
  const rowOf = (cell) => Math.floor(cell / n);
  const colOf = (cell) => cell % n;
  const single = (clue, cell) => {
    const row = rowOf(cell);
    const col = colOf(cell);
    if (clue.kind === 'room') return puzzle.rooms[cell] === clue.value;
    if (clue.kind === 'notRoom') return puzzle.rooms[cell] !== clue.value;
    if (clue.kind === 'row') return row === clue.value;
    if (clue.kind === 'col') return col === clue.value;
    if (clue.kind === 'edge') return row === 0 || col === 0 || row === n - 1 || col === n - 1;
    if (clue.kind === 'notEdge') return row > 0 && col > 0 && row < n - 1 && col < n - 1;
    if (clue.kind === 'near') {
      const markedRow = rowOf(clue.value);
      const markedCol = colOf(clue.value);
      return Math.abs(markedRow - row) + Math.abs(markedCol - col) === 1;
    }
    return true;
  };
  const pair = (clue, first, second) => {
    if (clue.kind === 'left') return colOf(first) < colOf(second);
    if (clue.kind === 'above') return rowOf(first) < rowOf(second);
    if (clue.kind === 'sameRoom') return puzzle.rooms[first] === puzzle.rooms[second];
    if (clue.kind === 'differentRoom') return puzzle.rooms[first] !== puzzle.rooms[second];
    return false;
  };
  const candidates = Object.fromEntries(
    ids.map((id) => [
      id,
      Array.from(
        { length: n * n },
        (_, cell) =>
          !blocked.has(cell) &&
          puzzle.clues
            .filter((clue) => clue.who === id && !clue.other)
            .every((clue) => single(clue, cell)),
      ).flatMap((valid, cell) => (valid ? [cell] : [])),
    ]),
  );
  const matches = [];
  function visit(index, assignment, rows, cols) {
    if (index === ids.length) {
      const victimRoom = puzzle.rooms[assignment[puzzle.victim]];
      const occupants = Object.values(assignment).filter(
        (cell) => puzzle.rooms[cell] === victimRoom,
      );
      if (occupants.length === 2) matches.push({ ...assignment });
      return;
    }
    const id = ids[index];
    for (const cell of candidates[id]) {
      if (rows.has(rowOf(cell)) || cols.has(colOf(cell))) continue;
      let valid = true;
      for (const clue of puzzle.clues) {
        if (!clue.other) continue;
        if (
          clue.who === id &&
          assignment[clue.other] !== undefined &&
          !pair(clue, cell, assignment[clue.other])
        )
          valid = false;
        if (
          clue.other === id &&
          assignment[clue.who] !== undefined &&
          !pair(clue, assignment[clue.who], cell)
        )
          valid = false;
      }
      if (!valid) continue;
      visit(
        index + 1,
        { ...assignment, [id]: cell },
        new Set([...rows, rowOf(cell)]),
        new Set([...cols, colOf(cell)]),
      );
    }
  }
  visit(0, {}, new Set(), new Set());
  return matches;
}

function independentSolutions(puzzle) {
  if (puzzle.type === 'witness') return independentWitness(puzzle);
  if (puzzle.type === 'dossier') return independentDossier(puzzle);
  if (puzzle.type === 'nonogram') return independentNonogram(puzzle);
  if (puzzle.type === 'scene') return independentScene(puzzle);
  throw new Error(`No independent oracle for ${puzzle.type}`);
}

test('the unfinished invitation is an additive eight-record continuous case', () => {
  assert.ok(book, 'casebook entry exists');
  assert.equal(book.format, 'continuous');
  assert.equal(book.chapters.length, 8);
  assert.deepEqual(
    book.chapters.map((chapter) => chapter.id),
    pack.puzzles.map((puzzle) => puzzle.id),
  );
  assert.deepEqual(
    book.chapters.map((chapter) => chapter.time),
    ['07:50', '08:05', '08:15', '08:40', '08:55', '09:10', '09:20', '09:35'],
  );
  for (const chapter of book.chapters) {
    assert.match(chapter.brief, /\S/);
    assert.match(chapter.revelation, /\S/);
  }
});

test('all eight records pass native and independent uniqueness checks', () => {
  const validated = C.validatePack(pack, true);
  assert.equal(validated.puzzles.length, 8);
  assert.equal(new Set(validated.puzzles.map((puzzle) => puzzle.id)).size, 8);
  for (const puzzle of validated.puzzles) {
    assert.equal(C.solve(puzzle, null, 2).solutions.length, 1, `${puzzle.id} native uniqueness`);
    const independent = independentSolutions(puzzle);
    assert.equal(independent.length, 1, `${puzzle.id} independent uniqueness`);
    assert.deepEqual(
      independent[0],
      puzzle.solution,
      `${puzzle.id} solution matches independent oracle`,
    );
  }
});

test('registry, chronology and opportunity boundary remain explicit', () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'content/official-packs.json')));
  assert.ok(registry.packs.includes('extra/case-invitation.json'));
  const guide = fs.readFileSync(path.join(root, 'docs/cases/invitation.md'), 'utf8');
  for (const puzzle of pack.puzzles) assert.match(guide, new RegExp(puzzle.id));
  assert.match(guide, /opportunity only/i);
  assert.match(guide, /does not prove/i);
  assert.match(guide, /Orrin Pike/);
  assert.match(guide, /Iona Reed/);
  assert.match(book.ending, /Elias Bell's route/);
  assert.match(book.ending, /identify Orrin/);
  assert.match(book.ending, /restores Iona's authorship/);
});
