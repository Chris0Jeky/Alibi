'use strict';

const { range, adjacent, near } = require('./family-studies-shared.cjs');

function lightVisible(puzzle, cell) {
  const { size } = puzzle;
  const output = [];
  const steps = [-size, 1, size, -1];
  for (let direction = 0; direction < 4; direction++) {
    let next = cell;
    while (true) {
      const row = Math.floor(next / size);
      next += steps[direction];
      if (
        next < 0 ||
        next >= size * size ||
        (direction % 2 === 1 && Math.floor(next / size) !== row) ||
        puzzle.walls[next] !== -2
      )
        break;
      output.push(next);
    }
  }
  return output;
}

function countLightup(puzzle, limit = 2) {
  const open = range(puzzle.size ** 2).filter((cell) => puzzle.walls[cell] === -2);
  const visible = new Map(open.map((cell) => [cell, lightVisible(puzzle, cell)]));
  const illuminators = new Map(open.map((cell) => [cell, [cell, ...visible.get(cell)]]));
  const numbered = range(puzzle.size ** 2).filter((cell) => puzzle.walls[cell] >= 0);
  const wallNeighbours = new Map(
    numbered.map((cell) => [
      cell,
      adjacent(cell, puzzle.size).filter((next) => puzzle.walls[next] === -2),
    ]),
  );
  const bulbs = new Set();
  const lit = new Set();
  const seen = new Set();
  const solutions = new Set();
  let first = null;
  let nodes = 0;

  function canPlace(cell) {
    if (bulbs.has(cell)) return true;
    if (visible.get(cell).some((other) => bulbs.has(other))) return false;
    for (const wall of numbered) {
      const neighbours = wallNeighbours.get(wall);
      if (!neighbours.includes(cell)) continue;
      const placed = neighbours.filter((other) => bulbs.has(other)).length;
      if (placed >= puzzle.walls[wall]) return false;
    }
    return true;
  }

  function wallFeasible() {
    for (const wall of numbered) {
      const neighbours = wallNeighbours.get(wall);
      const placed = neighbours.filter((cell) => bulbs.has(cell)).length;
      const possible = neighbours.filter((cell) => bulbs.has(cell) || canPlace(cell)).length;
      if (placed > puzzle.walls[wall] || possible < puzzle.walls[wall]) return false;
    }
    return true;
  }

  function search() {
    if (solutions.size >= limit) return;
    nodes++;
    const stateKey = [...bulbs].sort((a, b) => a - b).join(',');
    if (seen.has(stateKey)) return;
    seen.add(stateKey);
    if (!wallFeasible()) return;
    let chosen = -1;
    let options = null;
    for (const cell of open) {
      if (lit.has(cell)) continue;
      const candidates = illuminators.get(cell).filter((candidate) => canPlace(candidate));
      if (!candidates.length) return;
      if (!options || candidates.length < options.length) {
        chosen = cell;
        options = candidates;
      }
    }
    if (chosen < 0) {
      if (
        numbered.every(
          (wall) =>
            wallNeighbours.get(wall).filter((cell) => bulbs.has(cell)).length ===
            puzzle.walls[wall],
        )
      ) {
        const solution = range(puzzle.size ** 2).map((cell) => (bulbs.has(cell) ? 1 : 0));
        const key = solution.join('');
        if (!solutions.has(key)) {
          solutions.add(key);
          first ||= solution;
        }
      }
      return;
    }
    for (const cell of options) {
      const newlyLit = [cell, ...visible.get(cell)].filter((target) => !lit.has(target));
      bulbs.add(cell);
      newlyLit.forEach((target) => lit.add(target));
      search();
      newlyLit.forEach((target) => lit.delete(target));
      bulbs.delete(cell);
      if (solutions.size >= limit) return;
    }
  }

  search();
  return { count: solutions.size, first, nodes };
}

function countTents(puzzle, limit = 2) {
  const candidates = puzzle.trees.map((tree) =>
    adjacent(tree, puzzle.size).filter((cell) => !puzzle.trees.includes(cell)),
  );
  const assigned = Array(puzzle.trees.length).fill(-1);
  const used = new Set();
  const rowCounts = Array(puzzle.size).fill(0);
  const colCounts = Array(puzzle.size).fill(0);
  const solutions = new Set();
  let first = null;
  let nodes = 0;

  function available(tree) {
    return candidates[tree].filter((cell) => {
      if (used.has(cell)) return false;
      if ([...used].some((other) => near(cell, other, puzzle.size))) return false;
      const row = Math.floor(cell / puzzle.size);
      const col = cell % puzzle.size;
      return rowCounts[row] < puzzle.rowTargets[row] && colCounts[col] < puzzle.colTargets[col];
    });
  }

  function search(depth) {
    if (solutions.size >= limit) return;
    nodes++;
    if (depth === puzzle.trees.length) {
      if (
        rowCounts.every((value, row) => value === puzzle.rowTargets[row]) &&
        colCounts.every((value, col) => value === puzzle.colTargets[col])
      ) {
        const solution = range(puzzle.size ** 2).map((cell) => (used.has(cell) ? 1 : 0));
        const key = solution.join('');
        if (!solutions.has(key)) {
          solutions.add(key);
          first ||= solution;
        }
      }
      return;
    }
    let chosen = -1;
    let options = null;
    for (let tree = 0; tree < puzzle.trees.length; tree++) {
      if (assigned[tree] >= 0) continue;
      const values = available(tree);
      if (!values.length) return;
      if (!options || values.length < options.length) {
        chosen = tree;
        options = values;
      }
    }
    for (const cell of options) {
      const row = Math.floor(cell / puzzle.size);
      const col = cell % puzzle.size;
      assigned[chosen] = cell;
      used.add(cell);
      rowCounts[row]++;
      colCounts[col]++;
      search(depth + 1);
      colCounts[col]--;
      rowCounts[row]--;
      used.delete(cell);
      assigned[chosen] = -1;
      if (solutions.size >= limit) return;
    }
  }

  search(0);
  return { count: solutions.size, first, nodes };
}

function aquariumRows(puzzle) {
  const count = Math.max(...puzzle.tanks) + 1;
  return range(count).map((tank) =>
    [
      ...new Set(
        range(puzzle.size ** 2)
          .filter((cell) => puzzle.tanks[cell] === tank)
          .map((cell) => Math.floor(cell / puzzle.size)),
      ),
    ].sort((a, b) => b - a),
  );
}

function aquariumCells(puzzle, levels) {
  const rows = aquariumRows(puzzle);
  return puzzle.tanks.map((tank, cell) =>
    rows[tank].slice(0, levels[tank]).includes(Math.floor(cell / puzzle.size)) ? 1 : 0,
  );
}

function countAquarium(puzzle, limit = 2) {
  const rows = aquariumRows(puzzle);
  const levels = Array(rows.length).fill(0);
  const rowCounts = Array(puzzle.size).fill(0);
  const colCounts = Array(puzzle.size).fill(0);
  const contributions = rows.map((tankRows, tank) =>
    range(tankRows.length + 1).map((level) => {
      const cells = range(puzzle.size ** 2).filter(
        (cell) =>
          puzzle.tanks[cell] === tank &&
          tankRows.slice(0, level).includes(Math.floor(cell / puzzle.size)),
      );
      const row = Array(puzzle.size).fill(0);
      const col = Array(puzzle.size).fill(0);
      cells.forEach((cell) => {
        row[Math.floor(cell / puzzle.size)]++;
        col[cell % puzzle.size]++;
      });
      return { row, col };
    }),
  );
  let count = 0;
  let first = null;
  let nodes = 0;

  function search(tank) {
    if (count >= limit) return;
    nodes++;
    if (tank === rows.length) {
      if (
        rowCounts.every((value, index) => value === puzzle.rowTargets[index]) &&
        colCounts.every((value, index) => value === puzzle.colTargets[index])
      ) {
        count++;
        first ||= levels.slice();
      }
      return;
    }
    for (let level = 0; level <= rows[tank].length; level++) {
      const contribution = contributions[tank][level];
      if (
        contribution.row.some(
          (value, index) => value + rowCounts[index] > puzzle.rowTargets[index],
        ) ||
        contribution.col.some(
          (value, index) => value + colCounts[index] > puzzle.colTargets[index],
        )
      )
        continue;
      levels[tank] = level;
      contribution.row.forEach((value, index) => (rowCounts[index] += value));
      contribution.col.forEach((value, index) => (colCounts[index] += value));
      search(tank + 1);
      contribution.col.forEach((value, index) => (colCounts[index] -= value));
      contribution.row.forEach((value, index) => (rowCounts[index] -= value));
      if (count >= limit) return;
    }
  }

  search(0);
  return { count, first, nodes, cells: first ? aquariumCells(puzzle, first) : null };
}

module.exports = { countLightup, countTents, countAquarium };
