// Fixed save contract for the pinned specimen, independently compared with its source in tests.
export const CASE_ID = 'reading-room-blackout';
export const CASE_HASH = '6b86c2495fdf4b8c720203b00b4765772aeac0505614b31be4b1aa378cfb6a2c';
export const verdicts = ['', 'supported', 'contradicted', 'not-established'];
const sources = ['checks', 'model', 'bell-log', 'maintenance', 'admission', 'custody'];
const keys = [
  [
    [1, [0, 1]],
    [3, [0, 1]],
    [2, [0, 1]],
  ],
  [
    [1, [2]],
    [3, [2, 3]],
    [2, [3]],
  ],
  [
    [3, [4, 5]],
    [2, [4, 5]],
    [1, [4]],
  ],
];
const list = (a, n, check) => Array.isArray(a) && a.length === n && Array.from(a).every(check);
export function freshCase() {
  return {
    id: CASE_ID,
    revision: 1,
    sourceSha256: CASE_HASH,
    answers: [],
    drafts: keys.map(() => keys.map(() => ['', []])),
    hints: [0, 0, 0],
    revealed: [false, false, false],
  };
}
export function validateCaseStudy(c) {
  const draft = (row, stage) =>
    list(
      row,
      3,
      (a) =>
        Array.isArray(a) &&
        a.length === 2 &&
        verdicts.includes(a[0]) &&
        Array.isArray(a[1]) &&
        a[1].length <= 2 * (stage + 1) &&
        new Set(a[1]).size === a[1].length &&
        Array.from(a[1]).every((id) => sources.slice(0, 2 * (stage + 1)).includes(id)),
    );
  if (
    !c ||
    Object.keys(c).length !== 7 ||
    c.id !== CASE_ID ||
    c.revision !== 1 ||
    c.sourceSha256 !== CASE_HASH ||
    !Array.isArray(c.answers) ||
    c.answers.length > 3 ||
    !Array.from(c.answers).every(
      (row, i) =>
        draft(row, i) &&
        row.every((a, j) => {
          const [v, refs] = keys[i][j];
          return (
            a[0] === verdicts[v] &&
            a[1].length === refs.length &&
            refs.every((r) => a[1].includes(sources[r]))
          );
        }),
    ) ||
    !list(c.drafts, 3, draft) ||
    !list(
      c.hints,
      3,
      (n, i) => Number.isInteger(n) && n >= 0 && n <= (i <= c.answers.length ? 3 : 0),
    ) ||
    !list(c.revealed, 3, (v, i) => typeof v === 'boolean' && (i <= c.answers.length || !v))
  )
    throw Error('Unknown or invalid case revision. Original notebook preserved.');
  return c;
}
