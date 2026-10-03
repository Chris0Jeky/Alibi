'use strict';
// Build-time representation only. The emitted, synchronous script restores exact JSON values.
const { transformSync } = require('esbuild');
const { encode, decode } = require('./official-data-codec.cjs');
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function serialize(globals) {
  if (!record(globals) || Object.keys(globals).some((key) => !/^[A-Z][A-Z0-9_]*$/.test(key)))
    throw Error('Invalid official global names.');
  // Match JSON.stringify's existing normalization (holes, non-finite numbers, toJSON).
  // Cycles and BigInt still fail at build time rather than producing partial content.
  const normalized = JSON.parse(JSON.stringify(globals));
  return transformSync(
    `Object.assign(globalThis,(${decode.toString()})(${JSON.stringify(encode(normalized))}));`,
    { minify: true, target: 'es2022', charset: 'utf8' },
  ).code;
}
// Fields read by listing, search, card and discovery surfaces before a definition is opened.
// A listing entry keeps these fields in the definition's own order; play needs the full chunk.
const LISTING_FIELDS = [
  'id',
  'revision',
  'type',
  'title',
  'subtitle',
  'difficulty',
  'difficultyStatus',
  'size',
  'minutes',
];
const keyOf = (p) => p.id + '@' + p.revision;
function listing(puzzle) {
  return Object.fromEntries(Object.entries(puzzle).filter(([key]) => LISTING_FIELDS.includes(key)));
}

// Replace deferred definitions by listing entries. Returns the initial catalogue, the
// ordered deferred keys and the full definitions with their catalogue positions.
function split(catalog, deferredKeys) {
  const keys = [],
    positions = [],
    definitions = [];
  const puzzles = catalog.puzzles.map((puzzle, index) => {
    if (!deferredKeys.has(keyOf(puzzle))) return puzzle;
    keys.push(keyOf(puzzle));
    positions.push(index);
    definitions.push(puzzle);
    return listing(puzzle);
  });
  if (keys.length !== deferredKeys.size)
    throw Error('Every deferred official definition must be in the catalogue');
  return { catalog: { ...catalog, puzzles }, keys, positions, definitions };
}

// Initial marker plus a once-only loader. It never reads definitions itself.
function deferredRuntime(url, keys) {
  const boot = (url, keys) => {
    const G = globalThis;
    let pending = null;
    const D = (G.ALIBI_DEFERRED = {
      url,
      keys,
      ready: !keys.length,
      has(p) {
        return !!p && !D.ready && D.keys.includes(p.id + '@' + p.revision);
      },
      ensure() {
        if (D.ready) return Promise.resolve();
        return (
          pending ||
          (pending = Promise.resolve().then(
            () =>
              new Promise((resolve, reject) => {
                let script,
                  timer,
                  settled = false;
                const finish = () => {
                  if (settled) return;
                  settled = true;
                  clearTimeout(timer);
                  if (script) {
                    script.onload = script.onerror = null;
                    script.remove();
                  }
                  pending = null;
                  if (D.ready) resolve();
                  else reject(Error('Puzzle definitions did not load.'));
                };
                try {
                  script = document.createElement('script');
                  script.src = D.url;
                  script.onload = script.onerror = finish;
                  timer = setTimeout(finish, 10000);
                  document.head.append(script);
                } catch {
                  finish();
                }
              }),
          ))
        );
      },
    });
    if (!D.ready && typeof addEventListener === 'function')
      addEventListener('load', () =>
        (G.requestIdleCallback || setTimeout)(() => D.ensure().catch(() => {})),
      );
  };
  return transformSync(`(${boot.toString()})(${JSON.stringify(url)},${JSON.stringify(keys)});`, {
    minify: true,
    target: 'es2022',
    charset: 'utf8',
  }).code;
}

// The deferred chunk validates every definition against its listing entry, then swaps all of
// them in place (object identity is kept for existing references). Any mismatch fails closed.
function serializeDeferred(keys, positions, definitions) {
  const normalized = JSON.parse(JSON.stringify(definitions));
  const apply = (definitions, keys, positions, fields) => {
    const G = globalThis,
      D = G.ALIBI_DEFERRED,
      P = G.ALIBI_CATALOG?.puzzles;
    if (!D || !Array.isArray(P)) throw Error('Deferred definitions have no listing.');
    if (D.ready) return;
    if (
      definitions.length !== keys.length ||
      positions.length !== keys.length ||
      JSON.stringify(D.keys) !== JSON.stringify(keys)
    )
      throw Error('Deferred definitions do not match the listing.');
    const entries = definitions.map((definition, i) => {
      const entry = P[positions[i]],
        own = Object.keys(entry || {});
      if (
        !entry ||
        entry.id + '@' + entry.revision !== keys[i] ||
        definition.id !== entry.id ||
        definition.revision !== entry.revision ||
        definition.type !== entry.type ||
        JSON.stringify(own) !==
          JSON.stringify(Object.keys(definition).filter((key) => fields.includes(key))) ||
        own.some((key) => JSON.stringify(entry[key]) !== JSON.stringify(definition[key]))
      )
        throw Error('Deferred definition ' + keys[i] + ' does not match its listing.');
      return entry;
    });
    entries.forEach((entry, i) => {
      for (const key of Object.keys(entry)) delete entry[key];
      Object.assign(entry, definitions[i]);
    });
    D.ready = true;
  };
  return transformSync(
    `(${apply.toString()})((${decode.toString()})(${JSON.stringify(encode(normalized))}),${JSON.stringify(keys)},${JSON.stringify(positions)},${JSON.stringify(LISTING_FIELDS)});`,
    { minify: true, target: 'es2022', charset: 'utf8' },
  ).code;
}
module.exports = {
  serialize,
  split,
  listing,
  deferredRuntime,
  serializeDeferred,
  LISTING_FIELDS,
};
