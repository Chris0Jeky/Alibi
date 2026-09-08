'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
require(path.join(ROOT, 'src', 'core.js'));
require(path.join(ROOT, 'src', 'engines.js'));
const C = require(path.join(ROOT, 'src', 'bridges.js'));
require(path.join(ROOT, 'src', 'insights.js'));
const E = C.registry.bridges;

const unique = {
  type: 'bridges',
  id: 'test-bridges-unique',
  revision: 1,
  title: 'Unique bridges',
  subtitle: 'A small test network',
  difficulty: 'Gentle',
  size: 5,
  islands: [
    { cell: 0, count: 1 },
    { cell: 2, count: 2 },
    { cell: 12, count: 2 },
    { cell: 14, count: 2 },
    { cell: 24, count: 1 },
  ],
  solution: [1, 1, 1, 1],
};

const longPath = {
  type: 'bridges',
  id: 'test-bridges-long-path',
  revision: 1,
  title: 'Long path',
  subtitle: 'A longer small test network',
  difficulty: 'Steady',
  size: 7,
  islands: [
    { cell: 0, count: 1 },
    { cell: 2, count: 2 },
    { cell: 16, count: 2 },
    { cell: 18, count: 2 },
    { cell: 32, count: 2 },
    { cell: 34, count: 2 },
    { cell: 48, count: 2 },
    { cell: 43, count: 1 },
  ],
  solution: [1, 1, 1, 1, 1, 1, 1],
};

const twoOrMore = {
  type: 'bridges',
  id: 'test-bridges-two-solutions',
  revision: 1,
  title: 'Two-solution bridges',
  subtitle: 'A small ambiguous network',
  difficulty: 'Tricky',
  size: 5,
  islands: [
    { cell: 14, count: 3 },
    { cell: 3, count: 1 },
    { cell: 9, count: 1 },
    { cell: 18, count: 2 },
    { cell: 13, count: 5 },
    { cell: 10, count: 1 },
    { cell: 19, count: 2 },
    { cell: 24, count: 1 },
  ],
  solution: [0, 1, 1, 1, 2, 1, 1, 1],
};

const zero = C.clone(unique);
zero.id = 'test-bridges-zero';
zero.islands[0].count = 2;

// These four islands form two visible horizontal pairs with no shared row or column.
const disconnected = {
  type: 'bridges',
  id: 'test-bridges-disconnected',
  revision: 1,
  title: 'Disconnected bridges',
  subtitle: 'Two separate pairs',
  difficulty: 'Gentle',
  size: 5,
  islands: [
    { cell: 0, count: 1 },
    { cell: 1, count: 1 },
    { cell: 13, count: 1 },
    { cell: 14, count: 1 },
  ],
  solution: [1, 1],
};

// These two visible edges cross in the middle of the board.
const crossing = {
  type: 'bridges',
  id: 'test-bridges-crossing',
  revision: 1,
  title: 'Crossing bridges',
  subtitle: 'Crossing validation fixture',
  difficulty: 'Gentle',
  size: 5,
  islands: [
    { cell: 10, count: 2 },
    { cell: 14, count: 2 },
    { cell: 2, count: 2 },
    { cell: 22, count: 2 },
  ],
  solution: [1, 1],
};

function edgeKey(p, edge) {
  return [p.islands[edge.a].cell, p.islands[edge.b].cell].sort((a, b) => a - b).join('-');
}

function edgeIndexByCells(p, graph, from, to) {
  return graph.edges.findIndex((edge) => {
    const a = p.islands[edge.a].cell;
    const b = p.islands[edge.b].cell;
    return (a === from && b === to) || (a === to && b === from);
  });
}

// Independent Hashi visibility and crossing oracle. It intentionally does not call
// C.bridges.graph, C.bridges.connected, or any other implementation helper.
function oracleGraph(p) {
  const points = p.islands.map(({ cell }) => ({ x: cell % p.size, y: Math.floor(cell / p.size) }));
  const edges = [];
  const between = (a, b, c) => {
    if (a.y === b.y && b.y === c.y) return c.x > Math.min(a.x, b.x) && c.x < Math.max(a.x, b.x);
    if (a.x === b.x && b.x === c.x) return c.y > Math.min(a.y, b.y) && c.y < Math.max(a.y, b.y);
    return false;
  };
  for (let a = 0; a < points.length; a++) {
    for (let b = a + 1; b < points.length; b++) {
      const sameRow = points[a].y === points[b].y;
      const sameColumn = points[a].x === points[b].x;
      if (
        (sameRow || sameColumn) &&
        !points.some((point, i) => i !== a && i !== b && between(points[a], points[b], point))
      ) {
        edges.push({ a, b, horizontal: sameRow });
      }
    }
  }
  const crosses = edges.map(() => []);
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      if (edges[i].horizontal === edges[j].horizontal) continue;
      const horizontal = edges[i].horizontal ? edges[i] : edges[j];
      const vertical = edges[i].horizontal ? edges[j] : edges[i];
      const hx1 = Math.min(points[horizontal.a].x, points[horizontal.b].x);
      const hx2 = Math.max(points[horizontal.a].x, points[horizontal.b].x);
      const vy1 = Math.min(points[vertical.a].y, points[vertical.b].y);
      const vy2 = Math.max(points[vertical.a].y, points[vertical.b].y);
      const vx = points[vertical.a].x;
      const hy = points[horizontal.a].y;
      if (vx > hx1 && vx < hx2 && hy > vy1 && hy < vy2) {
        crosses[i].push(j);
        crosses[j].push(i);
      }
    }
  }
  return { points, edges, crosses };
}

function oracleConnected(p, graph, values) {
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const island = queue.pop();
    for (let i = 0; i < graph.edges.length; i++) {
      if (values[i] <= 0) continue;
      const edge = graph.edges[i];
      if (edge.a !== island && edge.b !== island) continue;
      const other = edge.a === island ? edge.b : edge.a;
      if (!seen.has(other)) {
        seen.add(other);
        queue.push(other);
      }
    }
  }
  return seen.size === p.islands.length;
}

function oracleSolutions(p, partial = null) {
  const graph = oracleGraph(p);
  const values = Array(graph.edges.length).fill(0);
  const solutions = [];
  // Gameplay state arrays follow the engine's edge order. Translate those fixed
  // positive values by endpoint key before the independent oracle enumerates its
  // own (deliberately separate) edge order.
  const engineGraph = partial ? C.bridges.graph(p) : null;
  const fixed = partial
    ? graph.edges.map((edge) => {
        const index = engineGraph.edges.findIndex(
          (candidate) => edgeKey(p, candidate) === edgeKey(p, edge),
        );
        return index < 0 ? 0 : partial.cells[index];
      })
    : [];

  function search(index) {
    if (index === graph.edges.length) {
      const totals = p.islands.map(() => 0);
      for (let i = 0; i < graph.edges.length; i++) {
        totals[graph.edges[i].a] += values[i];
        totals[graph.edges[i].b] += values[i];
      }
      if (!totals.every((total, i) => total === p.islands[i].count)) return;
      if (!oracleConnected(p, graph, values)) return;
      solutions.push([...values]);
      return;
    }

    const choices = fixed[index] > 0 ? [fixed[index]] : [0, 1, 2];
    for (const value of choices) {
      values[index] = value;
      const edge = graph.edges[index];
      const totals = p.islands.map(() => 0);
      for (let i = 0; i <= index; i++) {
        totals[graph.edges[i].a] += values[i];
        totals[graph.edges[i].b] += values[i];
      }
      const crossed = value > 0 && graph.crosses[index].some((other) => values[other] > 0);
      if (!crossed && totals.every((total, i) => total <= p.islands[i].count)) search(index + 1);
    }
    values[index] = 0;
  }

  search(0);
  return solutions;
}

function assignmentKey(p, values, graph) {
  return graph.edges
    .map((edge, i) => `${edgeKey(p, edge)}:${values[i]}`)
    .sort()
    .join('|');
}

function compareSolver(p, expectedCount, limit) {
  const oracle = oracleSolutions(p);
  assert.equal(oracle.length, expectedCount, `${p.id}: independent oracle count`);
  const actual = C.solve(p, null, limit);
  assert.equal(
    actual.solutions.length,
    Math.min(expectedCount, limit),
    `${p.id}: bounded solver count`,
  );
  const allowed = new Set(oracle.map((solution) => assignmentKey(p, solution, oracleGraph(p))));
  const graph = C.bridges.graph(p);
  for (const solution of actual.solutions)
    assert.ok(
      allowed.has(assignmentKey(p, solution, graph)),
      `${p.id}: engine solution is not oracle-valid`,
    );
}

function cellFromCoordinate(p, coordinate) {
  return coordinate.charCodeAt(0) - 65 + (Number(coordinate.slice(1)) - 1) * p.size;
}

const passed = [];
const failures = [];
function test(name, fn) {
  try {
    fn();
    passed.push(name);
    console.log('PASS', name);
  } catch (error) {
    failures.push({ name, message: error.message, stack: error.stack });
    console.error('FAIL', name, '-', error.message);
  }
}

test('small fixtures validate and cover four to eight islands', () => {
  for (const puzzle of [unique, longPath, twoOrMore]) {
    assert.ok(
      puzzle.islands.length >= 4 && puzzle.islands.length <= 8,
      `${puzzle.id}: island range`,
    );
    assert.doesNotThrow(() => C.validateDefinition(puzzle), `${puzzle.id}: definition`);
  }
});

test('unique, zero, and bounded-two solver results agree with independent oracle', () => {
  compareSolver(unique, 1, 2);
  compareSolver(longPath, 1, 2);
  compareSolver(zero, 0, 2);
  compareSolver(twoOrMore, 2, 2);
});

test('partial positive bridge assignments are honored by the solver', () => {
  const partial = E.initial(unique);
  partial.cells[0] = 1;
  const expected = oracleSolutions(unique, partial);
  const actual = C.solve(unique, partial, 10);
  assert.equal(expected.length, 1);
  assert.equal(actual.solutions.length, 1);
  assert.equal(actual.solutions[0][0], 1);
  assert.equal(
    assignmentKey(unique, actual.solutions[0], C.bridges.graph(unique)),
    assignmentKey(unique, expected[0], oracleGraph(unique)),
  );

  const impossible = E.initial(unique);
  impossible.cells[0] = 2;
  assert.equal(oracleSolutions(unique, impossible).length, 0);
  assert.equal(C.solve(unique, impossible, 2).solutions.length, 0);
});

test('crossing bridges are rejected', () => {
  const graph = C.bridges.graph(crossing);
  const cells = Array(graph.edges.length).fill(0);
  const horizontal = edgeIndexByCells(crossing, graph, 10, 14);
  const vertical = edgeIndexByCells(crossing, graph, 2, 22);
  assert.notEqual(horizontal, -1);
  assert.notEqual(vertical, -1);
  cells[horizontal] = 1;
  cells[vertical] = 1;
  const errors = E.validate(crossing, { cells, notes: {} });
  assert.ok(
    errors.some((error) => /cross/i.test(error.message)),
    'crossing error is reported',
  );
});

test('complete but disconnected degrees are not solved', () => {
  const graph = C.bridges.graph(disconnected);
  assert.equal(graph.edges.length, 2);
  const state = { cells: [1, 1], notes: {} };
  assert.ok(
    E.validate(disconnected, state).some((error) => /connected network/i.test(error.message)),
  );
  assert.equal(E.complete(disconnected, state), false);
});

test('reducer is immutable and cycles connection values one, two, zero', () => {
  const initial = E.initial(unique);
  const snapshot = C.clone(initial);
  const first = E.reduce(unique, initial, { type: 'connect', from: 0, to: 2 });
  const second = E.reduce(unique, first, { type: 'connect', from: 0, to: 2 });
  const third = E.reduce(unique, second, { type: 'connect', from: 0, to: 2 });
  assert.deepEqual(initial, snapshot);
  assert.notStrictEqual(first, initial);
  assert.notStrictEqual(second, first);
  assert.notStrictEqual(third, second);
  assert.deepEqual(first.cells, [1, 0, 0, 0]);
  assert.deepEqual(second.cells, [2, 0, 0, 0]);
  assert.deepEqual(third.cells, [0, 0, 0, 0]);
  assert.deepEqual(initial.cells, [0, 0, 0, 0]);
  assert.deepEqual(
    E.reduce(unique, second, { type: 'connect', from: 2, to: 0, reverse: true }).cells,
    [0, 0, 0, 0],
  );
  assert.strictEqual(
    E.reduce(unique, initial, { type: 'connect', from: 0, to: 24 }),
    initial,
    'nonadjacent connect refused',
  );
});

test('dangerous reducer indices and values are refused', () => {
  const initial = E.initial(unique);
  const invalidActions = [
    { type: 'set', cell: -1, value: 1 },
    { type: 'set', cell: initial.cells.length, value: 1 },
    { type: 'set', cell: '__proto__', value: 1 },
    { type: 'set', cell: 0.5, value: 1 },
    { type: 'set', cell: 0, value: -1 },
    { type: 'set', cell: 0, value: 3 },
    { type: 'set', cell: 0, value: Number.NaN },
    { type: 'connect', from: '__proto__', to: 2 },
  ];
  for (const action of invalidActions)
    assert.strictEqual(E.reduce(unique, initial, action), initial, JSON.stringify(action));
});

test('invalid headers and states reject without broad coercion', () => {
  const badHeaders = [
    ['null input', () => null],
    ['missing id', (p) => delete p.id],
    [
      'unsafe id',
      (p) => {
        p.id = '__proto__';
      },
    ],
    [
      'reserved id',
      (p) => {
        p.id = 'constructor';
      },
    ],
    [
      'revision zero',
      (p) => {
        p.revision = 0;
      },
    ],
    [
      'empty title',
      (p) => {
        p.title = '';
      },
    ],
    [
      'long subtitle',
      (p) => {
        p.subtitle = 'x'.repeat(121);
      },
    ],
    [
      'unknown difficulty',
      (p) => {
        p.difficulty = 'Impossible';
      },
    ],
    [
      'size four',
      (p) => {
        p.size = 4;
      },
    ],
    [
      'duplicate island',
      (p) => {
        p.islands[1].cell = p.islands[0].cell;
      },
    ],
    [
      'island out of range',
      (p) => {
        p.islands[0].cell = 25;
      },
    ],
    [
      'island count zero',
      (p) => {
        p.islands[0].count = 0;
      },
    ],
    [
      'solution wrong length',
      (p) => {
        p.solution = [1, 1, 1];
      },
    ],
    [
      'solution dangerous value',
      (p) => {
        p.solution[0] = 3;
      },
    ],
    [
      'solution not connected',
      (p) => {
        p.solution = [0, 0, 0, 0];
      },
    ],
  ];
  for (const [name, mutate] of badHeaders) {
    const candidate = mutate.length === 0 ? mutate() : C.clone(unique);
    if (candidate) mutate(candidate);
    assert.throws(() => C.validateDefinition(candidate), name);
  }

  const valid = E.initial(unique);
  const invalidStates = [
    null,
    [],
    {},
    { cells: [0, 0, 0], notes: {} },
    { cells: [0, 0, 0, 3], notes: {} },
    { cells: [0, 0, 0, Number.NaN], notes: {} },
    { cells: [0, 0, 0, 0], notes: [] },
    { cells: [0, 0, 0, 0], notes: { marked: true } },
  ];
  for (const state of invalidStates)
    assert.throws(() => C.validateState(unique, state), 'invalid state');
  const copy = C.validateState(unique, valid);
  assert.deepEqual(copy, valid);
  assert.notStrictEqual(copy, valid);
});

test('solution-free insight deductions avoid the solution and opt-in reveals match it', () => {
  const guarded = new Proxy(unique, {
    get(target, property, receiver) {
      if (property === 'solution') throw new Error('solution property was read');
      return Reflect.get(target, property, receiver);
    },
  });
  assert.doesNotThrow(() => C.insights.deduction(guarded, E.initial(unique)));

  const state = E.initial(unique);
  const reveal = C.hint(unique, state);
  assert.match(reveal.message, /reveal/i);
  assert.deepEqual(reveal.action, { type: 'set', cell: 0, value: unique.solution[0] });
});

test('lower-bound deductions are sound across all valid partial boards', () => {
  let checked = 0;
  for (const puzzle of [unique, longPath, twoOrMore]) {
    const graph = oracleGraph(puzzle);
    const engineGraph = C.bridges.graph(puzzle);
    const stateCount = 3 ** graph.edges.length;
    for (let mask = 0; mask < stateCount; mask++) {
      let rest = mask;
      const partial = E.initial(puzzle);
      for (let i = 0; i < partial.cells.length; i++) {
        partial.cells[i] = rest % 3;
        rest = Math.floor(rest / 3);
      }
      if (E.validate(puzzle, partial).length) continue;
      const solutions = oracleSolutions(puzzle, partial);
      if (!solutions.length) continue;
      const deduction = C.bridges.deduction(puzzle, partial);
      if (!deduction) continue;
      const match = deduction.message.match(
        /^Island ([A-I]\d+) still needs \d+ bridges?\. Its other routes cannot supply them all, so at least (\d+) more must connect to ([A-I]\d+)\.$/,
      );
      assert.ok(match, `${puzzle.id}: deduction message has a checkable lower bound`);
      const sourceCell = cellFromCoordinate(puzzle, match[1]);
      const targetCell = cellFromCoordinate(puzzle, match[3]);
      const sourceIsland = puzzle.islands.findIndex((island) => island.cell === sourceCell);
      const targetIsland = puzzle.islands.findIndex((island) => island.cell === targetCell);
      const edge = graph.edges.findIndex(
        (candidate) =>
          (candidate.a === sourceIsland && candidate.b === targetIsland) ||
          (candidate.a === targetIsland && candidate.b === sourceIsland),
      );
      assert.notEqual(edge, -1, `${puzzle.id}: deduction identifies an existing route`);
      const engineEdge = engineGraph.edges.findIndex(
        (candidate) => edgeKey(puzzle, candidate) === edgeKey(puzzle, graph.edges[edge]),
      );
      assert.notEqual(engineEdge, -1, `${puzzle.id}: deduction route maps to gameplay state`);
      const lowerBound = partial.cells[engineEdge] + Number(match[2]);
      for (const solution of solutions)
        assert.ok(
          solution[edge] >= lowerBound,
          `${puzzle.id}: unsound lower bound; state=${JSON.stringify(partial.cells)} deduction=${JSON.stringify(deduction)} edge=${edge} completion=${JSON.stringify(solution)} lowerBound=${lowerBound}`,
        );
      checked++;
    }
  }
  assert.ok(checked > 0, 'at least one valid partial deduction was checked');
});

const report = {
  root: ROOT,
  passed: failures.length === 0,
  passedTests: passed.length,
  failedTests: failures.length,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
