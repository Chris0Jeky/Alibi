'use strict';
// Release-owned JSON representation only. No imports, generators or mutable object sharing.
const signature = (value) => JSON.stringify(Object.keys(value));
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function encode(value) {
  const counts = new Map();
  function visit(entry) {
    if (typeof entry === 'string' && entry.length >= 32)
      counts.set(entry, (counts.get(entry) || 0) + 1);
    else if (entry && typeof entry === 'object') Object.values(entry).forEach(visit);
  }
  visit(value);
  const dictionary = [...counts].filter(([, count]) => count > 1).map(([text]) => text);
  const indices = new Map(dictionary.map((text, index) => [text, index]));
  function encodeValue(value) {
    if (typeof value === 'string' && indices.has(value)) return [5, indices.get(value)];
    if (value === null || typeof value !== 'object') return value;
    if (!Array.isArray(value))
      return [1, ...Object.entries(value).flatMap(([key, entry]) => [key, encodeValue(entry)])];
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
      return [
        2,
        keys,
        value.length,
        ...keys.map((key) => encodeValue(value.map((entry) => entry[key]))),
      ];
    }
    // Preserve heterogeneous list order; group only consecutive identical record shapes.
    const groups = [];
    for (let i = 0; i < value.length; ) {
      let end = i + 1;
      if (record(value[i]))
        while (
          end < value.length &&
          record(value[end]) &&
          signature(value[end]) === signature(value[i])
        )
          end++;
      groups.push(end - i > 1 ? encodeValue(value.slice(i, end)) : [0, encodeValue(value[i])]);
      i = end;
    }
    return groups.some((group) => group[0] === 2)
      ? [4, ...groups]
      : [0, ...groups.map((group) => group[1])];
  }
  return [dictionary, encodeValue(value)];
}

// Kept self-contained: the static builder embeds this function, not this module.
function decode([dictionary, data]) {
  function read(value) {
    if (!Array.isArray(value)) return value;
    if (value[0] === 0) return value.slice(1).map(read);
    if (value[0] === 1) {
      const entries = [];
      for (let i = 1; i < value.length; i += 2) entries.push([value[i], read(value[i + 1])]);
      return Object.fromEntries(entries);
    }
    if (value[0] === 2) {
      const columns = value.slice(3).map(read);
      return Array.from({ length: value[2] }, (_, i) =>
        Object.fromEntries(value[1].map((key, j) => [key, columns[j][i]])),
      );
    }
    if (value[0] === 3) return Array.from(value[1], (character) => character.charCodeAt(0) - 35);
    if (value[0] === 4) return value.slice(1).flatMap(read);
    if (
      value[0] === 5 &&
      Number.isInteger(value[1]) &&
      value[1] >= 0 &&
      value[1] < dictionary.length &&
      typeof dictionary[value[1]] === 'string'
    )
      return dictionary[value[1]];
    throw Error('Invalid official content encoding.');
  }
  return read(data);
}

module.exports = { encode, decode };
