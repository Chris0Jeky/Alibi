/* Human-scale deductions use clues and the current board, never stored solutions. */
(function (root) {
  'use strict';
  const C = root.AlibiCore,
    X = C.extras;
  const at = C.at;
  const lineName = (axis, line) =>
    axis ? 'Column ' + String.fromCharCode(65 + line) : 'Row ' + (line + 1);
  const conflict = (message, cells) => ({ rule: 'Revisit a conflict', message, cells });
  function aquariumDeduction(p, s) {
    const n = p.size,
      integers = (a, length, max) =>
        Array.isArray(a) &&
        a.length === length &&
        Array.from(a).every((v) => Number.isInteger(v) && v >= 0 && v <= max);
    // Validate just the public geometry, within the published definition limits.
    // validateDefinition also checks the stored answer, so it cannot be used here.
    if (
      !Number.isInteger(n) || n < 3 || n > 7 ||
      !integers(p.tanks, n * n, 9) ||
      !integers(p.rowTargets, n, n) || !integers(p.colTargets, n, n)
    ) return null;
    const count = Math.max(...p.tanks) + 1;
    if (new Set(p.tanks).size !== count) return null;
    const rows = X.tankRows(p),
      cells = rows.map((_, t) => C.range(n * n).filter((i) => p.tanks[i] === t));
    for (const group of cells) {
      const seen = new Set([group[0]]), queue = [group[0]];
      while (queue.length)
        for (const j of X.adj(queue.pop(), n))
          if (group.includes(j) && !seen.has(j)) {
            seen.add(j);
            queue.push(j);
          }
      if (seen.size !== group.length) return null;
    }
    if (!integers(s?.levels, count, n) || s.levels.some((v, t) => v > rows[t].length))
      return null;
    const issues = C.registry.aquarium.validate(p, s);
    if (issues.length) return conflict(issues[0].message, issues[0].cells);
    if (p.rowTargets.reduce((a, b) => a + b, 0) !== p.colTargets.reduce((a, b) => a + b, 0))
      return null;

    // Player levels, including zero, are tentative: only clues narrow these domains.
    const domains = rows.map((r) => C.range(r.length + 1)),
      targets = [...p.rowTargets, ...p.colTargets],
      contributions = domains.map((levels, t) => levels.map((level) => {
        const counts = X.lineCounts(p, X.aquariumCells(p, {
          levels: rows.map((_, k) => k === t ? level : 0),
        }));
        return [...counts.rows, ...counts.cols];
      })),
      reasons = rows.map(() => []),
      used = rows.map(() => new Set());
    let changed = true;
    // Every changed pass removes at least one level; at most 10 * 8 levels exist.
    while (changed) {
      changed = false;
      for (let line = 0; line < targets.length; line++) {
        const target = targets[line], prefix = [new Set([0])], suffix = [];
        const sums = (from, t) => new Set([...from].flatMap((sum) =>
          domains[t].map((v) => sum + contributions[t][v][line]),
        ).filter((sum) => sum <= target));
        for (let t = 0; t < count; t++) prefix[t + 1] = sums(prefix[t], t);
        if (!prefix[count].has(target)) return null;
        suffix[count] = new Set([0]);
        for (let t = count - 1; t >= 0; t--) suffix[t] = sums(suffix[t + 1], t);
        const previous = used.map((clues) => new Set(clues));
        for (let t = 0; t < count; t++) {
          const others = new Set([...prefix[t]].flatMap((a) =>
              [...suffix[t + 1]].map((b) => a + b),
            ).filter((sum) => sum <= target)),
            next = domains[t].filter((v) => others.has(target - contributions[t][v][line]));
          if (next.length === domains[t].length) continue;
          if (!next.length) return null;
          const dependencies = new Set();
          for (let k = 0; k < count; k++)
            if (k !== t && contributions[k].some((v) => v[line]))
              for (const clue of previous[k]) dependencies.add(clue);
          for (const clue of dependencies) used[t].add(clue);
          used[t].add(line);
          reasons[t].push({ line, others: [...others],
            water: next.map((v) => contributions[t][v][line]),
            dependencies: [...dependencies].filter((clue) => clue !== line),
          });
          domains[t] = next;
          changed = true;
        }
      }
    }
    // Line support alone cannot certify global consistency. Offer guidance only
    // when propagation itself supplies a complete public-clue witness; no search.
    if (domains.some((d) => d.length !== 1)) return null;
    const levels = domains.map((d) => d[0]);
    if (!C.registry.aquarium.complete(p, { levels })) return null;
    const tank = levels.findIndex((level, t) => level !== s.levels[t]);
    if (tank < 0) return null;
    const label = (line) => lineName(line >= n ? 1 : 0, line % n),
      amounts = (values) => {
        const sorted = [...new Set(values)].sort((a, b) => a - b);
        return sorted.join(' or ') + (sorted.length === 1 && sorted[0] === 1 ? ' square' : ' squares');
      },
      explanation = reasons[tank].map(({ line, others, water, dependencies }) =>
        `${label(line)} needs ${targets[line]} water square${targets[line] === 1 ? '' : 's'}. ` +
        (dependencies.length ? `Using ${dependencies.sort((a, b) => a - b).map((clue) => `${label(clue)} (${targets[clue]})`).join(', ')}, ` : '') +
        `the other tanks are limited to ${amounts(others)} there, leaving ${amounts(water)} for this tank.`,
      ).join(' '),
      level = levels[tank],
      action = level === 0 ? 'Keep this tank dry.' :
        `Fill its bottom ${level === 1 ? 'row' : level + ' rows'}, through Row ${rows[tank][level - 1] + 1}.`;
    return {
      rule: 'A forced waterline',
      message: `Focus on tank ${String.fromCharCode(65 + tank)} at ${at(cells[tank][0], n)}. ${explanation} ${action}`,
      cells: cells[tank],
      clues: [...used[tank]].sort((a, b) => a - b).map((line) => ({ axis: line >= n ? 1 : 0, line: line % n })),
      tank, level,
      // Deliberately no value: Club interprets that field as an applicable cell move.
    };
  }
  function tentConflicts(p, s) {
    const issues = C.registry.tents.validate(p, s),
      tents = s.cells.flatMap((v, i) => (v === 1 ? [i] : []));
    // Reverse the matching sides: every placed tent needs its own tree, not vice versa.
    if (!X.matchTrees({ size: p.size, trees: tents }, p.trees))
      issues.push({ message: 'Each tent needs a different adjacent tree.', cells: tents });
    return issues;
  }
  function deduction(p, s) {
    const result = (rule, message, cell, value, forced = [cell]) => {
      // Lantern claims can force several neighbours; validate them together on a copy.
      const issue =
        p.type === 'lightup' &&
        C.registry.lightup.validate(p, {
          cells: s.cells.map((v, i) => (forced.includes(i) ? value : v)),
        })[0];
      return issue
        ? conflict(`With your marks: ${issue.message}`, issue.cells)
        : { rule, message, cells: [cell], value };
    };
    if (p.type === 'bridges') return C.bridges.deduction(p, s);
    if (p.type === 'aquarium') return aquariumDeduction(p, s);
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
      const open = (i) => s.cells[i] < 0,
        sets = [
          ...C.range(n * n)
            .filter(open)
            .map((i) => [i]),
          ...C.groups(p)
            .map((group) => group.filter(open))
            .filter((cells) => cells.length === 2),
        ];
      for (const cells of sets) {
        const trials = [],
          allowed = [];
        for (let mask = 0; mask < 1 << cells.length; mask++) {
          const next = s.cells.slice();
          cells.forEach((i, k) => (next[i] = (mask >> k) & 1));
          const issues = C.registry.binary.validate(p, { cells: next });
          trials.push(issues);
          if (!issues.length) allowed.push(mask);
        }
        if (!allowed.length) return conflict(`${at(cells[0], n)} has no move. Check marks.`, cells);
        for (let k = 0; k < cells.length; k++) {
          const value = (allowed[0] >> k) & 1;
          if (allowed.some((mask) => ((mask >> k) & 1) !== value)) continue;
          const reason = [
            ...new Set(
              trials
                .filter((_, mask) => ((mask >> k) & 1) !== value)
                .flat()
                .map((issue) => issue.message),
            ),
          ].join(' ');

          return result(
            cells.length === 1 ? 'Only one symbol fits' : 'Compare two squares',
            `${at(cells[k], n)} is a ${value ? 'moon' : 'sun'}: ${reason}`,
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
            `${at(i, n)} faces a lantern with no wall between. Cross it.`,
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
        if (remaining === 0 || remaining === unknown.length) {
          const value = remaining ? 1 : 0;
          return result(
            value ? 'Fill the remaining neighbours' : 'This wall has enough lanterns',
            `The wall at ${at(i, n)} ${value ? 'needs all unmarked neighbours. Place a lantern at' : 'has enough lanterns. Cross out'} ${at(unknown[0], n)}.`,
            unknown[0],
            value,
            unknown,
          );
        }
      }
      for (const i of white) {
        if (lit.has(i)) continue;
        const sources = [i, ...X.visible(p, i)].filter((j) => s.cells[j] === -1 && !lit.has(j));
        if (sources.length === 1)
          return result(
            'Only one way to light this square',
            `Only ${at(sources[0], n)} can light ${at(i, n)} with your marks. Place a lantern there.`,
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
