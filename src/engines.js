/* Additional puzzle engines. Pure functions, bounded solvers, no DOM or network. */
(function (root) {
  'use strict';
  const C = root.AlibiCore,
    { clone, range, equal, DIFFICULTIES } = C,
    legacy = {
      solve: C.solve,
      validateDefinition: C.validateDefinition,
      validateState: C.validateState,
      hint: C.hint,
    };
  const extra = ['dossier', 'witness', 'lightup', 'tents', 'aquarium', 'network', 'trail'];
  const issue = (message, cells = []) => ({ message, cells });
  const adj = (i, n) =>
    [i - n, i + 1, i + n, i - 1].filter(
      (j) =>
        j >= 0 &&
        j < n * n &&
        Math.abs(Math.floor(i / n) - Math.floor(j / n)) + Math.abs((i % n) - (j % n)) === 1,
    );
  const near = (a, b, n) =>
    Math.abs(Math.floor(a / n) - Math.floor(b / n)) <= 1 && Math.abs((a % n) - (b % n)) <= 1;
  const pop = (x) => [1, 2, 4, 8].filter((b) => x & b).length;
  const rot = (x, k = 1) => {
    for (let i = 0; i < ((k % 4) + 4) % 4; i++) x = ((x << 1) & 15) | (x >> 3);
    return x;
  };
  const bits = [1, 2, 4, 8],
    op = [4, 8, 1, 2];
  const step = (i, d, n) => {
    const j = i + [-n, 1, n, -1][d];
    return j >= 0 && j < n * n && (d % 2 === 0 || Math.floor(i / n) === Math.floor(j / n)) ? j : -1;
  };
  function permutations(a) {
    if (!a.length) return [[]];
    return a.flatMap((v, i) => permutations(a.filter((_, j) => i !== j)).map((x) => [v, ...x]));
  }
  function dossierClue(p, c) {
    const name = (i) => p.people[i],
      val = (cat, i) => p.categories[cat].values[i];
    if (c.kind === 'eq')
      return `${name(c.who)} ${c.cat === 0 ? 'was in' : 'carried'} the ${val(c.cat, c.value)}.`;
    if (c.kind === 'ne')
      return `${name(c.who)} ${c.cat === 0 ? 'was not in' : 'did not carry'} the ${val(c.cat, c.value)}.`;
    return `The person in the ${val(0, c.a)} carried the ${val(1, c.b)}.`;
  }
  function dossierMatch(p, a, c) {
    return c.kind === 'link'
      ? a[p.size + a.slice(0, p.size).indexOf(c.a)] === c.b
      : c.kind === 'eq'
        ? a[c.cat * p.size + c.who] === c.value
        : a[c.cat * p.size + c.who] !== c.value;
  }
  function dossierAssignments(p, s) {
    return p.categories.flatMap((_, cat) =>
      range(p.size).map(
        (r) =>
          range(p.size).find((c) => s.marks[cat * p.size * p.size + r * p.size + c] === 1) ?? -1,
      ),
    );
  }
  function dossierReady(p, s) {
    const n = p.size,
      a = dossierAssignments(p, s);
    if (
      p.categories.some((_, cat) =>
        range(n).some(
          (r) =>
            range(n).filter((c) => s.marks[cat * n * n + r * n + c] === 1).length !== 1 ||
            range(n).filter((c) => s.marks[cat * n * n + c * n + r] === 1).length !== 1,
        ),
      )
    )
      return false;
    return (
      a.every((v) => v >= 0) &&
      p.categories.every(
        (_, k) => new Set(a.slice(k * p.size, (k + 1) * p.size)).size === p.size,
      ) &&
      p.clues.every((c) => dossierMatch(p, a, c))
    );
  }
  function truth(c, who) {
    return c.kind === 'is'
      ? c.suspects[0] === who
      : c.kind === 'not'
        ? c.suspects[0] !== who
        : c.suspects.includes(who);
  }
  function witnessText(p, c) {
    return c.kind === 'is'
      ? `${p.people[c.suspects[0]]} took it.`
      : c.kind === 'not'
        ? `${p.people[c.suspects[0]]} did not take it.`
        : `Either ${p.people[c.suspects[0]]} or ${p.people[c.suspects[1]]} took it.`;
  }
  function visible(p, i) {
    const out = [];
    for (let d = 0; d < 4; d++) {
      let j = step(i, d, p.size);
      while (j >= 0 && p.walls[j] === -2) {
        out.push(j);
        j = step(j, d, p.size);
      }
    }
    return out;
  }
  function litCells(p, s) {
    const lit = new Set();
    for (let i = 0; i < p.size ** 2; i++)
      if (s.cells[i] === 1 && p.walls[i] === -2) {
        lit.add(i);
        for (const j of visible(p, i)) lit.add(j);
      }
    return lit;
  }
  function lightIssues(p, s) {
    const out = [],
      n = p.size;
    for (let i = 0; i < n * n; i++) {
      if (p.walls[i] === -2 && s.cells[i] === 1 && visible(p, i).some((j) => s.cells[j] === 1))
        out.push(
          issue('Two lanterns shine directly at each other. A wall must separate them.', [
            i,
            ...visible(p, i).filter((j) => s.cells[j] === 1),
          ]),
        );
      if (p.walls[i] >= 0) {
        const ns = adj(i, n).filter((j) => p.walls[j] === -2),
          bulbs = ns.filter((j) => s.cells[j] === 1).length,
          open = ns.filter((j) => s.cells[j] !== 0).length;
        if (bulbs > p.walls[i] || open < p.walls[i])
          out.push(
            issue(
              `This wall needs exactly ${p.walls[i]} neighbouring lantern${p.walls[i] === 1 ? '' : 's'}.`,
              [i, ...ns],
            ),
          );
      }
    }
    return out;
  }
  function matchTrees(p, tents) {
    const match = new Map();
    function visit(tree, seen) {
      for (const t of tents)
        if (adj(tree, p.size).includes(t) && !seen.has(t)) {
          seen.add(t);
          if (!match.has(t) || visit(match.get(t), seen)) {
            match.set(t, tree);
            return true;
          }
        }
      return false;
    }
    return p.trees.every((tree) => visit(tree, new Set()));
  }
  function tentIssues(p, s) {
    const out = [],
      n = p.size,
      ts = range(n * n).filter((i) => s.cells[i] === 1);
    for (const i of ts) {
      if (p.trees.includes(i)) out.push(issue('A tent cannot cover a tree.', [i]));
      if (!p.trees.some((t) => adj(t, n).includes(i)))
        out.push(issue('Every tent needs an adjacent tree, not diagonally.', [i]));
      for (const j of ts)
        if (j > i && near(i, j, n))
          out.push(issue('Tents cannot touch, even at a corner.', [i, j]));
    }
    for (let k = 0; k < n; k++) {
      const r = ts.filter((i) => Math.floor(i / n) === k),
        c = ts.filter((i) => i % n === k);
      if (r.length > p.rowTargets[k]) out.push(issue(`Row ${k + 1} has too many tents.`, r));
      if (c.length > p.colTargets[k])
        out.push(issue(`Column ${String.fromCharCode(65 + k)} has too many tents.`, c));
    }
    return out;
  }
  function tankRows(p) {
    return range(Math.max(...p.tanks) + 1).map((t) =>
      [
        ...new Set(
          range(p.size ** 2)
            .filter((i) => p.tanks[i] === t)
            .map((i) => Math.floor(i / p.size)),
        ),
      ].sort((a, b) => b - a),
    );
  }
  function aquariumCells(p, s) {
    const rows = tankRows(p);
    return p.tanks.map((t, i) =>
      rows[t].slice(0, s.levels[t]).includes(Math.floor(i / p.size)) ? 1 : 0,
    );
  }
  function lineCounts(p, cells) {
    return {
      rows: range(p.size).map(
        (r) => cells.slice(r * p.size, (r + 1) * p.size).filter((v) => v === 1).length,
      ),
      cols: range(p.size).map(
        (c) => range(p.size).filter((r) => cells[r * p.size + c] === 1).length,
      ),
    };
  }
  function networkInfo(p, s) {
    const n = p.size,
      masks = p.tiles.map((t, i) => rot(t, s.rotations[i])),
      connected = new Set([p.source]),
      open = [];
    for (let i = 0; i < n * n; i++)
      for (let d = 0; d < 4; d++)
        if (masks[i] & bits[d]) {
          let j = step(i, d, n);
          if (j < 0 || !(masks[j] & op[d])) open.push(i);
        }
    const stack = [p.source];
    while (stack.length) {
      const i = stack.pop();
      for (let d = 0; d < 4; d++) {
        const j = step(i, d, n);
        if (j >= 0 && masks[i] & bits[d] && masks[j] & op[d] && !connected.has(j)) {
          connected.add(j);
          stack.push(j);
        }
      }
    }
    return { masks, connected, open: [...new Set(open)] };
  }
  function trailIssues(p, s) {
    const out = [],
      n = p.size;
    for (let v = 1; v <= n * n; v++) {
      const ix = range(n * n).filter((i) => s.cells[i] === v);
      if (ix.length > 1) out.push(issue(`${v} appears more than once.`, ix));
      const a = s.cells.indexOf(v),
        b = s.cells.indexOf(v + 1);
      if (a >= 0 && b >= 0 && !adj(a, n).includes(b))
        out.push(issue(`${v} and ${v + 1} need to share an edge.`, [a, b]));
    }
    return out;
  }
  function gridReduce(p, s, a) {
    if (
      a.type !== 'set' ||
      !Number.isInteger(a.cell) ||
      a.cell < 0 ||
      a.cell >= p.size ** 2 ||
      ![-1, 0, 1].includes(a.value)
    )
      return s;
    if (
      (p.type === 'lightup' && p.walls[a.cell] !== -2) ||
      (p.type === 'tents' && p.trees.includes(a.cell))
    )
      return s;
    const t = clone(s);
    t.cells[a.cell] = a.value;
    return t;
  }
  const R = {
    dossier: {
      label: 'Alibi files',
      icon: 'dossier',
      initial: (p) => ({
        marks: range(2 * p.size * p.size).map(() => -1),
        notes: {},
        clueMarks: [],
        accused: null,
      }),
      reduce: (p, s, a) => {
        const t = clone(s),
          n = p.size;
        if (
          a.type === 'mark' &&
          Number.isInteger(a.cell) &&
          a.cell >= 0 &&
          a.cell < t.marks.length &&
          [-1, 0, 1].includes(a.value)
        ) {
          t.accused = null;
          t.marks[a.cell] = a.value;
          if (a.value === 1 && a.auto !== false) {
            const cat = Math.floor(a.cell / (n * n)),
              local = a.cell % (n * n),
              r = Math.floor(local / n),
              c = local % n;
            for (let k = 0; k < n; k++) {
              if (k !== c) t.marks[cat * n * n + r * n + k] = 0;
              if (k !== r) t.marks[cat * n * n + k * n + c] = 0;
            }
          }
        }
        if (a.type === 'clue')
          t.clueMarks = t.clueMarks.includes(a.index)
            ? t.clueMarks.filter((x) => x !== a.index)
            : [...t.clueMarks, a.index];
        if (a.type === 'accuse' && Number.isInteger(a.who) && a.who >= 0 && a.who < n)
          t.accused = a.who;
        return t;
      },
      validate: (p, s) => {
        const out = [],
          n = p.size,
          a = dossierAssignments(p, s);
        for (let cat = 0; cat < 2; cat++)
          for (let r = 0; r < n; r++) {
            const row = range(n).map((c) => cat * n * n + r * n + c),
              col = range(n).map((c) => cat * n * n + c * n + r);
            if (
              row.filter((i) => s.marks[i] === 1).length > 1 ||
              col.filter((i) => s.marks[i] === 1).length > 1
            )
              out.push(
                issue(
                  'Each person has exactly one match in each category. Each option is used once.',
                ),
              );
            if (row.every((i) => s.marks[i] === 0) || col.every((i) => s.marks[i] === 0))
              out.push(issue('A row or column has no remaining possibilities.'));
          }
        for (const cl of p.clues)
          if (cl.kind !== 'link' && a[cl.cat * n + cl.who] >= 0 && !dossierMatch(p, a, cl))
            out.push(issue(dossierClue(p, cl)));
        if (dossierReady(p, s) && s.accused !== null && a[n + s.accused] !== p.targetItem)
          out.push(issue('That person did not carry the item identified in the evidence.'));
        return out;
      },
      complete: (p, s) =>
        dossierReady(p, s) &&
        s.accused !== null &&
        dossierAssignments(p, s)[p.size + s.accused] === p.targetItem,
    },
    witness: {
      label: 'Witness statements',
      icon: 'witness',
      initial: (p) => ({ marks: p.statements.map(() => -1), accused: null, notes: {} }),
      reduce: (p, s, a) => {
        const t = clone(s);
        if (
          a.type === 'mark' &&
          Number.isInteger(a.cell) &&
          a.cell >= 0 &&
          a.cell < p.statements.length &&
          [-1, 0, 1].includes(a.value)
        )
          t.marks[a.cell] = a.value;
        if (a.type === 'accuse' && Number.isInteger(a.who) && a.who >= 0 && a.who < p.people.length)
          t.accused = a.who;
        return t;
      },
      validate: (p, s) =>
        s.accused !== null && p.statements.filter((c) => truth(c, s.accused)).length !== p.trueCount
          ? [
              issue(
                `With ${p.people[s.accused]} as the culprit, ${p.statements.filter((c) => truth(c, s.accused)).length} statements would be true. The evidence says exactly ${p.trueCount}.`,
              ),
            ]
          : [],
      complete: (p, s) =>
        s.accused !== null &&
        p.statements.filter((c) => truth(c, s.accused)).length === p.trueCount,
    },
    lightup: {
      label: 'Lanterns',
      icon: 'lightup',
      initial: (p) => ({ cells: range(p.size ** 2).map(() => -1), notes: {} }),
      reduce: gridReduce,
      validate: lightIssues,
      complete: (p, s) =>
        !lightIssues(p, s).length &&
        litCells(p, s).size === p.walls.filter((w) => w === -2).length &&
        p.walls.every(
          (w, i) => w < 0 || adj(i, p.size).filter((j) => s.cells[j] === 1).length === w,
        ),
    },
    tents: {
      label: 'Tents & trees',
      icon: 'tents',
      initial: (p) => ({ cells: range(p.size ** 2).map(() => -1), notes: {} }),
      reduce: gridReduce,
      validate: tentIssues,
      complete: (p, s) => {
        const ts = range(p.size ** 2).filter((i) => s.cells[i] === 1),
          ct = lineCounts(p, s.cells);
        return (
          ts.length === p.trees.length &&
          !tentIssues(p, s).length &&
          equal(ct.rows, p.rowTargets) &&
          equal(ct.cols, p.colTargets) &&
          matchTrees(p, ts)
        );
      },
    },
    aquarium: {
      label: 'Aquariums',
      icon: 'aquarium',
      initial: (p) => ({ levels: tankRows(p).map(() => 0), notes: {} }),
      reduce: (p, s, a) => {
        if (
          a.type !== 'level' ||
          !Number.isInteger(a.tank) ||
          a.tank < 0 ||
          a.tank >= s.levels.length ||
          !Number.isInteger(a.value) ||
          a.value < 0 ||
          a.value > tankRows(p)[a.tank].length
        )
          return s;
        const t = clone(s);
        t.levels[a.tank] = a.value;
        return t;
      },
      validate: (p, s) => {
        const ct = lineCounts(p, aquariumCells(p, s)),
          out = [];
        for (let k = 0; k < p.size; k++) {
          if (ct.rows[k] > p.rowTargets[k])
            out.push(
              issue(
                `Row ${k + 1} has too much water.`,
                range(p.size).map((c) => k * p.size + c),
              ),
            );
          if (ct.cols[k] > p.colTargets[k])
            out.push(
              issue(
                `Column ${String.fromCharCode(65 + k)} has too much water.`,
                range(p.size).map((r) => r * p.size + k),
              ),
            );
        }
        return out;
      },
      complete: (p, s) => {
        const ct = lineCounts(p, aquariumCells(p, s));
        return equal(ct.rows, p.rowTargets) && equal(ct.cols, p.colTargets);
      },
    },
    network: {
      label: 'Signal paths',
      icon: 'network',
      initial: (p) => ({ rotations: p.tiles.map(() => 0), notes: {} }),
      reduce: (p, s, a) => {
        if (
          a.type !== 'rotate' ||
          !Number.isInteger(a.cell) ||
          a.cell < 0 ||
          a.cell >= p.size ** 2 ||
          (p.locked || []).includes(a.cell)
        )
          return s;
        const t = clone(s);
        t.rotations[a.cell] = (t.rotations[a.cell] + (a.reverse ? 3 : 1)) % 4;
        return t;
      },
      validate: (p, s) => {
        const x = networkInfo(p, s);
        return x.open.length
          ? [
              issue(
                `${x.open.length} tiles have at least one open connection. Every line must meet another line.`,
                x.open,
              ),
            ]
          : x.connected.size < p.size ** 2
            ? [issue('Some tiles form a separate network. Connect every tile to the source.')]
            : [];
      },
      complete: (p, s) => {
        const x = networkInfo(p, s);
        return !x.open.length && x.connected.size === p.size ** 2;
      },
    },
    trail: {
      label: 'Number trails',
      icon: 'trail',
      initial: (p) => ({ cells: p.givens.slice(), notes: {} }),
      reduce: (p, s, a) => {
        if (
          a.type !== 'set' ||
          !Number.isInteger(a.cell) ||
          a.cell < 0 ||
          a.cell >= p.size ** 2 ||
          p.givens[a.cell] ||
          !Number.isInteger(a.value) ||
          a.value < 0 ||
          a.value > p.size ** 2
        )
          return s;
        const t = clone(s);
        if (a.value && p.givens.includes(a.value)) return s;
        if (a.value) {
          const old = t.cells.indexOf(a.value);
          if (old >= 0) t.cells[old] = 0;
        }
        t.cells[a.cell] = a.value;
        return t;
      },
      validate: trailIssues,
      complete: (p, s) => s.cells.every((v) => v > 0) && !trailIssues(p, s).length,
    },
  };
  Object.assign(C.registry, R);
  C.TYPES.push(...extra);
  function solve(p, state = null, limit = 2, maxNodes = 250000) {
    if (!extra.includes(p.type)) return legacy.solve(p, state, limit, maxNodes);
    let nodes = 0;
    const solutions = [],
      n = p.size,
      N = n * n,
      seen = new Set();
    function tick() {
      if (++nodes > maxNodes)
        throw new Error('Solver budget exceeded. Add more clues or simplify this puzzle.');
    }
    function add(s) {
      const key = JSON.stringify(s);
      if (!seen.has(key)) {
        seen.add(key);
        solutions.push(clone(s));
      }
    }
    if (p.type === 'witness') {
      for (let i = 0; i < p.people.length; i++) {
        tick();
        if (
          p.statements.filter((c) => truth(c, i)).length === p.trueCount &&
          (state?.accused == null || state.accused === i)
        )
          add(i);
        if (solutions.length >= limit) break;
      }
    }
    if (p.type === 'dossier') {
      const ps = permutations(range(n));
      for (const a of ps) {
        if (solutions.length >= limit) break;
        for (const b of ps) {
          tick();
          const sol = [...a, ...b];
          if (
            p.clues.every((c) => dossierMatch(p, sol, c)) &&
            (!state ||
              sol.every((v, i) =>
                range(n).every((k) => {
                  const mark = state.marks[Math.floor(i / n) * n * n + (i % n) * n + k];
                  return mark === -1 || (mark === 1 ? k === v : k !== v);
                }),
              ))
          )
            add(sol);
          if (solutions.length >= limit) break;
        }
      }
    }
    if (p.type === 'aquarium') {
      const rows = tankRows(p),
        levels = rows.map(() => 0);
      function visit(k) {
        tick();
        if (solutions.length >= limit) return;
        if (k === rows.length) {
          if (R.aquarium.complete(p, { levels })) add(levels);
          return;
        }
        for (let v = 0; v <= rows[k].length; v++) {
          levels[k] = v;
          const ct = lineCounts(
            p,
            aquariumCells(p, { levels: levels.map((x, i) => (i <= k ? x : 0)) }),
          );
          if (
            ct.rows.some((x, i) => x > p.rowTargets[i]) ||
            ct.cols.some((x, i) => x > p.colTargets[i])
          )
            continue;
          visit(k + 1);
        }
      }
      visit(0);
    }
    if (p.type === 'tents') {
      const options = range(n).map((r) => {
        const out = [];
        for (let m = 0; m < 2 ** n; m++) {
          const cells = range(n)
            .filter((c) => m & (1 << c))
            .map((c) => r * n + c);
          if (
            cells.length !== p.rowTargets[r] ||
            cells.some((i) => p.trees.includes(i) || !p.trees.some((t) => adj(t, n).includes(i))) ||
            cells.some((i, k) => k && i === cells[k - 1] + 1)
          )
            continue;
          if (
            state &&
            range(n).some(
              (c) =>
                (state.cells[r * n + c] === 1 && !cells.includes(r * n + c)) ||
                (state.cells[r * n + c] === 0 && cells.includes(r * n + c)),
            )
          )
            continue;
          out.push(cells);
        }
        return out;
      });
      function visit(r, ts, counts) {
        tick();
        if (solutions.length >= limit) return;
        if (r === n) {
          if (equal(counts, p.colTargets) && matchTrees(p, ts))
            add(range(N).map((i) => (ts.includes(i) ? 1 : 0)));
          return;
        }
        for (const row of options[r]) {
          if (row.some((i) => ts.some((t) => near(i, t, n)))) continue;
          const ct = counts.map((v, c) => v + row.filter((i) => i % n === c).length);
          if (ct.some((v, c) => v > p.colTargets[c] || v + (n - r - 1) < p.colTargets[c])) continue;
          visit(r + 1, [...ts, ...row], ct);
        }
      }
      visit(
        0,
        [],
        range(n).map(() => 0),
      );
    }
    if (p.type === 'network') {
      let domains = p.tiles.map((v, i) =>
        [...new Set(range(4).map((k) => rot(v, k)))].filter(
          (mask) =>
            (!(p.locked || []).includes(i) || mask === v) &&
            bits.every((b, d) => step(i, d, n) >= 0 || !(mask & b)),
        ),
      );
      function propagate(ds) {
        let changed = true;
        while (changed) {
          changed = false;
          for (let i = 0; i < N; i++)
            for (let d = 0; d < 4; d++) {
              const j = step(i, d, n);
              if (j < 0) continue;
              const next = ds[i].filter((v) =>
                ds[j].some((w) => !!(v & bits[d]) === !!(w & op[d])),
              );
              if (!next.length) return null;
              if (next.length !== ds[i].length) {
                ds[i] = next;
                changed = true;
              }
            }
        }
        return ds;
      }
      function visit(ds) {
        tick();
        if (solutions.length >= limit) return;
        ds = propagate(ds.map((x) => x.slice()));
        if (!ds) return;
        let at = -1;
        for (let i = 0; i < N; i++)
          if (ds[i].length > 1 && (at < 0 || ds[i].length < ds[at].length)) at = i;
        if (at < 0) {
          const masks = ds.map((x) => x[0]),
            rotations = masks.map((m, i) => range(4).find((k) => rot(p.tiles[i], k) === m));
          if (R.network.complete(p, { rotations })) add(rotations);
          return;
        }
        for (const v of ds[at]) {
          const next = ds.map((x) => x.slice());
          next[at] = [v];
          visit(next);
        }
      }
      visit(domains);
    }
    if (p.type === 'lightup') {
      const white = range(N).filter((i) => p.walls[i] === -2),
        vis = Object.fromEntries(white.map((i) => [i, visible(p, i)])),
        fixed = white.filter((i) => state?.cells[i] === 1),
        forbid = new Set(white.filter((i) => state?.cells[i] === 0)),
        memo = new Set();
      function visit(bulbs) {
        tick();
        if (solutions.length >= limit) return;
        const key = bulbs
          .slice()
          .sort((a, b) => a - b)
          .join(',');
        if (memo.has(key)) return;
        memo.add(key);
        const lit = new Set(bulbs.flatMap((i) => [i, ...vis[i]]));
        if (bulbs.some((i) => vis[i].some((j) => bulbs.includes(j)))) return;
        const available = white.filter((i) => !lit.has(i) && !forbid.has(i));
        for (let i = 0; i < N; i++)
          if (p.walls[i] >= 0) {
            const ns = adj(i, n).filter((j) => p.walls[j] === -2),
              yes = ns.filter((j) => bulbs.includes(j)).length,
              maybe = ns.filter((j) => available.includes(j)).length;
            if (yes > p.walls[i] || yes + maybe < p.walls[i]) return;
          }
        if (lit.size === white.length) {
          const cells = range(N).map((i) => (bulbs.includes(i) ? 1 : 0));
          if (R.lightup.complete(p, { cells })) add(cells);
          return;
        }
        let options = null;
        for (const i of white)
          if (!lit.has(i)) {
            const opts = [i, ...vis[i]].filter((j) => available.includes(j));
            if (!opts.length) return;
            if (!options || opts.length < options.length) options = opts;
          }
        for (const i of options) visit([...bulbs, i]);
      }
      visit(fixed);
    }
    if (p.type === 'trail') {
      const fixed = p.givens.slice();
      if (state)
        for (let i = 0; i < N; i++)
          if (state.cells[i]) {
            if (fixed[i] && fixed[i] !== state.cells[i]) return { solutions: [], nodes };
            fixed[i] = state.cells[i];
          }
      const positions = new Map();
      for (let i = 0; i < N; i++)
        if (fixed[i]) {
          if (positions.has(fixed[i])) return { solutions: [], nodes };
          positions.set(fixed[i], i);
        }
      const path = [],
        used = new Set();
      function visit(cell, v) {
        tick();
        if (solutions.length >= limit) return;
        if (
          used.has(cell) ||
          (fixed[cell] && fixed[cell] !== v) ||
          (positions.has(v) && positions.get(v) !== cell)
        )
          return;
        const nextFixed = [...positions.keys()].filter((k) => k > v).sort((a, b) => a - b)[0];
        if (nextFixed) {
          const j = positions.get(nextFixed),
            d = Math.abs(Math.floor(j / n) - Math.floor(cell / n)) + Math.abs((j % n) - (cell % n));
          if (d > nextFixed - v || (nextFixed - v - d) % 2) return;
        }
        used.add(cell);
        path.push(cell);
        if (v === N) {
          const sol = range(N).map(() => 0);
          path.forEach((c, i) => (sol[c] = i + 1));
          add(sol);
        } else for (const j of adj(cell, n)) visit(j, v + 1);
        path.pop();
        used.delete(cell);
      }
      for (const i of positions.has(1) ? [positions.get(1)] : range(N)) {
        visit(i, 1);
        if (solutions.length >= limit) break;
      }
    }
    return { solutions, nodes };
  }
  function definition(input) {
    if (!extra.includes(input?.type)) return legacy.validateDefinition(input);
    const p = clone(input),
      fail = (m) => {
        throw new Error(`${p.id || 'Puzzle'}: ${m}`);
      },
      int = (v, a, b) => Number.isInteger(v) && v >= a && v <= b,
      text = (v, max = 160) => typeof v === 'string' && v.trim().length > 0 && v.length <= max,
      arr = (v, len, min, max) =>
        Array.isArray(v) && v.length === len && v.every((x) => int(x, min, max));
    if (
      typeof p.id !== 'string' ||
      !/^[a-z][a-z0-9-]{1,63}$/.test(p.id) ||
      ['constructor', 'prototype'].includes(p.id) ||
      !int(p.revision, 1, 999999) ||
      !text(p.title, 90) ||
      !text(p.subtitle, 120) ||
      !DIFFICULTIES.includes(p.difficulty) ||
      !int(p.size, 3, 7)
    )
      fail('Invalid puzzle header.');
    if (p.difficultyStatus !== undefined && !text(p.difficultyStatus, 40))
      fail('Invalid difficulty status.');
    if (p.story !== undefined && !text(p.story, 1600)) fail('Invalid story.');
    if (p.question !== undefined && !text(p.question, 200)) fail('Invalid final question.');
    if (p.questionContext !== undefined && !text(p.questionContext, 400))
      fail('Invalid question context.');
    const n = p.size,
      N = n * n;
    if (p.type === 'dossier') {
      if (
        n !== 4 ||
        !Array.isArray(p.people) ||
        p.people.length !== n ||
        !p.people.every((v) => text(v, 30)) ||
        new Set(p.people).size !== n ||
        !Array.isArray(p.categories) ||
        p.categories.length !== 2 ||
        !p.categories.every(
          (c) =>
            text(c.name, 30) &&
            Array.isArray(c.values) &&
            c.values.length === n &&
            new Set(c.values).size === n &&
            c.values.every((v) => text(v, 40)),
        ) ||
        !int(p.targetItem, 0, n - 1) ||
        !arr(p.solution, 2 * n, 0, n - 1)
      )
        fail('Invalid dossier categories.');
      if (
        !Array.isArray(p.clues) ||
        p.clues.length < 1 ||
        p.clues.length > 30 ||
        !p.clues.every((c) =>
          c.kind === 'link'
            ? int(c.a, 0, n - 1) && int(c.b, 0, n - 1)
            : ['eq', 'ne'].includes(c.kind) &&
              int(c.cat, 0, 1) &&
              int(c.who, 0, n - 1) &&
              int(c.value, 0, n - 1),
        )
      )
        fail('Invalid dossier clues.');
      if (
        !p.categories.every((_, k) => new Set(p.solution.slice(k * n, (k + 1) * n)).size === n) ||
        !p.clues.every((c) => dossierMatch(p, p.solution, c))
      )
        fail('Dossier solution violates clues.');
    }
    if (p.type === 'witness') {
      if (
        !Array.isArray(p.people) ||
        p.people.length !== n ||
        new Set(p.people).size !== n ||
        !p.people.every((v) => text(v, 30)) ||
        !Array.isArray(p.statements) ||
        p.statements.length < 3 ||
        p.statements.length > 8 ||
        !int(p.trueCount, 0, p.statements.length) ||
        !int(p.solution, 0, n - 1)
      )
        fail('Invalid witnesses.');
      if (
        !p.statements.every(
          (c) =>
            ['is', 'not', 'oneof'].includes(c.kind) &&
            Array.isArray(c.suspects) &&
            c.suspects.length === (c.kind === 'oneof' ? 2 : 1) &&
            new Set(c.suspects).size === c.suspects.length &&
            c.suspects.every((i) => int(i, 0, n - 1)) &&
            text(c.speaker, 30),
        )
      )
        fail('Invalid statement.');
      if (p.statements.filter((c) => truth(c, p.solution)).length !== p.trueCount)
        fail('Witness solution breaks the truth count.');
    }
    if (p.type === 'lightup') {
      if (
        !arr(p.walls, N, -2, 4) ||
        !arr(p.solution, N, 0, 1) ||
        p.walls.filter((w) => w === -2).length < 3 ||
        p.solution.some((v, i) => v && p.walls[i] !== -2) ||
        !R.lightup.complete(p, { cells: p.solution })
      )
        fail('Invalid lantern layout or solution.');
    }
    if (p.type === 'tents') {
      if (
        !Array.isArray(p.trees) ||
        !p.trees.length ||
        p.trees.length > N / 2 ||
        new Set(p.trees).size !== p.trees.length ||
        !p.trees.every((i) => int(i, 0, N - 1)) ||
        !arr(p.rowTargets, n, 0, n) ||
        !arr(p.colTargets, n, 0, n) ||
        !arr(p.solution, N, 0, 1) ||
        !R.tents.complete(p, { cells: p.solution })
      )
        fail('Invalid tents layout or solution.');
    }
    if (p.type === 'aquarium') {
      if (!arr(p.tanks, N, 0, N - 1) || !arr(p.rowTargets, n, 0, n) || !arr(p.colTargets, n, 0, n))
        fail('Invalid aquarium.');
      const count = Math.max(...p.tanks) + 1;
      if (
        count > 10 ||
        new Set(p.tanks).size !== count ||
        !arr(p.solution, count, 0, n) ||
        p.solution.some((v, i) => v > tankRows(p)[i].length)
      )
        fail('Invalid water levels.');
      for (let t = 0; t < count; t++) {
        const cells = range(N).filter((i) => p.tanks[i] === t),
          seen = new Set([cells[0]]),
          q = [cells[0]];
        while (q.length)
          for (const j of adj(q.pop(), n))
            if (p.tanks[j] === t && !seen.has(j)) {
              seen.add(j);
              q.push(j);
            }
        if (seen.size !== cells.length) fail('Each tank must be connected.');
      }
      if (!R.aquarium.complete(p, { levels: p.solution }))
        fail('Water solution does not match counts.');
    }
    if (p.type === 'network') {
      if (
        !arr(p.tiles, N, 1, 15) ||
        !int(p.source, 0, N - 1) ||
        !arr(p.solution, N, 0, 3) ||
        !Array.isArray(p.locked) ||
        new Set(p.locked).size !== p.locked.length ||
        !p.locked.every((i) => int(i, 0, N - 1)) ||
        p.locked.some((i) => p.solution[i] !== 0) ||
        !R.network.complete(p, { rotations: p.solution })
      )
        fail('Invalid network or solution.');
    }
    if (p.type === 'trail') {
      if (
        !arr(p.solution, N, 1, N) ||
        !arr(p.givens, N, 0, N) ||
        !p.givens.every((v, i) => v === 0 || v === p.solution[i]) ||
        !p.givens.includes(1) ||
        !p.givens.includes(N) ||
        !R.trail.complete(p, { cells: p.solution })
      )
        fail('Invalid trail clues or solution.');
    }
    return p;
  }
  function state(p, s) {
    if (!extra.includes(p.type)) return legacy.validateState(p, s);
    if (
      !s ||
      typeof s !== 'object' ||
      !s.notes ||
      typeof s.notes !== 'object' ||
      Array.isArray(s.notes) ||
      Object.keys(s.notes).length !== 0
    )
      throw new Error('Invalid puzzle state.');
    const n = p.size,
      N = n * n,
      ints = (a, len, lo, hi) =>
        Array.isArray(a) &&
        a.length === len &&
        a.every((v) => Number.isInteger(v) && v >= lo && v <= hi),
      acc = (x) => x === null || (Number.isInteger(x) && x >= 0 && x < n);
    let good = true;
    if (p.type === 'dossier')
      good =
        ints(s.marks, 2 * N, -1, 1) &&
        Array.isArray(s.clueMarks) &&
        s.clueMarks.length <= p.clues.length &&
        s.clueMarks.every((i) => Number.isInteger(i) && i >= 0 && i < p.clues.length) &&
        acc(s.accused);
    if (p.type === 'witness') good = ints(s.marks, p.statements.length, -1, 1) && acc(s.accused);
    if (['lightup', 'tents'].includes(p.type))
      good =
        ints(s.cells, N, -1, 1) &&
        (p.type === 'lightup'
          ? s.cells.every((v, i) => p.walls[i] === -2 || v === -1)
          : p.trees.every((i) => s.cells[i] === -1));
    if (p.type === 'aquarium')
      good =
        ints(s.levels, tankRows(p).length, 0, n) &&
        s.levels.every((v, i) => v <= tankRows(p)[i].length);
    if (p.type === 'network')
      good = ints(s.rotations, N, 0, 3) && p.locked.every((i) => s.rotations[i] === 0);
    if (p.type === 'trail')
      good = ints(s.cells, N, 0, N) && p.givens.every((v, i) => v === 0 || v === s.cells[i]);
    if (!good) throw new Error('Invalid or incompatible saved board. Nothing was replaced.');
    return clone(s);
  }
  C.solve = solve;
  C.validateDefinition = definition;
  C.validateState = state;
  C.validatePack = (input, checkUnique = true) => {
    if (
      !input ||
      input.schemaVersion !== 1 ||
      typeof input.id !== 'string' ||
      !/^[a-z][a-z0-9-]{1,63}$/.test(input.id) ||
      ['constructor', 'prototype'].includes(input.id) ||
      !Number.isInteger(input.version) ||
      input.version < 1 ||
      input.version > 999999 ||
      typeof input.title !== 'string' ||
      !input.title.trim() ||
      input.title.length > 120 ||
      !Array.isArray(input.puzzles) ||
      input.puzzles.length < 1 ||
      input.puzzles.length > 150
    )
      throw new Error('A valid pack needs an ID, title and 1–150 puzzles.');
    const puzzles = input.puzzles.map((p) => C.validateDefinition(p));
    if (new Set(puzzles.map((p) => p.id)).size !== puzzles.length)
      throw new Error('Duplicate puzzle IDs.');
    if (checkUnique)
      for (const p of puzzles)
        if (C.solve(p).solutions.length !== 1)
          throw new Error(`${p.title}: the rules do not identify exactly one solution.`);
    return {
      schemaVersion: 1,
      id: input.id,
      version: input.version,
      title: input.title,
      author: typeof input.author === 'string' ? input.author.slice(0, 100) : 'Local author',
      puzzles,
    };
  };
  C.hint = (p, s) => {
    if (!extra.includes(p.type)) return legacy.hint(p, s);
    let action = null,
      message = 'Compare the constraints before committing to an answer.';
    if (p.type === 'dossier') {
      const a = dossierAssignments(p, s),
        at = p.solution.findIndex((v, i) => v !== a[i]);
      if (at >= 0) {
        action = {
          type: 'mark',
          cell: Math.floor(at / p.size) * p.size ** 2 + (at % p.size) * p.size + p.solution[at],
          value: 1,
        };
        message = `Focus on ${p.people[at % p.size]}'s ${p.categories[Math.floor(at / p.size)].name.toLowerCase()}. Compare direct clues with the linked evidence.`;
      } else message = `Find the person carrying the ${p.categories[1].values[p.targetItem]}.`;
    }
    if (p.type === 'witness') {
      const i = s.marks.findIndex((v, i) => v !== Number(truth(p.statements[i], p.solution)));
      message =
        'Try one suspect as a temporary assumption. Count how many statements become true; the total must match the evidence.';
      if (i >= 0)
        action = { type: 'mark', cell: i, value: Number(truth(p.statements[i], p.solution)) };
    }
    if (p.type === 'lightup' || p.type === 'tents') {
      const i = p.solution.findIndex(
        (v, i) => (v === 1 && s.cells[i] !== 1) || (s.cells[i] === 1 && v !== 1),
      );
      if (i >= 0) {
        action = { type: 'set', cell: i, value: p.solution[i] };
        message = `Focus on row ${Math.floor(i / p.size) + 1}, column ${String.fromCharCode(65 + (i % p.size))}. Compare its neighbouring cells and the edge clues.`;
      }
    }
    if (p.type === 'aquarium') {
      const i = p.solution.findIndex((v, i) => v !== s.levels[i]);
      if (i >= 0) {
        action = { type: 'level', tank: i, value: p.solution[i] };
        message = `Revisit tank ${String.fromCharCode(65 + i)}. Raising a waterline fills every square of that tank at that height and below.`;
      }
    }
    if (p.type === 'network') {
      const i = p.solution.findIndex(
        (v, i) => rot(p.tiles[i], v) !== rot(p.tiles[i], s.rotations[i]),
      );
      if (i >= 0) {
        action = { type: 'rotate', cell: i };
        message = `Try turning the tile at row ${Math.floor(i / p.size) + 1}, column ${String.fromCharCode(65 + (i % p.size))}. Start at the edges, where lines cannot point outside.`;
      }
    }
    if (p.type === 'trail') {
      const i = p.solution.findIndex((v, i) => s.cells[i] !== v);
      if (i >= 0) {
        action = { type: 'set', cell: i, value: p.solution[i] };
        message = `Look between the nearest fixed numbers around ${p.solution[i]}. The remaining number of steps limits the route.`;
      }
    }
    return { message, action };
  };
  C.extras = {
    adj,
    near,
    rot,
    step,
    bits,
    op,
    pop,
    permutations,
    dossierClue,
    dossierMatch,
    dossierAssignments,
    dossierReady,
    truth,
    witnessText,
    visible,
    litCells,
    matchTrees,
    tankRows,
    aquariumCells,
    lineCounts,
    networkInfo,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(globalThis);
