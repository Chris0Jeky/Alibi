'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test(
  'CLI refuses a named pipe without blocking on a writer',
  { skip: process.platform === 'win32' },
  () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-case-pipe-'));
    try {
      const file = path.join(dir, 'pipe');
      const created = spawnSync('mkfifo', [file], { encoding: 'utf8' });
      assert.equal(created.status, 0, created.stderr);
      const result = spawnSync(
        process.execPath,
        [path.join(__dirname, '../tools/case-authoring.cjs'), file],
        { encoding: 'utf8', timeout: 1000 },
      );
      assert.equal(result.status, 1, String(result.error));
      assert.match(result.stderr, /regular file/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },
);
