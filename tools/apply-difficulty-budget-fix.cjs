'use strict';

const fs = require('node:fs');
const path = require('node:path');

const filename = path.resolve(__dirname, '../src/core.js');
const source = fs.readFileSync(filename, 'utf8');
const tokenMatches = source.match(/\bcolOf\b/g) || [];
if (tokenMatches.length !== 1)
  throw new Error(`Expected colOf to be definition-only; found ${tokenMatches.length} occurrences.`);
const declaration = '  const colOf = (cell, n) => cell % n;\n';
const matches = source.split(declaration).length - 1;
if (matches !== 1) throw new Error(`Expected one dead colOf declaration; found ${matches}.`);
fs.writeFileSync(filename, source.replace(declaration, ''));
