'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { readRegularFile, regularFiles } = require('./android-host-policy.cjs');
const policy = require('../android/gradle/generated-inputs.json');
const MODULE = 'capacitor-cordova-android-plugins';
const MODULE_INPUTS = new Set([
  'build.gradle',
  'cordova.variables.gradle',
  'src/main/AndroidManifest.xml',
  'src/main/java/.gitkeep',
  'src/main/res/.gitkeep',
]);

function checkParents(root, name) {
  let current = root;
  for (const component of ['', ...name.split('/').slice(0, -1)]) {
    current = path.join(current, component);
    const stat = fs.lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error(`Expected a regular directory, not a symlink: ${current}.`);
  }
}

function checkGeneratedInputs(root = path.resolve(__dirname, '../android')) {
  const errors = [];
  for (const [name, expected] of Object.entries(policy.sha256)) {
    try {
      checkParents(root, name);
      const source = readRegularFile(path.join(root, name), 65536)
        .toString('utf8')
        .replace(/\r\n/g, '\n');
      const actual = createHash('sha256').update(source).digest('hex');
      if (actual !== expected)
        errors.push(`Generated Gradle input differs from Capacitor ${policy.capacitorVersion}: ${name}.`);
    } catch (error) {
      errors.push(`Cannot verify generated input ${name}: ${error.message}`);
    }
  }
  try {
    const files = regularFiles(path.join(root, MODULE));
    for (const name of files.keys()) {
      // AGP outputs are not inputs to this pinned module. Do not permit extra libs,
      // Java/Kotlin sources, resource overlays or executable Gradle configuration.
      if (!name.startsWith('build/') && !MODULE_INPUTS.has(name))
        errors.push(`Unexpected generated-module source input: ${name}.`);
    }
    for (const name of MODULE_INPUTS) {
      if (!files.has(name)) errors.push(`Missing generated-module input: ${name}.`);
    }
  } catch (error) {
    errors.push(`Cannot inspect generated module: ${error.message}`);
  }
  return errors;
}

module.exports = { checkGeneratedInputs };
