const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const buildDelivery = require('../tools/build-delivery.cjs');
const root = path.resolve(__dirname, '..');
test('delivery build emits exact derivatives outside the offline shell and validates mirror policy', () => {
  const fixture = path.join(root, 'test-results/delivery-build');
  const dist = path.join(fixture, 'dist');
  for (const dir of [
    'content',
    'assets-source/curation',
    'src/curation-assets/museum',
    'dist/assets',
  ])
    fs.mkdirSync(path.join(fixture, dir), { recursive: true });
  const registry = JSON.parse(
    fs.readFileSync(path.join(root, 'assets-source/curation/registry.json')),
  );
  const fallback = {};
  for (const a of registry.assets.filter((a) => a.kind === 'museum-image')) {
    fs.copyFileSync(path.join(root, a.derivative.file), path.join(fixture, a.derivative.file));
    fallback[a.id] = './compact-' + a.id;
  }
  fs.writeFileSync(
    path.join(fixture, 'assets-source/curation/registry.json'),
    JSON.stringify(registry),
  );
  const policy = (mirrors) =>
    fs.writeFileSync(
      path.join(fixture, 'content/asset-delivery.json'),
      JSON.stringify({ schemaVersion: 1, mirrors }),
    );
  policy({ 'met-melencolia': ['https://cdn.example/alibi/pinned.webp'] });
  const built = buildDelivery(fixture, dist, fallback);
  assert.deepEqual(built.origins, ['https://cdn.example']);
  assert.equal(Object.keys(built.entries).length, 4);
  for (const [id, entry] of Object.entries(built.entries)) {
    const emitted = fs.readFileSync(path.join(dist, entry.urls.at(-1)));
    assert.equal(entry.sha256, crypto.createHash('sha256').update(emitted).digest('hex'));
    assert.equal(entry.bytes, emitted.length);
    assert.equal(entry.fallback, fallback[id]);
  }
  for (const mirrors of [
    { missing: ['https://cdn.example/x.webp'] },
    { 'met-melencolia': ['http://cdn.example/x.webp'] },
    { 'met-melencolia': ['https://user:password@cdn.example/x.webp'] },
    { 'met-melencolia': ['https://cdn.example/x.webp?key=secret'] },
    { 'met-melencolia': ['https://cdn.example/a', 'https://cdn.example/b'] },
  ]) {
    policy(mirrors);
    assert.throws(() => buildDelivery(fixture, dist, fallback));
  }
  const sw = fs.readFileSync(path.join(root, 'dist/sw.js'), 'utf8');
  assert.ok(!sw.includes('/enhanced-'));
  const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json')));
  const photos = JSON.parse(
    fs.readFileSync(path.join(root, 'assets-source/online/acquired/receipt.json')),
  ).assets;
  assert.equal(info.enhancementBytes, built.bytes + photos.reduce((n, a) => n + a.bytes, 0));
  assert.ok(info.enhancementBytes < 4 * 1024 * 1024);
  const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  assert.ok(html.includes('http-equiv="Content-Security-Policy"'));
  assert.ok(html.indexOf('http-equiv="Content-Security-Policy"') < html.indexOf('<script'));
  assert.ok(!html.includes('frame-ancestors'), 'framing is a response-header policy only');
  const headers = fs.readFileSync(path.join(root, 'dist/_headers'), 'utf8');
  assert.ok(headers.includes("img-src 'self' data: blob:"));
  assert.ok(headers.includes("script-src 'self';"));
  assert.ok(!headers.includes('cdn.example'));
});
