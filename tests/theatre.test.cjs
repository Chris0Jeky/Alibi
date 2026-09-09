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
