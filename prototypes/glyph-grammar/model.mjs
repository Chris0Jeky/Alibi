export const MARKS = Object.freeze(
  [
    ['P', 'Notched ring', 'Workshop'],
    ['Q', 'Forked stem', 'Workshop'],
    ['X', 'Open corner', 'Tool'],
    ['Y', 'Double wave', 'Tool'],
    ['Z', 'Bridge arch', 'Tool'],
    ['H', 'Twin bars', 'Relation'],
    ['R', 'Dot on rail', 'Relation'],
    ['D', 'Split chevron', 'Count'],
  ].map(([id, name, group]) => Object.freeze({ id, name, group })),
);
const people = ['Lark', 'Moss'],
  tools = ['bowl', 'lamp', 'spoon'],
  relations = ['owns', 'requests'];
export const CHOICES = Object.freeze(
  Object.fromEntries(
    [
      ['P', people],
      ['Q', people],
      ['X', tools],
      ['Y', tools],
      ['Z', tools],
      ['H', relations],
      ['R', relations],
      ['D', ['1', '2']],
      ['order', ['first', 'last']],
      ['position', ['before', 'after']],
    ].map(([key, values]) => [key, Object.freeze(values)]),
  ),
);
export const ANSWERS = Object.freeze({
  who: people,
  relation: relations,
  count: ['1', '2'],
  tool: tools,
});
function permutations(values) {
  return values.length
    ? values.flatMap((value, i) =>
        permutations(values.filter((_, j) => j !== i)).map((rest) => [value, ...rest]),
      )
    : [[]];
}
const grammars = [];
for (const [P, Q] of permutations(people))
  for (const [X, Y, Z] of permutations(tools))
    for (const [H, R] of permutations(relations))
      for (const D of CHOICES.D)
        for (const order of CHOICES.order)
          for (const position of CHOICES.position)
            grammars.push(Object.freeze({ P, Q, X, Y, Z, H, R, D, order, position }));
export const GRAMMARS = Object.freeze(grammars);
export const OBSERVATIONS = Object.freeze(
  [
    [
      ['P', 'H', 'X'],
      ['Lark', 'owns', '1', 'bowl'],
    ],
    [
      ['Q', 'R', 'Y'],
      ['Moss', 'requests', '1', 'lamp'],
    ],
    [
      ['P', 'R', 'Z'],
      ['Lark', 'requests', '1', 'spoon'],
    ],
    [
      ['Q', 'H', 'D', 'Z'],
      ['Moss', 'owns', '2', 'spoon'],
    ],
  ].map(([tokens, values]) =>
    Object.freeze({
      tokens: Object.freeze(tokens),
      reading: Object.freeze(
        Object.fromEntries(Object.keys(ANSWERS).map((key, i) => [key, values[i]])),
      ),
    }),
  ),
);
export const TRANSFER = Object.freeze(['P', 'R', 'D', 'Y']);
const same = (a, b) => a && b && Object.keys(ANSWERS).every((key) => a[key] === b[key]);
function choicesValid(value, options, partial = false) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => Object.hasOwn(options, key)) &&
    Object.entries(options).every(
      ([key, values]) => values.includes(value[key]) || (partial && value[key] === ''),
    )
  );
}
function tokensValid(tokens) {
  return (
    Array.isArray(tokens) &&
    [3, 4].includes(tokens.length) &&
    tokens.every((id) => MARKS.some((m) => m.id === id))
  );
}
export function parse(grammar, tokens) {
  if (
    !choicesValid(grammar, CHOICES) ||
    !tokensValid(tokens) ||
    [
      ['P', 'Q'],
      ['X', 'Y', 'Z'],
      ['H', 'R'],
    ].some((keys) => new Set(keys.map((key) => grammar[key])).size !== keys.length)
  )
    return null;
  const first = grammar.order === 'first';
  const person = first ? tokens[0] : tokens.at(-1),
    verb = first ? tokens[1] : tokens.at(-2);
  let phrase = first ? tokens.slice(2) : tokens.slice(0, -2),
    count = '1';
  if (!['P', 'Q'].includes(person) || !['H', 'R'].includes(verb)) return null;
  if (phrase.length === 2) {
    const mark = grammar.position === 'before' ? 0 : 1;
    if (phrase[mark] !== 'D') return null;
    phrase = [phrase[1 - mark]];
    count = grammar.D;
  }
  if (phrase.length !== 1 || !['X', 'Y', 'Z'].includes(phrase[0])) return null;
  return { who: grammar[person], relation: grammar[verb], count, tool: grammar[phrase[0]] };
}
export function compatible(evidence) {
  if (
    !Array.isArray(evidence) ||
    evidence.length > 4 ||
    evidence.some(
      (item) => !item || !tokensValid(item.tokens) || !choicesValid(item.reading, ANSWERS),
    )
  )
    return null;
  return GRAMMARS.filter((g) =>
    evidence.every((item) => same(parse(g, item.tokens), item.reading)),
  );
}
export function analyze(evidence, tokens = TRANSFER) {
  const candidates = compatible(evidence);
  if (!candidates || !tokensValid(tokens))
    return { status: 'invalid', candidates: 0, syntaxRefusals: 0, readings: [] };
  const readings = [],
    parsed = candidates.map((g) => parse(g, tokens));
  for (const reading of parsed)
    if (reading && !readings.some((r) => same(r, reading))) readings.push(reading);
  const syntaxRefusals = parsed.filter((reading) => !reading).length;
  return {
    status:
      !candidates.length || !readings.length
        ? 'unavailable'
        : readings.length === 1 && !syntaxRefusals
          ? 'settled'
          : 'open',
    candidates: candidates.length,
    syntaxRefusals,
    readings,
  };
}
export function judgeTransfer(reading, evidence) {
  const analysis = analyze(evidence);
  if (['invalid', 'unavailable'].includes(analysis.status)) return analysis;
  if (!choicesValid(reading, ANSWERS)) return { ...analysis, status: 'incomplete' };
  const matches = compatible(evidence).filter((g) => same(parse(g, TRANSFER), reading)).length;
  return {
    ...analysis,
    status: !matches ? 'contradicted' : matches === analysis.candidates ? 'supported' : 'possible',
  };
}
export function judgeDraft(draft, evidence) {
  const candidates = compatible(evidence);
  if (!candidates || !choicesValid(draft, CHOICES, true)) return { status: 'invalid' };
  if (!candidates.length) return { status: 'unavailable' };
  const fits = candidates.filter((g) =>
    Object.entries(draft).every(([key, value]) => !value || g[key] === value),
  );
  return {
    status: !fits.length
      ? 'contradicted'
      : Object.values(draft).includes('')
        ? 'incomplete'
        : 'compatible',
  };
}
export function hint(evidence, level = 1) {
  if (!compatible(evidence)?.length)
    return 'These observations do not support a reading. Check the evidence before drawing a conclusion.';
  if (level < 2)
    return 'Treat your entries as hypotheses. The same mark keeps its meaning in every shown card; one unmarked tool means one tool.';
  if (level === 2) {
    for (let i = 0; i < evidence.length; i++)
      for (let j = i + 1; j < evidence.length; j++) {
        const common = evidence[i].tokens.find((id) => evidence[j].tokens.includes(id));
        if (common)
          return `Compare cards ${i + 1} and ${j + 1}: both contain ${MARKS.find((m) => m.id === common).name}. Look at what stays the same in their descriptions.`;
      }
    return 'One card may leave several readings possible. Keep uncertain entries open and inspect another card.';
  }
  const marked = evidence.findIndex((item) => item.tokens.includes('D'));
  return marked < 0
    ? 'No shown card contains Split chevron. Its meaning and position are still uncertain; another observation is needed.'
    : `Card ${marked + 1} contains Split chevron. Compare its quantity with an unmarked card, then notice which side of the tool mark it occupies.`;
}
export function deductions(evidence) {
  const candidates = compatible(evidence);
  if (!candidates?.length) return {};
  return Object.fromEntries(
    Object.keys(CHOICES)
      .filter((key) => candidates.every((g) => g[key] === candidates[0][key]))
      .map((key) => [key, candidates[0][key]]),
  );
}
export function initialState() {
  return {
    seen: 1,
    draft: Object.fromEntries(Object.keys(CHOICES).map((key) => [key, ''])),
    answer: Object.fromEntries(Object.keys(ANSWERS).map((key) => [key, ''])),
    story: true,
    hint: 0,
    reveal: false,
    draftResult: null,
    answerResult: null,
  };
}
export function reduce(state, action) {
  const evidence = OBSERVATIONS.slice(0, state.seen);
  switch (action.type) {
    case 'draft':
    case 'answer': {
      const options = action.type === 'draft' ? CHOICES : ANSWERS;
      if (
        !Object.hasOwn(options, action.key) ||
        (action.value !== '' && !options[action.key].includes(action.value))
      )
        return state;
      return {
        ...state,
        [action.type]: { ...state[action.type], [action.key]: action.value },
        [`${action.type}Result`]: null,
      };
    }
    case 'next':
      return state.seen === 4
        ? state
        : {
            ...state,
            seen: state.seen + 1,
            draftResult: null,
            answerResult: null,
            hint: 0,
            reveal: false,
          };
    case 'check-draft':
      return { ...state, draftResult: judgeDraft(state.draft, evidence) };
    case 'check-answer':
      return { ...state, answerResult: judgeTransfer(state.answer, evidence) };
    case 'hint':
      return { ...state, hint: Math.min(3, state.hint + 1) };
    case 'reveal':
      return { ...state, reveal: !state.reveal };
    case 'story':
      return { ...state, story: !state.story };
    case 'restart':
      return initialState();
    default:
      return state;
  }
}
