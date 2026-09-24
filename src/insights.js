/* Human-scale deductions use clues and the current board, never stored solutions. */
(function (root) {
  'use strict';
  const C = root.AlibiCore,
    X = C.extras;
  const at = (i, n) => `${String.fromCharCode(65 + (i % n))}${Math.floor(i / n) + 1}`;
  const result = (rule, message, cell, value) => ({ rule, message, cells: [cell], value });
  const lineName = (axis, line) =>
    axis ? 'Column ' + String.fromCharCode(65 + line) : 'Row ' + (line + 1);
  const conflict = (message, cells) => ({ rule: 'Revisit a conflict', message, cells });
  function tentConflicts(p, s) {
    const issues = C.registry.tents.validate(p, s),
      tents = s.cells.flatMap((v, i) => (v === 1 ? [i] : []));
    // Reverse the matching sides: every placed tent needs its own tree, not vice versa.
    if (!X.matchTrees({ size: p.size, trees: tents }, p.trees))
      issues.push({ message: 'Each tent needs a different adjacent tree.', cells: tents });
    return issues;
  }
  function deduction(p, s) {
    if (p.type === 'bridges') return C.bridges.deduction(p, s);
    const networkHint = root.AlibiCuratedNetworkHints?.hint;
    if (p.type === 'network' && networkHint) {
      const guidance = networkHint(p, s);
      if (guidance) return guidance;
    }
    const n = p.size,
      issues = p.type === 'tents' ? tentConflicts(p, s) : C.registry[p.type].validate(p, s);
    if (issues.length) return conflict(issues[0].message, issues[0].cells || []);
    if (['sudoku', 'futoshiki'].includes(p.type)) {
      const groups = C.groups(p);
      for (let i = 0; i < n * n; i++) {
        if (s.cells[i]) continue;
        const peers = groups.filter((group) => group.includes(i)).flat();
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
            `Only ${possible[0]} fits ${at(i, n)} with your row, column${p.type === 'sudoku' ? ', box' : ', inequality'} and current marks.`,
            i,
            possible[0],
          );
      }
    }
    if (p.type === 'binary') {
      const open = (cells) => cells.filter((i) => s.cells[i] === -1),
        sets = [
          ...open(C.range(n * n)).map((i) => [i]),
          ...C.groups(p).map(open).filter((cells) => cells.length === 2),
        ];
      for (const cells of sets) {
        const trials = C.range(2 ** cells.length).map((mask) => {
          const next = s.cells.slice(), values = cells.map((i, k) => (mask >> k) & 1);
          cells.forEach((i, k) => { next[i] = values[k]; });
          return { values, issues: C.registry.binary.validate(p, { cells: next }) };
        }),
          allowed = trials.filter((trial) => !trial.issues.length);
        if (!allowed.length)
          return conflict(`No allowed symbols at ${cells.map((i) => at(i, n)).join(', ')}. Recheck your marks.`, cells);
        for (let k = 0; k < cells.length; k++) {
          const value = allowed[0].values[k];
          if (!allowed.every((trial) => trial.values[k] === value)) continue;
          const reasons = [...new Set(trials.filter((trial) => trial.values[k] !== value)
            .flatMap((trial) => trial.issues.map((issue) => issue.message)))];
          return result(
            cells.length === 1 ? 'Only one symbol fits' : 'Compare two squares',
            `With your marks, ${at(cells[k], n)} must be ${value === 0 ? 'a sun' : 'a moon'}. Other choices in ${cells.map((i) => at(i, n)).join(', ')} break at least one rule: ${reasons.join(' ')}`,
            cells[k],
            value,
          );
        }
      }
    }
    if (p.type === 'tents') {
      const sites = C.range(n * n).filter((i) => !p.trees.includes(i)),
        tents = sites.filter((i) => s.cells[i] === 1);
      for (const i of sites) {
        if (s.cells[i] !== -1) continue;
        const beside = X.adj(i, n).some((j) => p.trees.includes(j));
        if (!beside || tents.some((j) => X.near(i, j, n)))
          return result(
            beside ? 'Tent spacing' : 'No tree',
            `${at(i, n)} ${beside ? 'touches a tent. Diagonals count' : 'has no tree on a side'}. Cross it.`,
            i,
            0,
          );
      }
      for (let axis = 0; axis < 2; axis++)
        for (let line = 0; line < n; line++) {
          const cells = sites.filter((i) => (axis ? i % n : Math.floor(i / n)) === line),
            unknown = cells.filter((i) => s.cells[i] === -1),
            remaining =
              (axis ? p.colTargets : p.rowTargets)[line] -
              cells.filter((i) => s.cells[i] === 1).length,
            label = lineName(axis, line);
          if (!unknown.length) continue;
          if (remaining === 0 || remaining === unknown.length) {
            const value = remaining ? 1 : 0;
            if (value) {
              const issue = tentConflicts(p, {
                cells: s.cells.map((v, i) => (unknown.includes(i) ? 1 : v)),
              })[0];
              if (issue) return conflict(`${label}: ${issue.message}`, cells);
            }
            return result(
              value ? 'Complete line' : 'Line full',
              `${label} ${value ? 'needs all open sites. Place one at' : 'quota is met. Cross out'} ${at(unknown[0], n)}.`,
              unknown[0],
              value,
            );
          }
        }
    }
    if (p.type === 'lightup') {
      const lit = X.litCells(p, s),
        white = C.range(n * n).filter((i) => p.walls[i] === -2);
      for (const i of white)
        if (s.cells[i] === -1 && lit.has(i))
          return result(
            'No facing lanterns',
            `${at(i, n)} faces a lantern with no wall between them. Mark it with a cross.`,
            i,
            0,
          );
      for (let i = 0; i < n * n; i++) {
        if (p.walls[i] < 0) continue;
        const neighbours = X.adj(i, n).filter((j) => p.walls[j] === -2),
          placed = neighbours.filter((j) => s.cells[j] === 1).length,
          unknown = neighbours.filter((j) => s.cells[j] === -1),
          remaining = p.walls[i] - placed;
        if (!unknown.length) continue;
        if (remaining === 0)
          return result(
            'This wall has enough lanterns',
            `The wall at ${at(i, n)} has all its required lanterns. Cross out ${at(unknown[0], n)}.`,
            unknown[0],
            0,
          );
        if (remaining === unknown.length)
          return result(
            'Fill the remaining neighbours',
            `The clue at ${at(i, n)} needs every unmarked neighbour. Place a lantern at ${at(unknown[0], n)}.`,
            unknown[0],
            1,
          );
      }
      for (const i of white) {
        if (lit.has(i)) continue;
        const sources = [i, ...X.visible(p, i)].filter((j) => s.cells[j] === -1 && !lit.has(j));
        if (sources.length === 1)
          return result(
            'Only one way to light this square',
            `With your marks, only a lantern at ${at(sources[0], n)} can light ${at(i, n)}. Place one there.`,
            sources[0],
            1,
          );
      }
    }
    if (p.type === 'nonogram') {
      for (let axis = 0; axis < 2; axis++)
        for (let line = 0; line < n; line++) {
          const cells = C.range(n).map((k) => (axis ? k * n + line : line * n + k)),
            clues = (axis ? p.colClues : p.rowClues)[line],
            patterns = C.nonogramPatterns(n, clues).filter((values) =>
              values.every((v, k) => s.cells[cells[k]] === -1 || s.cells[cells[k]] === v),
            );
          if (!patterns.length) continue;
          for (let k = 0; k < n; k++)
            if (s.cells[cells[k]] === -1 && patterns.every((v) => v[k] === patterns[0][k])) {
              const value = patterns[0][k],
                label = lineName(axis, line);
              return result(
                value ? 'Where the runs overlap' : 'A gap in every arrangement',
                `${label} clues ${clues.join(', ')}: all ${patterns.length} arrangements fitting your marks ${value ? 'fill' : 'leave empty'} ${at(cells[k], n)}. ${value ? 'Fill it.' : 'Mark it with a cross.'}`,
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
        typeof p.action === 'string' && p.action.trim()
          ? `${p.people[s.accused]} is the person who ${X.witnessAction(p)}; exactly ${p.trueCount} true account${p.trueCount === 1 ? '' : 's'}.`
          : `${p.people[s.accused]} is the culprit consistent with exactly ${p.trueCount} true account${p.trueCount === 1 ? '' : 's'}.`,
        ...p.statements.map(
          (statement, i) =>
            `Account ${i + 1}: ${X.truth(statement, s.accused) ? 'true' : 'false'} — ${X.witnessText(p, statement)}`,
        ),
      ];
    const summaries = {
      bridges: `All ${p.islands?.length || 0} islands meet their counts in one connected network.`,
      sudoku: 'Each number appears once per row, column and box.',
      futoshiki: 'Each number appears once per row and column; all inequalities hold.',
      binary: 'Lines are balanced and distinct, with no three equal neighbours.',
      nonogram: 'Filled runs match every row and column clue.',
      lightup: 'Every open square is lit; numbered walls and lantern sight lines all fit.',
      tents: 'Tents have distinct trees, do not touch and match all edge counts.',
      aquarium: 'Each tank is level and all row and column totals match.',
      network: 'All connectors fit in one network linked to the source.',
      trail: 'Consecutive numbers form one unbroken path through every square.',
    };
    return [summaries[p.type] || 'Every rule is satisfied.'];
  }
  C.insights = { deduction, recap };
  if (typeof module !== 'undefined' && module.exports) module.exports = C.insights;
})(globalThis);
