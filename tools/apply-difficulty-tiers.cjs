'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TIERS = ['Gentle', 'Steady', 'Tricky', 'Expert', 'Master', 'Grandmaster'];

function exact(filename, before, after, label) {
  const absolute = path.join(ROOT, filename);
  const source = fs.readFileSync(absolute, 'utf8');
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label} expected one match in ${filename}; found ${count}.`);
  fs.writeFileSync(absolute, source.replace(before, after));
}

exact(
  'src/core.js',
  "  const DIFFICULTIES = ['Gentle', 'Steady', 'Tricky', 'Expert'];",
  `  const DIFFICULTIES = ${JSON.stringify(TIERS)};`,
  'core difficulty registry',
);

const schemaPath = path.join(ROOT, 'schemas/pack.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
schema.$defs.common.properties.difficulty.enum = TIERS;
fs.writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);

exact(
  'src/house/model.js',
  "  const views = ['desk', 'puzzles', 'house', 'notebook', 'comfort'];",
  `  const views = ['desk', 'puzzles', 'house', 'notebook', 'comfort'];\n  const levels = ${JSON.stringify(TIERS)};`,
  'house difficulty registry',
);
exact(
  'src/house/model.js',
  "      level: ['Gentle', 'Steady', 'Tricky', 'Expert'].includes(p.get('level'))\n        ? p.get('level')\n        : '',",
  "      level: levels.includes(p.get('level')) ? p.get('level') : '',",
  'house route validation',
);
exact(
  'src/house/model.js',
  '    views,\n    families,',
  '    views,\n    levels,\n    families,',
  'house model export',
);
exact(
  'src/house/view.js',
  "['Gentle', 'Steady', 'Tricky', 'Expert'].map(",
  'M.levels.map(',
  'house difficulty options',
);
