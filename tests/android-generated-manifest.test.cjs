'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkGeneratedInputs } = require('../tools/android-generated-inputs.cjs');

const moduleName = 'capacitor-cordova-android-plugins';
const manifestPath = `${moduleName}/src/main/AndroidManifest.xml`;
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-native-manifest-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [name, source] of [
    ['capacitor.settings.gradle', 'capacitor.settings.gradle'],
    ['app/capacitor.build.gradle', 'capacitor.build.gradle'],
    [`${moduleName}/build.gradle`, 'cordova-build.gradle'],
    [`${moduleName}/cordova.variables.gradle`, 'cordova.variables.gradle'],
    [manifestPath, 'AndroidManifest.xml'],
  ]) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.copyFileSync(path.join(__dirname, 'fixtures/native-generated', source), file);
  }
  for (const dir of ['java', 'res']) {
    const file = path.join(root, moduleName, 'src/main', dir, '.gitkeep');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '');
  }
  return root;
}

test('pinned empty Cordova manifest accepts both LF and CRLF checkouts', (t) => {
  const root = fixture(t);
  assert.deepEqual(checkGeneratedInputs(root), []);
  const file = path.join(root, manifestPath);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\n/g, '\r\n'));
  assert.deepEqual(checkGeneratedInputs(root), []);
});

for (const [name, before, after] of [
  [
    'package visibility',
    '</manifest>',
    '<queries><package android:name="unreviewed.app"/></queries></manifest>',
  ],
  [
    'hardware feature',
    '</manifest>',
    '<uses-feature android:name="android.hardware.camera"/></manifest>',
  ],
  [
    'private receiver',
    '</application>',
    '<receiver android:name="unreviewed.Receiver" android:exported="false"/></application>',
  ],
  ['application flags', '<application  >', '<application android:usesCleartextTraffic="true">'],
]) {
  test(`rejects changed generated manifest: ${name}`, (t) => {
    const root = fixture(t);
    const file = path.join(root, manifestPath);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(before, after));
    assert.ok(checkGeneratedInputs(root).some((error) => error.includes(manifestPath)));
  });
}
