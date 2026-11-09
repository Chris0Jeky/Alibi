'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('./sunrise.cjs');

function write() {
  const { pack, notes } = build();
  fs.writeFileSync(
    path.join(__dirname, '../../content/extra/sunrise-studies.json'),
    JSON.stringify(pack, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(__dirname, '../../content/curation/editorial/sunrise-studies.json'),
    JSON.stringify(notes, null, 2) + '\n',
  );
  const counts = pack.puzzles.reduce(
    (out, puzzle) => {
      out[puzzle.type + puzzle.size + 'x' + puzzle.size]++;
      return out;
    },
    { binary6x6: 0, binary8x8: 0, futoshiki7x7: 0 },
  );
  process.stdout.write(`${JSON.stringify(counts)}\n`);
}

if (require.main === module) write();
module.exports = { write };
