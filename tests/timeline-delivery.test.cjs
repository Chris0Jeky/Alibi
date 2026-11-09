const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');

test('the built desk stays optional, self-contained and fully accounted on web and Android', () => {
  const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json')));
  const assets = path.join(root, 'dist/assets');
  const names = fs
    .readdirSync(assets)
    .filter((name) => /^timeline-lab\.[a-f0-9]{12}\.js$/.test(name));
  assert.equal(names.length, 1);
  const name = names[0],
    bytes = fs.readFileSync(path.join(assets, name));
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(name, `timeline-lab.${digest.slice(0, 12)}.js`);
  assert.equal(info.timelineLabBytes, bytes.length);
  assert.equal(info.timelineLabGzipBytes, zlib.gzipSync(bytes).length);
  assert.ok(bytes.length <= 48 * 1024);
  const worker = fs.readFileSync(path.join(root, 'dist/sw.js'), 'utf8');
  assert.ok(!worker.includes(name), 'the desk is not installed with the core shell');
  assert.ok(
    worker.includes('alibi-timeline-pack-'),
    'the main worker can serve the optional cache',
  );
  assert.ok(!fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8').includes(name));
  const scope = {};
  vm.runInNewContext(bytes.toString(), scope);
  for (const method of ['mount', 'flush', 'cachePack', 'offline'])
    assert.equal(typeof scope.AlibiTimeline[method], 'function', method);
  assert.equal(scope.AlibiTimeline.offline(), false);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dist-android/android-assets.json')));
  const record = manifest.files.find((file) => file.path === `assets/${name}`);
  assert.ok(record, 'Android accounts for the same optional asset');
  assert.equal(record.bytes, bytes.length);
  assert.equal(record.sha256, digest);
  assert.deepEqual(fs.readFileSync(path.join(root, 'dist-android/assets', name)), bytes);
});
