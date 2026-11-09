'use strict';
const buildQuietPack = require('./build-quiet-pack.cjs');
const buildCastle = require('./build-castle.cjs');

// Each optional activity has its own download manifest and byte accounting.
module.exports = function buildQuiet(root, dist, baseMedia, inlineBase, experience) {
  const quiet = buildQuietPack(root, dist, baseMedia, inlineBase, experience);
  const castle = buildCastle(root, dist);
  const eclipse = require('./build-eclipse.cjs')(root, dist);
  quiet.config.castle = castle.config;
  quiet.standalone.castle = castle.standalone;
  quiet.castleBytes = castle.bytes;
  quiet.config.eclipse = eclipse.config;
  quiet.standalone.eclipse = eclipse.standalone;
  quiet.eclipseBytes = eclipse.bytes;
  quiet.eclipseGzipBytes = eclipse.gzipBytes;
  const timeline = require('./build-timeline.cjs')(root, dist);
  quiet.config.timeline = timeline.config;
  quiet.standalone.timeline = timeline.standalone;
  quiet.timelineBytes = timeline.bytes;
  quiet.timelineGzipBytes = timeline.gzipBytes;
  return quiet;
};
