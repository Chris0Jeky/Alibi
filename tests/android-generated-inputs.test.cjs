'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkGeneratedInputs } = require('../tools/android-generated-inputs.cjs');
const inputs = [
  ['capacitor.settings.gradle', 'capacitor.settings.gradle'],
  ['app/capacitor.build.gradle', 'capacitor.build.gradle'],
  ['capacitor-cordova-android-plugins/build.gradle', 'cordova-build.gradle'],
  ['capacitor-cordova-android-plugins/cordova.variables.gradle', 'cordova.variables.gradle'],
  ['capacitor-cordova-android-plugins/src/main/AndroidManifest.xml', 'AndroidManifest.xml'],
];

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-generated-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [destination, source] of inputs) {
    const filename = path.join(root, destination);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.copyFileSync(path.join(__dirname, 'fixtures/native-generated', source), filename);
  }
  const cordova = path.join(root, 'capacitor-cordova-android-plugins');
  for (const [name, value] of [
    ['src/main/java/.gitkeep', ''],
    ['src/main/res/.gitkeep', '\n'],
  ]) {
    const filename = path.join(cordova, name);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, value);
  }
  return root;
}

test('reviewed plugin-free Gradle inputs pass, including CRLF checkouts', (t) => {
  const root = fixture(t);
  assert.deepEqual(checkGeneratedInputs(root), []);
  for (const [name] of inputs) {
    const file = path.join(root, name);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\n/g, '\r\n'));
  }
  assert.deepEqual(checkGeneratedInputs(root), []);
});

for (const [name] of inputs) {
  test(`rejects extra executable code in ${name}`, (t) => {
    const root = fixture(t);
    fs.appendFileSync(path.join(root, name), "\napply from: 'unreviewed.gradle'\n");
    assert.ok(checkGeneratedInputs(root).some((message) => message.includes(name)));
  });
  test(`rejects missing ${name}`, (t) => {
    const root = fixture(t);
    fs.unlinkSync(path.join(root, name));
    assert.ok(checkGeneratedInputs(root).some((message) => message.includes(name)));
  });
  test(`rejects symlink ${name}`, { skip: process.platform === 'win32' }, (t) => {
    const root = fixture(t);
    const original = path.join(root, name);
    fs.renameSync(original, `${original}.real`);
    fs.symlinkSync(`${original}.real`, original);
    assert.ok(checkGeneratedInputs(root).some((message) => message.includes(name)));
  });
}

test('rejects redirected Capacitor project and substituted Java target', (t) => {
  const root = fixture(t);
  const settings = path.join(root, inputs[0][0]);
  fs.writeFileSync(
    settings,
    fs.readFileSync(settings, 'utf8').replace('../node_modules', '../outside'),
  );
  const app = path.join(root, inputs[1][0]);
  fs.writeFileSync(app, fs.readFileSync(app, 'utf8').replaceAll('VERSION_21', 'VERSION_17'));
  assert.equal(checkGeneratedInputs(root).length, 2);
});

for (const name of ['src/main/java/Injected.java', 'libs/injected.jar', 'extra.gradle']) {
  test(`rejects unexpected generated-module input ${name}`, (t) => {
    const root = fixture(t);
    const file = path.join(root, 'capacitor-cordova-android-plugins', name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'unreviewed');
    assert.ok(checkGeneratedInputs(root).some((message) => message.includes(name)));
  });
}

test(
  'rejects a symlinked parent even when its file bytes match',
  { skip: process.platform === 'win32' },
  (t) => {
    const root = fixture(t);
    fs.renameSync(path.join(root, 'app'), path.join(root, 'real-app'));
    fs.symlinkSync(path.join(root, 'real-app'), path.join(root, 'app'));
    assert.ok(checkGeneratedInputs(root).some((message) => message.includes('symlink')));
  },
);

test('post-build checking permits outputs but not additional source inputs', (t) => {
  const root = fixture(t);
  const build = path.join(root, 'capacitor-cordova-android-plugins/build');
  fs.mkdirSync(build);
  fs.writeFileSync(path.join(build, 'output.jar'), 'generated output');
  assert.deepEqual(checkGeneratedInputs(root), []);
});
