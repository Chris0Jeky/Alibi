import { CARDS, CLAIMS, HINTS, REVISION } from './case.mjs';
import { remaining, classify } from './model.mjs';

const $ = (selector) => document.querySelector(selector);
const requested = new URL(location.href).searchParams.get('role');
const role = ['archive', 'field', 'solo'].includes(requested) ? requested : 'solo';
const cards = CARDS.filter((card) => role === 'solo' || card.role === role);
let hintStage = 0;
$('#revision').textContent = REVISION;
$('#dossier-title').textContent = {
  archive: 'Archive dossier',
  field: 'Field dossier',
  solo: 'Combined solo sheet',
}[role];
$('#role-prompt').textContent = {
  archive:
    'You hold the plan and installation records. Identify which revision applies, work through its conditions and ask the field reader what was observed. Explain your reasoning rather than only reading the rules aloud.',
  field:
    'You hold the observations. Separate what was seen from what could not be identified, describe the remaining possibilities and ask the archive reader how the installed mechanism connects them.',
  solo: 'You hold the same five cards used by the two readers. Work through both perspectives yourself before checking. No extra clue or altered rule is supplied in this version.',
}[role];
document.querySelector(`nav a[href="?role=${role}"]`).setAttribute('aria-current', 'page');
for (const card of cards) {
  const li = document.createElement('li');
  li.id = `card-${card.id}`;
  const title = document.createElement('h4');
  title.textContent = `${card.id} · ${card.title}`;
  const text = document.createElement('p');
  text.textContent = card.text;
  li.append(title, text);
  $('#cards').append(li);
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.value = card.id;
  input.id = `cite-${card.id}`;
  label.append(
    input,
    ` ${card.id} · ${card.current ? card.title : 'Superseded plan (context only)'}`,
  );
  $('#citations').append(label);
}

function selected() {
  return [...document.querySelectorAll('#citations input:checked')].map((input) => input.value);
}
function clearFeedback() {
  $('#result').textContent = 'Choose a verdict and cite the evidence you used.';
  $('#result').dataset.status = 'ready';
  hintStage = 0;
  for (const [button, output] of [
    ['hint', 'hint-text'],
    ['reveal', 'worked'],
  ]) {
    $(`#${button}`).setAttribute('aria-expanded', 'false');
    $(`#${output}`).hidden = true;
    $(`#${output}`).textContent = '';
  }
}
function evidence() {
  const ids = selected();
  const worlds = remaining(ids);
  return { ids, worlds, status: classify(worlds, $('#claim').value) };
}
const descriptions = {
  supported: 'Every remaining possibility supports this claim.',
  refuted: 'Every remaining possibility rules this claim out.',
  uncertain: 'The claim is true in some remaining possibilities and false in others.',
};
function unavailable() {
  return 'This selection cannot certify a conclusion. A0 is an uninstalled, superseded plan; cite current evidence about this inspection instead.';
}
$('#conclusion').addEventListener('input', clearFeedback);
$('#conclusion').addEventListener('submit', (event) => {
  event.preventDefault();
  const { worlds, status } = evidence();
  const verdict = $('#verdict').value;
  const result = $('#result');
  if (status === 'unavailable') {
    result.dataset.status = 'unavailable';
    result.textContent = unavailable();
  } else if (!verdict) {
    result.dataset.status = 'incomplete';
    result.textContent = 'Choose a verdict. Your evidence and explanation stay here.';
  } else {
    const matches = verdict === status;
    result.dataset.status = matches ? 'matches' : 'revise';
    result.textContent = `${matches ? 'Your verdict matches' : 'Revisit your verdict using'} the selected evidence: ${worlds.length} possibilities remain. ${descriptions[status]} This says only what the cited cards establish.`;
  }
});
$('#hint').addEventListener('click', () => {
  $('#hint-text').textContent = HINTS[Math.min(hintStage++, HINTS.length - 1)];
  $('#hint-text').hidden = false;
  $('#hint').setAttribute('aria-expanded', 'true');
});
$('#reveal').addEventListener('click', () => {
  const { ids, worlds, status } = evidence();
  const out = $('#worked');
  out.textContent =
    status === 'unavailable'
      ? unavailable()
      : `Selected evidence: ${ids.join(', ') || 'none'}. ${worlds.length} possibilities remain. ${CLAIMS[$('#claim').value]} ${descriptions[status]}`;
  if (status === 'uncertain') {
    for (const value of [true, false]) {
      const w = worlds.find((world) => world[$('#claim').value] === value);
      const p = document.createElement('p');
      p.textContent = `Compatible arrangement: upper ${w.upper ? 'open' : 'closed'}, lower ${w.lower ? 'open' : 'closed'}, source ${w.pulse ? 'pulse' : 'no pulse'}, Quay ${w.quay ? 'on' : 'off'}, Yard ${w.yard ? 'on' : 'off'}.`;
      out.append(p);
    }
  }
  out.hidden = false;
  $('#reveal').setAttribute('aria-expanded', 'true');
});
$('#story-toggle').addEventListener('click', () => {
  $('#story').hidden = !$('#story').hidden;
  $('#story-toggle').setAttribute('aria-pressed', String($('#story').hidden));
  $('#story-toggle').textContent = $('#story').hidden ? 'Show story' : 'Hide story';
});
$('#pause').addEventListener('click', () => $('#pause-dialog').showModal());
$('#resume').addEventListener('click', () => $('#pause-dialog').close());
$('#pause-dialog').addEventListener('close', () => $('#pause').focus());
$('#restart').addEventListener('click', () => {
  $('#conclusion').reset();
  $('#story').hidden = false;
  $('#story-toggle').textContent = 'Hide story';
  $('#story-toggle').setAttribute('aria-pressed', 'false');
  clearFeedback();
  $('#restart').focus();
});
$('#print').addEventListener('click', () => window.print());
// Discard browser-restored form values as well as our in-memory feedback on reload/back.
addEventListener('pageshow', () => {
  $('#conclusion').reset();
  clearFeedback();
});
clearFeedback();
