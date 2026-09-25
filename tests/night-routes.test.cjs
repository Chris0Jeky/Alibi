'use strict';
const { verifyCollection } = require('./helpers/night-collection-contract.cjs');
verifyCollection('night-routes', ['network', 'trail', 'bridges']);
