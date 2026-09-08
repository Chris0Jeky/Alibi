'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
module.exports = function buildQuiet(root, dist, baseMedia, inlineBase) {
  const dir = path.join(root, 'src/quiet-wing');
  const hash = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);
  const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
  const source = ['engine.js', 'city.js', 'realm.js', 'pets.js', 'storage.js', 'app.js']
    .map(read)
    .join('\n');
  const cssSource = read('style.css'),
    files = [];
  function emit(name, bytes, ext) {
    const url = `./assets/quiet-${name}.${hash(bytes)}.${ext}`;
    fs.writeFileSync(path.join(dist, url), bytes);
    files.push(url);
    return url;
  }
  const script = emit('activity', source, 'js'),
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
    fs.readFileSync(path.join(root, 'docs/quiet-wing/KENNEY-CASTLE-LICENSE.txt')),
    'txt',
  );
  const sources = fs.readFileSync(path.join(dir, 'sources.html'));
  fs.writeFileSync(path.join(dist, 'quiet-wing-sources.html'), sources);
  files.push('./quiet-wing-sources.html', media.town);
  const build = hash(JSON.stringify(files) + sources);
  return {
    config: { script, css, media, files, build },
    standalone: { source, cssSource, media: inlineMedia },
    bytes: files
      .filter((f) => f !== media.town)
      .reduce((n, f) => n + fs.statSync(path.join(dist, f)).size, 0),
  };
};
