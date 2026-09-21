'use strict';

const { range, adjacent } = require('./family-studies-shared.cjs');

const NETWORK_BITS = [1, 2, 4, 8];
const NETWORK_OPPOSITE = [4, 8, 1, 2];
function rotateMask(mask, rotation) {
  let value = mask;
  for (let turn = 0; turn < rotation; turn++) value = ((value << 1) & 15) | (value >> 3);
  return value;
}
function networkStep(cell, direction, size) {
  const next = cell + [-size, 1, size, -1][direction];
  return next >= 0 &&
    next < size * size &&
    (direction % 2 === 0 || Math.floor(cell / size) === Math.floor(next / size))
    ? next
    : -1;
}

function countNetwork(puzzle, limit = 2) {
  const domains = puzzle.tiles.map((tile, cell) => {
    const byMask = new Map();
    for (let rotation = 0; rotation < 4; rotation++) {
      const mask = rotateMask(tile, rotation);
      if (!byMask.has(mask)) byMask.set(mask, rotation);
    }
    const values = [...byMask.values()];
    return (puzzle.locked || []).includes(cell) ? values.filter((value) => value === 0) : values;
  });
  let count = 0;
  let first = null;
  let nodes = 0;

  function propagate(source) {
    const next = source.map((domain) => domain.slice());
    let changed = true;
    while (changed) {
      changed = false;
      for (let cell = 0; cell < next.length; cell++) {
        const filtered = next[cell].filter((rotation) => {
          const mask = rotateMask(puzzle.tiles[cell], rotation);
          for (let direction = 0; direction < 4; direction++) {
            const neighbour = networkStep(cell, direction, puzzle.size);
            const has = Boolean(mask & NETWORK_BITS[direction]);
            if (neighbour < 0) {
              if (has) return false;
              continue;
            }
            if (
              !next[neighbour].some((otherRotation) => {
                const otherMask = rotateMask(puzzle.tiles[neighbour], otherRotation);
                return has === Boolean(otherMask & NETWORK_OPPOSITE[direction]);
              })
            )
              return false;
          }
          return true;
        });
        if (!filtered.length) return null;
        if (filtered.length !== next[cell].length) {
          next[cell] = filtered;
          changed = true;
        }
      }
    }
    return next;
  }

  function connected(rotations) {
    const seen = new Set([puzzle.source]);
    const stack = [puzzle.source];
    while (stack.length) {
      const cell = stack.pop();
      const mask = rotateMask(puzzle.tiles[cell], rotations[cell]);
      for (let direction = 0; direction < 4; direction++) {
        if (!(mask & NETWORK_BITS[direction])) continue;
        const next = networkStep(cell, direction, puzzle.size);
        if (next >= 0 && !seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    return seen.size === puzzle.size ** 2;
  }

  function search(source) {
    if (count >= limit) return;
    nodes++;
    const current = propagate(source);
    if (!current) return;
    let chosen = -1;
    for (let cell = 0; cell < current.length; cell++) {
      if (current[cell].length <= 1) continue;
      if (chosen < 0 || current[cell].length < current[chosen].length) chosen = cell;
    }
    if (chosen < 0) {
      const rotations = current.map((domain) => domain[0]);
      if (!connected(rotations)) return;
      count++;
      first ||= rotations;
      return;
    }
    for (const rotation of current[chosen]) {
      const branch = current.map((domain) => domain.slice());
      branch[chosen] = [rotation];
      search(branch);
      if (count >= limit) return;
    }
  }

  search(domains);
  return { count, first, nodes };
}

module.exports = { countNetwork };
