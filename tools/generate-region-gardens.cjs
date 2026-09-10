'use strict';
const fs = require('node:fs');
const path = require('node:path');
let seed = 190926;
const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
function solutions(n, regions, limit = 2) {
  const out = [],
    columns = [],
    used = new Set();
  function visit(row) {
    if (out.length >= limit) return;
    if (row === n) {
      out.push(columns.map((col, r) => r * n + col));
      return;
    }
    for (let col = 0; col < n; col++) {
      const region = regions[row * n + col];
      if (
        columns.includes(col) ||
        used.has(region) ||
        (row && Math.abs(col - columns[row - 1]) < 2)
      )
        continue;
      columns.push(col);
      used.add(region);
      visit(row + 1);
      used.delete(region);
      columns.pop();
    }
  }
  visit(0);
  return out;
}
function generate(n) {
  for (let attempt = 0; attempt < 10000; attempt++) {
    const cols = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [cols[i], cols[j]] = [cols[j], cols[i]];
    }
    if (cols.some((c, r) => r && Math.abs(c - cols[r - 1]) < 2)) continue;
    const regions = Array(n * n).fill(-1);
    cols.forEach((c, r) => (regions[r * n + c] = r));
    while (regions.includes(-1)) {
      const frontier = [];
      regions.forEach((v, i) => {
        if (v < 0) return;
        for (const j of [i - n, i + n, i - 1, i + 1]) {
          if (
            j >= 0 &&
            j < n * n &&
            regions[j] < 0 &&
            Math.abs(Math.floor(i / n) - Math.floor(j / n)) + Math.abs((i % n) - (j % n)) === 1
          )
            frontier.push([j, v]);
        }
      });
      const [cell, region] = frontier[Math.floor(random() * frontier.length)];
      regions[cell] = region;
    }
    const found = solutions(n, regions);
    if (found.length === 1 && new Set(regions).size === n)
      return { size: n, regions, solution: found[0] };
  }
  throw Error('Bounded garden generation exhausted for ' + n);
}
if (require.main === module) {
  const names = [
    'Window boxes',
    'The orchard gate',
    'The glass walk',
    'After the rain',
    'The walled garden',
    'Lantern night',
  ];
  const puzzles = [6, 6, 6, 7, 7, 7].map((n, i) => ({
    id: 'garden-' + (i + 1),
    revision: 1,
    title: names[i],
    ...generate(n),
  }));
  const file = path.join(__dirname, '../content/region-gardens.json');
  if (fs.existsSync(file)) throw Error('Existing published gardens must not be regenerated');
  fs.writeFileSync(file, JSON.stringify({ puzzles }, null, 2) + '\n');
  console.log(puzzles.map((p) => ({ id: p.id, size: p.size })));
}
module.exports = { solutions };
