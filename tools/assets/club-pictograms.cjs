/* Compile reviewed native SVG fragments into exports and the existing icon table. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const allowed = {
  path: new Set(['d', 'fill', 'stroke']),
  rect: new Set(['x', 'y', 'width', 'height', 'rx', 'fill', 'stroke']),
  circle: new Set(['cx', 'cy', 'r', 'fill', 'stroke']),
};
function validate(name, fragment) {
  const unsafe = () => {
    throw Error('Unsafe pictogram: ' + name);
  };
  if (!/^[a-z]+(?:-[a-z]+)*$/.test(name) || typeof fragment !== 'string' || !fragment) unsafe();
  const tags = fragment.match(/<(?:path|rect|circle)\s+[^<>]*\/>/g) || [];
  if (tags.join('') !== fragment) unsafe();
  for (const tag of tags) {
    const [, type, body] = tag.match(/^<(\w+)\s+(.*?)\/>$/);
    const attributes = [...body.matchAll(/([a-z]+)="([^"]*)"/g)];
    if (attributes.map(([, key, value]) => `${key}="${value}"`).join(' ') !== body) unsafe();
    const keys = new Set();
    for (const [, key, value] of attributes) {
      if (!allowed[type].has(key) || keys.has(key)) unsafe();
      keys.add(key);
      if (key === 'fill' || key === 'stroke') {
        if (!['none', 'currentColor'].includes(value)) unsafe();
      } else if (key === 'd') {
        if (!/^[MmLlHhVvCcSsQqTtAaZz0-9., +\-]+$/.test(value)) unsafe();
      } else if (!/^\d+(?:\.\d+)?$/.test(value)) unsafe();
    }
  }
  return fragment;
}
function svg(fragment) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${fragment}</svg>\n`;
}
function compact(fragment) {
  // Adjacent unfilled paths inherit identical styling; combine their contours only.
  return fragment.replace(/<path d="([^"]*)"\/><path d="([^"]*)"\/>/g, '<path d="$1 $2"/>');
}
function sync(root, check = false) {
  const directory = path.join(root, 'assets-source/library/club-pictograms');
  const masters = JSON.parse(fs.readFileSync(path.join(directory, 'pictograms.json'), 'utf8'));
  const update = (file, expected) => {
    if (check) {
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== expected)
        throw Error('Stale pictogram output: ' + path.relative(root, file));
    } else fs.writeFileSync(file, expected);
  };
  const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
  const receipts = {};
  for (const [name, fragment] of Object.entries(masters)) {
    const output = svg(validate(name, fragment));
    update(path.join(directory, name + '.svg'), output);
    receipts[name + '.svg'] = sha256(output);
  }
  update(
    path.join(directory, 'hashes.json'),
    JSON.stringify(
      {
        sourceSha256: sha256(fs.readFileSync(path.join(directory, 'pictograms.json'))),
        files: receipts,
      },
      null,
      2,
    ) + '\n',
  );
  const file = path.join(root, 'src/presentation.js');
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(/  const paths = (\{[\s\S]*?\n  \});/);
  if (!match) throw Error('Icon table not found');
  const paths = vm.runInNewContext('(' + match[1] + ')');
  for (const name of Object.keys(paths))
    if (Object.hasOwn(masters, name)) paths[name] = compact(masters[name]);
  for (const name of ['bridges', 'quiet', 'castle']) paths[name] = compact(masters[name]);
  paths.plant = compact(masters.seedling);
  const table =
    '  const paths = ' +
    JSON.stringify(paths, null, 2)
      .split('\n')
      .map((line, i) => (i ? '  ' + line : line))
      .join('\n') +
    ';';
  // Match repository formatting without adding a runtime loader or duplicate table.
  const prettier = require('prettier');
  return prettier
    .format(source.replace(match[0], table), {
      parser: 'babel',
      ...JSON.parse(fs.readFileSync(path.join(root, '.prettierrc.json'), 'utf8')),
    })
    .then((formatted) => update(file, formatted));
}
if (require.main === module)
  sync(path.resolve(__dirname, '../..'), process.argv.includes('--check'))
    .then(() => console.log('Club pictograms verified'))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
module.exports = { validate, svg, compact, sync };
