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
module.exports = { serialize };
