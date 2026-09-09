'use strict';
const crypto = require('node:crypto');
const buildQuietPack = require('./build-quiet-pack.cjs');
const buildCastle = require('./build-castle.cjs');

// The root build owns one optional-pack manifest; activities execute only when entered.
module.exports = function buildQuiet(root, dist, baseMedia, inlineBase, experience) {
  const quiet = buildQuietPack(root, dist, baseMedia, inlineBase, experience);
  const castle = buildCastle(root, dist);
  quiet.config.castle = castle.config;
  quiet.config.files.push(castle.config.script);
  quiet.config.build = crypto
    .createHash('sha256')
    .update(quiet.config.build + JSON.stringify(castle.config))
    .digest('hex')
    .slice(0, 12);
  quiet.standalone.castle = castle.standalone;
  quiet.bytes += castle.bytes;
  return quiet;
};
