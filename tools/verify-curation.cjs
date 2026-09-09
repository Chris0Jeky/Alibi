'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = path.join(
  root,
  'test-results/curation-check',
  new Date().toISOString().replace(/[:.]/g, '-'),
);
fs.mkdirSync(output, { recursive: true });
const registry = require('../content/official-packs.json');
const packs = registry.packs.map((f) => path.join(root, 'content', f));
const runs = [
  [
    process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
    [
      path.join(__dirname, 'curation/independent_check.py'),
      ...packs,
      '--out',
      path.join(output, 'independent.json'),
    ],
  ],
  [process.execPath, [path.join(__dirname, 'curation/runtime_check.cjs'), root, ...packs]],
];
for (const [exe, args] of runs) {
  const result = cp.spawnSync(exe, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PYTHONUTF8: '1', ALIBI_REPORT: path.join(output, 'runtime.json') },
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || String(result.error));
    process.exit(1);
  }
}
console.log('Independent uniqueness and native reducer checks passed: ' + output);
