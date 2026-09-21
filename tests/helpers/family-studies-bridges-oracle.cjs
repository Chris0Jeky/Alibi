'use strict';

function bridgesGraph(puzzle) {
  const points = puzzle.islands.map(({ cell }) => ({
    x: cell % puzzle.size,
    y: Math.floor(cell / puzzle.size),
  }));
  const edges = [];
  for (let a = 0; a < points.length; a++) {
    for (const horizontal of [true, false]) {
      const targets = points
        .map((point, b) => ({ ...point, b }))
        .filter((point) =>
          horizontal
            ? point.y === points[a].y && point.x > points[a].x
            : point.x === points[a].x && point.y > points[a].y,
        )
        .sort((left, right) => (horizontal ? left.x - right.x : left.y - right.y));
      if (targets.length) edges.push({ a, b: targets[0].b, horizontal });
    }
  }
  const incident = points.map((_, island) =>
    edges.flatMap((edge, index) => (edge.a === island || edge.b === island ? [index] : [])),
  );
  const crosses = edges.map(() => []);
  for (let a = 0; a < edges.length; a++) {
    for (let b = a + 1; b < edges.length; b++) {
      if (edges[a].horizontal === edges[b].horizontal) continue;
      const horizontal = edges[a].horizontal ? edges[a] : edges[b];
      const vertical = edges[a].horizontal ? edges[b] : edges[a];
      if (
        points[vertical.a].x > points[horizontal.a].x &&
        points[vertical.a].x < points[horizontal.b].x &&
        points[horizontal.a].y > points[vertical.a].y &&
        points[horizontal.a].y < points[vertical.b].y
      ) {
        crosses[a].push(b);
        crosses[b].push(a);
      }
    }
  }
  return { points, edges, incident, crosses };
}

function countBridges(puzzle, limit = 2) {
  const graph = bridgesGraph(puzzle);
  const values = Array(graph.edges.length).fill(-1);
  let count = 0;
  let first = null;
  let nodes = 0;

  function connected(potential) {
    const seen = new Set([0]);
    const stack = [0];
    while (stack.length) {
      const island = stack.pop();
      for (const edgeIndex of graph.incident[island]) {
        const value = values[edgeIndex];
        if (!(value > 0 || (potential && value < 0))) continue;
        const edge = graph.edges[edgeIndex];
        const other = edge.a === island ? edge.b : edge.a;
        if (!seen.has(other)) {
          seen.add(other);
          stack.push(other);
        }
      }
    }
    return seen.size === puzzle.islands.length;
  }

  function search(edgeIndex) {
    if (count >= limit) return;
    nodes++;
    const totals = graph.incident.map((indices) =>
      indices.reduce((sum, index) => sum + Math.max(0, values[index]), 0),
    );
    if (totals.some((total, island) => total > puzzle.islands[island].count)) return;
    if (
      values.some(
        (value, index) => value > 0 && graph.crosses[index].some((cross) => values[cross] > 0),
      )
    )
      return;
    if (!connected(true)) return;
    if (edgeIndex === values.length) {
      if (
        totals.every((total, island) => total === puzzle.islands[island].count) &&
        connected(false)
      ) {
        count++;
        first ||= values.slice();
      }
      return;
    }
    for (const value of [0, 1, 2]) {
      values[edgeIndex] = value;
      search(edgeIndex + 1);
      if (count >= limit) break;
    }
    values[edgeIndex] = -1;
  }

  search(0);
  return { count, first, nodes, graph };
}

module.exports = { countBridges, bridgesGraph };
