'use strict';
// Field notes 3D parses GLB bytes and GLTFLoader fetches embedded textures from blob: URLs, which
// Chromium counts as connect-src. Allow exactly that and nothing else beyond the existing policy.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dist = path.resolve(__dirname, '..', 'dist');
const policies = {
  _headers: fs
    .readFileSync(path.join(dist, '_headers'), 'utf8')
    .match(/Content-Security-Policy: (.+)/)[1],
  'index.html': fs
    .readFileSync(path.join(dist, 'index.html'), 'utf8')
    .match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1],
};
const directive = (policy, name) =>
  (policy.split('; ').find((d) => d.startsWith(name + ' ')) || '').split(' ').slice(1);

for (const [where, policy] of Object.entries(policies))
  test(`${where} lets the 3D viewer fetch its blob: textures without widening other directives`, () => {
    assert.ok(directive(policy, 'connect-src').includes('blob:'), 'connect-src allows blob:');
    for (const name of ['default-src', 'script-src', 'style-src', 'object-src'])
      assert.ok(!directive(policy, name).includes('blob:'), `${name} stays without blob:`);
  });
