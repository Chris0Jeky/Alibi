#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { buildAndroid } = require('./build-android.cjs');
const { inspectAndroidArtifact } = require('./check-android-artifact.cjs');
const {
  checkPreviewConfig,
  readRegularFile,
  readConfig,
  regularFiles,
} = require('./android-host-policy.cjs');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'android', 'app', 'src', 'main', 'assets');
const PUBLIC = path.join(ASSETS, 'public');
const FLAVOR = 'capacitor-preview';
const CAPACITOR_PUBLIC_EXTRAS = new Set(['cordova.js', 'cordova_plugins.js']);

function checkPublicPayload({ source = path.join(ROOT, 'dist-android'), target = PUBLIC } = {}) {
  const errors = [];
  try {
    const sourceFiles = regularFiles(source);
    const targetFiles = regularFiles(target);
    if (!sourceFiles.has('index.html')) errors.push('Android source needs a nonempty index.html.');
    else if (!readRegularFile(sourceFiles.get('index.html')).length)
      errors.push('Android source needs a nonempty index.html.');
    const copiedFiles = [...targetFiles.keys()].filter(
      (name) => !CAPACITOR_PUBLIC_EXTRAS.has(name),
    );
    if ([...sourceFiles.keys()].sort().join('\n') !== copiedFiles.sort().join('\n'))
      errors.push('Capacitor public payload file set differs from the checked Android payload.');
    for (const name of CAPACITOR_PUBLIC_EXTRAS) {
      if (!targetFiles.has(name))
        errors.push(`Expected generated Capacitor file is missing: ${name}.`);
      else if (readRegularFile(targetFiles.get(name)).length !== 0)
        errors.push(`Generated ${name} must be empty for the plugin-free preview.`);
    }
    for (const [name, filename] of sourceFiles) {
      if (
        !targetFiles.has(name) ||
        !readRegularFile(filename).equals(readRegularFile(targetFiles.get(name)))
      )
        errors.push(`Capacitor public payload differs for ${name}.`);
    }
    const assets = path.dirname(target);
    errors.push(...checkPreviewConfig(readConfig(path.join(assets, 'capacitor.config.json'))));
    const plugins = readConfig(path.join(assets, 'capacitor.plugins.json'));
    if (!Array.isArray(plugins) || plugins.length !== 0)
      errors.push('capacitor.plugins.json must be an empty plugin registry for this preview.');
  } catch (error) {
    errors.push(`Native sync check failed: ${error.message}`);
  }
  return errors;
}

function checkSourceConfig() {
  const errors = checkPreviewConfig(readConfig(path.join(ROOT, 'capacitor.config.json')));
  if (errors.length) throw new Error(errors.join('\n'));
}

function syncAndroid() {
  checkSourceConfig();
  buildAndroid({ flavor: FLAVOR });
  const result = inspectAndroidArtifact({ expectedFlavor: FLAVOR });
  if (result.errors.length)
    throw new Error(`Android host artifact check failed:\n${result.errors.join('\n')}`);
  const capacitor = require.resolve('@capacitor/cli/bin/capacitor');
  execFileSync(process.execPath, [capacitor, 'sync', 'android'], { cwd: ROOT, stdio: 'inherit' });
  const errors = checkPublicPayload();
  if (errors.length) throw new Error(`Capacitor payload closure failed:\n${errors.join('\n')}`);
  return { flavor: FLAVOR, public: PUBLIC };
}

if (require.main === module) {
  if (process.argv.length === 2) syncAndroid();
  else if (process.argv.length === 3 && process.argv[2] === '--check') {
    checkSourceConfig();
    const errors = checkPublicPayload();
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Native sync configuration and payload closure passed.');
  } else throw new Error('Usage: node tools/sync-android.cjs [--check]');
}

module.exports = { checkPublicPayload, syncAndroid };
