'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { readIdentity } = require('../tools/platform-identity.cjs');

for (const directory of ['dist', 'dist-android']) {
  test(`${directory} runtime identity directly binds both complete official sources`, () => {
    const root = path.join(__dirname, '..', directory);
    const assets = path.join(root, 'assets');
    const names = fs.readdirSync(assets);
    const read = (prefix) => {
      const matches = names.filter((name) =>
        new RegExp(`^${prefix}\\.[0-9a-f]{12}\\.js$`).test(name),
      );
      assert.equal(matches.length, 1, `Expected one ${prefix} source`);
      return fs.readFileSync(path.join(assets, matches[0]), 'utf8');
    };
    const initial = read('official-content');
    const deferred = read('official-deferred');
    const expected = crypto
      .createHash('sha256')
      .update(
        JSON.stringify([
          'alibi-official-content-1',
          ['initial', initial],
          ['deferred', deferred],
        ]),
      )
      .digest('hex');
    assert.equal(readIdentity(root).identity.contentManifestRevision, expected);
  });
}
