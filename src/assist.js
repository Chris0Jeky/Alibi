/* Reversible rule assistance. It never reads p.solution and never edits a player's saved facts. */
(function (root) {
  'use strict';
  const C = root.AlibiCore;
  const at = (i, n) => `${String.fromCharCode(65 + (i % n))}${Math.floor(i / n) + 1}`;
  function reason(p, s, cell, value, person) {
    const n = p.size;
    if (['sudoku', 'futoshiki'].includes(p.type)) {
      if (!value) return '';
      for (let j = 0; j < n * n; j++) {
        if (j === cell || s.cells[j] !== value) continue;
        if (Math.floor(j / n) === Math.floor(cell / n))
          return `${value} is already in row ${Math.floor(cell / n) + 1}, at ${at(j, n)}.`;
        if (j % n === cell % n)
          return `${value} is already in column ${String.fromCharCode(65 + (cell % n))}, at ${at(j, n)}.`;
        if (
          p.type === 'sudoku' &&
          Math.floor(Math.floor(j / n) / p.boxRows) ===
            Math.floor(Math.floor(cell / n) / p.boxRows) &&
          Math.floor((j % n) / p.boxCols) === Math.floor((cell % n) / p.boxCols)
        )
          return `${value} is already in this box, at ${at(j, n)}.`;
      }
      if (p.type === 'futoshiki')
        for (const q of p.inequalities) {
          if (q.a !== cell && q.b !== cell) continue;
          const a = q.a === cell ? value : s.cells[q.a],
            b = q.b === cell ? value : s.cells[q.b];
          if (a && b && !(q.op === '<' ? a < b : a > b))
            return `The inequality between ${at(q.a, n)} and ${at(q.b, n)} excludes ${value}.`;
        }
    }
    if (p.type === 'scene') {
      if (!person) return '';
      if (p.objects.some((o) => o.cell === cell)) return 'That square is occupied by furniture.';
      for (const [id, j] of Object.entries(s.placements)) {
        if (id === person) continue;
        if (Math.floor(j / n) === Math.floor(cell / n) || j % n === cell % n)
          return `${p.people.find((w) => w.id === id)?.name || 'Someone'} already occupies this row or column.`;
      }
      const next = { ...s.placements, [person]: cell };
      for (const cl of p.clues) {
        if (cl.who !== person && cl.other !== person) continue;
        if (cl.other) {
          if (
            Number.isInteger(next[cl.who]) &&
            Number.isInteger(next[cl.other]) &&
            !C.scenePair(p, cl, next[cl.who], next[cl.other])
          )
            return C.clueText(p, cl);
        } else if (cl.who === person && !C.sceneSingle(p, cl, cell)) return C.clueText(p, cl);
      }
    }
    if (p.type === 'binary' && value >= 0) {
      for (const indices of [
        Array.from({ length: n }, (_, k) => Math.floor(cell / n) * n + k),
        Array.from({ length: n }, (_, k) => k * n + (cell % n)),
      ]) {
        const line = indices.map((i) => (i === cell ? value : s.cells[i]));
        if (line.filter((v) => v === value).length > n / 2)
          return 'This line already has its full share of that symbol.';
        for (let k = 0; k < n - 2; k++)
          if (
            indices.slice(k, k + 3).includes(cell) &&
            line[k] >= 0 &&
            line[k] === line[k + 1] &&
            line[k] === line[k + 2]
          )
            return 'That would create three identical symbols together.';
      }
    }
    if (p.type === 'lightup' && value === 1) {
      for (const d of [-n, 1, n, -1]) {
        let i = cell;
        while (true) {
          const j = i + d;
          if (
            j < 0 ||
            j >= n * n ||
            Math.abs(Math.floor(i / n) - Math.floor(j / n)) + Math.abs((i % n) - (j % n)) !== 1 ||
            p.walls[j] !== -2
          )
            break;
          if (j !== cell && s.cells[j] === 1)
            return `A lantern at ${at(j, n)} can already see this square.`;
          i = j;
        }
      }
      for (const j of [cell - n, cell + 1, cell + n, cell - 1].filter(
        (j) =>
          j >= 0 &&
          j < n * n &&
          Math.abs(Math.floor(j / n) - Math.floor(cell / n)) + Math.abs((j % n) - (cell % n)) === 1,
      )) {
        if (p.walls[j] >= 0) {
          const count = [j - n, j + 1, j + n, j - 1].filter(
            (k) =>
              k >= 0 &&
              k < n * n &&
              Math.abs(Math.floor(k / n) - Math.floor(j / n)) + Math.abs((k % n) - (j % n)) === 1 &&
              k !== cell &&
              s.cells[k] === 1,
          ).length;
          if (count >= p.walls[j])
            return 'The adjacent numbered wall already has all its lanterns.';
        }
      }
    }
    if (p.type === 'tents' && value === 1) {
      if (p.trees.includes(cell)) return 'This square contains a tree.';
      const adj = [cell - n, cell + 1, cell + n, cell - 1].filter(
        (j) =>
          j >= 0 &&
          j < n * n &&
          Math.abs(Math.floor(j / n) - Math.floor(cell / n)) + Math.abs((j % n) - (cell % n)) === 1,
      );
      if (!adj.some((j) => p.trees.includes(j)))
        return 'A tent must be beside a tree, not diagonally.';
      for (let j = 0; j < n * n; j++)
        if (
          j !== cell &&
          s.cells[j] === 1 &&
          Math.abs(Math.floor(j / n) - Math.floor(cell / n)) <= 1 &&
          Math.abs((j % n) - (cell % n)) <= 1
        )
          return `A tent at ${at(j, n)} touches this square.`;
      const row = Math.floor(cell / n),
        col = cell % n;
      for (const [indices, target] of [
        [Array.from({ length: n }, (_, k) => row * n + k), p.rowTargets[row]],
        [Array.from({ length: n }, (_, k) => k * n + col), p.colTargets[col]],
      ])
        if (indices.filter((i) => i !== cell && s.cells[i] === 1).length >= target)
          return 'This row or column has all its tents.';
    }
    return '';
  }
  function project(p, s, enabled = true) {
    const q = C.clone(s),
      derived = {};
    if (!enabled) return { state: q, derived };
    const n = p.size;
    if (p.type === 'dossier') {
      for (let k = 0; k < p.categories.length; k++)
        for (let r = 0; r < n; r++)
          for (let c = 0; c < n; c++) {
            const i = k * n * n + r * n + c;
            if (s.marks[i] !== 1) continue;
            for (let j = 0; j < n; j++)
              for (const at of [k * n * n + r * n + j, k * n * n + j * n + c])
                if (at !== i && s.marks[at] === -1) {
                  q.marks[at] = 0;
                  derived[at] =
                    'Excluded by the yes in this row or column. Remove that yes and this becomes available again.';
                }
          }
    }
    if (p.type === 'nonogram') {
      for (let axis = 0; axis < 2; axis++)
        for (let line = 0; line < n; line++) {
          const cells = Array.from({ length: n }, (_, k) => (axis ? k * n + line : line * n + k));
          if (C.equal(C.runs(cells.map((i) => s.cells[i])), (axis ? p.colClues : p.rowClues)[line]))
            for (const i of cells)
              if (s.cells[i] === -1) {
                q.cells[i] = 0;
                derived[i] =
                  `This ${axis ? 'column' : 'row'} already has exactly its required runs. The remaining squares are empty.`;
              }
        }
    }
    if (p.type === 'tents') {
      for (let i = 0; i < n * n; i++)
        if (s.cells[i] === -1 && !p.trees.includes(i)) {
          const why = reason(p, s, i, 1);
          if (why) {
            q.cells[i] = 0;
            derived[i] = why;
          }
        }
    }
    return { state: q, derived };
  }
  root.AlibiAssist = {
    reason,
    project,
    candidates: (p, s, cell) =>
      Array.from({ length: p.size }, (_, i) => i + 1).filter((v) => !reason(p, s, cell, v)),
    at,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.AlibiAssist;
})(globalThis);
