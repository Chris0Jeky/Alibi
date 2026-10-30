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
      !Number.isInteger(n) ||
      n < 3 ||
      n > 7 ||
      !integers(p.tanks, n * n, 9) ||
      !integers(p.rowTargets, n, n) ||
      !integers(p.colTargets, n, n)
    )
      return null;
    const count = Math.max(...p.tanks) + 1;
    if (new Set(p.tanks).size !== count) return null;
    const rows = X.tankRows(p),
      cells = rows.map((_, t) => C.range(n * n).filter((i) => p.tanks[i] === t));
    for (const group of cells) {
      const seen = new Set([group[0]]),
        queue = [group[0]];
      while (queue.length)
        for (const j of X.adj(queue.pop(), n))
          if (group.includes(j) && !seen.has(j)) {
            seen.add(j);
            queue.push(j);
          }
      if (seen.size !== group.length) return null;
    }
    if (!integers(s?.levels, count, n) || s.levels.some((v, t) => v > rows[t].length)) return null;
    const issues = C.registry.aquarium.validate(p, s);
    if (issues.length) return conflict(issues[0].message, issues[0].cells);
    if (p.rowTargets.reduce((a, b) => a + b, 0) !== p.colTargets.reduce((a, b) => a + b, 0))
      return null;

    // Player levels, including zero, are tentative: only clues narrow these domains.
    const domains = rows.map((r) => C.range(r.length + 1)),
      targets = [...p.rowTargets, ...p.colTargets],
      contributions = domains.map((levels, t) =>
        levels.map((level) => {
          const counts = X.lineCounts(
            p,
            X.aquariumCells(p, {
              levels: rows.map((_, k) => (k === t ? level : 0)),
            }),
          );
          return [...counts.rows, ...counts.cols];
        }),
      ),
      reasons = rows.map(() => []),
      used = rows.map(() => new Set());
    let changed = true;
    // Every changed pass removes at least one level; at most 10 * 8 levels exist.
    while (changed) {
      changed = false;
      for (let line = 0; line < targets.length; line++) {
        const target = targets[line],
          prefix = [new Set([0])],
          suffix = [];
        const sums = (from, t) =>
          new Set(
            [...from]
              .flatMap((sum) => domains[t].map((v) => sum + contributions[t][v][line]))
              .filter((sum) => sum <= target),
          );
        for (let t = 0; t < count; t++) prefix[t + 1] = sums(prefix[t], t);
        if (!prefix[count].has(target)) return null;
        suffix[count] = new Set([0]);
        for (let t = count - 1; t >= 0; t--) suffix[t] = sums(suffix[t + 1], t);
        const previous = used.map((clues) => new Set(clues));
        for (let t = 0; t < count; t++) {
          const others = new Set(
              [...prefix[t]]
                .flatMap((a) => [...suffix[t + 1]].map((b) => a + b))
                .filter((sum) => sum <= target),
            ),
            next = domains[t].filter((v) => others.has(target - contributions[t][v][line]));
          if (next.length === domains[t].length) continue;
          if (!next.length) return null;
          const dependencies = new Set();
          for (let k = 0; k < count; k++)
            if (k !== t && contributions[k].some((v) => v[line]))
              for (const clue of previous[k]) dependencies.add(clue);
          for (const clue of dependencies) used[t].add(clue);
          used[t].add(line);
          reasons[t].push({
            line,
            others: [...others],
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
        return (
          sorted.join(' or ') + (sorted.length === 1 && sorted[0] === 1 ? ' square' : ' squares')
        );
      },
      explanation = reasons[tank]
        .map(
          ({ line, others, water, dependencies }) =>
            `${label(line)} needs ${targets[line]} water square${targets[line] === 1 ? '' : 's'}. ` +
            (dependencies.length
              ? `Using ${dependencies
                  .sort((a, b) => a - b)
                  .map((clue) => `${label(clue)} (${targets[clue]})`)
                  .join(', ')}, `
              : '') +
            `${dependencies.length ? 'the' : 'The'} other tanks are limited to ${amounts(others)} there, leaving ${amounts(water)} for this tank.`,
        )
        .join(' '),
      level = levels[tank],
      action =
        level === 0
          ? 'Drain this tank; it must stay dry.'
          : `Fill its bottom ${level === 1 ? 'row' : level + ' rows'}, through Row ${rows[tank][level - 1] + 1}.`;
    return {
      rule: 'A forced waterline',
      message: `Focus on tank ${String.fromCharCode(65 + tank)} at ${at(cells[tank][0], n)}. ${explanation} ${action}`,
      cells: cells[tank],
      clues: [...used[tank]]
        .sort((a, b) => a - b)
        .map((line) => ({ axis: line >= n ? 1 : 0, line: line % n })),
      tank,
      level,
      // Deliberately no value: Club interprets that field as an applicable cell move.
    };
  }
  // Number trails: a missing number lies on the path between its nearest placed neighbours,
  // so it sits within reach of both through open squares. Distances never use the answer.
  // Alibi files: record a direct clue, then a row or column with one option left, then follow a
  // linked room/object clue. Marks are -1 open, 0 no, 1 yes; a yes rules out its row and column.
  // Results carry `mark` but no `value`: these grids take 'mark' moves, not single-cell values.
  function dossierDeduction(p, s) {
    const n = p.size,
      cell = (k, r, c) => k * n * n + r * n + c,
      known = (k, r, c) => {
        const m = s.marks[cell(k, r, c)];
        if (m !== -1) return m;
        for (let j = 0; j < n; j++)
          if (
            (j !== c && s.marks[cell(k, r, j)] === 1) ||
            (j !== r && s.marks[cell(k, j, c)] === 1)
          )
            return 0;
        return -1;
      },
      thing = (k, c) => `the ${p.categories[k].values[c]}`,
      verb = (k, yes) => (k ? (yes ? 'carried' : 'did not carry') : yes ? 'was in' : 'was not in'),
      hint = (rule, message, k, r, c, value) => ({
        rule,
        message,
        cells: [cell(k, r, c)],
        mark: { cell: cell(k, r, c), value },
      });
    const direct = p.clues.flatMap((cl, i) =>
      cl.kind === 'link'
        ? []
        : [{ cl, i, want: cl.kind === 'eq' ? 1 : 0, have: known(cl.cat, cl.who, cl.value) }],
    );
    // A contradicted clue outranks a fresh suggestion.
    for (const { cl, i, want, have } of direct)
      if (have === 1 - want)
        return conflict(`Clue ${i + 1} says: ${X.dossierClue(p, cl)} Your marks disagree.`, [
          cell(cl.cat, cl.who, cl.value),
        ]);
    for (const { cl, i, want, have } of direct) {
      if (have === -1)
        return hint(
          'A clue to record',
          `Clue ${i + 1}: ${X.dossierClue(p, cl)} Mark ${want ? 'yes' : 'no'} for ${p.people[cl.who]} and ${thing(cl.cat, cl.value)}.`,
          cl.cat,
          cl.who,
          cl.value,
          want,
        );
    }
    for (let k = 0; k < 2; k++)
      for (let line = 0; line < n; line++)
        for (const byPerson of [true, false]) {
          const at = (j) => (byPerson ? [line, j] : [j, line]),
            states = C.range(n).map((j) => known(k, ...at(j)));
          if (states.includes(1)) continue;
          const open = states.flatMap((v, j) => (v === -1 ? [j] : []));
          if (!open.length)
            return conflict(
              `${byPerson ? p.people[line] : thing(k, line)} has no ${byPerson ? p.categories[k].name.toLowerCase() : 'person'} left.`,
              [],
            );
          if (open.length > 1) continue;
          const [r, c] = at(open[0]);
          return hint(
            'Only one option left',
            byPerson
              ? `Every other ${p.categories[k].name.toLowerCase()} is ruled out for ${p.people[r]}, so ${p.people[r]} ${verb(k, true)} ${thing(k, c)}.`
              : `Everyone else is ruled out for ${thing(k, c)}, so ${p.people[r]} ${verb(k, true)} it.`,
            k,
            r,
            c,
            1,
          );
        }
    for (const [i, cl] of p.clues.entries()) {
      if (cl.kind !== 'link') continue;
      for (let r = 0; r < n; r++) {
        const room = known(0, r, cl.a),
          object = known(1, r, cl.b),
          [from, to, value] =
            room !== -1 && object === -1
              ? [0, 1, room]
              : object !== -1 && room === -1
                ? [1, 0, object]
                : [];
        if (from === undefined) continue;
        const name = p.people[r],
          ends = [thing(0, cl.a), thing(1, cl.b)];
        return hint(
          'Follow a linked clue',
          `Clue ${i + 1}: ${X.dossierClue(p, cl)} ${name} ${verb(from, value)} ${ends[from]}, so ${name} ${verb(to, value)} ${ends[to]}.`,
          to,
          r,
          to ? cl.b : cl.a,
          value,
        );
      }
    }
    return null;
  }
  // Witness statements: test one suspect against "exactly N accounts are true" and say why it fails.
  function witnessDeduction(p, s) {
    for (let who = 0; who < p.people.length; who++) {
      if (who === s.accused) continue;
      const trueAccounts = p.statements.flatMap((c, i) => (X.truth(c, who) ? [i + 1] : []));
      if (trueAccounts.length === p.trueCount) continue;
      const listed = trueAccounts.length
        ? `account${trueAccounts.length === 1 ? '' : 's'} ${trueAccounts.join(', ')} would be true`
        : 'no account would be true';
      return {
        rule: 'Test one person',
        message: `Suppose ${p.people[who]} ${X.witnessAction(p)}: ${listed}. The evidence says exactly ${p.trueCount}, so ${p.people[who]} is ruled out. Test the others the same way.`,
        cells: [],
      };
    }
    return null;
  }
  function trailDeduction(p, s) {
    const n = p.size,
      last = n * n,
      where = new Map(),
      reach = new Map();
    s.cells.forEach((v, i) => v > 0 && where.set(v, i));
    if (!where.size) return null;
    const placed = [...where.keys()].sort((a, b) => a - b),
      steps = (v) => {
        if (!reach.has(v)) {
          const d = Array(last).fill(Infinity),
            queue = [where.get(v)];
          d[queue[0]] = 0;
          for (const i of queue)
            for (const j of X.adj(i, n))
              if (!s.cells[j] && d[j] === Infinity) {
                d[j] = d[i] + 1;
                queue.push(j);
              }
          reach.set(v, d);
        }
        return reach.get(v);
      },
      open = C.range(last).filter((i) => !s.cells[i]),
      spots = new Map();
    for (let m = 1; m <= last; m++) {
      if (where.has(m)) continue;
      const below = placed.filter((v) => v < m).at(-1),
        above = placed.find((v) => v > m),
        cells = open.filter(
          (i) =>
            (below === undefined || steps(below)[i] <= m - below) &&
            (above === undefined || steps(above)[i] <= above - m),
        ),
        between = [below, above]
          .filter((v) => v !== undefined)
          .map(
            (v) =>
              `within ${Math.abs(m - v)} step${Math.abs(m - v) === 1 ? '' : 's'} of ${v} at ${at(where.get(v), n)}`,
          )
          .join(' and ');
      if (!cells.length)
        return conflict(
          `No open square is ${between}, where ${m} must go.`,
          [below, above].filter((v) => v !== undefined).map((v) => where.get(v)),
        );
      if (cells.length === 1)
        return {
          rule: 'Only one square in reach',
          message: `${m} must be ${between}. Only ${at(cells[0], n)} is in reach of ${below !== undefined && above !== undefined ? 'both' : 'it'}.`,
          cells,
          value: m,
        };
      spots.set(m, cells);
    }
    for (const i of open) {
      const fits = [...spots].filter(([, cells]) => cells.includes(i)).map(([m]) => m);
      if (!fits.length) return conflict(`No missing number can reach ${at(i, n)}.`, [i]);
      if (fits.length === 1)
        return {
          rule: 'Only one number reaches',
          message: `Every square holds a number, and ${fits[0]} is the only missing number that can reach ${at(i, n)} from its neighbours in the trail.`,
          cells: [i],
          value: fits[0],
        };
    }
    return null;
  }
  function tentConflicts(p, s) {
    const issues = C.registry.tents.validate(p, s),
      tents = s.cells.flatMap((v, i) => (v === 1 ? [i] : []));
    // Reverse the matching sides: every placed tent needs its own tree, not vice versa.
    if (!X.matchTrees({ size: p.size, trees: tents }, p.trees))
      issues.push({ message: 'Each tent needs a different adjacent tree.', cells: tents });
    return issues;
  }
  // Crime scenes: candidates come from AlibiAssist.reason (furniture, taken rows/columns and
  // clues about one person), then pair clues prune them to a fixpoint. Never reads the solution.
  function sceneDeduction(p, s) {
    const assist = root.AlibiAssist;
    if (!assist) return null;
    const n = p.size,
      placed = s.placements || {},
      isPlaced = (id) => Number.isInteger(placed[id]),
      name = (id) => p.people.find((x) => x.id === id)?.name || id,
      inLine = (axis, line) => (c) => (axis ? c % n === line : Math.floor(c / n) === line),
      unplaced = p.people.filter((x) => !isPlaced(x.id));
    if (!unplaced.length)
      return s.accused == null
        ? {
            rule: 'Time to accuse',
            message:
              'Everyone is placed and no clue is broken. Exactly one suspect shares the victim’s room: choose them in the final deduction and make your accusation.',
            cells: [],
          }
        : null;
    const cand = new Map(),
      pairClues = new Map(unplaced.map((x) => [x.id, new Set()]));
    for (const x of unplaced)
      cand.set(
        x.id,
        C.range(n * n).filter((c) => !assist.reason(p, s, c, null, x.id)),
      );
    const spots = (id) => (isPlaced(id) ? [placed[id]] : cand.get(id));
    for (let changed = true, pass = 0; changed && pass < unplaced.length * n * n; pass++) {
      changed = false;
      for (const cl of p.clues) {
        if (!cl.other) continue;
        for (const [me, them, mine] of [
          [cl.who, cl.other, true],
          [cl.other, cl.who, false],
        ]) {
          if (!cand.has(me)) continue;
          const keep = cand
            .get(me)
            .filter((c) =>
              spots(them).some(
                (d) =>
                  d !== c &&
                  Math.floor(d / n) !== Math.floor(c / n) &&
                  d % n !== c % n &&
                  (mine ? C.scenePair(p, cl, c, d) : C.scenePair(p, cl, d, c)),
              ),
            );
          if (keep.length < cand.get(me).length) {
            cand.set(me, keep);
            pairClues.get(me).add(cl);
            changed = true;
          }
        }
      }
    }
    const empty = unplaced.find((x) => !cand.get(x.id).length);
    if (empty)
      return conflict(
        `With your placements, ${empty.name} has no square left that fits the rows, columns, furniture and clues. Revisit an earlier placement.`,
        [],
      );
    const only = (id, cell) => {
      // Explain what removed the other squares, naming the clues that did it.
      const furniture = new Set(p.objects.map((o) => o.cell)),
        taken = Object.values(placed),
        blocked = [],
        texts = new Set([...pairClues.get(id)].map((cl) => C.clueText(p, cl)));
      for (const c of C.range(n * n)) {
        if (furniture.has(c)) blocked[0] = 'furniture';
        else if (taken.some((j) => Math.floor(j / n) === Math.floor(c / n) || j % n === c % n))
          blocked[1] = 'rows and columns already taken';
        else if (assist.reason(p, s, c, null, id)) texts.add(assist.reason(p, s, c, null, id));
      }
      return {
        rule: 'Only one square left',
        message: `${name(id)} can only stand at ${at(cell, n)}. The rest are blocked by ${blocked.filter(Boolean).join(' and ') || 'the clues'}.${texts.size ? ` Clues: ${[...texts].slice(0, 3).join(' ')}` : ''}`,
        cells: [cell],
        person: id,
        // Deliberately no value: a scene move is a placement, not a single-cell value.
      };
    };
    for (const x of unplaced) if (cand.get(x.id).length === 1) return only(x.id, cand.get(x.id)[0]);
    for (const axis of [0, 1])
      for (let line = 0; line < n; line++) {
        const here = inLine(axis, line);
        if (Object.values(placed).some(here)) continue;
        const can = unplaced.filter((x) => cand.get(x.id).some(here));
        if (!can.length)
          return conflict(
            `${lineName(axis, line)} has no square left for anyone. Revisit an earlier placement.`,
            [],
          );
        if (can.length > 1) continue;
        const cells = cand.get(can[0].id).filter(here);
        // The line rule forces the square; the person's other squares are not blocked.
        if (cells.length === 1)
          return {
            rule: 'Only one square left',
            message: `${lineName(axis, line)} must hold ${can[0].name}: nobody else has a square left in it, and ${at(cells[0], n)} is ${can[0].name}'s only open square there.`,
            cells,
            person: can[0].id,
          };
        return {
          rule: axis ? 'Only one person fits a column' : 'Only one person fits a row',
          message: `${lineName(axis, line)} must hold ${can[0].name}: nobody else has a square left in it.`,
          cells,
        };
      }
    return null;
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
    if (p.type === 'trail') return trailDeduction(p, s);
    if (p.type === 'scene') return sceneDeduction(p, s);
    if (p.type === 'dossier') return dossierDeduction(p, s);
    if (p.type === 'witness') return witnessDeduction(p, s);
    if (['sudoku', 'futoshiki'].includes(p.type)) {
      const groups = C.groups(p),
        // Futoshiki chains: a cell below k others cannot hold the top k values (and vice versa).
        pairs = (p.inequalities || []).map((q) => (q.op === '<' ? [q.a, q.b] : [q.b, q.a])),
        // Memoised so a dense draft stays linear; a contradictory cycle just stops early.
        memo = [new Map(), new Map()],
        bound = (i, dir, seen = new Set()) => {
          if (s.cells[i]) return s.cells[i];
          const known = memo[+(dir > 0)];
          if (known.has(i)) return known.get(i);
          if (seen.has(i)) return dir > 0 ? n : 1;
          seen.add(i);
          let v = dir > 0 ? n : 1;
          for (const [lo, hi] of pairs)
            if (dir > 0 && lo === i) v = Math.min(v, bound(hi, dir, seen) - 1);
            else if (dir < 0 && hi === i) v = Math.max(v, bound(lo, dir, seen) + 1);
          seen.delete(i);
          known.set(i, v);
          return v;
        },
        candidates = C.range(n * n).map((i) => {
          if (s.cells[i]) return [];
          const peers = groups.filter((group) => group.includes(i)).flat(),
            low = bound(i, -1),
            high = bound(i, 1);
          return C.range(n)
            .map((k) => k + 1)
            .filter((v) => v >= low && v <= high && !peers.some((j) => s.cells[j] === v));
        }),
        rules = `row, column${p.type === 'sudoku' ? ', box' : ', inequality chain'}`;
      for (let i = 0; i < n * n; i++) {
        if (s.cells[i]) continue;
        const possible = candidates[i];
        if (!possible.length)
          return conflict(`No number fits ${at(i, n)} with your ${rules} and marks.`, [i]);
        if (possible.length === 1)
          return result(
            'Only one number fits',
            `Only ${possible[0]} fits ${at(i, n)} with your ${rules} and current marks.`,
            i,
            possible[0],
          );
      }
      // Hidden single: a number missing from a line or box with exactly one open place for it.
      for (const group of groups) {
        const row = group[1] - group[0] === 1 && group.at(-1) - group[0] === n - 1,
          column = group[1] - group[0] === n,
          name = row
            ? `row ${Math.floor(group[0] / n) + 1}`
            : column
              ? `column ${String.fromCharCode(65 + (group[0] % n))}`
              : `the box at ${at(group[0], n)}`,
          others =
            p.type === 'futoshiki'
              ? `${row ? 'column' : 'row'} or inequality chain`
              : row
                ? 'column or box'
                : column
                  ? 'row or box'
                  : 'row or column';
        for (let v = 1; v <= n; v++) {
          if (group.some((i) => s.cells[i] === v)) continue;
          const places = group.filter((i) => candidates[i].includes(v));
          if (!places.length) return conflict(`${v} has no place left in ${name}.`, group);
          if (places.length === 1)
            return result(
              'Only one place for a number',
              `${name[0].toUpperCase() + name.slice(1)} still needs a ${v}. Every other open square there is ruled out by its ${others}, so it goes in ${at(places[0], n)}.`,
              places[0],
              v,
            );
        }
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
  // The named steps a hint walk takes from the fresh board (#835). Only applicable steps count:
  // cell values, Alibi-file marks and scene placements; corrections and nudges end the walk.
  // Memoised per revision (a 15x15 walk is tens of ms); a failure only hides the line.
  const walked = new Map();
  function techniques(p) {
    const key = p.id + '@' + p.revision;
    if (walked.has(key)) return walked.get(key);
    const used = new Map();
    try {
      const s = C.registry[p.type].initial(p);
      for (let step = 0; step < 4 * p.size ** 2; step++) {
        const h = deduction(p, s);
        if (!h || /^Revisit/.test(h.rule)) break;
        if (h.value !== undefined && h.cells?.length === 1 && Array.isArray(s.cells))
          s.cells[h.cells[0]] = h.value;
        else if (h.mark) s.marks[h.mark.cell] = h.mark.value;
        else if (h.person) s.placements[h.person] = h.cells[0];
        else break;
        used.set(h.rule, (used.get(h.rule) || 0) + 1);
      }
    } catch {
      used.clear();
    }
    const result = [...used].sort((x, y) => y[1] - x[1]);
    walked.set(key, result);
    return result;
  }
  C.insights = { deduction, recap, techniques };
  if (typeof module !== 'undefined' && module.exports) module.exports = C.insights;
})(globalThis);
