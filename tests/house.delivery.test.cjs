'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json')));
const assets = fs.readdirSync(path.join(root, 'dist/assets'));
const js = fs.readFileSync(path.join(root, 'dist/assets', assets.find(f => /^alibi\..*\.js$/.test(f))), 'utf8');
const cfg = JSON.parse(js.match(/globalThis\.ALIBI_HOUSE_CONFIG=(.*);\n/)[1]);
test('house is a bounded, genuinely optional two-file pack', () => {
  assert.equal(cfg.files.length, 2);
  assert.deepEqual(cfg.files, [cfg.script, cfg.css]);
  assert.match(cfg.build, /^[a-f0-9]{12}$/);
  const sw = fs.readFileSync(path.join(root, 'dist/sw.js'), 'utf8');
  for (const file of cfg.files) {
    assert.ok(fs.existsSync(path.join(root, 'dist', file)));
    assert.ok(!sw.includes(file), 'The optional file is not precached by the shell');
  }
  assert.equal(info.houseBytes, cfg.files.reduce((n,f)=>n+fs.statSync(path.join(root,'dist',f)).size,0));
  assert.ok(info.houseBytes < 60 * 1024);
  assert.ok(info.houseScriptGzipBytes + info.houseCssGzipBytes < 18 * 1024);
});
test('optional pack bytes remain part of the complete distribution accounting', () => {
  const names = ['coreOfflineBytes','quietWingBytes','castleBytes','experienceBytes','ambienceBytes','enhancementBytes','observatoryBytes','blockMotionBytes','houseBytes'];
  assert.equal(names.reduce((n,key)=>n+info[key],0),info.uncompressedBytes);
});
test('entry uses the existing timeout-bounded loader, not another network owner', () => {
  const entry = fs.readFileSync(path.join(root, 'src/house-loader.js'),'utf8');
  const activities = fs.readFileSync(path.join(root,'src/activities.js'),'utf8');
  assert.match(entry,/AlibiActivities\.loadSource/);
  assert.match(activities,/15000/);
  assert.ok(!entry.includes('setTimeout'));
});
test('the preview pack never owns puzzle data or shell cache eviction', () => {
  const boot = fs.readFileSync(path.join(root,'src/house/bootstrap.js'),'utf8');
  assert.match(boot,/alibi-house-pack-/);
  assert.ok(!/indexedDB|localStorage|alibi-shell-/.test(boot));
  assert.match(boot,/cache\.addAll/);
  assert.match(boot,/slice\(-1\)/);
});
