'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
module.exports = function buildQuiet(root, dist, baseMedia, inlineBase) {
  const dir = path.join(root, 'src/quiet-wing');
  const hash = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);
  const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
  const modelData = read('assets/city-models.json');
  const gpu = require('esbuild').buildSync({
    entryPoints: [path.join(dir, 'gpu.js')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2022',
    write: false,
  }).outputFiles[0].text;
  const source =
    `globalThis.QWCityModels=${modelData};\n` +
    ['engine.js', 'city.js', 'realm.js', 'gpu.js', 'pets.js', 'storage.js', 'app.js']
      .map((f) => (f === 'gpu.js' ? gpu : read(f)))
      .join('\n');
  const cssSource = read('style.css'),
    files = [];
  function emit(name, bytes, ext) {
    const url = `./assets/quiet-${name}.${hash(bytes)}.${ext}`;
    fs.writeFileSync(path.join(dist, url), bytes);
    files.push(url);
    return url;
  }
  const script = emit(
      'activity',
      require('esbuild').transformSync(source, { minify: true, target: 'es2022' }).code,
      'js',
    ),
    css = emit('style', cssSource, 'css');
  const keeper = fs.readFileSync(path.join(dir, 'assets/kenney-keeper.png'));
  const media = { town: baseMedia['quiet-town'], keeper: emit('keeper', keeper, 'png') };
  const inlineMedia = {
    town: inlineBase['quiet-town'],
    keeper: 'data:image/png;base64,' + keeper.toString('base64'),
  };
  const museum = path.join(dir, 'assets/museum');
  if (fs.existsSync(museum))
    for (const file of fs.readdirSync(museum).sort()) {
      if (!/^(wave|portrait|bedroom|sunday)\.webp$/.test(file)) continue;
      const id = path.parse(file).name,
        bytes = fs.readFileSync(path.join(museum, file));
      media[id] = emit(id, bytes, 'webp');
      inlineMedia[id] = 'data:image/webp;base64,' + bytes.toString('base64');
    }
  for (const file of ['rights.json']) {
    const p = path.join(museum, file);
    if (fs.existsSync(p)) emit('museum-rights', fs.readFileSync(p), 'json');
  }
  emit(
    'kenney-license',
    Buffer.concat([
      fs.readFileSync(path.join(root, 'docs/quiet-wing/KENNEY-CASTLE-LICENSE.txt')),
      fs.readFileSync(path.join(root, 'assets-source/quiet-wing/city/town/License.txt')),
      Buffer.from('\nThree.js renderer — MIT licence\n'),
      fs.readFileSync(path.join(root, 'node_modules/three/LICENSE')),
    ]),
    'txt',
  );
  const sources = fs.readFileSync(path.join(dir, 'sources.html'));
  const sourcesURL = `./quiet-wing-sources.${hash(sources)}.html`;
  fs.writeFileSync(path.join(dist, sourcesURL), sources);
  fs.writeFileSync(path.join(dist, 'quiet-wing-sources.html'), sources);
  files.push(sourcesURL, './quiet-wing-sources.html', media.town);
  const build = hash(JSON.stringify(files) + sources);
  return {
    config: { script, css, media, files, build, sources: sourcesURL },
    standalone: { source, cssSource, media: inlineMedia, sources: './quiet-wing-sources.html' },
    bytes: files
      .filter((f) => f !== media.town)
      .reduce((n, f) => n + fs.statSync(path.join(dist, f)).size, 0),
  };
};
