'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
require('../src/core.js');
const C = require('../src/engines.js'),
  root = path.join(__dirname, '..'),
  read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('curation copy and authoring surfaces stay honest', () => {
  const app = read('src/app.js'),
    presentation = read('src/presentation.js'),
    casebooks = read('content/casebooks.json'),
    authoring = read('docs/AUTHORING.md');
  assert.doesNotMatch(app, /p\.minutes\s*\|\|\s*8/);
  assert.doesNotMatch(app, /twelve game families|Export twelve example puzzles/);
  assert.match(app, /Complete both category grids before answering the final question/);
  assert.match(presentation, /Complete both grids before answering the final question/);
  assert.match(presentation, /The available digits are 1–4/);
  assert.match(
    presentation,
    /Light every floor square without letting any two lanterns shine directly at one another/,
  );
  assert.match(
    casebooks,
    /Light every floor tile without letting lanterns shine directly at one another/,
  );
  assert.match(authoring, /thirteen supported families/);
  assert.match(authoring, /All chapters are visible/);
  assert.match(authoring, /`minutes` is optional/);
});

test('touch-first instructions leave mouse and keyboard help to .kb notes (0.14.1 audit m8)', () => {
  globalThis.window = globalThis;
  require('../src/presentation.js');
  const pointerOnly = /right-click|shift\+enter|arrow keys|arrows move|keyboard:/i;
  for (const [type, family] of Object.entries(globalThis.AlibiUI.data))
    assert.doesNotMatch(family.gesture, pointerOnly, `${type} gesture is shown on phones`);
  const app = read('src/app.js'),
    css = read('src/app.css');
  for (const note of app.match(/<p class="control-note[^"]*">(?:[^<]|<(?!\/p>))*<\/p>/g)) {
    const visible = note.replace(/<span class="kb">[^<]*<\/span>/g, '');
    if (!note.includes('control-note kb'))
      assert.doesNotMatch(visible, pointerOnly, `touch-visible control note: ${note.slice(0, 60)}`);
  }
  assert.doesNotMatch(css, /\.kb\s*\{[^}]*display:\s*none/s);
  assert.match(css, /@media \(hover: none\) and \(pointer: coarse\)/);
  assert.match(css, /\.kb\s*\{[^}]*clip-path:\s*inset\(50%\)/s);
  assert.match(css, /@media \(any-pointer: fine\)/);
  assert.doesNotMatch(
    app,
    /control-note">Tap to turn clockwise/,
    'the network turn instruction appears once, in the banner',
  );
});

test('lanterns accept crossing beams when no lantern sees another', () => {
  const puzzle = {
      id: 'crossing-beams',
      revision: 1,
      type: 'lightup',
      title: 'Crossing beams',
      subtitle: 'A copy regression',
      difficulty: 'Gentle',
      size: 3,
      walls: [-2, -2, -2, -2, -2, -2, -2, -2, -1],
      solution: [0, 1, 0, 1, 0, 0, 0, 0, 0],
    },
    state = { cells: [0, 1, 0, 1, 0, 0, 0, 0, -1] };
  assert.deepEqual(C.registry.lightup.validate(puzzle, state), []);
});
