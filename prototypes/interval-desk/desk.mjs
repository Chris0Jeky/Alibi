import { PROBLEM, classify, evaluate, formatMinute, initialState, reduce } from './model.mjs';

const rows = document.querySelector('#event-rows');
const controls = document.querySelector('#interval-controls');
const timelineRows = document.querySelector('#timeline-rows');
const claimSelect = document.querySelector('#claim-select');
let state = initialState();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function appendCell(row, text, className) {
  const cell = element('td', className, text);
  row.append(cell);
  return cell;
}

function timeRange(interval) {
  return `${formatMinute(interval[0])}–${formatMinute(interval[1])}`;
}

function rangePair(interval) {
  const pair = element('span', 'range-pair');
  pair.append(
    element('span', 'range-start', formatMinute(interval[0])),
    element('span', 'range-separator', '–'),
    element('span', 'range-end', formatMinute(interval[1])),
  );
  pair.setAttribute(
    'aria-label',
    `${formatMinute(interval[0])} through ${formatMinute(interval[1])}`,
  );
  return pair;
}

function buildRows() {
  const clueList = document.querySelector('#clues');
  for (const clue of PROBLEM.clues) clueList.append(element('li', '', clue.text));

  for (const event of PROBLEM.events) {
    const row = element('tr');
    row.id = `event-row-${event.id}`;
    row.dataset.eventId = event.id;
    const nameCell = element('td');
    nameCell.append(element('span', 'event-name', event.name));
    nameCell.append(element('span', 'clock-source', event.clockNote));
    row.append(nameCell);
    appendCell(row, '', 'range-summary').append(rangePair(event.evidence));
    const summaryCell = appendCell(row, '', 'range-summary');
    summaryCell.append(rangePair(state.windows[event.id]));
    const summary = summaryCell.firstElementChild;
    summary.id = `window-${event.id}`;
    rows.append(row);

    const fieldset = element('fieldset', 'event-controls');
    fieldset.dataset.eventId = event.id;
    const legend = element('legend', '', event.name);
    fieldset.append(legend);
    const nudges = element('div', 'nudge-row');
    for (const direction of ['earlier', 'later']) {
      const button = element('button', '', direction === 'earlier' ? 'Earlier' : 'Later');
      button.type = 'button';
      button.dataset.action = 'nudge';
      button.dataset.id = event.id;
      button.dataset.direction = direction;
      button.id = `${direction}-${event.id}`;
      button.setAttribute('aria-label', `Narrow ${event.name} toward ${direction} times`);
      nudges.append(button);
    }
    fieldset.append(nudges);
    for (const [edge, label] of [
      ['earliest', 'Earliest possible minute'],
      ['latest', 'Latest possible minute'],
    ]) {
      const labelNode = element('label', 'range-label');
      const inputId = `range-${event.id}-${edge}`;
      const labelText = element('span', '', label);
      const output = element('output', '', '');
      output.id = `output-${event.id}-${edge}`;
      output.htmlFor = inputId;
      const range = document.createElement('input');
      range.type = 'range';
      range.step = '1';
      range.id = inputId;
      range.dataset.action = 'set-bound';
      range.dataset.id = event.id;
      range.dataset.edge = edge;
      range.setAttribute('aria-describedby', 'window-guidance');
      labelNode.append(labelText, output, range);
      fieldset.append(labelNode);
    }
    controls.append(fieldset);

    const timelineRow = element('li', 'timeline-row');
    timelineRow.dataset.eventId = event.id;
    timelineRow.append(element('strong', '', event.name));
    const track = element('div', 'timeline-track');
    const band = element('span', 'timeline-band');
    band.id = `timeline-band-${event.id}`;
    track.append(band);
    timelineRow.append(track);
    const timelineWindow = element('span', '', '');
    timelineWindow.id = `timeline-window-${event.id}`;
    timelineRow.append(timelineWindow);
    timelineRows.append(timelineRow);
  }
  document.querySelector('#timeline').setAttribute('aria-describedby', 'timeline-equivalence');
  const equivalence = element('span', 'visually-hidden', '');
  equivalence.id = 'timeline-equivalence';
  equivalence.textContent =
    'This read-only timeline shows the current working intervals from the table.';
  document.querySelector('#timeline-title').after(equivalence);

  const axis = document.querySelector('.timeline-axis');
  axis.append(element('span', '', '20:00'));
  const ticks = element('div', 'axis-ticks');
  for (const minute of [0, 2, 4, 6, 8]) ticks.append(element('span', '', String(minute)));
  axis.append(ticks, element('span', '', '20:08'));

  for (const claim of PROBLEM.claims) {
    const option = element('option', '', claim.text);
    option.value = claim.id;
    claimSelect.append(option);
  }
}

function setScheduleTable(container, schedule, emptyText) {
  if (!schedule) {
    container.append(element('p', 'schedule-empty', emptyText));
    return;
  }
  const table = element('table', 'schedule-table');
  const caption = element('caption', '', 'One complete admissible schedule');
  const body = document.createElement('tbody');
  for (const event of PROBLEM.events) {
    const row = document.createElement('tr');
    const heading = element('th', '', event.name);
    heading.scope = 'row';
    row.append(heading, element('td', '', formatMinute(schedule[event.id])));
    body.append(row);
  }
  table.append(caption, body);
  container.append(table);
}

function witnessCard(title, schedule, emptyText, claimText, counterexample = false) {
  const card = element('article', 'witness-card');
  card.append(element('h3', '', title));
  if (schedule) {
    const side = counterexample
      ? 'It makes the selected claim false.'
      : 'It makes the selected claim true.';
    card.append(element('p', '', `${side} ${claimText}`));
    setScheduleTable(card, schedule, emptyText);
  } else card.append(element('p', 'schedule-empty', emptyText));
  return card;
}

function refresh() {
  const analysis = evaluate(state);
  document.querySelector('#story-copy').hidden = !state.storyOn;
  const storyToggle = document.querySelector('#story-toggle');
  storyToggle.setAttribute('aria-pressed', String(state.storyOn));
  storyToggle.textContent = state.storyOn ? 'Turn story off' : 'Turn story on';

  const timeline = document.querySelector('#timeline');
  timeline.hidden = !state.timelineOn;
  const timelineToggle = document.querySelector('#timeline-toggle');
  timelineToggle.setAttribute('aria-expanded', String(state.timelineOn));
  timelineToggle.textContent = state.timelineOn
    ? 'Hide optional timeline'
    : 'Show optional timeline';
  claimSelect.value = state.claimId;
  document.querySelector('#undo').disabled = state.undoStack.length === 0;

  for (const event of PROBLEM.events) {
    const [low, high] = state.windows[event.id];
    const windowPair = document.querySelector(`#window-${event.id}`);
    windowPair.querySelector('.range-start').textContent = formatMinute(low);
    windowPair.querySelector('.range-end').textContent = formatMinute(high);
    windowPair.setAttribute('aria-label', `${formatMinute(low)} through ${formatMinute(high)}`);
    document.querySelector(`#output-${event.id}-earliest`).textContent = formatMinute(low);
    document.querySelector(`#output-${event.id}-latest`).textContent = formatMinute(high);
    const earliest = document.querySelector(`#range-${event.id}-earliest`);
    earliest.min = String(event.evidence[0]);
    earliest.max = String(high);
    earliest.value = String(low);
    const latest = document.querySelector(`#range-${event.id}-latest`);
    latest.min = String(low);
    latest.max = String(event.evidence[1]);
    latest.value = String(high);
    document.querySelector(`#earlier-${event.id}`).disabled = low === high;
    document.querySelector(`#later-${event.id}`).disabled = low === high;

    const band = document.querySelector(`#timeline-band-${event.id}`);
    const left = (low / PROBLEM.clock.end) * 100;
    const width = ((high - low) / PROBLEM.clock.end) * 100;
    band.style.left = `${left}%`;
    band.style.width = `${width}%`;
    band.style.minWidth = width === 0 ? '8px' : '0';
    band.style.transform =
      width !== 0 || low === 0
        ? ''
        : low === PROBLEM.clock.end
          ? 'translateX(-100%)'
          : 'translateX(-50%)';
    band.setAttribute('aria-label', `Working window ${timeRange([low, high])}`);
    document.querySelector(`#timeline-window-${event.id}`).textContent = timeRange([low, high]);
  }

  const status = document.querySelector('#model-status');
  if (analysis.ambiguity === 'none') {
    status.dataset.state = 'none';
    status.textContent =
      'No schedules fit these hypothetical windows and the fixed clues. This is an explicit zero-schedule working model; no conclusion can be classified. Widen an interval or restart.';
  } else {
    status.dataset.state = analysis.ambiguity;
    status.textContent =
      analysis.ambiguity === 'unique'
        ? 'One schedule fits these hypothetical windows and the fixed clues. The working model is unique, but the selected intervals are still assumptions.'
        : `Ambiguous: ${analysis.schedules.length} schedules fit these hypothetical windows and the fixed clues. Each verdict is relative to this set, not an unconditional fact.`;
  }

  const claim = PROBLEM.claims.find((item) => item.id === state.claimId);
  const classification = document.querySelector('#classification');
  classification.removeAttribute('data-verdict');
  const witnesses = document.querySelector('#witnesses');
  witnesses.replaceChildren();
  if (analysis.claim.verdict === 'no-schedules') {
    classification.dataset.verdict = 'no-schedules';
    classification.textContent = 'Not classified · no schedules fit';
    witnesses.append(
      witnessCard('Supporting schedule', null, 'Unavailable in a zero-schedule model.', claim.text),
      witnessCard(
        'Counterexample schedule',
        null,
        'Unavailable in a zero-schedule model.',
        claim.text,
        true,
      ),
    );
    return;
  }

  const verdictText = {
    necessary: 'Necessary in this working model',
    impossible: 'Impossible in this working model',
    possible: 'Possible, but not necessary',
  }[analysis.claim.verdict];
  classification.dataset.verdict = analysis.claim.verdict;
  classification.textContent = verdictText;
  witnesses.append(
    witnessCard(
      'Supporting schedule',
      analysis.claim.supporting,
      'No admissible schedule supports this claim.',
      claim.text,
    ),
    witnessCard(
      'Counterexample schedule',
      analysis.claim.counterexample,
      analysis.claim.verdict === 'necessary'
        ? 'No counterexample exists among the schedules in this working model.'
        : 'No admissible schedule refutes this claim.',
      claim.text,
      true,
    ),
  );
}

function dispatch(action) {
  const next = reduce(state, action);
  if (next !== state) {
    state = next;
    refresh();
  }
}

document.addEventListener('click', (event) => {
  const control = event.target.closest('button[data-action]');
  if (control) {
    dispatch({
      type: control.dataset.action,
      id: control.dataset.id,
      direction: control.dataset.direction,
    });
    return;
  }
  if (event.target.id === 'story-toggle') dispatch({ type: 'story', on: !state.storyOn });
  if (event.target.id === 'undo') dispatch({ type: 'undo' });
  if (event.target.id === 'restart') dispatch({ type: 'restart' });
  if (event.target.id === 'timeline-toggle') dispatch({ type: 'timeline', on: !state.timelineOn });
});

document.addEventListener('input', (event) => {
  const control = event.target;
  if (control instanceof HTMLInputElement && control.dataset.action === 'set-bound')
    dispatch({
      type: 'set-bound',
      id: control.dataset.id,
      edge: control.dataset.edge,
      value: control.value,
    });
});

claimSelect.addEventListener('change', () => dispatch({ type: 'claim', id: claimSelect.value }));

buildRows();
refresh();
