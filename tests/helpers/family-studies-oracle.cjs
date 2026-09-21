'use strict';

const { countNonogram, countBinary, countFutoshiki } = require('./family-studies-grid-oracle.cjs');
const { countLightup, countTents, countAquarium } = require('./family-studies-placement-oracle.cjs');
const { countNetwork, countTrail, countBridges, bridgesGraph } = require('./family-studies-route-oracle.cjs');

const counters = {
  nonogram: countNonogram,
  binary: countBinary,
  futoshiki: countFutoshiki,
  lightup: countLightup,
  tents: countTents,
  aquarium: countAquarium,
  network: countNetwork,
  trail: countTrail,
  bridges: countBridges,
};

module.exports = {
  counters,
  countNonogram,
  countBinary,
  countFutoshiki,
  countLightup,
  countTents,
  countAquarium,
  countNetwork,
  countTrail,
  countBridges,
  bridgesGraph,
};
