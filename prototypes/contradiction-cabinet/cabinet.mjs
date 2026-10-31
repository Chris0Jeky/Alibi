import { LAMPS, REPORTS, RETAINED, initialState, reduce } from './model.mjs';

let state = initialState();
const byId = (id) => document.getElementById(id);
function element(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}
for (const report of REPORTS) {
  const label = element('label');
  label.className = 'report';
  const input = element('input');
  input.type = 'checkbox';
  input.id = report.id;
  const copy = element('span');
  copy.append(
    element('strong', `${report.id.toUpperCase()} · ${report.source}`),
    element('span', report.text),
  );
  label.append(input, copy);
  byId('reports').append(label);
  input.addEventListener('change', () => dispatch({ type: 'select', id: report.id }));
}
for (const report of RETAINED) {
  byId('retained').append(element('li', `${report.id.toUpperCase()}: ${report.text}`));
}
for (const lamp of LAMPS) {
  const row = element('tr');
  const name = lamp[0].toUpperCase() + lamp.slice(1);
  const heading = element('th', name);
  heading.scope = 'row';
  const cell = element('td');
  const select = element('select');
  select.id = `lamp-${lamp}`;
  select.setAttribute('aria-label', `${name} lantern state`);
  for (const [value, text] of [
    ['', 'Choose a state'],
    ['lit', 'Lit'],
    ['dark', 'Dark'],
  ]) {
    const option = element('option', text);
    option.value = value;
    select.append(option);
  }
  select.addEventListener('change', () =>
    dispatch({
      type: 'lamp',
      id: lamp,
      value: select.value === '' ? null : select.value === 'lit',
    }),
  );
  cell.append(select);
  row.append(heading, cell);
  byId('world').append(row);
}

const conflictText = {
  empty: 'No reports selected. Choose a group to compare.',
  invalid: 'That selection is unavailable. Restart the rehearsal.',
  consistent:
    'These reports can all be true together. Try a group that cannot fit any lantern state.',
  'too-large':
    'No state fits these reports, but a smaller conflicting group exists. Remove reports and try again.',
  smallest:
    'Smallest conflict accepted. No lantern state fits this group, and no smaller conflicting group exists.',
};
const counterexampleText = {
  incomplete: 'Choose Lit or Dark for all three lanterns before checking.',
  'no-worlds':
    'No state fits the fixed premises. Inconsistent premises cannot provide a counterexample.',
  'violates-premises':
    'This state breaks a fixed premise. Keep every listed premise true and try again.',
  'supports-claim':
    'This state fits the premises, but Stair is lit, so it does not disprove the claim. Try another state.',
  counterexample:
    'Counterexample accepted. Every fixed premise is true and Stair is dark, so the claim is false.',
};
function render() {
  byId('story').hidden = !state.story;
  byId('story-toggle').textContent = state.story ? 'Turn story off' : 'Turn story on';
  byId('story-toggle').setAttribute('aria-pressed', String(state.story));
  for (const r of REPORTS) byId(r.id).checked = state.selected.includes(r.id);
  for (const lamp of LAMPS)
    byId(`lamp-${lamp}`).value =
      state.world[lamp] === null ? '' : state.world[lamp] ? 'lit' : 'dark';
  for (const [id, result, messages, initial] of [
    ['conflict', state.conflict, conflictText, 'Choose reports, then check the group.'],
    [
      'counterexample',
      state.counterexample,
      counterexampleText,
      'Choose a state for each lantern, then check.',
    ],
  ]) {
    byId(`${id}-result`).textContent = result ? messages[result.status] : initial;
    byId(`${id}-result`).dataset.status = result?.status || 'ready';
    byId(`${id}-hint-text`).hidden = state.hint !== id;
    byId(`${id}-hint`).setAttribute('aria-expanded', String(state.hint === id));
  }
  byId('worked').hidden = !state.reveal;
  byId('reveal').textContent = state.reveal
    ? 'Hide worked explanations'
    : 'Reveal worked explanations';
  byId('reveal').setAttribute('aria-expanded', String(state.reveal));
}
function dispatch(action) {
  state = reduce(state, action);
  render(); // Update the existing controls in place, retaining native focus.
}
for (const [id, action] of [
  ['story-toggle', { type: 'story' }],
  ['restart', { type: 'restart' }],
  ['check-conflict', { type: 'check-conflict' }],
  ['check-counterexample', { type: 'check-counterexample' }],
  ['conflict-hint', { type: 'hint', for: 'conflict' }],
  ['counterexample-hint', { type: 'hint', for: 'counterexample' }],
  ['reveal', { type: 'reveal' }],
])
  byId(id).addEventListener('click', () => dispatch(action));
render();
