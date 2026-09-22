'use strict';

const { countNetwork } = require('./family-studies-network-oracle.cjs');
const { countTrail } = require('./family-studies-trail-oracle.cjs');
const { countBridges, bridgesGraph } = require('./family-studies-bridges-oracle.cjs');

module.exports = { countNetwork, countTrail, countBridges, bridgesGraph };
