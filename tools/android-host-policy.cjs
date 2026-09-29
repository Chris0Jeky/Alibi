'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');

// Deliberate allowlist for the unapproved, plugin-free 8.5.2 preview, not a generic
// Capacitor schema. New native capabilities require a reviewed policy change.
const PREVIEW_CONFIG = {
  appId: 'example.unapproved.alibi.preview',
  appName: 'Alibi Android Preview',
  webDir: 'dist-android',
  loggingBehavior: 'debug',
  server: {
    hostname: 'localhost',
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [],
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
    minWebViewVersion: 120,
  },
  plugins: {
    SystemBars: { insetsHandling: 'css', style: 'DEFAULT', hidden: false },
  },
};

function checkPreviewConfig(value) {
  return isDeepStrictEqual(value, PREVIEW_CONFIG)
    ? []
    : ['Capacitor config differs from the reviewed plugin-free preview policy.'];
}

function readRegularFile(filename, limit = Infinity) {
  const stat = fs.lstatSync(filename);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error(`Expected a regular file, not a symlink or special file: ${filename}.`);
  if (stat.size > limit) throw new Error(`File exceeds the ${limit}-byte check limit: ${filename}.`);
  return fs.readFileSync(filename);
}

function readConfig(filename) {
  try {
    return JSON.parse(readRegularFile(filename, 65536).toString('utf8'));
  } catch (error) {
    throw new Error(`${path.basename(filename)} cannot be read: ${error.message}`);
  }
}

function regularFiles(directory) {
  const entries = new Map();
  function visit(current) {
    const stat = fs.lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error(`Expected a regular directory, not a symlink: ${current}.`);
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const filename = path.join(current, entry.name);
      if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile()))
        throw new Error(`Payload contains a symlink or special file: ${filename}.`);
      if (entry.isDirectory()) visit(filename);
      else {
        if (entries.size >= 10000) throw new Error('Native sync exceeds 10000 files.');
        const name = path.relative(directory, filename).split(path.sep).join('/');
        entries.set(name, filename);
      }
    }
  }
  visit(directory);
  return entries;
}

module.exports = { checkPreviewConfig, readRegularFile, readConfig, regularFiles };
