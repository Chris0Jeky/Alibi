'use strict';
const buildQuietPack = require('./build-quiet-pack.cjs');
const buildCastle = require('./build-castle.cjs');

// Each optional activity has its own download manifest and byte accounting.
module.exports = function buildQuiet(root, dist, baseMedia, inlineBase, experience) {
  const quiet = buildQuietPack(root, dist, baseMedia, inlineBase, experience);
  const castle = buildCastle(root, dist);
  quiet.config.castle = castle.config;
  quiet.standalone.castle = castle.standalone;
  quiet.castleBytes = castle.bytes;
  return quiet;
};
