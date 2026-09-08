'use strict';
const esbuild = require('esbuild'),
  path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
esbuild
  .build({
    entryPoints: [path.join(root, 'assets-source/library/model-preview.source.js')],
    outfile: path.join(root, 'assets-source/library/model-preview.js'),
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    legalComments: 'inline',
    banner: {
      js: '/*! Alibi model preview bundles Three.js r185 (MIT License); see THIRD-PARTY-NOTICES.md. */',
    },
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
