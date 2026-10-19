'use strict';
// Origin-shared Web Locks fixture; not a browser exclusion/durability test.
function fakeLocks() {
  const held = new Set();
  return {
    request(name, options, callback) {
      if (!options.ifAvailable) throw Error('Fixture requires bounded lock admission');
      if (held.has(name)) return Promise.resolve().then(() => callback(null));
      held.add(name);
      return Promise.resolve()
        .then(() => callback({ name, mode: 'exclusive' }))
        .finally(() => held.delete(name));
    },
  };
}
module.exports = { fakeLocks };
