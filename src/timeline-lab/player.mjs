import {
  applyMark,
  check,
  clueText,
  emptyMarks,
  hint,
  hourName,
  involved,
  schedules,
} from './model.mjs';
import { PUZZLES } from './puzzles.mjs';
import { feedbackText, canSendFeedback, reviewFeedback } from './feedback.mjs';

// Drafts outlive route changes and mounts; no text is transmitted.
const drafts = new Map();
const esc = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const idOf = (p) => `${p.id}@${p.revision}`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const STATE = ['open', 'ruled out', 'placed'];
const GLYPH = ['·', '✕', '●'];
const RULES = [
  'Every event happens in exactly one hour of the night.',
  'Tap an hour to cycle it: open, ruled out (✕), placed (●). Placing an event moves it out of any other hour.',
  'Each clue is plain language. A witness clock may be an hour out either way.',
  'Some nights no two events share an hour; every level says which.',
  'There is no timer. Undo, redo and restart are always available.',
];
export function flushDrafts() {
  if ([...drafts.values()].some((d) => d.dirty))
    throw Error('Save or discard your Timeline Desk feedback draft before updating.');
}
function download(name, contents) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function mount({ root, css, preferences, store, offline }) {
  let disposed = false,
    p = null,
    run = null,
    selected = 0,
    flagged = [],
    lens = -1,
    message = '',
    feedbackMessage = '',
    preview = null,
    reviewGeneration = 0,
    restoring = false,
    busy = false,
    offlineReady = !!offline;
  let prefs = preferences || {},
    pending = Promise.resolve();
  const selectPuzzle = () => {
    try {
      return (
        PUZZLES.find(
          (x) => x.id === decodeURIComponent(location.hash.slice('#/quiet/timeline/'.length)),
        ) || null
      );
    } catch {
      return null;
    }
  };
  const draftFor = () => {
    const key = idOf(p);
    if (!drafts.has(key)) drafts.set(key, { edited: new Set(), dirty: false });
    const draft = drafts.get(key);
    // Untouched fields follow the current saved run, including after a restore.
    for (const field of ['rating', 'difficulty', 'feedback'])
      if (!draft.edited.has(field)) draft[field] = run[field];
    return draft;
  };
  function setPreferences(value) {
    prefs = value || {};
    const h = root.host;
    const dark =
      prefs.theme === 'night' ||
      (prefs.theme === 'system' && globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches);
    h.dataset.theme = dark ? 'night' : 'light';
    h.dataset.contrast = String(!!prefs.contrast);
    h.dataset.large = String(!!prefs.largeText);
    h.dataset.motion = String(!prefs.reducedMotion);
  }
  const status = () => {
    const s = store.status();
    return `<p class="status" role="status">${esc(s.message || 'Progress is saved on this device.')} ${offlineReady ? 'Available offline.' : ''}</p>`;
  };
  const shell = (content) =>
    `<style>${css}</style><main tabindex="-1"><header><a class="back" href="#/quiet">← Quiet Wing</a><span class="eyebrow">A room for trying things <b class="badge">Experimental</b></span><h1>Timeline Desk</h1><p class="intro">Rebuild a night hour by hour from imperfect statements, and see whether an alibi survives.</p></header>${status()}${content}${backupPanel()}</main>`;
  function backupPanel() {
    return `<section class="backup"><h2>Your desk notebook</h2><p>Export a Timeline Desk backup to keep your progress and saved feedback elsewhere. The regular Cabinet combined backup does not include it.</p><div class="actions"><button data-action="export">Export desk backup</button><label class="filebutton">Review desk backup<input type="file" data-file accept="application/json,.json"></label><button data-action="recovery">Download recovery copy</button></div>${restoring ? '<p class="notice" role="status">Restoring backup…</p>' : preview ? `<div class="notice"><p>Backup contains ${preview.count} level runs. Restoring replaces the current desk shelf and keeps a recovery copy.</p><button data-action="restore">Confirm restore</button><button data-action="cancel-restore">Cancel</button></div>` : ''}</section>`;
  }
  const solved = (puzzle, marks) => check(puzzle, marks).complete;
  const win = () => `Solved. ${p.payoff}`;
  function lobby() {
    const runs = store.snapshot().runs;
    const level = (x) => {
      const saved = runs[idOf(x)];
      const done = !!saved && solved(saved.puzzle, saved.marks);
      return `<a href="#/quiet/timeline/${x.id}" class="${done ? 'completed' : ''}" aria-label="Level ${x.level}, ${esc(x.title)}, ${x.events.length} events, ${x.slots} hours${done ? ', solved' : ''}"><b>${x.level}${done ? ' ✓' : ''}</b><span>${esc(x.title)}</span><small>${x.events.length} events · ${x.slots} hours</small></a>`;
    };
    return `<section class="lobby"><div class="section-head"><span class="eyebrow">How it works</span><h2>Reconstruct the night</h2></div><ul class="rules">${RULES.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div class="section-head"><span class="eyebrow">Twelve cases</span><h2>Choose a night</h2><p>The first three introduce the clue kinds one at a time; later nights mix them.</p></div><nav class="levels" aria-label="Levels">${PUZZLES.map(level).join('')}</nav></section>`;
  }
  const clues = () => p.clues.map((c) => ({ rows: involved(c), text: clueText(p, c) }));
  function grid() {
    const T = p.slots,
      rows = lens >= 0 ? clues()[lens].rows : [];
    return `<div class="grid-scroll"><div class="timeline" role="group" aria-label="${esc(p.title)} schedule" style="--t:${T}">${p.events
      .map(
        (ev, e) =>
          `<div class="evrow ${rows.includes(e) ? 'lens' : ''}"><span class="evname" id="ev-${e}">${esc(cap(ev))}</span><div class="slots" role="group" aria-labelledby="ev-${e}">${Array.from(
            { length: T },
            (_, s) => {
              const i = e * T + s,
                v = run.marks[i];
              return `<button class="cell s${v} ${flagged.includes(i) ? 'flag' : ''}" data-cell="${i}" tabindex="${i === selected ? 0 : -1}" aria-label="${esc(cap(ev))} at ${hourName(p.start + s)}: ${STATE[v]}"><span class="g" aria-hidden="true">${GLYPH[v]}</span><span class="h" aria-hidden="true">${hourName(p.start + s)}</span></button>`;
            },
          ).join('')}</div></div>`,
      )
      .join('')}</div></div>`;
  }
  function feedback() {
    const d = draftFor();
    const params = new URLSearchParams({
      title: `Timeline Desk feedback: ${p.title}`,
      body: feedbackText(p, run),
    });
    const share = `https://github.com/Chris0Jeky/Alibi/issues/new?${params}`;
    return `<section class="feedback"><span class="eyebrow">Your impressions</span><h2>Help shape this room</h2><p>Ratings and notes save on this device. Sharing them is optional.</p><fieldset><legend>Enjoyment</legend><div class="rating">${[1, 2, 3, 4, 5].map((x) => `<label><input type="radio" name="rating" value="${x}" ${d.rating === x ? 'checked' : ''}> ${x}</label>`).join('')}</div></fieldset><label>Difficulty <select data-difficulty><option value="">Choose an impression</option><option value="gentle" ${d.difficulty === 'gentle' ? 'selected' : ''}>Gentle</option><option value="just-right" ${d.difficulty === 'just-right' ? 'selected' : ''}>Just right</option><option value="tough" ${d.difficulty === 'tough' ? 'selected' : ''}>Tough</option></select></label><label>Notes <textarea data-feedback maxlength="2000" rows="4">${esc(d.feedback)}</textarea></label><p class="small">${d.dirty ? 'Unsaved draft. Save or discard before updating or exporting.' : 'Optional. You can change this later.'}</p><div class="actions"><button data-action="save-feedback">Save feedback</button><button data-action="discard-feedback">Discard draft</button></div><p class="small">Saved feedback stays on this device. ${canSendFeedback() ? 'Review it in the feedback composer, then press Send to share it with the maintainer.' : 'To send it, review and submit a GitHub issue (GitHub sign-in required).'}</p>${canSendFeedback() ? `<button data-action="send-feedback" ${d.dirty ? 'disabled' : ''}>Review and send saved feedback</button><p class="small">Save or discard any draft first. Sends only the level, rating, difficulty impression and note shown for review, plus app version, screen and device type. No marks or history.</p><p class="feedback-message" role="status" aria-live="polite">${esc(feedbackMessage)}</p>` : ''}<a href="${esc(share)}" target="_blank" rel="noopener noreferrer">Share feedback on GitHub</a></section>`;
  }
  function play() {
    const ix = PUZZLES.findIndex((x) => x.id === p.id),
      done = solved(p, run.marks);
    return `<section class="play"><a href="#/quiet/timeline">← All levels</a><div class="play-heading"><div><span class="eyebrow">Level ${p.level} · ${p.events.length} events · ${p.slots} hours</span><h2>${esc(p.title)}</h2><p>${esc(p.story)}</p></div><nav class="level-nav" aria-label="Levels">${ix > 0 ? `<a href="#/quiet/timeline/${PUZZLES[ix - 1].id}">← Previous</a>` : ''}${ix < PUZZLES.length - 1 ? `<a href="#/quiet/timeline/${PUZZLES[ix + 1].id}">Next →</a>` : ''}</nav></div><div class="play-grid"><div><p class="rule">${p.distinct ? 'No two events share an hour.' : 'Two events may share an hour.'}</p>${grid()}<p class="small">Tap an hour to cycle: open, ruled out, placed. Arrow keys move; X rules out, P places, Backspace clears.</p><div class="actions"><button data-action="undo" ${!run.undo.length ? 'disabled' : ''}>Undo</button><button data-action="redo" ${!run.redo.length ? 'disabled' : ''}>Redo</button><button data-action="restart">Restart</button><button data-action="check">Check</button><button data-action="hint">Hint</button></div><p class="message" role="status" aria-live="polite">${esc(message)}</p>${done ? `${message === win() ? '' : `<p class="payoff">${esc(win())}</p>`}${ix < PUZZLES.length - 1 ? `<a class="next" href="#/quiet/timeline/${PUZZLES[ix + 1].id}">Next case →</a>` : ''}` : ''}</div><aside class="clue-panel"><h3>Clues</h3><p class="small">${esc(p.lesson)}</p><ol class="clues">${clues()
      .map(
        (c, i) =>
          `<li><button data-clue="${i}" aria-pressed="${lens === i}">${esc(c.text)}</button></li>`,
      )
      .join(
        '',
      )}</ol><p class="small">Choose a clue to outline the events it mentions.</p></aside></div>${feedback()}</section>`;
  }
  function render() {
    if (disposed) return;
    const focused = root.activeElement;
    let selector = null;
    if (focused) {
      for (const attr of [
        'data-cell',
        'data-action',
        'data-clue',
        'data-difficulty',
        'data-feedback',
        'data-file',
        'href',
      ]) {
        if (focused.hasAttribute(attr)) {
          selector = `[${attr}="${CSS.escape(focused.getAttribute(attr))}"]`;
          break;
        }
      }
      if (!selector && focused.matches('[name="rating"]'))
        selector = `[name="rating"][value="${CSS.escape(focused.value)}"]`;
      if (!selector && focused.matches('main')) selector = 'main';
    }
    const range =
      focused && typeof focused.selectionStart === 'number'
        ? [focused.selectionStart, focused.selectionEnd]
        : null;
    root.innerHTML = shell(p ? play() : lobby());
    let replacement = selector && root.querySelector(selector);
    if (selector && (!replacement || replacement.disabled))
      replacement = root.querySelector(`[data-cell="${selected}"]`) || root.querySelector('main');
    if (replacement) {
      replacement.focus({ preventScroll: true });
      if (range && typeof replacement.setSelectionRange === 'function')
        replacement.setSelectionRange(...range);
    }
    setPreferences(prefs);
  }
  async function save(next) {
    if (busy) return false;
    busy = true;
    try {
      next.updatedAt = new Date().toISOString();
      pending = store.saveRun(next);
      await pending;
      run = next;
      return true;
    } catch (e) {
      message = `Edit refused: ${e.message}`;
      return false;
    } finally {
      busy = false;
    }
  }
  async function commit(marks, note) {
    const next = { ...run, marks, undo: [...run.undo, run.marks].slice(-40), redo: [] };
    if (await save(next)) {
      flagged = [];
      message = solved(p, marks) ? win() : note;
    }
    render();
  }
  async function mark(cell, value) {
    if (!p || busy) return;
    selected = cell;
    const marks = applyMark(p, run.marks, cell, value);
    if (marks.every((x, i) => x === run.marks[i])) {
      message = 'No change.';
      render();
    } else await commit(marks, '');
  }
  async function history(kind) {
    if (busy || !run[kind].length) return;
    const source = run[kind],
      other = kind === 'undo' ? 'redo' : 'undo';
    const next = {
      ...run,
      marks: source.at(-1),
      [kind]: source.slice(0, -1),
      [other]: [...run[other], run.marks].slice(-40),
    };
    if (await save(next)) {
      flagged = [];
      message = kind === 'undo' ? 'Move undone.' : 'Move restored.';
    }
    render();
  }
  async function route() {
    await pending.catch(() => {});
    await store.flush().catch(() => {});
    if (disposed) return;
    const found = selectPuzzle();
    if (found?.id !== p?.id) {
      p = found;
      run = p ? store.getRun(p) : null;
      if (run) p = run.puzzle;
      selected = 0;
      flagged = [];
      lens = -1;
      message = '';
      feedbackMessage = '';
      preview = null;
      reviewGeneration++;
    }
    render();
  }
  function onInput(e) {
    if (!p) return;
    let field, value;
    if (e.target.matches('[name="rating"]')) [field, value] = ['rating', Number(e.target.value)];
    else if (e.target.matches('[data-difficulty]'))
      [field, value] = ['difficulty', e.target.value || null];
    else if (e.target.matches('[data-feedback]')) [field, value] = ['feedback', e.target.value];
    else return;
    const d = draftFor();
    d[field] = value;
    d.edited.add(field);
    d.dirty = true;
    feedbackMessage = '';
    const feedbackStatus = root.querySelector('.feedback-message');
    if (feedbackStatus) feedbackStatus.textContent = '';
    const send = root.querySelector('[data-action="send-feedback"]');
    if (send) send.disabled = true;
    const small = root.querySelector('.feedback .small');
    if (small) small.textContent = 'Unsaved draft. Save or discard before updating or exporting.';
  }
  async function onClick(e) {
    const cell = e.target.closest('[data-cell]');
    if (cell) {
      await mark(Number(cell.dataset.cell));
      return;
    }
    const clue = e.target.closest('[data-clue]');
    if (clue) {
      const i = Number(clue.dataset.clue);
      lens = lens === i ? -1 : i;
      message = lens < 0 ? 'Clue outline cleared.' : 'Events in this clue are outlined.';
      render();
      return;
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'undo' || action === 'redo') await history(action);
    else if (action === 'restart') {
      if (run.marks.some(Boolean))
        await commit(emptyMarks(p), 'Level restarted. Undo brings your marks back.');
      else {
        message = 'Nothing to restart.';
        render();
      }
    } else if (action === 'check') {
      const result = check(p, run.marks);
      flagged = [];
      lens = -1;
      if (result.complete) message = win();
      else if (result.issues.length) {
        message = result.issues[0].text;
        flagged = result.issues[0].events.map((ev) => ev * p.slots + result.placed[ev]);
      } else if (!schedules(p, run.marks, 1).length)
        message =
          'Your marks leave no schedule that fits every clue. Hint can point at the conflict.';
      else message = 'No conflicts among the events placed so far.';
      render();
    } else if (action === 'hint') {
      const h = hint(p, run.marks);
      flagged = h.cells;
      if (h.cells.length) selected = h.cells[0];
      message = h.text;
      render();
    } else if (action === 'save-feedback') {
      const d = draftFor(),
        next = { ...run, rating: d.rating, difficulty: d.difficulty, feedback: d.feedback };
      if (await save(next)) {
        for (const field of d.edited) if (d[field] === next[field]) d.edited.delete(field);
        d.dirty = d.edited.size > 0;
        message = d.dirty
          ? 'Earlier feedback saved; your newer edits are still a draft.'
          : 'Feedback saved locally.';
      }
      render();
    } else if (action === 'send-feedback') {
      const draft = draftFor();
      if (draft.dirty) return;
      const key = idOf(p),
        hash = location.hash,
        saved = run,
        opener = e.target.closest('[data-action]'),
        here = () => !disposed && p && idOf(p) === key && location.hash === hash,
        current = () => here() && run === saved && draftFor() === draft && !draft.dirty,
        tell = (text) => {
          feedbackMessage = text;
          const status = root.querySelector('.feedback-message');
          if (status) status.textContent = text;
        };
      let opened = false;
      opener.disabled = true;
      tell('Opening feedback for review. Nothing has been sent.');
      try {
        opened = await reviewFeedback(p, saved, opener, current);
        if (here())
          tell(opened ? '' : 'Feedback changed. Save or discard your draft, then try again.');
      } catch (err) {
        if (here()) tell(err.message || 'Feedback could not open. Try again.');
      } finally {
        if (opener.isConnected) {
          opener.disabled = !here() || draftFor().dirty;
          if (
            !opened &&
            !opener.disabled &&
            (document.activeElement === document.body || document.activeElement === root.host) &&
            (!root.activeElement || root.activeElement === opener)
          )
            opener.focus();
        }
      }
    } else if (action === 'discard-feedback') {
      drafts.delete(idOf(p));
      message = 'Feedback draft discarded.';
      render();
    } else if (action === 'export') {
      try {
        flushDrafts();
        download('timeline-desk-backup.json', store.exportData());
        store.markExported();
        message = 'Desk backup downloaded.';
      } catch (err) {
        message = err.message;
        alert(err.message);
      }
      render();
    } else if (action === 'recovery') {
      try {
        const data = store.recoveryData();
        if (!data) throw Error('No recovery copy is available.');
        download('timeline-desk-recovery.json', data);
      } catch (err) {
        alert(err.message);
      }
    } else if (action === 'cancel-restore') {
      if (restoring) return;
      preview = null;
      reviewGeneration++;
      render();
    } else if (action === 'restore' && preview && !busy) {
      busy = true;
      try {
        flushDrafts();
        restoring = true;
        render();
        pending = preview.restore();
        await pending;
        preview = null;
        run = p ? store.getRun(p) : null;
        if (run) p = run.puzzle;
        message = 'Desk backup restored. A recovery copy was kept.';
      } catch (err) {
        message = err.message;
        alert(err.message);
      } finally {
        restoring = false;
        busy = false;
      }
      render();
    }
  }
  async function onChange(e) {
    onInput(e);
    if (!e.target.matches('[data-file]') || busy) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const generation = ++reviewGeneration,
      hash = location.hash,
      currentReview = () => !disposed && generation === reviewGeneration && hash === location.hash;
    if (preview) {
      preview = null;
      render();
    }
    try {
      if (file.size > 6 * 1024 * 1024) throw Error('Choose a desk backup smaller than 6 MB.');
      const raw = await file.text();
      if (!currentReview()) return;
      const reviewed = await store.reviewBackup(raw);
      if (!currentReview()) return;
      preview = reviewed;
      message = '';
      render();
    } catch (err) {
      if (!currentReview()) return;
      preview = null;
      message = err.message;
      alert(err.message);
      render();
    }
  }
  function onKey(e) {
    const el = e.target.closest('[data-cell]');
    if (!el || e.ctrlKey || e.metaKey || e.altKey) return;
    const i = Number(el.dataset.cell),
      T = p.slots,
      last = p.events.length * T;
    let next = i;
    if (e.key === 'ArrowLeft' && i % T > 0) next--;
    else if (e.key === 'ArrowRight' && i % T < T - 1) next++;
    else if (e.key === 'ArrowUp' && i >= T) next -= T;
    else if (e.key === 'ArrowDown' && i + T < last) next += T;
    else if (e.key.toLowerCase() === 'x') {
      e.preventDefault();
      mark(i, 1);
      return;
    } else if (e.key.toLowerCase() === 'p') {
      e.preventDefault();
      mark(i, 2);
      return;
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      mark(i, 0);
      return;
    } else return;
    e.preventDefault();
    selected = next;
    root
      .querySelectorAll('[data-cell]')
      .forEach((x) => (x.tabIndex = Number(x.dataset.cell) === next ? 0 : -1));
    root.querySelector(`[data-cell="${next}"]`)?.focus();
  }
  const onFocus = (e) => {
    const el = e.target.closest('[data-cell]');
    if (el) selected = Number(el.dataset.cell);
  };
  root.addEventListener('focusin', onFocus);
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  root.addEventListener('keydown', onKey);
  route();
  return {
    route,
    async flush() {
      flushDrafts();
      await store.flush();
    },
    dispose() {
      disposed = true;
      root.removeEventListener('focusin', onFocus);
      root.removeEventListener('click', onClick);
      root.removeEventListener('input', onInput);
      root.removeEventListener('change', onChange);
      root.removeEventListener('keydown', onKey);
      root.innerHTML = '';
    },
    setPreferences,
    focusDestination() {
      const target = root.querySelector(`[data-cell="${selected}"]`) || root.querySelector('main');
      target?.focus();
      return !!target;
    },
    refreshOffline(value) {
      offlineReady = !!value;
      render();
    },
  };
}
