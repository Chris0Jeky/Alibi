import {
  MARKS,
  CHOICES,
  ANSWERS,
  OBSERVATIONS,
  TRANSFER,
  analyze,
  deductions,
  hint,
  initialState,
  reduce,
} from './model.mjs';

const $ = (id) => document.getElementById(id);
const paths = {
  P: '<path d="M30 7a17 17 0 1 0 5 24M30 7v9h8"/>',
  Q: '<path d="M22 38V20L9 8M22 20L35 8M22 29h10"/>',
  X: '<path d="M35 10H10v25h13M10 23h10"/>',
  Y: '<path d="M7 16q8-12 15 0t15 0M7 30q8-12 15 0t15 0"/>',
  Z: '<path d="M8 36V23a14 14 0 0 1 28 0v13M8 28h28"/>',
  H: '<path d="M9 14h26M9 30h26M15 10v8M29 26v8"/>',
  R: '<path d="M7 30h30M14 30v7M30 30v7"/><circle cx="22" cy="14" r="4"/>',
  D: '<path d="M8 10l10 12L8 34M28 10l10 12-10 12"/>',
};
const names = Object.fromEntries(MARKS.map((m) => [m.id, m.name]));
const labels = {
  ...names,
  order: 'Message order',
  position: 'Count-mark position',
  who: 'Workshop',
  relation: 'Relation',
  count: 'Quantity',
  tool: 'Tool',
};
const words = {
  1: 'one',
  2: 'two',
  first: 'Workshop · relation · tool phrase',
  last: 'Tool phrase · relation · workshop',
  before: 'Before the tool',
  after: 'After the tool',
};
const reading = (r) =>
  `${r.who} ${r.relation} ${words[r.count]} ${r.tool}${r.count === '2' ? 's' : ''}`;
function element(tag, text, className) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (className) el.className = className;
  return el;
}
function mark(id) {
  const el = element('span', '', 'mark');
  // These eight literal drawings are authored here; names carry the same information without sight.
  el.innerHTML = `<svg viewBox="0 0 44 44" aria-hidden="true" focusable="false">${paths[id]}</svg>`;
  el.append(element('span', names[id]));
  return el;
}
for (const el of document.querySelectorAll('[data-mark]')) el.append(mark(el.dataset.mark));

// The comparison sheet shares only the drawings; it has no rehearsal or answer checker.
if ($('observations')) {
  let state = initialState();
  for (const [index, observation] of OBSERVATIONS.entries()) {
    const li = element('li');
    li.id = `card-${index + 1}`;
    li.append(element('h3', `Card ${index + 1}`));
    const message = element('div', '', 'message');
    message.append(...observation.tokens.map(mark));
    li.append(message, element('p', reading(observation.reading)));
    $('observations').append(li);
  }
  $('transfer').append(...TRANSFER.map(mark));
  for (const [kind, options] of [
    ['draft', CHOICES],
    ['answer', ANSWERS],
  ]) {
    for (const [key, values] of Object.entries(options)) {
      const label = element('label');
      label.htmlFor = `${kind}-${key}`;
      label.append(names[key] ? mark(key) : element('span', labels[key]));
      if (names[key]) label.append(element('small', MARKS.find((m) => m.id === key).group));
      const select = element('select');
      select.id = `${kind}-${key}`;
      for (const value of ['', ...values]) {
        const option = element('option', value ? words[value] || value : 'Undecided');
        option.value = value;
        select.append(option);
      }
      select.addEventListener('change', () => act({ type: kind, key, value: select.value }));
      label.append(select);
      $(`${kind}-fields`).append(label);
    }
  }
  const feedback = {
    draft: {
      ready: 'Your entries are provisional.',
      incomplete:
        'Still open. Your filled entries fit at least one reading of the shown cards; keep revising the undecided ones.',
      contradicted:
        'These entries cannot all fit the shown cards and the stated rules. Your entries are kept for revision.',
      compatible:
        'This complete interpretation fits the shown cards. Other interpretations may still fit.',
    },
    answer: {
      ready: 'Choose a reading, then check it against the shown cards.',
      incomplete: 'Choose a workshop, relation, quantity and tool before checking.',
      contradicted:
        'This reading conflicts with every rule set fitting the shown cards. Revise it or inspect another card.',
      possible:
        'Possible, but not established. Other rule sets still fit the shown cards; they give another reading or cannot parse this message.',
      supported: 'Supported by every rule set fitting the shown cards, within the stated rules.',
    },
  };
  function render() {
    const evidence = OBSERVATIONS.slice(0, state.seen),
      analysis = analyze(evidence);
    $('story').hidden = !state.story;
    $('story-toggle').textContent = state.story ? 'Hide story' : 'Show story';
    $('story-toggle').setAttribute('aria-pressed', String(!state.story));
    for (let n = 1; n <= 4; n++) $(`card-${n}`).hidden = n > state.seen;
    $('next').textContent = state.seen < 4 ? 'Show another card' : 'All four cards shown';
    $('evidence-summary').textContent =
      `${state.seen} of 4 cards shown. ${analysis.candidates} rule set${analysis.candidates === 1 ? '' : 's'} still fit. ${analysis.syntaxRefusals} cannot parse the new message.`;
    for (const kind of ['draft', 'answer']) {
      for (const [key, value] of Object.entries(state[kind])) $(`${kind}-${key}`).value = value;
      const status = state[`${kind}Result`]?.status || 'ready';
      $(`${kind}-result`).dataset.status = status;
      $(`${kind}-result`).textContent =
        feedback[kind][status] ||
        'A reading is unavailable from this evidence. No answer has been certified.';
    }
    $('hint-text').hidden = !state.hint;
    $('hint-text').textContent = state.hint ? hint(evidence, state.hint) : '';
    $('hint').setAttribute('aria-expanded', String(!!state.hint));
    $('worked').hidden = !state.reveal;
    $('reveal').setAttribute('aria-expanded', String(state.reveal));
    $('worked').replaceChildren();
    if (state.reveal) {
      $('worked').append(element('h3', 'Agreement from the shown cards'));
      const list = element('ul');
      for (const [key, value] of Object.entries(deductions(evidence)))
        list.append(element('li', `${labels[key]}: ${words[value] || value}.`));
      $('worked').append(
        list,
        element(
          'p',
          `Possible parsed readings: ${analysis.readings.map(reading).join('; ') || 'none'}. ${analysis.syntaxRefusals} compatible rule sets refuse its syntax.`,
        ),
      );
      $('worked').append(
        element(
          'p',
          analysis.status === 'settled'
            ? 'Every remaining rule set agrees. Combine the established mark meanings with the established order to read the unseen message.'
            : 'The shown cards leave this message open. An omitted entry above is not yet established.',
        ),
      );
    }
  }
  function act(action) {
    state = reduce(state, action);
    render();
  }
  for (const id of ['next', 'check-draft', 'check-answer', 'hint', 'reveal', 'restart'])
    $(id).addEventListener('click', () => act({ type: id }));
  $('story-toggle').addEventListener('click', () => act({ type: 'story' }));
  render();
}
