#!/usr/bin/env node
'use strict';
const fs = require('node:fs'),
  path = require('node:path');
require('../src/core.js');
const C = require('../src/engines.js');
const filename = process.argv[2];
if (!filename) {
  console.error('Usage: node tools/validate-pack.cjs path/to/pack.json');
  process.exit(2);
}
try {
  const size = fs.statSync(filename).size;
  if (size > 3 * 1024 * 1024) throw Error('Pack exceeds 3 MB.');
  const pack = C.validatePack(JSON.parse(fs.readFileSync(filename, 'utf8')), true);
  console.log(
    JSON.stringify(
      {
        valid: true,
        id: pack.id,
        puzzles: pack.puzzles.length,
        types: [...new Set(pack.puzzles.map((p) => p.type))],
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.error('Invalid pack:', e.message);
  process.exitCode = 1;
}
