import { MODES, applyMark, check, component, hint } from './model.mjs';
import { PUZZLES } from './puzzles.mjs';
import { parseBackup } from './storage.mjs';

// Drafts outlive route changes and mounts; no text is transmitted.
const drafts = new Map();
const esc = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const idOf = (p) => `${p.id}@${p.revision}`;
const valueName = (v) => (v === 1 ? 'Sun' : v === 0 ? 'Moon' : 'Empty');
export function flushDrafts() {
  if ([...drafts.values()].some((d) => d.dirty))
    throw Error('Save or discard your Eclipse Lab feedback draft before updating.');
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
    brush = 1,
    selected = 0,
    highlight = [],
    message = '',
    preview = null,
    busy = false,
    offlineReady = !!offline;
  let prefs = preferences || {},
    pending = Promise.resolve();
  const selectPuzzle = () => {
    try {
      return (
        PUZZLES.find(
          (x) => x.id === decodeURIComponent(location.hash.slice('#/quiet/eclipse/'.length)),
        ) || null
      );
    } catch {
      return null;
    }
  };
  const draftFor = () => {
    const key = idOf(p);
    if (!drafts.has(key))
      drafts.set(key, {
        rating: run.rating,
        difficulty: run.difficulty,
        feedback: run.feedback,
        dirty: false,
      });
    return drafts.get(key);
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
    `<style>${css}</style><main tabindex="-1"><header><a class="back" href="#/quiet">← Quiet Wing</a><span class="eyebrow">A room for trying things</span><h1>Eclipse Lab</h1><p class="intro">Four little experiments in suns, moons and the space between.</p></header>${status()}${content}${backupPanel()}</main>`;
  function backupPanel() {
    return `<section class="backup"><h2>Your lab notebook</h2><p>Lab progress and feedback stay on this device until exported. This lab backup is separate: the regular Cabinet combined backup does not include it.</p><div class="actions"><button data-action="export">Export lab backup</button><label class="filebutton">Review lab backup<input type="file" data-file accept="application/json,.json"></label><button data-action="recovery">Download recovery copy</button></div>${preview ? `<div class="notice"><p>Backup contains ${preview.count} experiment runs. Restoring replaces the current lab shelf and keeps a recovery copy.</p><button data-action="restore">Confirm restore</button><button data-action="cancel-restore">Cancel</button></div>` : ''}</section>`;
  }
  function lobby() {
    return `<section class="lobby"><div class="section-head"><span class="eyebrow">The experiments</span><h2>Choose a table</h2><p>Each collection has eight provisional levels. Start small, then try a larger sky.</p></div><div class="cards">${Object.entries(
      MODES,
    )
      .map(
        ([key, m], i) =>
          `<article class="card"><div class="card-number">0${i + 1} <span>✦</span></div><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p><ul>${m.rules.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${['harbour', 'switchback'].includes(key) ? '<p class="note">Triples and repeated lines are allowed.</p>' : ''}<div class="level-list" aria-label="${esc(m.title)} levels">${PUZZLES.filter(
            (x) => x.mode === key,
          )
            .map(
              (x) =>
                `<a href="#/quiet/eclipse/${x.id}" aria-label="${esc(x.title)}, ${x.size} by ${x.size}">${x.level}</a>`,
            )
            .join('')}</div></article>`,
      )
      .join('')}</div></section>`;
  }
  function clues() {
    const n = p.size,
      out = [];
    for (let i = 0; i < n; i++) {
      const cells = Array.from({ length: n }, (_, j) => i * n + j);
      out.push({
        cells,
        text: `Row ${i + 1}: ${p.rowTargets[i]} suns${p.mode === 'switchback' ? `, ${p.rowChanges[i]} changes` : ''}`,
      });
    }
    for (let i = 0; i < n; i++) {
      const cells = Array.from({ length: n }, (_, j) => j * n + i);
      out.push({
        cells,
        text: `Column ${i + 1}: ${p.colTargets[i]} suns${p.mode === 'switchback' ? `, ${p.colChanges[i]} changes` : ''}`,
      });
    }
    for (const l of p.links)
      out.push({ cells: [l.a, l.b], text: `${address(l.a)} and ${address(l.b)}: ${l.relation}` });
    for (const w of p.windows)
      out.push({ cells: w.cells, text: `Window at ${address(w.cells[0])}: ${w.suns} suns` });
    return out;
  }
  function address(i) {
    return `row ${Math.floor(i / p.size) + 1}, column ${(i % p.size) + 1}`;
  }
  function overlays() {
    const n = p.size;
    return (
      p.links
        .map((l) => {
          const a = l.a,
            b = l.b,
            ax = (a % n) + 0.5,
            ay = Math.floor(a / n) + 0.5,
            bx = (b % n) + 0.5,
            by = Math.floor(b / n) + 0.5;
          return `<span class="edge" style="left:${((ax + bx) * 50) / n}%;top:${((ay + by) * 50) / n}%" aria-hidden="true">${l.relation === 'same' ? '=' : '≠'}</span>`;
        })
        .join('') +
      p.windows
        .map(
          (w) =>
            `<span class="window-mark" style="left:${(((w.cells[0] % n) + 1) * 100) / n}%;top:${((Math.floor(w.cells[0] / n) + 1) * 100) / n}%" aria-hidden="true">W${w.suns}</span>`,
        )
        .join('')
    );
  }
  function board() {
    return `<div class="board-wrap"><div class="board" role="group" aria-label="${esc(p.title)} board" style="--n:${p.size}">${run.cells.map((v, i) => `<button class="cell ${p.givens[i] !== -1 ? 'fixed' : ''} ${highlight.includes(i) ? 'highlight' : ''}" data-cell="${i}" tabindex="${i === selected ? 0 : -1}" aria-label="Row ${Math.floor(i / p.size) + 1}, column ${(i % p.size) + 1}, ${valueName(v)}${p.givens[i] !== -1 ? ', fixed' : ''}">${v === 1 ? '☀' : v === 0 ? '☾' : '<span class="empty">·</span>'}</button>`).join('')}<div class="overlays">${overlays()}</div></div></div>`;
  }
  function feedback() {
    const d = draftFor();
    const params = new URLSearchParams({
      title: `Eclipse Lab feedback: ${p.title}`,
      body: `Experiment: ${p.mode}\nPuzzle: ${p.id}\nRevision: ${p.revision}\nEnjoyment: ${run.rating ?? 'not rated'}/5\nDifficulty: ${run.difficulty ?? 'not selected'}\n\nFeedback:\n${run.feedback}`,
    });
    const share = `https://github.com/Chris0Jeky/Alibi/issues/new?${params}`;
    return `<section class="feedback"><span class="eyebrow">Your impressions</span><h2>Help shape this room</h2><p>Ratings and notes stay on this device until you export them. Nothing is sent to a server.</p><fieldset><legend>Enjoyment</legend><div class="rating">${[1, 2, 3, 4, 5].map((x) => `<label><input type="radio" name="rating" value="${x}" ${d.rating === x ? 'checked' : ''}> ${x}</label>`).join('')}</div></fieldset><label>Difficulty <select data-difficulty><option value="">Choose an impression</option><option value="gentle" ${d.difficulty === 'gentle' ? 'selected' : ''}>Gentle</option><option value="just-right" ${d.difficulty === 'just-right' ? 'selected' : ''}>Just right</option><option value="tough" ${d.difficulty === 'tough' ? 'selected' : ''}>Tough</option></select></label><label>Notes <textarea data-feedback maxlength="2000" rows="4">${esc(d.feedback)}</textarea></label><p class="small">${d.dirty ? 'Unsaved draft. Save or discard before updating or exporting.' : 'Optional. You can change this later.'}</p><div class="actions"><button data-action="save-feedback">Save feedback</button><button data-action="discard-feedback">Discard draft</button></div><p class="small">Saved feedback stays on this device. To send it, review and submit a GitHub issue (GitHub sign-in required).</p><a href="${esc(share)}" target="_blank" rel="noopener noreferrer">Share feedback on GitHub</a></section>`;
  }
  function play() {
    const m = MODES[p.mode],
      list = PUZZLES.filter((x) => x.mode === p.mode),
      ix = list.findIndex((x) => x.id === p.id);
    return `<section class="play"><a href="#/quiet/eclipse">← All experiments</a><div class="play-heading"><div><span class="eyebrow">${esc(m.title)} · ${p.size} × ${p.size}</span><h2>${esc(p.title)}</h2><p>${esc(p.lesson)}</p></div><nav class="level-nav" aria-label="Levels">${ix > 0 ? `<a href="#/quiet/eclipse/${list[ix - 1].id}">← Previous</a>` : ''}${ix < list.length - 1 ? `<a href="#/quiet/eclipse/${list[ix + 1].id}">Next →</a>` : ''}</nav></div><div class="play-grid"><div><div class="toolbar" role="group" aria-label="Choose a symbol">${[
      [1, '☀ Sun'],
      [0, '☾ Moon'],
      [-1, 'Clear'],
    ]
      .map(([v, t]) => `<button data-brush="${v}" aria-pressed="${brush === v}">${t}</button>`)
      .join(
        '',
      )}</div>${board()}<p class="small">Choose a symbol, then select a cell. Arrow keys move; S, M and Backspace mark. Enter or Space cycles.</p><div class="actions"><button data-action="preview-linked">Preview linked group</button><button data-action="linked">Fill linked group</button><button data-action="undo" ${!run.undo.length ? 'disabled' : ''}>Undo</button><button data-action="redo" ${!run.redo.length ? 'disabled' : ''}>Redo</button><button data-action="restart">Restart</button></div><div class="actions"><button data-action="check">Check</button><button data-action="hint">Hint</button></div><p class="message" role="status" aria-live="polite">${esc(message)}</p></div><aside class="clue-panel"><h3>Rules &amp; clue lens</h3><ul>${m.rules.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${['harbour', 'switchback'].includes(p.mode) ? '<p><strong>Triples and repeated lines are allowed.</strong></p>' : ''}<p>Choose a clue to outline its cells.</p><div class="clues">${clues()
      .map((c, i) => `<button data-clue="${i}">${esc(c.text)}</button>`)
      .join('')}</div></aside></div>${feedback()}</section>`;
  }
  function render() {
    if (disposed) return;
    const focused = root.activeElement;
    let selector = null;
    if (focused) {
      for (const attr of [
        'data-cell',
        'data-brush',
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
  async function mark(cell, value, linked = false) {
    if (!p || busy) return;
    selected = cell;
    const result = applyMark(p, run.cells, { cell, value, linked });
    if (!result.ok) {
      message = result.message;
      render();
      return;
    }
    if (result.cells.every((x, i) => x === run.cells[i])) {
      message = 'No change.';
      render();
      return;
    }
    const next = {
      ...run,
      cells: result.cells,
      undo: [...run.undo, run.cells].slice(-40),
      redo: [],
    };
    if (await save(next)) {
      message = linked ? 'Linked group filled as one move.' : '';
      highlight = linked ? component(p, cell).map((x) => x.cell) : [];
    }
    render();
  }
  async function history(kind) {
    if (busy || !run[kind].length) return;
    const source = run[kind],
      other = kind === 'undo' ? 'redo' : 'undo';
    const next = {
      ...run,
      cells: source.at(-1),
      [kind]: source.slice(0, -1),
      [other]: [...run[other], run.cells].slice(-40),
    };
    if (await save(next)) message = kind === 'undo' ? 'Move undone.' : 'Move restored.';
    render();
  }
  async function route() {
    await pending.catch(() => {});
    if (disposed) return;
    const found = selectPuzzle();
    if (found?.id !== p?.id) {
      p = found;
      run = p ? store.getRun(p) : null;
      if (run) p = run.puzzle;
      selected = 0;
      highlight = [];
      message = '';
      preview = null;
    }
    render();
  }
  function onInput(e) {
    if (!p) return;
    const d = draftFor();
    if (e.target.matches('[name="rating"]')) d.rating = Number(e.target.value);
    else if (e.target.matches('[data-difficulty]')) d.difficulty = e.target.value || null;
    else if (e.target.matches('[data-feedback]')) d.feedback = e.target.value;
    else return;
    d.dirty = true;
    const small = root.querySelector('.feedback .small');
    if (small) small.textContent = 'Unsaved draft. Save or discard before updating or exporting.';
  }
  async function onClick(e) {
    const cell = e.target.closest('[data-cell]');
    if (cell) {
      await mark(Number(cell.dataset.cell), brush);
      return;
    }
    const b = e.target.closest('[data-brush]');
    if (b) {
      brush = Number(b.dataset.brush);
      render();
      return;
    }
    const clue = e.target.closest('[data-clue]');
    if (clue) {
      highlight = clues()[Number(clue.dataset.clue)].cells;
      message = 'Clue cells outlined.';
      render();
      return;
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'preview-linked') {
      try {
        highlight = component(p, selected).map((x) => x.cell);
        message = 'Linked group outlined; choose Fill linked group to apply the selected symbol.';
      } catch (err) {
        message = err.message;
      }
      render();
    } else if (action === 'linked') {
      try {
        highlight = component(p, selected).map((x) => x.cell);
        await mark(selected, brush, true);
      } catch (err) {
        message = err.message;
        render();
      }
    } else if (action === 'undo' || action === 'redo') await history(action);
    else if (action === 'restart' && confirm('Restart this level? You can undo the restart.')) {
      const next = {
        ...run,
        cells: [...p.givens],
        undo: [...run.undo, run.cells].slice(-40),
        redo: [],
      };
      if (await save(next)) message = 'Level restarted.';
      render();
    } else if (action === 'check') {
      const result = check(p, run.cells);
      highlight = [...new Set(result.issues.flatMap((x) => x.cells))];
      message = result.complete
        ? 'Solved! All clues are satisfied.'
        : result.issues.length
          ? result.issues[0].message
          : 'No conflicts found so far.';
      render();
    } else if (action === 'hint') {
      const h = hint(p, run.cells);
      highlight = h ? [h.cell] : [];
      message = h
        ? `${h.reason} Try ${valueName(h.value)} at ${address(h.cell)}.`
        : 'No local hint is available here. Check for conflicts or review the clues.';
      render();
    } else if (action === 'save-feedback') {
      const d = draftFor(),
        next = { ...run, rating: d.rating, difficulty: d.difficulty, feedback: d.feedback };
      if (await save(next)) {
        d.dirty =
          d.rating !== next.rating ||
          d.difficulty !== next.difficulty ||
          d.feedback !== next.feedback;
        message = d.dirty
          ? 'Earlier feedback saved; your newer edits are still a draft.'
          : 'Feedback saved locally.';
      }
      render();
    } else if (action === 'discard-feedback') {
      drafts.delete(idOf(p));
      message = 'Feedback draft discarded.';
      render();
    } else if (action === 'export') {
      try {
        flushDrafts();
        download('eclipse-lab-backup.json', store.exportData());
        store.markExported();
        message = 'Lab backup downloaded.';
      } catch (err) {
        message = err.message;
        alert(err.message);
      }
      render();
    } else if (action === 'recovery') {
      try {
        const data = store.recoveryData();
        if (!data) throw Error('No recovery copy is available.');
        download('eclipse-lab-recovery.json', data);
      } catch (err) {
        alert(err.message);
      }
    } else if (action === 'cancel-restore') {
      preview = null;
      render();
    } else if (action === 'restore' && preview) {
      try {
        flushDrafts();
        await store.restore(preview.raw, preview.revision);
        drafts.clear();
        preview = null;
        run = p ? store.getRun(p) : null;
        if (run) p = run.puzzle;
        message = 'Lab backup restored. A recovery copy was kept.';
      } catch (err) {
        message = err.message;
        alert(err.message);
      }
      render();
    }
  }
  async function onChange(e) {
    onInput(e);
    if (!e.target.matches('[data-file]')) return;
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 6 * 1024 * 1024) throw Error('Choose a lab backup smaller than 6 MB.');
      const raw = await file.text(),
        data = parseBackup(raw);
      preview = { raw, revision: store.snapshot().revision, count: Object.keys(data.runs).length };
      message = '';
      render();
    } catch (err) {
      preview = null;
      message = err.message;
      alert(err.message);
      render();
    }
  }
  function onKey(e) {
    const el = e.target.closest('[data-cell]');
    if (!el) return;
    const i = Number(el.dataset.cell),
      n = p.size;
    let next = i;
    if (e.key === 'ArrowLeft' && i % n > 0) next--;
    else if (e.key === 'ArrowRight' && i % n < n - 1) next++;
    else if (e.key === 'ArrowUp' && i >= n) next -= n;
    else if (e.key === 'ArrowDown' && i < n * (n - 1)) next += n;
    else if (e.key.toLowerCase() === 's') {
      e.preventDefault();
      mark(i, 1);
      return;
    } else if (e.key.toLowerCase() === 'm') {
      e.preventDefault();
      mark(i, 0);
      return;
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      mark(i, -1);
      return;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      mark(i, run.cells[i] === -1 ? 1 : run.cells[i] === 1 ? 0 : -1);
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
      const target = root.querySelector('main');
      target?.focus();
      return !!target;
    },
    refreshOffline(value) {
      offlineReady = !!value;
      render();
    },
  };
}
