import W from './content.mjs';
import * as E from './engine.mjs';
import { createPages } from './pages.mjs';
import { renderBoard } from './boards.mjs';
import styles from './style.mjs';
import nativeStyle from './native-style.mjs';
import { inspectObject, appendObservation } from './objects.mjs';
import { CastleStore } from './storage.mjs';
import { IMPORT_LIMIT } from './backup.mjs';
import { theoryForm } from './investigation-view.mjs';
import { labelQuestions } from './investigation.mjs';
import { escape, button, link, quietLinks } from './html.mjs';

let retained;
let stagedImport, showStagedImport;
export async function exportBackup() {
  const store = (retained ||= new CastleStore());
  await store.init();
  await store.pending;
  return JSON.parse(store.export());
}
export async function prepareImport(data) {
  stagedImport = await globalThis.AlibiValidateImport({
    type: 'castle-backup',
    text: JSON.stringify(data),
  });
  if (location.hash === '#/quiet/castle/journal') showStagedImport?.();
  else location.hash = '#/quiet/castle/journal';
}
const rootRoute = () => {
  const parts = globalThis.location.hash.split('/');
  return { view: parts[3] || 'map', id: parts[4] || 'gatehouse' };
};

export async function mount({ root, preferences = null }) {
  const store = (retained ||= new CastleStore());
  await store.init();
  const abort = new AbortController();
  let state = store.state,
    view = 'map',
    selected = 'gatehouse',
    era = 'today',
    search = '',
    filter = 'all';
  let active = null,
    answer,
    history = [],
    selection = null,
    hint = 0,
    feedback = '',
    walk = { node: null, edges: [] };
  let pendingRestore = null;
  let disposed = false,
    opener = null,
    filmTimer = null,
    filmIndex = 0,
    filmPlaying = false;
  let effective = preferences,
    objectURLs = new Set(),
    timers = new Set();
  root.innerHTML = `<style>${styles}${nativeStyle}</style><header></header><div id="warning" class="warning" role="status" hidden></div><main id="castle-main" tabindex="-1"></main><footer></footer><dialog id="castle-dialog" aria-labelledby="castle-title"></dialog><div class="live" role="status" aria-live="polite" id="castle-live"></div>`;
  const $ = (selector) => root.querySelector(selector);
  const dialog = $('#castle-dialog');
  const announce = (text) => {
    $('#castle-live').textContent = text;
  };
  function updateStatus() {
    if (disposed) return;
    const info = store.info();
    $('#warning').hidden = info.mode === 'local';
    $('#warning').textContent =
      info.error || 'Castle progress is held for this session. Export it before closing.';
    const label =
      info.mode === 'local'
        ? info.dirty
          ? 'Saving castle progress…'
          : 'Castle progress saved on this device'
        : 'Castle progress needs attention';
    $('footer').innerHTML =
      `${escape(label)}. Castle exports cover this chapter only; Cabinet, Club and Quiet Wing exports are separate. ${link('Open castle notebook', 'journal')}`;
  }
  function prefs() {
    root.host.dataset.reduced = String(
      !state.preferences.motion ||
        !!effective?.reducedMotion ||
        matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    root.host.dataset.contrast = String(!!effective?.contrast);
    root.host.dataset.large = String(!!effective?.largeText);
    root.host.dataset.sound = String(state.preferences.sound && effective?.sound !== false);
  }
  function save(next) {
    store.save(next);
    state = next;
    prefs();
  }
  function mutate(fn) {
    const next = E.clone(state);
    fn(next);
    next.revision++;
    save(next);
  }
  const unsubscribe = store.subscribe(updateStatus);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  motion.addEventListener('change', prefs, { signal: abort.signal });
  function navigate(next, id = '') {
    location.hash = `#/quiet/castle/${next}${id ? '/' + id : ''}`;
  }
  function room() {
    return W.rooms.find((r) => r.id === selected) || W.rooms[0];
  }
  function header() {
    $('header').innerHTML =
      `<div><span class="eyebrow">Alibi · countryside estate</span><br><strong>Wrenmere Castle</strong></div><nav aria-label="Castle navigation">${link('Grounds', 'map')}${link('Museum', 'museum')}${link('Notebook', 'journal')}${link('Room directory', 'directory')}${button('Preferences', 'preferences')}<a href="#/home">Leave castle</a></nav><span class="score">${E.score(state)} / 100 points</span>`;
    for (const a of $('header').querySelectorAll('a'))
      if (a.hash === `#/quiet/castle/${view}`) a.setAttribute('aria-current', 'page');
  }
  const pages = () => createPages({ state, view, selected, era, search, filter });
  const roomCard = (r) => pages().roomCard(r);
  function render() {
    if (disposed) return;
    prefs();
    header();
    $('#castle-main').innerHTML =
      view === 'room'
        ? pages().roomPage()
        : view === 'museum'
          ? pages().museumPage()
          : view === 'journal'
            ? pages().notebook()
            : view === 'directory'
              ? pages().directory()
              : pages().mapPage();
    updateStatus();
  }
  function visit(id) {
    const r = W.rooms.find((r) => r.id === id);
    if (!r) return;
    selected = id;
    const status = E.roomStatus(state, r);
    if (!status.open) {
      show(r.name, `<p>${escape(status.reason)}</p>`);
      return;
    }
    if (!state.visited.includes(id)) mutate((n) => n.visited.push(id));
    navigate(id === 'museum' ? 'museum' : 'room', id === 'museum' ? '' : id);
  }
  function show(title, body) {
    if (!dialog.open) opener = root.activeElement;
    dialog.innerHTML = `${button('Close', 'close', '', 'class="close" aria-label="Close window"')}<h2 id="castle-title">${escape(title)}</h2>${body}`;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('.close').focus();
  }
  function stopFilm() {
    clearTimeout(filmTimer);
    filmTimer = null;
    filmPlaying = false;
  }
  function close() {
    stopFilm();
    active = null;
    selection = null;
    if (dialog.open) dialog.close();
    render();
    const next = [...root.querySelectorAll('button,a')].find((el) =>
      opener?.dataset?.do
        ? el.dataset.do === opener.dataset.do && el.dataset.value === opener.dataset.value
        : opener?.href && el.href === opener.href,
    );
    (next || $('#castle-main')).focus({ preventScroll: true });
  }
  function download(text, name) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    objectURLs.add(url);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      objectURLs.delete(url);
      timers.delete(timer);
    }, 1000);
    timers.add(timer);
  }
  async function exportSave() {
    await store.pending;
    download(store.export(), 'alibi-castle-save.json');
    announce('Castle export prepared. Check that your browser saved the file.');
    if (store.mode !== 'local')
      show(
        'Keep this notebook',
        `<p>Check your browser’s downloads and keep the castle JSON file somewhere safe. Downloading alone does not confirm that it was saved.</p><p>After confirmation, Alibi can update while the exported notebook remains unchanged. The protected device record will still be left untouched.</p>${button('I saved this file', 'acknowledge-export', '', 'class="primary"')}`,
      );
  }
  function reviewRestore(data) {
    active = null;
    pendingRestore = { data, revision: store.state.revision };
    show(
      'Review castle restore',
      `<p>This file contains ${Object.keys(data.state.completed).length} completed questions, ${data.state.visited.length} visited rooms and ${data.state.notes.length} note characters.</p><p><strong>Merge discoveries</strong> keeps your current answers and preferences, adds missing discoveries and appends different notes. <strong>Replace notebook</strong> uses the file instead of your current castle notebook.</p><p>Both retain a pre-restore recovery copy in the same database transaction. Other Alibi saves are unaffected.</p>${data.preservedRecord ? '<p>This file also carries a protected raw record. Keep the original file; that raw record is not automatically restored.</p>' : ''}<div class="actions">${button('Merge discoveries', 'restore-merge', '', 'class="primary"')}${button('Replace notebook', 'restore-replace')}</div>`,
    );
  }
  async function restoreNotebook(replace) {
    if (!pendingRestore) throw Error('Review a castle backup before restoring.');
    for (const control of dialog.querySelectorAll('button')) control.disabled = true;
    try {
      state = await store.restore(pendingRestore.data, {
        replace,
        expectedRevision: pendingRestore.revision,
      });
      pendingRestore = null;
      close();
      announce('Castle notebook restored. Its previous contents are available as a recovery copy.');
    } finally {
      for (const control of dialog.querySelectorAll('button')) control.disabled = false;
    }
  }
  async function exportRecovery() {
    const copy = await store.recovery();
    if (!copy) {
      announce('No castle restore has been performed on this device.');
      return;
    }
    download(JSON.stringify(copy, null, 2), 'alibi-castle-pre-restore.json');
    announce('Previous castle notebook exported. Import this file to review a recovery.');
  }
  async function importFile(file) {
    if (!file) return;
    if (file.size > IMPORT_LIMIT)
      throw Error('Castle backup exceeds the 512 KiB import limit. Nothing was changed.');
    const data = await globalThis.AlibiValidateImport({
      type: 'castle-backup',
      text: await file.text(),
    });
    if (!disposed) reviewRestore(data);
  }
  function settings() {
    show(
      'Visit preferences',
      `${[
        ['motion', 'Room transitions'],
        ['sound', 'Interaction sounds'],
        ['story', 'Follow the castle story'],
      ]
        .map(
          ([key, label]) =>
            `<label class="toggle">${label}<input type="checkbox" data-pref="${key}" ${state.preferences[key] ? 'checked' : ''}></label>`,
        )
        .join(
          '',
        )}<p class="small">Alibi’s reduced motion, contrast and larger text settings apply here. Your system’s reduced-motion setting also takes precedence. Sound remains off unless both this visit and Alibi allow it.</p><p>${escape(W.contentNote)}</p>${button('Export castle save', 'export')}`,
    );
  }
  function invitation() {
    show(
      state.preferences.story ? 'The keeper’s letter' : 'A quiet visit',
      state.preferences.story
        ? `<p>${escape(W.introduction)}</p><p>${escape(W.chapter.premise)}</p><p class="small">${escape(W.contentNote)}</p>`
        : '<p>The museum tables, lantern puzzle and three-peg board are open. The conservatory has a place to write and paths back to your garden and companions.</p>',
    );
  }
  const filmLines = () =>
    state.preferences.story
      ? [
          'The keeper has left a key at the gate.',
          'A ticket in the study reads 21:17.',
          'Finch’s maintenance note gives a different time.',
          'Begin in the Long Library.',
        ]
      : [
          'The lanterns are lit.',
          'The museum tables are ready.',
          'There is a pencil in the guest book.',
          'Stay for a question or two.',
        ];
  function drawFilm() {
    const lines = filmLines();
    $('#film-line').textContent = lines[filmIndex];
    $('#film-progress').textContent = `${filmIndex + 1} / ${lines.length}`;
  }
  function filmTick() {
    if (!filmPlaying || document.hidden || disposed) return;
    filmIndex++;
    if (filmIndex >= filmLines().length) {
      filmIndex = 0;
      stopFilm();
      $('#film-play').textContent = 'Play again';
    }
    drawFilm();
    if (filmPlaying) filmTimer = setTimeout(filmTick, 4500);
  }
  function film() {
    stopFilm();
    filmIndex = 0;
    show(
      'An invitation to Wrenmere',
      `<div class="prologue"><p id="film-line"></p><span id="film-progress" class="small"></span></div><div class="actions">${button('Play', 'film-play', '', 'id="film-play"')}${button('Next frame', 'film-next')}</div><details><summary>Read the complete text</summary><p>${filmLines().map(escape).join('</p><p>')}</p></details><p class="small">An optional four-frame text interlude. The package’s rendered video is not bundled into this activity; no required clue depends on it.</p>`,
    );
    drawFilm();
  }
  function exhibit(id) {
    const x = W.exhibits.find((x) => x.id === id);
    if (!x) return;
    show(
      x.title,
      `<p class="eyebrow">${escape(x.era)} · ${escape(x.region)}</p><p>${escape(x.history)}</p><p class="status">${escape(x.boundary)}</p>${button('Try the question', 'puzzle', x.puzzle, 'class="primary"')}<div class="source">${x.source.map((k) => `<a href="${escape(W.sources[k].url)}" target="_blank" rel="noopener noreferrer">${escape(W.sources[k].publisher)}: ${escape(W.sources[k].title)}</a>`).join('')}<small>Sources carried forward from the supplied 9 September 2026 review.</small></div>`,
    );
  }
  function resolution() {
    if (!E.has(state, 'inference')) return;
    show(
      'The unrecorded margin',
      `<p>${escape(W.chapter.ending)}</p><article class="card evidence"><p>${escape(W.evidence.at(-1).text)}</p></article><p>Chapter I complete. The later chapters investigate the service route, the warning network and the public report. They are not playable here yet.</p>`,
    );
  }
  function rest() {
    show(
      'The winter conservatory',
      '<p>The chair nearest the glass is warm from the afternoon sun. Someone has sharpened the guest-book pencil with a penknife.</p>' +
        quietLinks() +
        `<p class="small">Garden, realm and companion rewards remain separate planned work. Existing creations are unchanged.</p>${button('Write in the notebook', 'notebook')}`,
    );
  }
  function puzzle(id) {
    if (!E.ids.includes(id) || !E.available(state, id)) return;
    stopFilm();
    active = id;
    answer = E.clone(state.drafts[id] ?? W.puzzles[id].setup);
    history = [];
    selection = null;
    hint = 0;
    feedback = '';
    walk = { node: null, edges: [] };
    show(W.puzzles[id].title, '');
    drawPuzzle();
  }
  function cue(kind) {
    root.dispatchEvent(new CustomEvent('castle-feedback', { detail: { kind } }));
  }
  function change(next) {
    if (!E.validDraft(active, next)) return;
    history.push(E.clone(answer));
    if (history.length > 100) history.shift();
    answer = next;
    selection = null;
    feedback = '';
    persist();
    drawPuzzle();
    cue('place');
  }
  function persist() {
    if (active && !E.has(state, active))
      mutate((n) => {
        n.drafts[active] = E.clone(answer);
      });
  }
  function focusKey() {
    const el = root.activeElement;
    return el?.dataset?.do ? { action: el.dataset.do, value: el.dataset.value } : null;
  }
  function restoreKey(key) {
    if (!key) return;
    for (const el of dialog.querySelectorAll('[data-do]'))
      if (el.dataset.do === key.action && el.dataset.value === key.value) {
        el.focus({ preventScroll: true });
        break;
      }
  }
  function drawPuzzle() {
    const key = focusKey(),
      p = W.puzzles[active];
    if (!p) return;
    dialog.innerHTML = `${button('Close', 'close', '', 'class="close" aria-label="Close puzzle"')}<p class="eyebrow">${escape(p.label)}</p><h2 id="castle-title">${escape(p.title)}</h2><ol class="rules">${p.rules.map((r) => `<li>${escape(r)}</li>`).join('')}</ol><div id="board">${renderBoard({ active, answer, selection, walk })}</div><div class="feedback" id="feedback" role="status" aria-live="polite">${escape(feedback)}</div><div class="actions">${button('Undo', 'undo', '', history.length ? '' : 'disabled')}${button('Reset board', 'reset')}${button('Hint', 'hint')}${button('Worked answer', 'reveal')}${button('Check', 'check', '', 'class="primary"')}</div><p class="small">${E.has(state, active) ? 'First completion already recorded. Replaying adds no points.' : '10 points for a first completion, including guided play.'}</p>`;
    restoreKey(key);
    if (feedback) announce(feedback);
  }
  function playAction(action, value) {
    if (!active) return;
    const p = W.puzzles[active],
      i = Number(value);
    if (action === 'swap') {
      if (selection === null) {
        selection = i;
        drawPuzzle();
      } else if (selection === i) {
        selection = null;
        drawPuzzle();
      } else {
        const next = [...answer];
        [next[i], next[selection]] = [next[selection], next[i]];
        change(next);
      }
    } else if (action === 'lamp') {
      const next = [...answer];
      next[i] ^= 1;
      change(next);
    } else if (action === 'peg') {
      if (selection === null) {
        if (E.hanoi(answer)[i].length) selection = i;
        else feedback = 'That peg is empty.';
        drawPuzzle();
      } else if (selection === i) {
        selection = null;
        drawPuzzle();
      } else {
        const next = [...answer, [selection, i]];
        if (E.hanoi(next)) change(next);
        else {
          selection = null;
          feedback =
            answer.length >= 1000
              ? 'This board stores up to 1,000 moves. Undo or reset the board.'
              : 'A larger disk cannot sit on a smaller one.';
          drawPuzzle();
        }
      }
    } else if (action === 'route') {
      const next = [...answer, value];
      if (E.routeTime(next) !== null) change(next);
      else {
        feedback =
          'Follow a connected path without revisiting a place. Undo to try another branch.';
        drawPuzzle();
      }
    } else if (action === 'odd')
      change({
        ...answer,
        odd: answer.odd.includes(value)
          ? answer.odd.filter((x) => x !== value)
          : [...answer.odd, value],
      });
    else if (action === 'verdict') change({ ...answer, conclusion: value });
    else if (action === 'ur') change(i);
    else if (action === 'inference') change(value);
    else if (action === 'river-start') {
      walk = { node: value, edges: [] };
      drawPuzzle();
    } else if (action === 'river') {
      const [a, b] = E.river[i] || [];
      if (!walk.edges.includes(i) && [a, b].includes(walk.node)) {
        walk.node = walk.node === a ? b : a;
        walk.edges.push(i);
        drawPuzzle();
      }
    } else if (action === 'undo' && history.length) {
      answer = history.pop();
      selection = null;
      feedback = 'Move undone.';
      persist();
      drawPuzzle();
      cue('undo');
    } else if (action === 'reset') change(E.clone(p.setup));
    else if (action === 'hint') {
      feedback = p.hints[Math.min(hint++, p.hints.length - 1)];
      drawPuzzle();
    } else if (action === 'reveal') {
      feedback = 'This shows a complete answer and records guided play. Your points are unchanged.';
      drawPuzzle();
      $('#feedback').insertAdjacentHTML(
        'beforeend',
        `<div>${button('Show the worked answer', 'confirm-reveal')}</div>`,
      );
    } else if (action === 'confirm-reveal') {
      mutate((n) => {
        if (!n.revealed.includes(active)) n.revealed.push(active);
      });
      change(E.clone(p.solution));
      feedback =
        'Worked answer shown. Read the rules against this board, then Check to record completion.';
      drawPuzzle();
    } else if (action === 'check') {
      const result = E.complete(state, active, answer, state.revealed.includes(active));
      if (result.ok) {
        if (result.newAward) {
          save(result.state);
          cue('complete');
        }
        feedback = p.after + (result.newAward ? ' 10 points added.' : '');
        header();
      } else
        feedback =
          active === 'inference'
            ? 'The ticket gives a departure time. Which record actually places Finch at the tower?'
            : result.error;
      drawPuzzle();
    }
  }
  function inspect(id) {
    const object = inspectObject(id, selected);
    if (!object || view !== 'room' || !E.roomStatus(state, room()).open) return;
    show(
      object.title,
      `<p>${escape(object.text)}</p>${button('Keep a note', 'keep-observation', id)}<p class="small" id="observation-result" role="status"></p>`,
    );
  }
  function keepObservation(id) {
    const object = inspectObject(id, selected);
    if (!object || view !== 'room' || !E.roomStatus(state, room()).open) return;
    const result = appendObservation(state.notes, object);
    if (result.added)
      mutate((next) => {
        next.notes = result.notes;
      });
    if ($('#observation-result')) $('#observation-result').textContent = result.message;
    announce(result.message);
  }
  function editTheory(id) {
    if (!state.preferences.story) return;
    active = null;
    show(id ? 'Revise a hypothesis' : 'A working hypothesis', theoryForm(state, id));
    $('#theory-text').focus();
  }
  function saveTheory(id) {
    const theory = {
      id,
      text: $('#theory-text').value.trim(),
      position: $('#theory-position').value,
      records: [...dialog.querySelectorAll('[data-citation]:checked')].map((input) => input.value),
    };
    mutate((next) => {
      const index = next.theories.findIndex((t) => t.id === id);
      if (index < 0) next.theories.push(theory);
      else next.theories[index] = theory;
    });
    close();
    announce('Hypothesis saved. You can revise its assessment and references.');
  }
  function showLabel(id) {
    const question = labelQuestions[id];
    if (!question || !E.has(state, id)) return;
    active = null;
    show(
      'Review the museum label',
      `<p>${escape(question.prompt)}</p><div class="choices">${question.options.map(([value, text]) => button(escape(text), 'label-answer', `${id}:${value}`)).join('')}</div><p id="label-result" class="feedback" role="status"></p><p class="small">Choose a label supported by the source. Revisions are welcome; there is no penalty.</p>`,
    );
  }
  function answerLabel(value) {
    const [id, answer] = value.split(':'),
      question = labelQuestions[id];
    if (!question || !E.has(state, id) || !$('#label-result')) return;
    const correct = answer === question.answer;
    if (correct && !state.labels[id])
      mutate((next) => {
        next.labels[id] = answer;
      });
    $('#label-result').textContent =
      `${correct ? 'Label reviewed. ' : 'Try revising the claim. '}${question.feedback}${correct ? ' ' + question.transfer : ''}${correct && Object.keys(state.labels).length === 3 ? ' Mara’s exhibition drawer is now open.' : ''}`;
    announce($('#label-result').textContent);
  }
  async function action(event) {
    const target = event.target.closest?.('[data-do]');
    if (!target) return;
    const name = target.dataset.do,
      value = target.dataset.value;
    if (name === 'close') close();
    else if (name === 'theory-edit') editTheory(value);
    else if (name === 'theory-save') saveTheory(value);
    else if (name === 'theory-remove')
      show(
        'Remove this hypothesis?',
        `<p>Your collected records and other notes stay in the notebook.</p>${button('Remove this hypothesis', 'theory-remove-confirm', value)}`,
      );
    else if (name === 'theory-remove-confirm') {
      mutate((next) => {
        next.theories = next.theories.filter((t) => t.id !== value);
      });
      close();
      announce('Hypothesis removed.');
    } else if (name === 'record') {
      const record = E.evidence(state).find((r) => r.id === value);
      if (record && state.preferences.story)
        show(
          record.title,
          `<p class="eyebrow">${escape(record.kind)} · ${escape(record.from)}</p><p>${escape(record.text)}</p><p><em>${escape(record.question)}</em></p>`,
        );
    } else if (name === 'label') showLabel(value);
    else if (name === 'label-answer') answerLabel(value);
    else if (name === 'curator-drawer' && Object.keys(state.labels).length === 3)
      show(
        'Questions We Share',
        state.preferences.story
          ? '<p>A pencilled exhibition draft lies beside two game pieces: one perfect, one carefully repaired.</p><article class="card evidence"><h3>Mara’s exhibition draft</h3><p>“Put the mended game beside the untouched one. Ask how it was used. Leave room on the label for the next person to tell us something we missed.”</p></article><p>The drawer preserves an intention for the museum, not an answer to the flood. You have helped put that intention into practice.</p>' +
              quietLinks()
          : '<p>A perfect game piece sits beside a carefully mended one. The revised labels have a place at the reopening exhibition.</p>' +
              quietLinks(),
      );
    else if (name === 'visit') visit(value);
    else if (name === 'select') {
      selected = value;
      render();
      for (const el of root.querySelectorAll('[data-do="select"]'))
        if (el.dataset.value === value) el.focus({ preventScroll: true });
    } else if (name === 'era') {
      era = value;
      render();
      for (const el of root.querySelectorAll('[data-do="era"]'))
        if (el.dataset.value === value) el.focus({ preventScroll: true });
    } else if (name === 'object') inspect(value);
    else if (name === 'keep-observation') keepObservation(value);
    else if (name === 'puzzle') puzzle(value);
    else if (name === 'preferences') settings();
    else if (name === 'invitation') invitation();
    else if (name === 'film') film();
    else if (name === 'exhibit') exhibit(value);
    else if (name === 'resolution') resolution();
    else if (name === 'rest') rest();
    else if (name === 'notebook') {
      close();
      navigate('journal');
    } else if (name === 'export') await exportSave();
    else if (name === 'import') {
      $('#castle-import').value = '';
      $('#castle-import').click();
    } else if (name === 'recovery') await exportRecovery();
    else if (name === 'restore-merge') await restoreNotebook(false);
    else if (name === 'restore-replace')
      show(
        'Replace this castle notebook?',
        `<p>The reviewed file will replace this castle notebook. A pre-restore copy stays on the device.</p>${button('Replace with reviewed file', 'restore-confirm', '', 'class="primary"')}`,
      );
    else if (name === 'restore-confirm') await restoreNotebook(true);
    else if (name === 'acknowledge-export') {
      store.acknowledgeExport();
      close();
      announce('Export confirmed. A later edit will require a new export before updating.');
    } else if (name === 'film-play') {
      if (filmPlaying) {
        stopFilm();
        target.textContent = 'Play';
      } else {
        filmPlaying = true;
        target.textContent = 'Pause';
        filmTimer = setTimeout(filmTick, 4500);
      }
    } else if (name === 'film-next') {
      stopFilm();
      filmIndex = (filmIndex + 1) % filmLines().length;
      drawFilm();
      $('#film-play').textContent = 'Play';
    } else playAction(name, value);
  }
  const failure = (error) => {
    if (!disposed) show('Notebook needs attention', `<p role="alert">${escape(error.message)}</p>`);
  };
  root.addEventListener(
    'click',
    (event) => {
      action(event).catch(failure);
    },
    { signal: abort.signal },
  );
  root.addEventListener(
    'input',
    (event) => {
      const el = event.target;
      if (el.id === 'notes') {
        mutate((n) => {
          n.notes = el.value.slice(0, 12000);
        });
        $('#notes-count').textContent = `${state.notes.length} / 12,000 characters`;
      } else if (el.id === 'search') {
        search = el.value;
        const matches = W.rooms.filter(
          (r) =>
            (filter === 'all' || r.wing === filter) &&
            `${r.name} ${r.line}`.toLowerCase().includes(search.toLowerCase()),
        );
        $('#room-results').innerHTML = matches.map(roomCard).join('');
        $('#results-count').textContent = `${matches.length} rooms`;
      } else if (el.id === 'clock-answer' && active === 'clock') {
        answer = el.value;
        persist();
      }
    },
    { signal: abort.signal },
  );
  root.addEventListener(
    'change',
    (event) => {
      const el = event.target;
      if (el.id === 'castle-import') importFile(el.files[0]).catch(failure);
      else if (el.dataset.wheel !== undefined && active === 'gate') {
        const i = Number(el.dataset.wheel),
          next = [...answer];
        next[i] = Number(el.value);
        change(next);
        dialog.querySelector(`[data-wheel="${i}"]`)?.focus({ preventScroll: true });
      } else if (el.dataset.pref) {
        const key = el.dataset.pref;
        mutate((n) => {
          n.preferences[key] = el.checked;
        });
      } else if (el.id === 'filter') {
        filter = el.value;
        render();
        $('#filter').focus();
      }
    },
    { signal: abort.signal },
  );
  dialog.addEventListener(
    'cancel',
    (event) => {
      event.preventDefault();
      close();
    },
    { signal: abort.signal },
  );
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        stopFilm();
        if ($('#film-play')) $('#film-play').textContent = 'Play';
      }
    },
    { signal: abort.signal },
  );
  function route() {
    if (disposed) return;
    stopFilm();
    active = null;
    if (dialog.open) dialog.close();
    const next = rootRoute();
    view = ['map', 'museum', 'journal', 'directory', 'room'].includes(next.view)
      ? next.view
      : 'map';
    if (view === 'room') {
      const r = W.rooms.find((r) => r.id === next.id);
      if (!r || !E.roomStatus(state, r).open || r.id === 'museum') view = 'map';
      else selected = r.id;
    }
    render();
    $('#castle-main').focus({ preventScroll: true });
    showStagedImport();
  }
  const reviewStaged = () => {
    if (stagedImport && !disposed) {
      const data = stagedImport;
      stagedImport = null;
      reviewRestore(data);
    }
  };
  showStagedImport = reviewStaged;
  route();
  return {
    route,
    flush: () => store.flush(),
    setPreferences(value) {
      effective = value;
      prefs();
    },
    dispose() {
      disposed = true;
      if (showStagedImport === reviewStaged) showStagedImport = null;
      stopFilm();
      abort.abort();
      unsubscribe();
      for (const timer of timers) clearTimeout(timer);
      for (const url of objectURLs) URL.revokeObjectURL(url);
      if (dialog.open) dialog.close();
      root.innerHTML = '';
    },
    diagnostics: () => ({ view, selected, storage: store.info() }),
  };
}
export async function flush() {
  if (retained) await retained.flush();
}
export function diagnostics() {
  return retained?.info() || { mode: 'unopened', dirty: false };
}
