import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
// Alibi's built-site assertions for the Pulseboard SDK. Run after `npm run build`.
export default ({ content }) => {
  const root = new URL('../', import.meta.url);
  const COLLECTOR_ORIGIN = 'https://pulseboard-observatory.commit-atlas.workers.dev';
  const read = (relative) => {
    try {
      return readFileSync(new URL(relative, root), 'utf8');
    } catch {
      assert.fail(`Run \`npm run build\` before this check: ${relative} is missing`);
    }
  };
  const sha = (value) => createHash('sha256').update(value).digest('hex');
  // The shipped policy must let the SDK reach the collector; the SDK needs no inline styles or scripts.
  const policy = read('dist/_headers').match(/Content-Security-Policy: (.+)/)?.[1] ?? '';
  assert.ok(
    (policy.match(/connect-src ([^;]+)/)?.[1] ?? '').split(/\s+/).includes(COLLECTOR_ORIGIN),
    `_headers connect-src must list ${COLLECTOR_ORIGIN}`,
  );
  const html = read('dist/index.html');
  const meta = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] ?? '';
  assert.ok(
    (meta.match(/connect-src ([^;]+)/)?.[1] ?? '').split(/\s+/).includes(COLLECTOR_ORIGIN),
    'The index.html CSP meta tag must list the collector origin',
  );
  // One deferred SDK script, last, serving the locked bytes from a hashed asset.
  const scripts = [...html.matchAll(/<script src="\.\/([^"]+)"( defer)?><\/script>/g)];
  const sdk = scripts.filter((m) => /^assets\/pulseboard\.[a-f0-9]{12}\.js$/.test(m[1]));
  assert.equal(sdk.length, 1, 'Expected exactly one Pulseboard SDK script in dist/index.html');
  assert.equal(scripts.at(-1), sdk[0], 'The SDK loads after the application scripts');
  assert.equal(sdk[0][2], ' defer', 'The SDK script is deferred');
  assert.equal(
    sha(read('dist/' + sdk[0][1])),
    sha(content),
    'The emitted asset must be the locked artifact byte for byte',
  );
  // The notice space is the first element of <body> and grows in flow; the button slot exists at mount.
  assert.match(
    html,
    /<body>\s*<div data-pulseboard-bar style="min-height: 2\.5rem"><\/div>\s*<a class="skip-link"/,
    'The in-flow [data-pulseboard-bar] placeholder must be the first child of <body>',
  );
  assert.equal(
    html.split('<div id="pulseboard-slot" data-pulseboard-slot hidden></div>').length,
    2,
    'Exactly one hidden #pulseboard-slot must exist before the SDK mounts',
  );
  // Online-only: not inlined into the initial bundle, not in the offline shell, not in the standalone file.
  const bundle = scripts.find((m) => /^assets\/alibi\.[a-f0-9]{12}\.js$/.test(m[1]));
  assert.ok(bundle, 'The main bundle script tag is missing from dist/index.html');
  const bundleCode = read('dist/' + bundle[1]);
  assert.ok(!bundleCode.includes('/v1/collect-stat/'), 'The SDK must not be inlined in the initial bundle');
  assert.ok(!read('dist/sw.js').includes('pulseboard.'), 'The offline shell must not precache the SDK');
  const standalone = read('alibi-deluxe-play.html');
  assert.ok(
    !standalone.includes('pulseboard-sdk') &&
      !standalone.includes('<div data-pulseboard-bar') &&
      !standalone.includes('id="pulseboard-slot"'),
    'The standalone file must not carry the SDK',
  );
  const info = JSON.parse(read('build-info.json'));
  assert.equal(info.observatoryBytes, Buffer.byteLength(content), 'build-info reports the SDK asset size');
  console.log(
    'SDK pin, header, collector, release contract, inert off-origin runtime, CSP, deferred asset, in-flow notice space and slot passed. Full build QA remains required.',
  );
};
