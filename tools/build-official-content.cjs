'use strict';
// Build-time representation only. The emitted, synchronous script restores exact JSON values.
const { transformSync } = require('esbuild');
const signature = (value) => JSON.stringify(Object.keys(value));
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function encode(value) {
  if (value === null || typeof value !== 'object') return value;
  if (!Array.isArray(value))
    return [1, ...Object.entries(value).flatMap(([key, entry]) => [key, encode(entry)])];
  if (
    value.length >= 5 &&
    value.every((entry) => Number.isInteger(entry) && entry >= -2 && entry <= 89)
  )
    return [3, value.map((entry) => String.fromCharCode(entry + 35)).join('')];
  if (
    value.length > 1 &&
    record(value[0]) &&
    value.every((entry) => record(entry) && signature(entry) === signature(value[0]))
  ) {
    const keys = Object.keys(value[0]);
    return [2, keys, value.length, ...keys.map((key) => encode(value.map((entry) => entry[key])))];
  }
  // Preserve heterogeneous list order; group only consecutive identical record shapes.
  const groups = [];
  for (let i = 0; i < value.length;) {
    let end = i + 1;
    if (record(value[i]))
      while (
        end < value.length &&
        record(value[end]) &&
        signature(value[end]) === signature(value[i])
      )
        end++;
    groups.push(end - i > 1 ? encode(value.slice(i, end)) : [0, encode(value[i])]);
    i = end;
  }
  return groups.some((group) => group[0] === 2)
    ? [4, ...groups]
    : [0, ...groups.map((group) => group[1])];
}

// Tags describe every container, so ordinary arrays/strings/property names cannot collide.
// This decodes release-owned output, not imports or untrusted network requests.
function decode(value) {
  if (!Array.isArray(value)) return value;
  if (value[0] === 0) return value.slice(1).map(decode);
  if (value[0] === 1) {
    const entries = [];
    for (let i = 1; i < value.length; i += 2) entries.push([value[i], decode(value[i + 1])]);
    return Object.fromEntries(entries);
  }
  if (value[0] === 2) {
    const columns = value.slice(3).map(decode);
    return Array.from({ length: value[2] }, (_, i) =>
      Object.fromEntries(value[1].map((key, j) => [key, columns[j][i]])),
    );
  }
  if (value[0] === 3) return Array.from(value[1], (character) => character.charCodeAt(0) - 35);
  if (value[0] === 4) return value.slice(1).flatMap(decode);
  throw Error('Invalid official content encoding.');
}

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
  const source = `(()=>{const G=globalThis;let pending=null;const D=G.ALIBI_DEFERRED={url:${JSON.stringify(url)},keys:${JSON.stringify(keys)},ready:${keys.length ? 'false' : 'true'},has(p){return !!p&&!D.ready&&D.keys.includes(p.id+'@'+p.revision)},ensure(){return D.ready?Promise.resolve():pending||(pending=new Promise((resolve,reject)=>{const s=document.createElement('script'),fail=()=>{s.remove();pending=null;reject(Error('Puzzle definitions did not load.'))};s.src=D.url;s.onload=()=>D.ready?resolve():fail();s.onerror=fail;document.head.append(s)}))}};if(!D.ready&&typeof addEventListener==='function')addEventListener('load',()=>(G.requestIdleCallback||setTimeout)(()=>D.ensure().catch(()=>{})))})();`;
  return transformSync(source, { minify: true, target: 'es2022', charset: 'utf8' }).code;
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
