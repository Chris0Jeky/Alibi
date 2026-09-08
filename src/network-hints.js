/* Answer-independent guidance for incomplete Signal paths. */
(function (root) {
  'use strict';
  const rotate = (mask, turns) => {
    for (let i = 0; i < turns; i++) mask = ((mask << 1) & 15) | (mask >>> 3);
    return mask;
  };
  function hint(p, s) {
    if (!p || p.type !== 'network' || !s || !Array.isArray(s.rotations)) return null;
    const n = p.size,
      locked = new Set(p.locked || []),
      count = n * n;
    if (!Number.isInteger(n) || n < 1 || s.rotations.length !== count) return null;
    const masks = p.tiles.map((m, i) => rotate(m, s.rotations[i]));
    const domains = p.tiles.map((base, i) => {
      const r = Math.floor(i / n),
        c = i % n,
        options = locked.has(i)
          ? [masks[i]]
          : [...new Set([0, 1, 2, 3].map((k) => rotate(base, k)))];
      return options.filter(
        (m) =>
          !(r === 0 && m & 1) &&
          !(c === n - 1 && m & 2) &&
          !(r === n - 1 && m & 4) &&
          !(c === 0 && m & 8),
      );
    });
    // Arc consistency only: optional neighbours must agree on both presence and absence.
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < count; i++) {
        const neighbours = [
          [i - n, 1, 4],
          [i + 1, 2, 8],
          [i + n, 4, 1],
          [i - 1, 8, 2],
        ].filter(
          ([j, bit]) =>
            j >= 0 &&
            j < count &&
            (!(bit === 2 || bit === 8) || Math.floor(j / n) === Math.floor(i / n)),
        );
        const next = domains[i].filter((m) =>
          neighbours.every(([j, a, b]) =>
            domains[j].some((q) => Boolean(m & a) === Boolean(q & b)),
          ),
        );
        if (next.length !== domains[i].length) {
          domains[i] = next;
          changed = true;
        }
      }
    }
    if (domains.some((x) => x.length === 0))
      return {
        rule: 'Check the fixed network',
        message:
          'The fixed tiles and perimeter have no locally consistent orientation. Revalidate this definition; this is not a verdict on your unplaced connections.',
        cells: [],
      };
    for (let i = 0; i < count; i++)
      if (!locked.has(i) && domains[i].length === 1 && domains[i][0] !== masks[i]) {
        const requiredMask = domains[i][0],
          names = [
            [1, 'north'],
            [2, 'east'],
            [4, 'south'],
            [8, 'west'],
          ]
            .filter(([b]) => requiredMask & b)
            .map(([, name]) => name);
        return {
          rule: 'An orientation is forced',
          message: `${String.fromCharCode(65 + (i % n))}${Math.floor(i / n) + 1} must connect ${names.join(' and ')}. The perimeter and reciprocal neighbouring shapes rule out its other orientations.`,
          cells: [i],
          requiredMask,
          proofKind: 'perimeter-and-reciprocal-domain-propagation',
          automaticAction: null,
        };
      }
    if (s.rotations.every((x) => x === 0))
      return {
        rule: 'Build the network',
        message:
          'Start at the perimeter: no connector can point off the board. Then join reciprocal neighbours into one network. Open connections are expected in a starting board.',
        cells: [],
        proofKind: 'strategy',
        automaticAction: null,
      };
    return null;
  }
  root.AlibiCuratedNetworkHints = { hint };
  if (typeof module !== 'undefined' && module.exports)
    module.exports = root.AlibiCuratedNetworkHints;
})(globalThis);
