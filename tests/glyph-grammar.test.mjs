import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAMMARS,
  CHOICES,
  OBSERVATIONS,
  TRANSFER,
  parse,
  compatible,
  analyze,
  judgeTransfer,
  judgeDraft,
  hint,
  deductions,
  initialState,
  reduce,
} from '../prototypes/glyph-grammar/model.mjs';

// Independent oracle generates every utterance from its meaning instead of parsing positions.
function language(g) {
  const utterances = new Map();
  for (const actor of ['P', 'Q'])
    for (const verb of ['H', 'R'])
      for (const noun of ['X', 'Y', 'Z'])
        for (const marked of [false, true]) {
          const phrase = marked ? (g.position === 'before' ? ['D', noun] : [noun, 'D']) : [noun];
          const words = g.order === 'first' ? [actor, verb, ...phrase] : [...phrase, verb, actor];
          utterances.set(words.join(' '), {
            who: g[actor],
            relation: g[verb],
            count: marked ? g.D : '1',
            tool: g[noun],
          });
        }
  return utterances;
}
const oracle = GRAMMARS.map((g) => ({ grammar: g, words: language(g) }));
const read = (who = 'Lark', count = '2', relation = 'requests', tool = 'lamp') => ({
  who,
  relation,
  count,
  tool,
});
test('192 unique grammars and all 4608 independently generated utterances agree', () => {
  assert.equal(GRAMMARS.length, 192);
  assert.equal(new Set(GRAMMARS.map(JSON.stringify)).size, 192);
  for (const { grammar, words } of oracle) {
    assert.equal(words.size, 24);
    for (const [wordsText, meaning] of words)
      assert.deepEqual(parse(grammar, wordsText.split(' ')), meaning);
  }
});
test('each observation prefix matches the independent oracle; unseen composition is supported', () => {
  const counts = [];
  for (let n = 0; n <= 4; n++) {
    const evidence = OBSERVATIONS.slice(0, n);
    const expected = oracle
      .filter(({ words }) =>
        evidence.every(
          (o) => JSON.stringify(words.get(o.tokens.join(' '))) === JSON.stringify(o.reading),
        ),
      )
      .map((x) => x.grammar);
    assert.deepEqual(compatible(evidence), expected);
    counts.push(expected.length);
  }
  assert.deepEqual(counts, [192, 8, 4, 4, 1]);
  assert.ok(!OBSERVATIONS.some((o) => o.tokens.join(' ') === TRANSFER.join(' ')));
  assert.equal(judgeTransfer(read(), OBSERVATIONS).status, 'supported');
  assert.equal(judgeTransfer(read('Moss'), OBSERVATIONS).status, 'contradicted');
});
test('possible is not supported: keep alternate readings AND syntax refusals', () => {
  const evidence = OBSERVATIONS.slice(0, 2),
    result = analyze(evidence);
  assert.equal(result.candidates, 4);
  assert.equal(result.syntaxRefusals, 2);
  assert.equal(result.readings.length, 2);
  assert.equal(result.status, 'open');
  assert.equal(judgeTransfer(read(), evidence).status, 'possible');
  assert.equal(judgeTransfer(read('Lark', '1'), evidence).status, 'possible');
  assert.equal(judgeTransfer(read('Lark', '2', 'owns'), evidence).status, 'contradicted');
});
test('malformed, over-bound and contradictory evidence cannot establish an answer', () => {
  for (const evidence of [
    null,
    [...OBSERVATIONS, OBSERVATIONS[0]],
    [{ tokens: ['bad'], reading: read() }],
    [{ ...OBSERVATIONS[0], reading: {} }],
  ])
    assert.equal(judgeTransfer(read(), evidence).status, 'invalid');
  const conflict = [
    OBSERVATIONS[0],
    { ...OBSERVATIONS[0], reading: { ...OBSERVATIONS[0].reading, who: 'Moss' } },
  ];
  assert.equal(compatible(conflict).length, 0);
  assert.equal(judgeTransfer(read(), conflict).status, 'unavailable');
  assert.equal(analyze([], ['P', 'P', 'P']).status, 'unavailable');
  assert.equal(analyze([], ['unknown']).status, 'invalid');
  assert.equal(judgeTransfer({}, OBSERVATIONS).status, 'incomplete');
  assert.equal(parse(GRAMMARS[0], ['D', 'P', 'H', 'X']), null);
  assert.equal(parse({ ...GRAMMARS[0], Q: GRAMMARS[0].P }, ['P', 'H', 'X']), null);
});
test('changing authored evidence changes deductions and transfer; there is no privileged dictionary', () => {
  const swapped = OBSERVATIONS.map((o) => ({
    ...o,
    reading: { ...o.reading, who: o.reading.who === 'Lark' ? 'Moss' : 'Lark' },
  }));
  assert.equal(judgeTransfer(read('Moss'), swapped).status, 'supported');
  assert.equal(judgeTransfer(read(), swapped).status, 'contradicted');
  assert.equal(deductions(swapped).P, 'Moss');
  assert.equal(deductions(OBSERVATIONS.slice(0, 2)).D, undefined);
});
test('incomplete and duplicate drafts are retained, not used to certify a transfer answer', () => {
  const blank = initialState().draft;
  assert.equal(judgeDraft(blank, OBSERVATIONS).status, 'incomplete');
  const duplicate = { ...blank, P: 'Lark', Q: 'Lark' };
  assert.equal(judgeDraft(duplicate, OBSERVATIONS).status, 'contradicted');
  assert.equal(duplicate.Q, 'Lark');
  assert.equal(judgeDraft({ ...blank, wrong: 'x' }, OBSERVATIONS).status, 'invalid');
  assert.equal(judgeDraft(compatible(OBSERVATIONS)[0], OBSERVATIONS).status, 'compatible');
  let state = {
    ...initialState(),
    seen: 2,
    draft: { ...compatible(OBSERVATIONS)[0] },
    answer: read(),
  };
  state = reduce(state, { type: 'check-answer' });
  assert.equal(state.answerResult.status, 'possible');
});
test('hints use only shown evidence, never expose a hidden future card or final reading', () => {
  for (const n of [0, 1, 2, 3]) {
    const text = hint(OBSERVATIONS.slice(0, n), 3);
    assert.match(text, /No shown card/);
    assert.doesNotMatch(text, /Card 4|two lamps|Lark requests/);
  }
  assert.match(hint(OBSERVATIONS, 3), /Card 4/);
  assert.match(hint(OBSERVATIONS.slice(0, 3), 2), /cards 1 and 3/);
  assert.deepEqual(deductions([]), {});
});
test('edits, story and new evidence preserve drafts; reset clears only rehearsal memory', () => {
  let state = reduce(initialState(), { type: 'draft', key: 'P', value: 'Moss' });
  state = reduce(state, { type: 'check-draft' });
  assert.equal(state.draftResult.status, 'contradicted');
  state = reduce(state, { type: 'story' });
  assert.equal(state.draft.P, 'Moss');
  state = reduce(state, { type: 'next' });
  assert.equal(state.draft.P, 'Moss');
  assert.equal(state.draftResult, null);
  state = reduce(state, { type: 'hint' });
  assert.equal(state.reveal, false);
  assert.equal(state.hint, 1);
  state = reduce(state, { type: 'reveal' });
  assert.equal(state.reveal, true);
  assert.equal(reduce(state, { type: 'draft', key: 'P', value: 'unknown' }), state);
  assert.deepEqual(reduce(state, { type: 'restart' }), initialState());
  assert.equal(Object.keys(CHOICES).length, 10);
});
