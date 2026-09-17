'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const files = [
  'src/updates.js',
  'src/core.js',
  'src/engines.js',
  'src/bridges.js',
  'src/storage.js',
  'src/presentation.js',
  'src/asset-library.js',
  'src/asset-delivery.js',
  'src/theatre.js',
  'src/validator-loader.js',
  'src/curation.js',
  'src/network-hints.js',
  'src/insights.js',
  'src/assist.js',
  'src/atlas.js',
  'src/atmosphere.js',
  'src/backup-validation.js',
  'src/club.js',
  'src/house-loader.js',
  'src/castle-practice.js',
  'src/activities.js',
  'src/app.js',
  'src/observatory-loader.js',
];

for (const relative of files) {
  const source = fs.readFileSync(path.join(ROOT, relative), 'utf8');
  const names = new Set([
    ...[...source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)].map(
      (match) => match[1],
    ),
    ...[...source.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(
      (match) => match[1],
    ),
  ]);
  for (const name of [...names].sort()) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const count = (source.match(new RegExp(`\\b${escaped}\\b`, 'g')) || []).length;
    if (count === 1) console.log(`${relative}: ${name}`);
  }
}

throw new Error('Diagnostic report complete; no source was modified.');
