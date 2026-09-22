'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  PATH_ROUTE_ALIASES,
  pathRouteAliasDocument,
  writePathRouteAliases,
} = require('../tools/build.cjs');
const boot = fs.readFileSync(path.join(__dirname, '..', 'src', 'boot.js'), 'utf8');

function bootPathRoutes() {
  const block = boot.match(/pathRoutes = \{([\s\S]*?)\};/);
  assert.ok(block, 'boot.js declares a pathRoutes table');
  const entries = [...block[1].matchAll(/(\w+): '(\w+)'/g)];
  assert.ok(entries.length > 0, 'pathRoutes table is not empty');
  return Object.fromEntries(entries.map(([, from, to]) => [from, to]));
}

test('every alias document forwards to its hash route three ways', () => {
  for (const [alias, target] of Object.entries(PATH_ROUTE_ALIASES)) {
    const document = pathRouteAliasDocument(alias, target);
    const hash = `#/${target}`;
    assert.match(document, new RegExp(`http-equiv="refresh" content="0;url=/${hash}"`), alias);
    assert.match(document, new RegExp(`<a href="/${hash}">`), alias);
    // The script preempts the meta refresh, keeps an explicit fragment and
    // merges an outer query into a fragment query instead of corrupting it
    // (issue #244).
    assert.ok(
      document.includes(`var h=location.hash||'${hash}'`),
      `${alias}: explicit fragment wins`,
    );
    assert.ok(
      document.includes(`h+=(h.indexOf('?')>=0?'&':'?')+q.slice(1)`),
      `${alias}: outer query merges with a fragment query`,
    );
    assert.ok(document.includes(`querySelector('meta[http-equiv="refresh"]').remove()`), alias);
  }
});

test('the build alias table matches the client-side pathRoutes table', () => {
  assert.deepEqual({ ...PATH_ROUTE_ALIASES }, bootPathRoutes());
});

test('the writer emits both host conventions for every alias', () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-alias-'));
  try {
    writePathRouteAliases(dist);
    for (const alias of Object.keys(PATH_ROUTE_ALIASES)) {
      for (const file of [`${alias}.html`, path.join(alias, 'index.html')]) {
        const full = path.join(dist, file);
        assert.ok(fs.existsSync(full), file);
        assert.equal(
          fs.readFileSync(full, 'utf8'),
          pathRouteAliasDocument(alias, PATH_ROUTE_ALIASES[alias]),
          file,
        );
      }
    }
  } finally {
    fs.rmSync(dist, { recursive: true, force: true });
  }
});

test('unknown addresses still fall through to the static 404 page', () => {
  const build = fs.readFileSync(path.join(__dirname, '..', 'tools', 'build.cjs'), 'utf8');
  assert.match(build, /not_found_handling|404\.html/, '404 handling is present');
  assert.match(build, /This clue leads nowhere/, 'static 404 page is unchanged');
  assert.ok(!('unknown' in PATH_ROUTE_ALIASES), 'no catch-all alias redirects unknowns');
});
