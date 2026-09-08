/* Human-scale deductions use clues and the current board, never stored solutions. */
(function (root) {
  'use strict';
  const C = root.AlibiCore,
    X = C.extras;
  const at = (i, n) => `${String.fromCharCode(65 + (i % n))}${Math.floor(i / n) + 1}`;
  const result = (rule, message, cell, value) => ({ rule, message, cells: [cell], value });
  function runs(line) {
    const out = [];
    let count = 0;
    for (const value of [...line, 0]) {
      if (value === 1) count++;
      else if (count) {
        out.push(count);
        count = 0;
      }
    }
    return out.length ? out : [0];
  }
  function deduction(p, s) {
    if (p.type === 'bridges') return C.bridges.deduction(p, s);
    const networkHint = root.AlibiCuratedNetworkHints?.hint;
    if (p.type === 'network' && networkHint) {
      const guidance = networkHint(p, s);
      if (guidance) return guidance;
    }
    const n = p.size,
      issues = C.registry[p.type].validate(p, s);
    if (issues.length)
      return {
        rule: 'Revisit a conflict',
        message: issues[0].message,
        cells: issues[0].cells || [],
      };
    if (['sudoku', 'futoshiki'].includes(p.type)) {
      for (let i = 0; i < n * n; i++) {
        if (s.cells[i]) continue;
        const row = Math.floor(i / n),
          col = i % n;
        const peers = C.range(n * n).filter(
          (j) =>
            Math.floor(j / n) === row ||
            j % n === col ||
            (p.type === 'sudoku' &&
              Math.floor(Math.floor(j / n) / p.boxRows) === Math.floor(row / p.boxRows) &&
              Math.floor((j % n) / p.boxCols) === Math.floor(col / p.boxCols)),
        );
        const possible = C.range(n)
          .map((k) => k + 1)
          .filter((v) => !peers.some((j) => s.cells[j] === v))
          .filter(
            (v) =>
              p.type !== 'futoshiki' ||
              p.inequalities.every((q) => {
                if (q.a !== i && q.b !== i) return true;
                const a = q.a === i ? v : s.cells[q.a],
                  b = q.b === i ? v : s.cells[q.b];
                return !a || !b || (q.op === '<' ? a < b : a > b);
              }),
          );
        if (possible.length === 1)
          return result(
            'Only one number fits',
            `${at(i, n)} can only be ${possible[0]} with your current entries. Every other number is excluded by its row, column${p.type === 'sudoku' ? ' or box' : ' or inequality clues'}.`,
            i,
            possible[0],
          );
      }
    }
    if (p.type === 'binary') {
      for (let axis = 0; axis < 2; axis++)
        for (let line = 0; line < n; line++) {
          const cells = C.range(n).map((k) => (axis ? k * n + line : line * n + k)),
            values = cells.map((i) => s.cells[i]);
          const label = axis ? 'column ' + String.fromCharCode(65 + line) : 'row ' + (line + 1);
          for (let k = 0; k < n; k++)
            if (values[k] === -1)
              for (const v of [0, 1]) {
                const full = values.filter((x) => x === v).length === n / 2;
                const triple = [k - 2, k - 1, k].some(
                  (start) =>
                    start >= 0 &&
                    start + 2 < n &&
                    C.range(3).every((d) => start + d === k || values[start + d] === v),
                );
                if (full || triple)
                  return result(
                    full ? 'Keep the balance' : 'No three together',
                    `${at(cells[k], n)} must be ${v === 0 ? 'a moon' : 'a sun'} with your current entries: ${full ? label + ' already has its full share of ' + (v === 0 ? 'suns' : 'moons') : 'the other symbol would make three in a row in ' + label}.`,
                    cells[k],
                    1 - v,
                  );
              }
        }
    }
    if (p.type === 'nonogram') {
      for (let axis = 0; axis < 2; axis++)
        for (let line = 0; line < n; line++) {
          const cells = C.range(n).map((k) => (axis ? k * n + line : line * n + k)),
            clues = (axis ? p.colClues : p.rowClues)[line],
            patterns = [];
          // At most 512 patterns for the supported 9-cell line.
          for (let mask = 0; mask < 2 ** n; mask++) {
            const values = cells.map((_, k) => (mask >> k) & 1);
            if (
              values.every((v, k) => s.cells[cells[k]] === -1 || s.cells[cells[k]] === v) &&
              C.equal(runs(values), clues)
            )
              patterns.push(values);
          }
          if (!patterns.length) continue;
          for (let k = 0; k < n; k++)
            if (s.cells[cells[k]] === -1 && patterns.every((v) => v[k] === patterns[0][k])) {
              const value = patterns[0][k],
                label = axis ? 'column ' + String.fromCharCode(65 + line) : 'row ' + (line + 1);
              return result(
                value ? 'Where the runs overlap' : 'A gap in every arrangement',
                `${label[0].toUpperCase() + label.slice(1)} has clues ${clues.join(', ')}. All ${patterns.length} arrangements that fit your marks ${value ? 'fill' : 'leave empty'} ${at(cells[k], n)}. ${value ? 'Fill this square.' : 'Mark it with a cross.'}`,
                cells[k],
                value,
              );
            }
        }
    }
    return null;
  }
  function recap(p, s) {
    if (!C.registry[p.type].complete(p, s)) return [];
    if (p.type === 'scene') {
      const rows = p.people.map((person) => {
        const i = s.placements[person.id];
        return `${person.name}${person.id === p.victim ? ' (victim)' : ''} — ${p.roomNames[p.rooms[i]]}, ${at(i, p.size)}.`;
      });
      const culprit = p.people.find((person) => person.id === C.murderer(p, s));
      return [
        ...rows,
        `${culprit.name} is the only suspect sharing the victim’s room. All ${p.clues.length} clues fit.`,
      ];
    }
    if (p.type === 'dossier') {
      const a = X.dossierAssignments(p, s);
      return [
        ...p.people.map(
          (name, i) =>
            `${name} — ${p.categories.map((cat, k) => cat.values[a[k * p.size + i]]).join(' · ')}.`,
        ),
        `${p.people[a.slice(p.size).indexOf(p.targetItem)]} carried the ${p.categories[1].values[p.targetItem]}. All ${p.clues.length} clues fit.`,
      ];
    }
    if (p.type === 'witness')
      return [
        `${p.people[s.accused]} is the culprit consistent with exactly ${p.trueCount} true account${p.trueCount === 1 ? '' : 's'}.`,
        ...p.statements.map(
          (statement, i) =>
            `Account ${i + 1}: ${X.truth(statement, s.accused) ? 'true' : 'false'} — ${X.witnessText(p, statement)}`,
        ),
      ];
    const summaries = {
      bridges: `All ${p.islands?.length || 0} islands meet their bridge counts and belong to one connected network.`,
      sudoku: 'Every row, column and box contains each number exactly once.',
      futoshiki: 'Every row and column contains each number once, and every inequality holds.',
      binary:
        'Every line is balanced, has no three equal neighbours and differs from every other line.',
      nonogram: 'Every filled run matches the clues on both edges.',
      lightup: 'Every open square is lit; numbered walls and lantern sight lines all fit.',
      tents: 'Every tent is matched to a tree, no tents touch, and all edge counts agree.',
      aquarium: 'The water is level within each tank and every row and column total matches.',
      network: 'Every connector fits, and the whole network connects to the source.',
      trail: 'Consecutive numbers form one unbroken path through every square.',
    };
    return [summaries[p.type] || 'Every rule is satisfied.'];
  }
  C.insights = { deduction, recap };
  if (typeof module !== 'undefined' && module.exports) module.exports = C.insights;
})(globalThis);
