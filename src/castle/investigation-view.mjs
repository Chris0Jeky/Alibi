import { positions } from './investigation.mjs';
import { evidence } from './engine.mjs';
import { escape, button } from './html.mjs';

export function theoryBoard(state) {
  if (!state.preferences.story)
    return '<p class="small">Your working hypotheses are saved. Turn the story on to view the evidence board.</p>';
  const records = evidence(state);
  return `<section class="theory-board" aria-label="Working hypotheses"><div class="row"><h2>Working hypotheses</h2>${button('New hypothesis', 'theory-edit', '', state.theories.length >= 8 ? 'disabled' : '')}</div><p>Your assessment can change. Attach collected records, then decide what they support. These notes do not award story deductions.</p><div class="directory">${state.theories.map((theory) => `<article class="card"><span class="eyebrow">${escape(positions[theory.position])}</span><h3>${escape(theory.text)}</h3><p>${theory.records.length ? theory.records.map((id) => button(escape(records.find((r) => r.id === id)?.title || id), 'record', id)).join(' ') : 'No supporting records attached yet.'}</p>${button('Revise hypothesis', 'theory-edit', theory.id)}</article>`).join('') || '<p>Begin with a question: does the ticket establish a departure, an arrival, or both?</p>'}</div></section>`;
}

export function theoryForm(state, id) {
  const existing = state.theories.find((t) => t.id === id);
  if (id && !existing) throw Error('That hypothesis is no longer on the board.');
  const nextId =
    id ||
    Array.from({ length: 8 }, (_, i) => `h${i + 1}`).find(
      (id) => !state.theories.some((t) => t.id === id),
    );
  if (!nextId) throw Error('The board holds eight hypotheses. Revise or remove one to make room.');
  const theory = existing || { id: nextId, text: '', position: 'open', records: [] };
  return `<label for="theory-text">Your hypothesis</label><textarea id="theory-text" maxlength="600" placeholder="What might these records mean?">${escape(theory.text)}</textarea><label for="theory-position">Current assessment</label><select id="theory-position">${Object.entries(
    positions,
  )
    .map(
      ([value, label]) =>
        `<option value="${value}" ${theory.position === value ? 'selected' : ''}>${label}</option>`,
    )
    .join('')}</select><fieldset><legend>Records to consider</legend>${
    evidence(state)
      .map(
        (record) =>
          `<label class="theory-citation"><input type="checkbox" value="${record.id}" data-citation ${theory.records.includes(record.id) ? 'checked' : ''}> ${escape(record.title)}</label>`,
      )
      .join('') || '<p>Collect a record in the library before attaching evidence.</p>'
  }</fieldset><div class="actions">${button('Save hypothesis', 'theory-save', nextId, 'class="primary"')}${existing ? button('Remove hypothesis', 'theory-remove', id) : ''}</div><p class="small">An attached source is a reference, not automatic proof. You can revise this assessment at any time.</p>`;
}
