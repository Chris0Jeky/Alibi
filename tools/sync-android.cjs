#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { buildAndroid } = require('./build-android.cjs');
const { inspectAndroidArtifact } = require('./check-android-artifact.cjs');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'android', 'app', 'src', 'main', 'assets');
const PUBLIC = path.join(ASSETS, 'public');
const FLAVOR = 'capacitor-preview';
const CAPACITOR_PUBLIC_EXTRAS = new Set(['cordova.js', 'cordova_plugins.js']);

function files(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? files(filename) : [filename];
  });
}

function relative(directory, filename) {
  return path.relative(directory, filename).split(path.sep).join('/');
}

function checkPublicPayload({ source = path.join(ROOT, 'dist-android'), target = PUBLIC } = {}) {
  const errors = [];
  const sourceFiles = files(source)
    .map((filename) => relative(source, filename))
    .sort();
  const targetFiles = files(target)
    .map((filename) => relative(target, filename))
    .sort();
  const copiedFiles = targetFiles.filter((name) => !CAPACITOR_PUBLIC_EXTRAS.has(name));
  if (sourceFiles.join('\n') !== copiedFiles.join('\n')) {
    errors.push('Capacitor public payload file set differs from the checked Android payload.');
  }
  for (const name of CAPACITOR_PUBLIC_EXTRAS) {
    if (!targetFiles.includes(name))
      errors.push(`Expected generated Capacitor file is missing: ${name}.`);
  }
  for (const name of sourceFiles) {
    const sourceBytes = fs.readFileSync(path.join(source, ...name.split('/')));
    const targetFile = path.join(target, ...name.split('/'));
    if (!fs.existsSync(targetFile) || !sourceBytes.equals(fs.readFileSync(targetFile)))
      errors.push(`Capacitor public payload differs for ${name}.`);
  }
  for (const name of ['capacitor.config.json', 'capacitor.plugins.json']) {
    if (!fs.existsSync(path.join(path.dirname(target), name)))
      errors.push(`Expected generated Capacitor extra is missing: ${name}.`);
  }
  return errors;
}

function syncAndroid() {
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
  syncAndroid();
}

module.exports = { checkPublicPayload, syncAndroid };
