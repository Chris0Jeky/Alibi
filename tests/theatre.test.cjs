const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(path.join(root, 'dist/assets'));
const js = fs.readFileSync(
  path.join(
    root,
    'dist/assets',
    files.find((f) => /^alibi\..*\.js$/.test(f)),
  ),
  'utf8',
);
const config = {};
vm.runInNewContext(js.split('\n').slice(0, 8).join('\n'), config);
test('recorded ambience is traceable, compact and excluded from the automatic shell download', () => {
  const crypto = require('node:crypto');
  const catalogue = require('../assets-source/ambience/catalogue.json');
  const sw = fs.readFileSync(path.join(root, 'dist/sw.js'), 'utf8');
  assert.deepEqual(
    catalogue.assets.map((a) => a.id),
    ['rain', 'waves'],
  );
  let bytes = 0;
  for (const a of catalogue.assets) {
    const file = fs.readFileSync(path.join(root, a.file));
    assert.equal(crypto.createHash('sha256').update(file).digest('hex'), a.sha256);
    assert.equal(a.license, 'CC0-1.0');
    assert.ok(a.duration > 8);
    bytes += file.length;
    const emitted = config.ALIBI_THEATRE.audio.find((item) => item.id === a.id);
    assert.ok(emitted && !sw.includes(emitted.url), 'play gesture downloads optional recording');
    assert.deepEqual(fs.readFileSync(path.join(root, 'dist', emitted.url)), file);
  }
  assert.ok(bytes < 250 * 1024);
  const source = fs.readFileSync(path.join(root, 'src/theatre.js'), 'utf8');
  assert.ok(
    !/createOscillator|createBufferSource|AudioContext/.test(source),
    'no synthetic fallback or unsolicited game tones',
  );
});
test('every game family and Quiet Wing route has a complete offline room and existing optional media', () => {
  const theatre = config.ALIBI_THEATRE;
  assert.equal(theatre.scenes.length, 8);
  const types = new Set(
    JSON.parse(fs.readFileSync(path.join(root, 'content/catalog.json'))).puzzles.map((p) => p.type),
  );
  for (const scene of theatre.scenes) {
    const url = (scene.curation ? config.ALIBI_CURATION_MEDIA : config.ALIBI_MEDIA)[scene.art];
    assert.ok(
      url && fs.statSync(path.join(root, 'dist', url)).size > 1000,
      scene.id + ' complete local artwork',
    );
    assert.ok(scene.notes.length === 3 && scene.notes.every((n) => n >= 100 && n <= 600));
    assert.ok(
      theatre.audio.some(
        (a) => a.id === scene.ambience && a.loop && fs.existsSync(path.join(root, 'dist', a.url)),
      ),
    );
    if (scene.detail) assert.ok(config.ALIBI_DELIVERY[scene.detail], scene.id + ' approved detail');
    for (const type of scene.families) types.delete(type);
  }
  assert.deepEqual([...types], [], 'all thirteen actual family identities have mood coverage');
  for (const route of [
    'realm',
    'pets',
    'garden',
    'classics',
    'challenges',
    'gallery',
    'journal',
    'folio',
    'city',
    'calm',
  ])
    assert.ok(
      theatre.scenes.some((s) => s.quiet.includes(route)),
      route,
    );
  assert.equal(theatre.films.length, 4);
  for (const film of theatre.films)
    assert.ok(film.duration > 0 && fs.existsSync(path.join(root, 'dist', film.url)));
  const standalone = fs.readFileSync(path.join(root, 'alibi-deluxe-play.html'), 'utf8');
  assert.ok(
    standalone.includes('"audio":[],"films":[]'),
    'single-file edition makes no missing-media promises',
  );
});
