/* Alibi core: deterministic puzzle rules, content validation and bounded solvers.
   No DOM, network, storage or framework dependencies. */
(function (root) {
  'use strict';
  const TYPES = ['scene', 'sudoku', 'nonogram', 'binary', 'futoshiki'];
  const DIFFICULTIES = ['Gentle', 'Steady', 'Tricky', 'Expert'];
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const issue = (message, cells = []) => ({ message, cells });
  const rowOf = (cell, n) => Math.floor(cell / n);
  const colOf = (cell, n) => cell % n;
  function runs(line) {
    const r = [];
    let count = 0;
    for (const x of [...line, 0]) {
      if (x === 1) count++;
      else if (count) {
        r.push(count);
        count = 0;
      }
    }
    return r.length ? r : [0];
  }
  function sceneSingle(p, cl, cell) {
    const n = p.size,
      r = rowOf(cell, n),
      c = cell % n,
      v = cl.value;
    switch (cl.kind) {
      case 'room':
        return p.rooms[cell] === v;
      case 'notRoom':
        return p.rooms[cell] !== v;
      case 'row':
        return r === v;
      case 'col':
        return c === v;
      case 'edge':
        return r === 0 || c === 0 || r === n - 1 || c === n - 1;
      case 'notEdge':
        return r > 0 && c > 0 && r < n - 1 && c < n - 1;
      case 'near':
        return Math.abs(rowOf(v, n) - r) + Math.abs((v % n) - c) === 1;
      default:
        return true;
    }
  }
  function scenePair(p, cl, a, b) {
    switch (cl.kind) {
      case 'left':
        return a % p.size < b % p.size;
      case 'above':
        return rowOf(a, p.size) < rowOf(b, p.size);
      case 'sameRoom':
        return p.rooms[a] === p.rooms[b];
      case 'differentRoom':
        return p.rooms[a] !== p.rooms[b];
      default:
        return false;
    }
  }
  function clueText(p, cl) {
    const who = p.people.find((x) => x.id === cl.who)?.name || cl.who;
    const other = p.people.find((x) => x.id === cl.other)?.name || cl.other;
    const v = cl.value;
    switch (cl.kind) {
      case 'room':
        return `${who} was in the ${p.roomNames[v]}.`;
      case 'notRoom':
        return `${who} was not in the ${p.roomNames[v]}.`;
      case 'row':
        return `${who} was in row ${v + 1}.`;
      case 'col':
        return `${who} was in column ${String.fromCharCode(65 + v)}.`;
      case 'edge':
        return `${who} was on an outside edge of the floor plan.`;
      case 'notEdge':
        return `${who} was not on an outside edge of the floor plan.`;
      case 'near':
        return `${who} was next to the ${p.objects.find((x) => x.cell === v)?.name || 'marked object'} (one square up, down, left or right).`;
      case 'left':
        return `${who} was in a column to the left of ${other}.`;
      case 'above':
        return `${who} was in a higher row than ${other}.`;
      case 'sameRoom':
        return `${who} and ${other} were in the same room.`;
      case 'differentRoom':
        return `${who} and ${other} were in different rooms.`;
      default:
        return 'Unknown clue';
    }
  }
  function validateScene(p, s) {
    const out = [],
      n = p.size,
      a = s.placements || {};
    for (const [id, cell] of Object.entries(a)) {
      if (p.objects.some((o) => o.cell === cell))
        out.push(issue('Furniture occupies this square.', [cell]));
      for (const [other, oc] of Object.entries(a)) {
        if (other <= id) continue;
        if (rowOf(cell, n) === rowOf(oc, n))
          out.push(issue('Only one person may occupy each row.', [cell, oc]));
        if (cell % n === oc % n)
          out.push(issue('Only one person may occupy each column.', [cell, oc]));
      }
    }
    for (const cl of p.clues) {
      if (a[cl.who] === undefined) continue;
      if (cl.other) {
        if (a[cl.other] !== undefined && !scenePair(p, cl, a[cl.who], a[cl.other]))
          out.push(issue(clueText(p, cl), [a[cl.who], a[cl.other]]));
      } else if (!sceneSingle(p, cl, a[cl.who])) out.push(issue(clueText(p, cl), [a[cl.who]]));
    }
    if (a[p.victim] !== undefined) {
      const occupants = Object.values(a).filter((c) => p.rooms[c] === p.rooms[a[p.victim]]);
      if (occupants.length > 2 || (Object.keys(a).length === n && occupants.length !== 2))
        out.push(issue('The victim must share a room with exactly one suspect.', occupants));
    }
    return out;
  }
  function groups(p) {
    const n = p.size;
    const gs = [];
    for (let r = 0; r < n; r++) gs.push(range(n).map((c) => r * n + c));
    for (let c = 0; c < n; c++) gs.push(range(n).map((r) => r * n + c));
    if (p.type === 'sudoku')
      for (let r = 0; r < n; r += p.boxRows)
        for (let c = 0; c < n; c += p.boxCols)
          gs.push(
            range(p.boxRows * p.boxCols).map(
              (i) => (r + Math.floor(i / p.boxCols)) * n + c + (i % p.boxCols),
            ),
          );
    return gs;
  }
  function validateLatin(p, s) {
    const out = [],
      a = s.cells;
    for (const g of groups(p)) {
      for (let v = 1; v <= p.size; v++) {
        const found = g.filter((i) => a[i] === v);
        if (found.length > 1)
          out.push(issue('A number appears more than once in a row, column or box.', found));
      }
    }
    for (const q of p.inequalities || [])
      if (a[q.a] && a[q.b] && !(q.op === '<' ? a[q.a] < a[q.b] : a[q.a] > a[q.b]))
        out.push(issue('The inequality points towards the smaller number.', [q.a, q.b]));
    return out;
  }
  function validateBinary(p, s) {
    const out = [],
      n = p.size,
      a = s.cells,
      gs = groups(p);
    for (const g of gs) {
      const line = g.map((i) => a[i]);
      for (let v = 0; v <= 1; v++)
        if (line.filter((x) => x === v).length > n / 2)
          out.push(
            issue(
              'Each row and column needs equal numbers of suns and moons.',
              g.filter((i) => a[i] === v),
            ),
          );
      for (let j = 0; j < n - 2; j++)
        if (line[j] >= 0 && line[j] === line[j + 1] && line[j] === line[j + 2])
          out.push(
            issue('Three matching symbols cannot touch in a row or column.', g.slice(j, j + 3)),
          );
    }
    for (const set of [gs.slice(0, n), gs.slice(n)])
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          if (set[i].every((k) => a[k] >= 0) && set[i].every((k, t) => a[k] === a[set[j][t]]))
            out.push(
              issue('Completed rows and columns must be different.', [...set[i], ...set[j]]),
            );
        }
    return out;
  }
  const patternCache = new Map();
  function patterns(n, clues) {
    const key = n + ':' + clues;
    if (patternCache.has(key)) return patternCache.get(key);
    if (clues.length === 1 && clues[0] === 0) {
      const out = [Array(n).fill(0)];
      patternCache.set(key, out);
      return out;
    }
    const out = [];
    function place(runIndex, start, mask, remaining) {
      const length = clues[runIndex],
        lastStart = n - remaining;
      for (let offset = start; offset <= lastStart; offset++) {
        const next = mask | (((1 << length) - 1) << offset);
        if (runIndex === clues.length - 1) out.push(range(n).map((_, i) => (next >> i) & 1));
        else place(runIndex + 1, offset + length + 1, next, remaining - length - 1);
      }
    }
    place(
      0,
      0,
      0,
      clues.reduce((sum, run) => sum + run, clues.length - 1),
    );
    patternCache.set(key, out);
    return out;
  }
  function validateNono(p, s) {
    const out = [],
      n = p.size;
    for (let r = 0; r < n; r++) {
      const g = range(n).map((c) => r * n + c);
      if (
        !patterns(n, p.rowClues[r]).some((line) =>
          g.every((i, c) => s.cells[i] === -1 || s.cells[i] === line[c]),
        )
      )
        out.push(issue(`Row ${r + 1} cannot match its clues.`, g));
    }
    for (let c = 0; c < n; c++) {
      const g = range(n).map((r) => r * n + c);
      if (
        !patterns(n, p.colClues[c]).some((line) =>
          g.every((i, r) => s.cells[i] === -1 || s.cells[i] === line[r]),
        )
      )
        out.push(issue(`Column ${String.fromCharCode(65 + c)} cannot match its clues.`, g));
    }
    return out;
  }
  function sceneComplete(p, s) {
    return Object.keys(s.placements).length === p.people.length && validateScene(p, s).length === 0;
  }
  function murderer(p, s) {
    if (!sceneComplete(p, s)) return null;
    const room = p.rooms[s.placements[p.victim]];
    return (
      p.people.find((x) => x.id !== p.victim && p.rooms[s.placements[x.id]] === room)?.id || null
    );
  }
  function applyScene(p, s, a) {
    const t = clone(s);
    if (['cycle-mark', 'clear-marks'].includes(a.type)) {
      if (
        !Number.isInteger(a.cell) ||
        a.cell < 0 ||
        a.cell >= p.size ** 2 ||
        p.objects.some((o) => o.cell === a.cell) ||
        !p.people.some((w) => w.id === a.who)
      )
        return s;
      const occupant = Object.keys(t.placements).find((id) => t.placements[id] === a.cell);
      if (a.type === 'clear-marks') {
        const ids = a.all ? p.people.map((w) => w.id) : [a.who];
        for (const id of ids) {
          if (t.placements[id] === a.cell) {
            delete t.placements[id];
            t.accused = null;
          }
          if (t.notes[id]) t.notes[id] = t.notes[id].filter((c) => c !== a.cell);
        }
        if (t.candidates?.[a.cell]) {
          t.candidates[a.cell] = t.candidates[a.cell].filter((id) => !ids.includes(id));
          if (!t.candidates[a.cell].length) delete t.candidates[a.cell];
        }
        if (a.all && t.crosses) t.crosses = t.crosses.filter((c) => c !== a.cell);
        return t;
      }
      // Never replace another person's placement with a cycling gesture.
      if (occupant && occupant !== a.who) return s;
      const stage =
        occupant === a.who
          ? 'candidate'
          : t.crosses?.includes(a.cell)
            ? 'place'
            : t.candidates?.[a.cell]?.includes(a.who)
              ? 'exclude'
              : t.notes[a.who]?.includes(a.cell)
                ? 'cross'
                : 'place';
      t.accused = null;
      if (stage === 'place') {
        t.placements[a.who] = a.cell;
        if (t.crosses) t.crosses = t.crosses.filter((c) => c !== a.cell);
      } else {
        // Moving from a placed person to a note only removes this cell's placement.
        if (t.placements[a.who] === a.cell) delete t.placements[a.who];
        t.candidates ??= {};
        t.candidates[a.cell] = (t.candidates[a.cell] || []).filter((id) => id !== a.who);
        t.notes[a.who] = (t.notes[a.who] || []).filter((c) => c !== a.cell);
        if (stage === 'candidate') t.candidates[a.cell].push(a.who);
        if (stage === 'exclude') t.notes[a.who].push(a.cell);
        if (stage === 'cross')
          t.crosses = [...(t.crosses || []).filter((c) => c !== a.cell), a.cell];
        if (!t.candidates[a.cell].length) delete t.candidates[a.cell];
      }
      return t;
    }
    if (['candidate', 'board-cross'].includes(a.type)) {
      if (
        !Number.isInteger(a.cell) ||
        a.cell < 0 ||
        a.cell >= p.size ** 2 ||
        p.objects.some((o) => o.cell === a.cell)
      )
        return s;
      if (a.type === 'board-cross') {
        const cells = t.crosses || [];
        t.crosses = cells.includes(a.cell) ? cells.filter((c) => c !== a.cell) : [...cells, a.cell];
      } else {
        if (!p.people.some((person) => person.id === a.who)) return s;
        t.candidates ??= {};
        const people = t.candidates[a.cell] || [];
        t.candidates[a.cell] = people.includes(a.who)
          ? people.filter((id) => id !== a.who)
          : [...people, a.who];
        if (!t.candidates[a.cell].length) delete t.candidates[a.cell];
      }
      return t;
    }
    if (a.type === 'place') {
      if (
        !p.people.some((x) => x.id === a.who) ||
        !Number.isInteger(a.cell) ||
        a.cell < 0 ||
        a.cell >= p.size ** 2 ||
        p.objects.some((o) => o.cell === a.cell)
      )
        return s;
      t.accused = null;
      if (t.placements[a.who] === a.cell) {
        delete t.placements[a.who];
        return t;
      }
      for (const [id, c] of Object.entries(t.placements)) if (c === a.cell) delete t.placements[id];
      t.placements[a.who] = a.cell;
    } else if (a.type === 'exclude') {
      const arr = t.notes[a.who] || [];
      t.notes[a.who] = arr.includes(a.cell) ? arr.filter((c) => c !== a.cell) : [...arr, a.cell];
    } else if (a.type === 'clue') {
      t.clueMarks = t.clueMarks.includes(a.index)
        ? t.clueMarks.filter((x) => x !== a.index)
        : [...t.clueMarks, a.index];
    } else if (a.type === 'accuse') t.accused = a.who;
    else if (a.type === 'clear') {
      for (const [id, c] of Object.entries(t.placements)) if (c === a.cell) delete t.placements[id];
    }
    return t;
  }
  function applyGrid(p, s, a) {
    if (a.type !== 'set' || !Number.isInteger(a.cell) || a.cell < 0 || a.cell >= p.size ** 2)
      return s;
    const blank = p.type === 'sudoku' || p.type === 'futoshiki' ? 0 : -1;
    if (p.givens && p.givens[a.cell] !== blank) return s;
    const min = blank,
      max = p.type === 'binary' || p.type === 'nonogram' ? 1 : p.size;
    if (!Number.isInteger(a.value) || a.value < min || a.value > max) return s;
    const t = clone(s);
    if (a.pencil && a.value > 0) {
      const arr = t.notes[a.cell] || [];
      t.notes[a.cell] = arr.includes(a.value)
        ? arr.filter((x) => x !== a.value)
        : [...arr, a.value].sort();
    } else {
      t.cells[a.cell] = a.value;
      delete t.notes[a.cell];
    }
    return t;
  }
  const registry = {
    scene: {
      label: 'Crime scenes',
      subtitle: 'A room full of possibilities.',
      icon: 'scene',
      initial: () => ({ placements: {}, notes: {}, clueMarks: [], accused: null }),
      reduce: applyScene,
      validate: validateScene,
      complete: (p, s) => sceneComplete(p, s) && s.accused === murderer(p, s),
    },
    sudoku: {
      label: 'Sudoku',
      subtitle: 'A little order in the world.',
      icon: 'grid',
      initial: (p) => ({ cells: p.givens.slice(), notes: {} }),
      reduce: applyGrid,
      validate: validateLatin,
      complete: (p, s) => s.cells.every((v) => v > 0) && !validateLatin(p, s).length,
    },
    nonogram: {
      label: 'Nonograms',
      subtitle: 'Find the picture in the pattern.',
      icon: 'picture',
      initial: (p) => ({ cells: range(p.size ** 2).map(() => -1), notes: {} }),
      reduce: applyGrid,
      validate: validateNono,
      complete: (p, s) =>
        range(p.size).every((r) =>
          equal(runs(s.cells.slice(r * p.size, (r + 1) * p.size)), p.rowClues[r]),
        ) &&
        range(p.size).every((c) =>
          equal(runs(range(p.size).map((r) => s.cells[r * p.size + c])), p.colClues[c]),
        ),
    },
    binary: {
      label: 'Binary',
      subtitle: 'Two symbols. One perfect balance.',
      icon: 'binary',
      initial: (p) => ({ cells: p.givens.slice(), notes: {} }),
      reduce: applyGrid,
      validate: validateBinary,
      complete: (p, s) => s.cells.every((v) => v >= 0) && !validateBinary(p, s).length,
    },
    futoshiki: {
      label: 'Futoshiki',
      subtitle: 'The small matter of greater than.',
      icon: 'compare',
      initial: (p) => ({ cells: p.givens.slice(), notes: {} }),
      reduce: applyGrid,
      validate: validateLatin,
      complete: (p, s) => s.cells.every((v) => v > 0) && !validateLatin(p, s).length,
    },
  };
  function solve(p, state = null, limit = 2, maxNodes = 250000) {
    let nodes = 0,
      solutions = [];
    const n = p.size;
    function tick() {
      if (++nodes > maxNodes)
        throw new Error('Solver budget exceeded. Simplify this puzzle or add clues.');
    }
    if (p.type === 'scene') {
      const a = clone(state?.placements || {}),
        ids = p.people.map((x) => x.id),
        blocked = new Set(p.objects.map((x) => x.cell));
      if (validateScene(p, { placements: a }).length) return { solutions: [], nodes };
      const ds = Object.fromEntries(
        ids.map((id) => [
          id,
          range(n * n).filter(
            (c) =>
              !blocked.has(c) &&
              p.clues.every((cl) => cl.who !== id || cl.other || sceneSingle(p, cl, c)),
          ),
        ]),
      );
      function visit() {
        tick();
        if (solutions.length >= limit) return;
        if (Object.keys(a).length === ids.length) {
          if (!validateScene(p, { placements: a }).length) solutions.push(clone(a));
          return;
        }
        let chosen = null,
          opts = [];
        for (const id of ids) {
          if (a[id] !== undefined) continue;
          const candidates = [];
          for (const c of ds[id]) {
            if (Object.values(a).some((v) => rowOf(c, n) === rowOf(v, n) || c % n === v % n))
              continue;
            a[id] = c;
            let ok = true;
            for (const cl of p.clues)
              if (
                cl.other &&
                a[cl.who] !== undefined &&
                a[cl.other] !== undefined &&
                !scenePair(p, cl, a[cl.who], a[cl.other])
              ) {
                ok = false;
                break;
              }
            if (
              a[p.victim] !== undefined &&
              Object.values(a).filter((v) => p.rooms[v] === p.rooms[a[p.victim]]).length > 2
            )
              ok = false;
            delete a[id];
            if (ok) candidates.push(c);
          }
          if (!candidates.length) return;
          if (chosen === null || candidates.length < opts.length) {
            chosen = id;
            opts = candidates;
          }
        }
        for (const c of opts) {
          a[chosen] = c;
          visit();
          delete a[chosen];
          if (solutions.length >= limit) break;
        }
      }
      visit();
    } else if (p.type === 'nonogram') {
      const a = state?.cells || range(n * n).map(() => -1),
        rows = [];
      const ro = p.rowClues.map((cl, r) =>
        patterns(n, cl).filter((line) =>
          line.every((v, c) => a[r * n + c] === -1 || a[r * n + c] === v),
        ),
      );
      const co = p.colClues.map((cl, c) =>
        patterns(n, cl).filter((line) =>
          line.every((v, r) => a[r * n + c] === -1 || a[r * n + c] === v),
        ),
      );
      function visit() {
        tick();
        if (solutions.length >= limit) return;
        const r = rows.length;
        if (r === n) {
          solutions.push(rows.flat());
          return;
        }
        for (const line of ro[r]) {
          if (
            co.every((opts, c) =>
              opts.some((col) => rows.every((row, k) => row[c] === col[k]) && col[r] === line[c]),
            )
          ) {
            rows.push(line);
            visit();
            rows.pop();
          }
        }
      }
      visit();
    } else {
      const binary = p.type === 'binary',
        blank = binary ? -1 : 0,
        a = (state?.cells || p.givens).slice(),
        values = binary ? [0, 1] : range(n).map((x) => x + 1),
        gs = groups(p);
      if (registry[p.type].validate(p, { cells: a }).length) return { solutions: [], nodes };
      const memberships = range(n * n).map((i) => gs.filter((g) => g.includes(i)));
      function validAt(i, v) {
        if (binary) return !validateBinary(p, { cells: a }).length;
        if (memberships[i].some((g) => g.some((k) => k !== i && a[k] === v))) return false;
        return (p.inequalities || []).every(
          (q) => !a[q.a] || !a[q.b] || (q.op === '<' ? a[q.a] < a[q.b] : a[q.a] > a[q.b]),
        );
      }
      function visit() {
        tick();
        if (solutions.length >= limit) return;
        let chosen = -1,
          opts = [];
        for (let i = 0; i < a.length; i++)
          if (a[i] === blank) {
            const ds = [];
            for (const v of values) {
              a[i] = v;
              if (validAt(i, v)) ds.push(v);
            }
            a[i] = blank;
            if (!ds.length) return;
            if (chosen === -1 || ds.length < opts.length) {
              chosen = i;
              opts = ds;
            }
          }
        if (chosen === -1) {
          solutions.push(a.slice());
          return;
        }
        for (const v of opts) {
          a[chosen] = v;
          visit();
          if (solutions.length >= limit) break;
        }
        a[chosen] = blank;
      }
      visit();
    }
    return { solutions, nodes };
  }
  function hint(p, s) {
    if (p.type === 'scene') {
      const wrong = p.people.find(
        (x) => s.placements[x.id] !== undefined && s.placements[x.id] !== p.solution[x.id],
      );
      if (wrong)
        return {
          message: `Revisit ${wrong.name}'s position. The reveal will correct that placement.`,
          action: { type: 'place', who: wrong.id, cell: p.solution[wrong.id] },
        };
      const next = p.people.find((x) => s.placements[x.id] === undefined);
      if (!next)
        return {
          message:
            'Compare the room containing the victim with the suspect positions. Exactly one suspect shares that room.',
          action: null,
        };
      const clue = p.clues.find((x) => x.who === next.id);
      return {
        message: clue
          ? `Focus on this evidence: ${clueText(p, clue)} Then check the unused rows and columns.`
          : 'The victim belongs in the one unused row and column. The victim shares a room with exactly one suspect.',
        action: { type: 'place', who: next.id, cell: p.solution[next.id] },
      };
    }
    const blank = p.type === 'sudoku' || p.type === 'futoshiki' ? 0 : -1;
    const wrong = s.cells.findIndex((v, i) => v !== blank && v !== p.solution[i]);
    const i =
      wrong >= 0
        ? wrong
        : s.cells.findIndex(
            (v, i) => v === blank && (p.type !== 'nonogram' || p.solution[i] === 1),
          );
    if (i < 0)
      return { message: 'Everything is in place. Check the completion message.', action: null };
    return {
      message:
        wrong >= 0
          ? `Revisit row ${rowOf(i, p.size) + 1}, column ${String.fromCharCode(65 + (i % p.size))}. A placed value conflicts with the solution.`
          : `Look at row ${rowOf(i, p.size) + 1}, column ${String.fromCharCode(65 + (i % p.size))}. Compare the row and column constraints.`,
      action: { type: 'set', cell: i, value: p.solution[i] },
    };
  }
  function validateDefinition(input) {
    const p = clone(input);
    const fail = (m) => {
      throw new Error(`${p.id || 'Puzzle'}: ${m}`);
    };
    const text = (v, len = 240) => typeof v === 'string' && v.trim().length > 0 && v.length <= len;
    const ident = (v) =>
      typeof v === 'string' &&
      /^[a-z][a-z0-9-]{1,63}$/.test(v) &&
      !['constructor', 'prototype', '__proto__'].includes(v);
    const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
    if (!ident(p.id) || !TYPES.includes(p.type) || !int(p.revision, 1, 999999))
      fail('Invalid id, type or revision.');
    if (!text(p.title, 90) || !text(p.subtitle, 120) || !DIFFICULTIES.includes(p.difficulty))
      fail('Invalid title, subtitle or difficulty.');
    if (p.difficultyStatus !== undefined && !text(p.difficultyStatus, 40))
      fail('Invalid difficulty status.');
    if (p.difficultyEvidence !== undefined && !text(p.difficultyEvidence, 240))
      fail('Invalid difficulty evidence.');
    if (!int(p.size, 4, p.type === 'scene' ? 5 : p.type === 'nonogram' ? 15 : 9))
      fail('Unsupported grid size.');
    const n = p.size,
      N = n * n;
    if (p.type === 'scene') {
      if (
        !Array.isArray(p.roomNames) ||
        p.roomNames.length < 2 ||
        p.roomNames.length > 8 ||
        !p.roomNames.every((x) => text(x, 40))
      )
        fail('Invalid rooms.');
      if (
        !Array.isArray(p.rooms) ||
        p.rooms.length !== N ||
        !p.rooms.every((v) => int(v, 0, p.roomNames.length - 1))
      )
        fail('Invalid room map.');
      if (
        !Array.isArray(p.people) ||
        p.people.length !== n ||
        new Set(p.people.map((x) => x.id)).size !== n ||
        !p.people.every(
          (x) => ident(x.id) && text(x.name, 30) && text(x.role, 50) && int(x.color, 0, 4),
        )
      )
        fail('Invalid people.');
      const ids = p.people.map((x) => x.id);
      if (!ids.includes(p.victim)) fail('Victim is not a person in this case.');
      if (!text(p.story, 1200)) fail('Invalid story.');
      if (
        !Array.isArray(p.objects) ||
        p.objects.length > N / 2 ||
        new Set(p.objects.map((x) => x.cell)).size !== p.objects.length ||
        !p.objects.every(
          (o) =>
            int(o.cell, 0, N - 1) &&
            ['plant', 'table', 'piano', 'shelf', 'lamp'].includes(o.kind) &&
            text(o.name, 40),
        )
      )
        fail('Invalid furniture.');
      if (!Array.isArray(p.clues) || p.clues.length < 1 || p.clues.length > 40)
        fail('Provide 1–40 clues.');
      for (const c of p.clues) {
        if (!ids.includes(c.who)) fail('Unknown person in clue.');
        if (['left', 'above', 'sameRoom', 'differentRoom'].includes(c.kind)) {
          if (!ids.includes(c.other) || c.other === c.who) fail('Invalid relational clue.');
        } else if (['room', 'notRoom'].includes(c.kind)) {
          if (!int(c.value, 0, p.roomNames.length - 1) || c.other !== undefined)
            fail('Invalid room clue.');
        } else if (['row', 'col'].includes(c.kind)) {
          if (!int(c.value, 0, n - 1) || c.other !== undefined) fail('Invalid coordinate clue.');
        } else if (c.kind === 'near') {
          if (!p.objects.some((o) => o.cell === c.value) || c.other !== undefined)
            fail('Near clues must refer to furniture.');
        } else if (!['edge', 'notEdge'].includes(c.kind) || c.other !== undefined)
          fail('Unknown clue kind.');
      }
      if (
        !p.solution ||
        Array.isArray(p.solution) ||
        Object.keys(p.solution).length !== n ||
        !ids.every((id) => int(p.solution[id], 0, N - 1))
      )
        fail('Provide every person in the solution.');
      if (!sceneComplete(p, { placements: p.solution })) fail('Solution breaks scene rules.');
    } else {
      if (!Array.isArray(p.solution) || p.solution.length !== N)
        fail('Invalid solution dimensions.');
      const binary = p.type === 'binary' || p.type === 'nonogram';
      if (!p.solution.every((v) => int(v, binary ? 0 : 1, binary ? 1 : n)))
        fail('Invalid solution values.');
      if (p.type === 'nonogram') {
        if (
          !['rowClues', 'colClues'].every(
            (k) =>
              Array.isArray(p[k]) &&
              p[k].length === n &&
              p[k].every(
                (cl) =>
                  Array.isArray(cl) &&
                  cl.length >= 1 &&
                  cl.length <= n &&
                  cl.every((x) => int(x, 0, n)),
              ),
          )
        )
          fail('Invalid picture clues.');
      } else {
        const blank = p.type === 'binary' ? -1 : 0;
        if (
          !Array.isArray(p.givens) ||
          p.givens.length !== N ||
          !p.givens.every((v, i) => v === blank || v === p.solution[i])
        )
          fail('Givens do not match the solution.');
        if (p.type === 'binary' && n % 2) fail('Binary grids need an even size.');
        if (
          p.type === 'sudoku' &&
          (!int(p.boxRows, 2, n) ||
            !int(p.boxCols, 2, n) ||
            p.boxRows * p.boxCols !== n ||
            n % p.boxRows ||
            n % p.boxCols)
        )
          fail('Invalid Sudoku boxes.');
        if (
          p.type === 'futoshiki' &&
          (!Array.isArray(p.inequalities) ||
            p.inequalities.length > N * 2 ||
            !p.inequalities.every(
              (q) =>
                int(q.a, 0, N - 1) &&
                int(q.b, 0, N - 1) &&
                ['<', '>'].includes(q.op) &&
                Math.abs(rowOf(q.a, n) - rowOf(q.b, n)) + Math.abs((q.a % n) - (q.b % n)) === 1,
            ))
        )
          fail('Invalid inequalities.');
      }
      if (!registry[p.type].complete(p, { cells: p.solution, notes: {} }))
        fail('Solution does not satisfy the rules.');
    }
    return p;
  }
  function validatePack(input, checkUnique = true) {
    if (
      !input ||
      input.schemaVersion !== 1 ||
      typeof input.id !== 'string' ||
      !/^[a-z][a-z0-9-]{1,63}$/.test(input.id) ||
      !Number.isInteger(input.version) ||
      input.version < 1 ||
      typeof input.title !== 'string' ||
      input.title.length > 120
    )
      throw new Error('Invalid pack header.');
    if (!Array.isArray(input.puzzles) || input.puzzles.length < 1 || input.puzzles.length > 50)
      throw new Error('A pack must contain 1–50 puzzles.');
    const puzzles = input.puzzles.map(validateDefinition),
      ids = puzzles.map((x) => x.id);
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate puzzle IDs in the pack.');
    if (checkUnique)
      for (const p of puzzles) {
        const result = solve(p);
        if (result.solutions.length !== 1)
          throw new Error(
            `${p.title}: expected one solution, found ${result.solutions.length === 2 ? 'at least 2' : 0}.`,
          );
      }
    return {
      schemaVersion: 1,
      id: input.id,
      version: input.version,
      title: input.title,
      author: typeof input.author === 'string' ? input.author.slice(0, 100) : 'Local author',
      puzzles,
    };
  }
  function validateState(p, s) {
    if (
      !s ||
      typeof s !== 'object' ||
      !s.notes ||
      typeof s.notes !== 'object' ||
      Array.isArray(s.notes)
    )
      throw new Error('Invalid saved state.');
    const n = p.size,
      N = n * n,
      ints = (arr, min, max) =>
        Array.isArray(arr) &&
        arr.length <= N &&
        arr.every((x) => Number.isInteger(x) && x >= min && x <= max);
    if (p.type === 'scene') {
      if (
        !s.placements ||
        typeof s.placements !== 'object' ||
        Array.isArray(s.placements) ||
        !Object.entries(s.placements).every(
          ([id, c]) => p.people.some((x) => x.id === id) && Number.isInteger(c) && c >= 0 && c < N,
        ) ||
        !ints(s.clueMarks, 0, p.clues.length - 1) ||
        !(s.accused === null || p.people.some((x) => x.id === s.accused))
      )
        throw new Error('Invalid scene save.');
      const placed = Object.values(s.placements);
      if (
        new Set(placed).size !== placed.length ||
        placed.some((cell) => p.objects.some((o) => o.cell === cell))
      )
        throw new Error('Invalid scene save.');
      for (const [id, values] of Object.entries(s.notes))
        if (!p.people.some((x) => x.id === id) || !ints(values, 0, N - 1))
          throw new Error('Invalid scene notes.');
      if (
        s.crosses !== undefined &&
        (!ints(s.crosses, 0, N - 1) ||
          new Set(s.crosses).size !== s.crosses.length ||
          s.crosses.some((cell) => p.objects.some((o) => o.cell === cell)))
      )
        throw new Error('Invalid scene crosses.');
      if (s.candidates !== undefined) {
        if (
          !s.candidates ||
          typeof s.candidates !== 'object' ||
          Array.isArray(s.candidates) ||
          !Object.entries(s.candidates).every(
            ([cell, people]) =>
              /^(0|[1-9]\d*)$/.test(cell) &&
              Number(cell) < N &&
              !p.objects.some((o) => o.cell === Number(cell)) &&
              Array.isArray(people) &&
              people.length <= p.people.length &&
              new Set(people).size === people.length &&
              people.every((id) => p.people.some((person) => person.id === id)),
          )
        )
          throw new Error('Invalid scene candidates.');
      }
    } else {
      const lo = ['binary', 'nonogram'].includes(p.type) ? -1 : 0,
        hi = ['binary', 'nonogram'].includes(p.type) ? 1 : n;
      if (!ints(s.cells, lo, hi) || s.cells.length !== N) throw new Error('Invalid grid save.');
      if (p.givens && !p.givens.every((v, i) => v === lo || v === s.cells[i]))
        throw new Error('A save changes a fixed clue.');
      for (const [id, values] of Object.entries(s.notes))
        if (!/^\d+$/.test(id) || Number(id) >= N || !ints(values, 1, n))
          throw new Error('Invalid number notes.');
    }
    return clone(s);
  }
  // Drafts may be unsolvable while being edited. Validate shape, not publication rules.
  function validateSceneDraft(input) {
    const p = clone(input),
      n = 5,
      N = n * n;
    const int = (x, max) => Number.isInteger(x) && x >= 0 && x < max;
    const text = (x, max) => typeof x === 'string' && x.length <= max;
    const fail = () => {
      throw Error('The saved workshop draft needs attention.');
    };
    if (
      !p ||
      p.type !== 'scene' ||
      p.size !== n ||
      !text(p.id, 64) ||
      !/^[a-z][a-z0-9-]+$/.test(p.id) ||
      !Number.isInteger(p.revision) ||
      p.revision < 1 ||
      !text(p.title, 90) ||
      !text(p.subtitle, 120) ||
      !text(p.story, 1200) ||
      !Array.isArray(p.roomNames) ||
      p.roomNames.length < 2 ||
      p.roomNames.length > 8 ||
      !p.roomNames.every((x) => text(x, 40)) ||
      !Array.isArray(p.rooms) ||
      p.rooms.length !== N ||
      !p.rooms.every((x) => int(x, p.roomNames.length)) ||
      !Array.isArray(p.people) ||
      p.people.length !== n ||
      !p.people.every(
        (x) =>
          x &&
          text(x.id, 64) &&
          /^[a-z][a-z0-9-]+$/.test(x.id) &&
          !['constructor', 'prototype', '__proto__'].includes(x.id) &&
          text(x.name, 30) &&
          text(x.role, 50) &&
          int(x.color, 5),
      )
    )
      fail();
    const ids = p.people.map((x) => x.id);
    if (
      new Set(ids).size !== n ||
      !ids.includes(p.victim) ||
      !Array.isArray(p.objects) ||
      p.objects.length > N ||
      !p.objects.every(
        (o) =>
          o &&
          int(o.cell, N) &&
          ['plant', 'table', 'piano', 'shelf', 'lamp'].includes(o.kind) &&
          text(o.name, 40),
      ) ||
      new Set(p.objects.map((o) => o.cell)).size !== p.objects.length ||
      !Array.isArray(p.clues) ||
      p.clues.length > 40 ||
      !p.solution ||
      Array.isArray(p.solution) ||
      Object.keys(p.solution).length !== n ||
      !ids.every((id) => int(p.solution[id], N))
    )
      fail();
    for (const c of p.clues) {
      if (!c || !ids.includes(c.who)) fail();
      if (['left', 'above', 'sameRoom', 'differentRoom'].includes(c.kind)) {
        if (!ids.includes(c.other)) fail();
      } else if (['room', 'notRoom'].includes(c.kind)) {
        if (!int(c.value, p.roomNames.length)) fail();
      } else if (['row', 'col'].includes(c.kind)) {
        if (!int(c.value, n)) fail();
      } else if (c.kind === 'near') {
        if (!int(c.value, N)) fail();
      } else if (!['edge', 'notEdge'].includes(c.kind)) fail();
    }
    return p;
  }
  function seededRandom(seed) {
    let a = seed >>> 0;
    return () => {
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function createSceneDraft(options = {}) {
    const seed = Number(options.seed) || 1,
      rng = seededRandom(seed),
      n = 5,
      shuffle = (a) =>
        a
          .map((x) => [rng(), x])
          .sort((a, b) => a[0] - b[0])
          .map((x) => x[1]);
    const rooms = range(25).map((i) => (rowOf(i, 5) < 2 ? 0 : 2) + (i % 5 < 3 ? 0 : 1));
    const names = options.names || ['June', 'Miles', 'Ada', 'Felix', 'Ellis'];
    const people = names.map((name, i) => ({
      id: i === 4 ? 'victim' : `person-${i + 1}`,
      name: name.slice(0, 30),
      role: i === 4 ? 'The victim' : 'A guest',
      color: i,
    }));
    let sol;
    for (let attempt = 0; attempt < 1000; attempt++) {
      const rows = shuffle(range(5)),
        cols = shuffle(range(5));
      sol = Object.fromEntries(people.map((p, i) => [p.id, rows[i] * 5 + cols[i]]));
      if (Object.values(sol).filter((c) => rooms[c] === rooms[sol.victim]).length === 2) break;
    }
    const cells = shuffle(range(25).filter((c) => !Object.values(sol).includes(c)));
    const objects = cells.slice(0, 4).map((cell, i) => ({
      cell,
      kind: ['plant', 'table', 'piano', 'shelf'][i],
      name: ['plant', 'table', 'piano', 'bookshelf'][i],
    }));
    const p = {
      id: `workshop-${seed.toString(36)}-${Date.now().toString(36)}`,
      revision: 1,
      type: 'scene',
      title: (options.title || 'An unexpected guest').slice(0, 90),
      subtitle: (options.setting || 'A house after dark').slice(0, 120),
      story: (
        options.story ||
        'Five people. Four rooms. Every statement is true. Place the guests, find the victim, then identify the killer.'
      ).slice(0, 1200),
      difficulty: 'Gentle',
      size: 5,
      roomNames: ['Lounge', 'Kitchen', 'Study', 'Garden room'],
      rooms,
      people,
      objects,
      victim: 'victim',
      clues: [],
      solution: sol,
    };
    for (const person of people.slice(0, 4)) {
      const c = sol[person.id];
      p.clues.push({ kind: 'room', who: person.id, value: rooms[c] });
      const adjacent = objects.find(
        (o) => Math.abs(rowOf(o.cell, n) - rowOf(c, n)) + Math.abs((o.cell % n) - (c % n)) === 1,
      );
      p.clues.push(
        adjacent
          ? { kind: 'near', who: person.id, value: adjacent.cell }
          : { kind: 'row', who: person.id, value: rowOf(c, n) },
      );
    }
    for (const person of shuffle(people.slice(0, 4))) {
      if (solve(p).solutions.length === 1) break;
      p.clues.push({ kind: 'col', who: person.id, value: sol[person.id] % n });
    }
    // A near-furniture clue can leave two rows possible even after columns are fixed.
    for (const person of shuffle(people.slice(0, 4))) {
      if (solve(p).solutions.length === 1) break;
      p.clues.push({ kind: 'row', who: person.id, value: rowOf(sol[person.id], n) });
    }
    // Remove redundant statements. These drafts are valid, not human-rated or story-edited.
    for (const clue of [...p.clues]) {
      const old = p.clues;
      p.clues = p.clues.filter((x) => x !== clue);
      if (!p.clues.some((c) => c.who === clue.who) || solve(p).solutions.length !== 1)
        p.clues = old;
    }
    validateDefinition(p);
    if (solve(p).solutions.length !== 1)
      throw new Error('Could not produce a unique draft. Try another seed.');
    return p;
  }
  root.AlibiCore = {
    TYPES,
    DIFFICULTIES,
    registry,
    clone,
    equal,
    range,
    runs,
    nonogramPatterns: patterns,
    groups,
    clueText,
    sceneSingle,
    scenePair,
    sceneComplete,
    murderer,
    solve,
    hint,
    validateDefinition,
    validateSceneDraft,
    validatePack,
    validateState,
    createSceneDraft,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.AlibiCore;
})(globalThis);
