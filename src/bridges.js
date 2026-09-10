/* Original Hashi rules implementation. No DOM, storage, imported engine or puzzle data. */
(function (root) {
  'use strict';
  const C = root.AlibiCore;
  const previous = {
    solve: C.solve,
    definition: C.validateDefinition,
    state: C.validateState,
    hint: C.hint,
  };
  const integer = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  const coordinate = (p, i) =>
    String.fromCharCode(65 + (p.islands[i].cell % p.size)) +
    (Math.floor(p.islands[i].cell / p.size) + 1);

  function graph(p) {
    const xy = p.islands.map(({ cell }) => ({ x: cell % p.size, y: Math.floor(cell / p.size) }));
    const edges = [];
    for (let a = 0; a < xy.length; a++) {
      for (const horizontal of [true, false]) {
        const targets = xy
          .map((point, b) => ({ ...point, b }))
          .filter((point) =>
            horizontal
              ? point.y === xy[a].y && point.x > xy[a].x
              : point.x === xy[a].x && point.y > xy[a].y,
          );
        targets.sort((u, v) => (horizontal ? u.x - v.x : u.y - v.y));
        if (targets.length) edges.push({ a, b: targets[0].b, horizontal });
      }
    }
    const incident = xy.map((_, i) => edges.flatMap((e, j) => (e.a === i || e.b === i ? [j] : [])));
    const crosses = edges.map(() => []);
    for (let i = 0; i < edges.length; i++)
      for (let j = i + 1; j < edges.length; j++) {
        const e = edges[i],
          f = edges[j];
        if (e.horizontal === f.horizontal) continue;
        const h = e.horizontal ? e : f,
          v = e.horizontal ? f : e;
        if (
          xy[v.a].x > xy[h.a].x &&
          xy[v.a].x < xy[h.b].x &&
          xy[h.a].y > xy[v.a].y &&
          xy[h.a].y < xy[v.b].y
        ) {
          crosses[i].push(j);
          crosses[j].push(i);
        }
      }
    return { xy, edges, incident, crosses };
  }
  function connected(g, cells, potential = false) {
    const seen = new Set([0]),
      queue = [0];
    while (queue.length) {
      const i = queue.pop();
      for (const edge of g.incident[i]) {
        if (!(
          cells[edge] > 0 ||
          (potential && cells[edge] === -1 && !g.crosses[edge].some((j) => cells[j] > 0))
        ))
          continue;
        const e = g.edges[edge],
          other = e.a === i ? e.b : e.a;
        if (!seen.has(other)) {
          seen.add(other);
          queue.push(other);
        }
      }
    }
    return seen.size === g.xy.length;
  }
  function counts(g, cells) {
    return g.incident.map((ids) => ids.reduce((sum, i) => sum + Math.max(0, cells[i]), 0));
  }
  function validate(p, s) {
    const g = graph(p),
      totals = counts(g, s.cells),
      errors = [];
    p.islands.forEach((island, i) => {
      if (totals[i] > island.count)
        errors.push({
          message: `Island ${coordinate(p, i)} has ${totals[i]} bridges but needs ${island.count}.`,
          cells: [island.cell],
        });
    });
    for (let i = 0; i < g.edges.length; i++)
      if (s.cells[i] > 0 && g.crosses[i].some((j) => s.cells[j] > 0)) {
        errors.push({
          message: 'Bridges cannot cross over one another.',
          cells: [p.islands[g.edges[i].a].cell, p.islands[g.edges[i].b].cell],
        });
        break;
      }
    if (totals.every((v, i) => v === p.islands[i].count) && !connected(g, s.cells))
      errors.push({
        message: 'The counts fit, but the islands must all belong to one connected network.',
        cells: [],
      });
    return errors;
  }
  const engine = {
    initial: (p) => ({ cells: graph(p).edges.map(() => 0), notes: {} }),
    reduce(p, s, action) {
      const g = graph(p);
      let index = action.cell,
        value = action.value;
      if (action.type === 'connect') {
        index = g.edges.findIndex(
          (e) =>
            (p.islands[e.a].cell === action.from && p.islands[e.b].cell === action.to) ||
            (p.islands[e.b].cell === action.from && p.islands[e.a].cell === action.to),
        );
        value = action.reverse ? 0 : (s.cells[index] + 1) % 3;
      } else if (action.type !== 'set') return s;
      if (
        !integer(index, 0, g.edges.length - 1) ||
        !integer(value, 0, 2) ||
        s.cells[index] === value
      )
        return s;
      const next = C.clone(s);
      next.cells[index] = value;
      return next;
    },
    validate,
    complete(p, s) {
      const g = graph(p);
      return (
        counts(g, s.cells).every((v, i) => v === p.islands[i].count) && validate(p, s).length === 0
      );
    },
  };
  function state(p, s) {
    if (
      !s ||
      Array.isArray(s) ||
      !Array.isArray(s.cells) ||
      s.cells.length !== graph(p).edges.length ||
      !s.cells.every((v) => integer(v, 0, 2)) ||
      !s.notes ||
      Array.isArray(s.notes) ||
      typeof s.notes !== 'object' ||
      Object.keys(s.notes).length
    )
      throw new Error('Invalid or incompatible saved bridges. Nothing was replaced.');
    return C.clone(s);
  }
  function definition(input) {
    const p = C.clone(input);
    if (
      !p ||
      !text(p.id, 64) ||
      !/^[a-z][a-z0-9-]{1,63}$/.test(p.id) ||
      ['constructor', 'prototype'].includes(p.id) ||
      !integer(p.revision, 1, 999999) ||
      !text(p.title, 90) ||
      !text(p.subtitle, 120) ||
      !C.DIFFICULTIES.includes(p.difficulty) ||
      !integer(p.size, 5, 9) ||
      (p.story !== undefined && !text(p.story, 1600)) ||
      (p.minutes !== undefined && !integer(p.minutes, 1, 90))
    )
      throw new Error('Invalid bridges header.');
    if (p.difficultyStatus !== undefined && !text(p.difficultyStatus, 40))
      throw new Error('Invalid bridges difficulty status.');
    if (
      !Array.isArray(p.islands) ||
      p.islands.length < 4 ||
      p.islands.length > 18 ||
      !p.islands.every((i) => i && integer(i.cell, 0, p.size ** 2 - 1) && integer(i.count, 1, 8)) ||
      new Set(p.islands.map((i) => i.cell)).size !== p.islands.length
    )
      throw new Error('Invalid islands.');
    const g = graph(p);
    if (
      p.islands.some((i, j) => i.count > g.incident[j].length * 2) ||
      !Array.isArray(p.solution) ||
      p.solution.length !== g.edges.length ||
      !p.solution.every((v) => integer(v, 0, 2)) ||
      !engine.complete(p, { cells: p.solution })
    )
      throw new Error('The published bridges must form one valid network.');
    return p;
  }
  function solve(p, s = null, limit = 2, maxNodes = 100000) {
    const g = graph(p),
      solutions = [],
      values = g.edges.map(() => -1);
    let nodes = 0;
    if (s) {
      state(p, s);
      s.cells.forEach((v, i) => {
        if (v > 0) values[i] = v;
      });
    }
    function search() {
      if (++nodes > Math.min(250000, maxNodes)) throw new Error('Bridges search budget exceeded.');
      const totals = counts(g, values);
      if (
        totals.some((v, i) => v > p.islands[i].count) ||
        values.some((v, i) => v > 0 && g.crosses[i].some((j) => values[j] > 0)) ||
        !connected(g, values, true)
      )
        return;
      let chosen = -1,
        domain = [];
      for (let i = 0; i < values.length; i++)
        if (values[i] === -1) {
          const e = g.edges[i];
          let hi = g.crosses[i].some((j) => values[j] > 0)
            ? 0
            : Math.min(2, p.islands[e.a].count - totals[e.a], p.islands[e.b].count - totals[e.b]);
          let lo = 0;
          for (const endpoint of [e.a, e.b]) {
            const otherCapacity = g.incident[endpoint]
              .filter((j) => j !== i && values[j] === -1)
              .reduce((sum, j) => sum + (g.crosses[j].some((k) => values[k] > 0) ? 0 : 2), 0);
            lo = Math.max(lo, p.islands[endpoint].count - totals[endpoint] - otherCapacity);
          }
          if (lo > hi) return;
          if (chosen === -1 || hi - lo + 1 < domain.length) {
            chosen = i;
            domain = C.range(hi - lo + 1).map((v) => lo + v);
          }
        }
      if (chosen === -1) {
        if (totals.every((v, i) => v === p.islands[i].count)) solutions.push([...values]);
        return;
      }
      for (const value of domain) {
        values[chosen] = value;
        search();
        if (solutions.length >= limit) break;
      }
      values[chosen] = -1;
    }
    search();
    return { solutions, nodes };
  }
  function deduction(p, s) {
    const errors = validate(p, s);
    if (errors.length) return { rule: 'Revisit this connection', message: errors[0].message };
    const g = graph(p),
      totals = counts(g, s.cells);
    for (let i = 0; i < p.islands.length; i++) {
      const remaining = p.islands[i].count - totals[i];
      if (!remaining) continue;
      const ids = g.incident[i];
      const capacity = ids.map((j) => {
        const e = g.edges[j],
          other = e.a === i ? e.b : e.a;
        return g.crosses[j].some((k) => s.cells[k] > 0)
          ? 0
          : Math.max(0, Math.min(2 - s.cells[j], p.islands[other].count - totals[other]));
      });
      for (let k = 0; k < ids.length; k++) {
        const minimum = remaining - capacity.reduce((sum, v, j) => sum + (j === k ? 0 : v), 0);
        if (minimum > 0 && minimum <= capacity[k]) {
          const e = g.edges[ids[k]],
            other = e.a === i ? e.b : e.a;
          return {
            rule: 'Count the available routes',
            message: `Island ${coordinate(p, i)} still needs ${remaining} bridge${remaining === 1 ? '' : 's'}. Its other routes cannot supply them all, so at least ${minimum} more must connect to ${coordinate(p, other)}.`,
          };
        }
      }
    }
    return null;
  }
  C.TYPES.push('bridges');
  C.registry.bridges = engine;
  C.validateDefinition = (p) => (p?.type === 'bridges' ? definition(p) : previous.definition(p));
  C.validateState = (p, s) => (p.type === 'bridges' ? state(p, s) : previous.state(p, s));
  C.solve = (p, s, limit, maxNodes) =>
    p.type === 'bridges' ? solve(p, s, limit, maxNodes) : previous.solve(p, s, limit, maxNodes);
  C.hint = (p, s) => {
    if (p.type !== 'bridges') return previous.hint(p, s);
    const cell = p.solution.findIndex((v, i) => v !== s.cells[i]);
    return {
      message: 'Reveal the final bridge count for one pair of islands.',
      action: cell < 0 ? null : { type: 'set', cell, value: p.solution[cell] },
    };
  };
  C.bridges = { graph, counts, connected, coordinate, deduction };
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(globalThis);
