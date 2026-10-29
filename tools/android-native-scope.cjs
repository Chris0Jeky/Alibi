#!/usr/bin/env node
'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const sha = (value) => /^[a-f0-9]{40}$/.test(value || '') && !/^0+$/.test(value);
const git = (...args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 8 * 1024 * 1024,
  });
function classify(env = process.env) {
  try {
    const base = env.ALIBI_BASE_SHA,
      head = env.ALIBI_HEAD_SHA;
    if (env.ALIBI_EVENT_NAME !== 'pull_request' || !sha(base) || !sha(head)) return 'full';
    if (
      git('rev-parse', 'HEAD').trim() !== head ||
      git('status', '--porcelain', '--untracked-files=no').trim()
    )
      return 'full';
    git('cat-file', '-e', `${base}^{commit}`);
    git('cat-file', '-e', `${head}^{commit}`);
    git('merge-base', base, head);
    const output = git('diff', '--name-only', '--no-renames', '-z', base, head);
    if (!output || !output.endsWith('\0')) return 'full';
    const paths = output.slice(0, -1).split('\0');
    if (
      !paths.length ||
      paths.some((p) => !/^docs\/state\/[A-Za-z0-9][A-Za-z0-9._-]*\.md$/.test(p))
    )
      return 'full';
    for (const file of paths) {
      const entry = git('ls-tree', head, '--', file).trim();
      if (!/^100644 blob [a-f0-9]{40}\t/.test(entry)) return 'full';
      const previous = git('ls-tree', base, '--', file).trim();
      if (previous && !/^100644 blob [a-f0-9]{40}\t/.test(previous)) return 'full';
    }
    return 'docs-only';
  } catch {
    return 'full';
  }
}
const mode = classify();
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `mode=${mode}\n`);
console.log(JSON.stringify({ mode }));
