'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { readIdentity } = require('../tools/platform-identity.cjs');

for (const directory of ['dist', 'dist-android']) {
  test(`${directory} runtime identity binds both complete sources`, () => {
    const root = path.join(__dirname, '..', directory);
    const assets = path.join(root, 'assets');
    const names = fs.readdirSync(assets);
    function read(prefix) {
      const pattern = new RegExp(`^${prefix}\\.[0-9a-f]{12}\\.js$`);
      const matches = names.filter((name) => pattern.test(name));
      assert.equal(matches.length, 1, `Expected one ${prefix} source`);
      return fs.readFileSync(path.join(assets, matches[0]), 'utf8');
    }
    const frame = [
      'alibi-official-content-1',
      ['initial', read('official-content')],
      ['deferred', read('official-deferred')],
    ];
    const expected = crypto.createHash('sha256').update(JSON.stringify(frame)).digest('hex');
    assert.equal(readIdentity(root).identity.contentManifestRevision, expected);
  });
}
