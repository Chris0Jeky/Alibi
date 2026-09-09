export const positions = {
  open: 'Open question',
  supported: 'Supported for now',
  reconsider: 'Needs revision',
};
const recordIds = ['maintenance', 'ticket', 'path', 'margin'];
export function validateTheories(value = []) {
  if (
    !Array.isArray(value) ||
    value.length > 8 ||
    new Set(value.map((x) => x?.id)).size !== value.length
  )
    throw Error('The evidence board holds up to eight distinct hypotheses.');
  for (const theory of value) {
    if (
      !theory ||
      typeof theory !== 'object' ||
      Array.isArray(theory) ||
      Object.keys(theory).some((key) => !['id', 'text', 'position', 'records'].includes(key)) ||
      !/^h[1-8]$/.test(theory.id) ||
      typeof theory.text !== 'string' ||
      !theory.text.trim() ||
      theory.text.length > 600 ||
      !Object.hasOwn(positions, theory.position) ||
      !Array.isArray(theory.records) ||
      theory.records.length > 4 ||
      new Set(theory.records).size !== theory.records.length ||
      !theory.records.every((id) => recordIds.includes(id))
    )
      throw Error('Invalid hypothesis. The original notebook has been left unchanged.');
  }
  return JSON.parse(JSON.stringify(value));
}
export function mergeTheories(current = [], incoming = []) {
  const next = validateTheories(current);
  for (const theory of validateTheories(incoming)) {
    if (
      next.some(
        (t) =>
          t.text === theory.text &&
          t.position === theory.position &&
          [...t.records].sort().join() === [...theory.records].sort().join(),
      )
    )
      continue;
    const id = Array.from({ length: 8 }, (_, i) => `h${i + 1}`).find(
      (id) => !next.some((t) => t.id === id),
    );
    if (!id)
      throw Error(
        'Merging would exceed eight hypotheses. Keep both exports and make room on the evidence board first.',
      );
    next.push({ ...theory, id });
  }
  return next;
}

export const labelQuestions = {
  bridges: {
    prompt:
      'Your route attempts keep failing. Which museum label explains why every possible walk must fail?',
    options: [
      ['attempts', 'Nobody at this table found a route, so it is impossible.'],
      [
        'structure',
        'All four land areas have odd degree. A connected one-stroke walk needs zero or two odd areas.',
      ],
      ['distance', 'The bridges are too far apart for one walk.'],
    ],
    answer: 'structure',
    feedback:
      'Failed attempts are not proof. Counting odd connections explains the obstruction for every possible route in this connected diagram.',
    transfer:
      'At the Map Room, distinguish a route you have tried from a conclusion about all routes.',
  },
  magic: {
    prompt:
      'A draft label gives an exact inventor and date for the Lo Shu. Which replacement does the evidence support?',
    options: [
      ['inventor', 'Emperor Yu invented this puzzle in 2200 BCE.'],
      [
        'tradition',
        'Chinese tradition links the Lo Shu to a turtle legend. This source does not establish an exact inventor or invention date.',
      ],
      ['orientation', 'Only the orientation shown here is a valid Lo Shu solution.'],
    ],
    answer: 'tradition',
    feedback:
      'Gresham presents the turtle account as a legend. The sum of 15 is a mathematical property; it cannot date the invention. Rotations and reflections still solve our exhibit.',
    transfer:
      'In the castle, a confident printed label still needs a source. Keep what is known separate from a story about its origin.',
  },
  ur: {
    prompt:
      'Which label keeps the surviving objects separate from this exhibit’s probability model?',
    options: [
      ['rules', 'The objects prove ancient players used four independent, fair binary dice.'],
      [
        'model',
        'The museum records a board and a marked tetrahedral die from Ur. Four fair binary dice are our stated modern model.',
      ],
      ['complete', 'The marks on the die establish the complete ancient game.'],
    ],
    answer: 'model',
    feedback:
      'The objects support the material description and dates. Four dice, fairness and independence are assumptions in our model; calculating its outcomes does not authenticate ancient rules.',
    transfer:
      'The seven-minute castle route is also a stated model. A possible arrival is not a witnessed arrival.',
  },
};
export function validateLabels(labels = {}, completed = {}) {
  if (
    !labels ||
    typeof labels !== 'object' ||
    Array.isArray(labels) ||
    Object.entries(labels).some(
      ([id, answer]) =>
        !Object.hasOwn(labelQuestions, id) ||
        answer !== labelQuestions[id].answer ||
        !Object.hasOwn(completed, id),
    )
  )
    throw Error(
      'Invalid curatorial record. Complete the object investigation before revising its label.',
    );
  return { ...labels };
}
