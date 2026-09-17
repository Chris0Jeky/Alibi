'use strict';

const fs = require('node:fs');
const path = require('node:path');

const filename = path.resolve(__dirname, '../src/core.js');
const source = fs.readFileSync(filename, 'utf8');
const before =
  "  const DIFFICULTIES = ['Gentle', 'Steady', 'Tricky', 'Expert', 'Master', 'Grandmaster'];";
const after =
  "  const DIFFICULTIES = 'Gentle Steady Tricky Expert Master Grandmaster'.split(' ');";
const matches = source.split(before).length - 1;
if (matches !== 1) throw new Error(`Expected one difficulty registry; found ${matches}.`);
fs.writeFileSync(filename, source.replace(before, after));
