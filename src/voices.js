/* Voices entry points (docs/FEEDBACK-AND-SURVEYS.md). The application calls AlibiVoices(run,
records) after every render. This adds the quiet Feedback button and "Report a problem with this
puzzle", and places for the rating row and survey invitation (official completion screens on the
primary site) and the Settings and Privacy panels. Their content, the sheet, the survey form and
delivery are a deferred, precached chunk (src/voices-queue.js, src/voices-sheet.js), loaded when a
place appears, on first use, or when messages are waiting. Nothing is sent from here. */
(function () {
  const g = globalThis,
    V = g.ALIBI_VOICES || {},
    $ = (s) => document.querySelector(s),
    icon = (n) => g.AlibiUI?.icon?.(n) || '';
  if (typeof document === 'undefined') return;
  // Sending works only on the primary origin with a known collector (not Sites, standalone, Android).
  const A = (g.AlibiVoices = decorate),
    eligible = (A.eligible =
      g.ALIBI_CONFIG?.standalone === false && !!V.collector && g.location?.origin === V.origin);
  let catalogue, chunk, started;
  const official = (A.official = (run) => {
    if (!catalogue) {
      catalogue = new Map();
      for (const p of g.ALIBI_CATALOG?.puzzles || []) catalogue.set(p?.id, p);
    }
    const p = catalogue.get(run?.puzzle?.id);
    return p && { subject: p.id, family: p.type, tier: String(p.difficulty).toLowerCase() };
  });
  const ensure = () =>
    (chunk ||= new Promise((resolve, reject) => {
      const s = document.createElement('script'),
        fail = () => {
          s.remove();
          chunk = null;
          reject();
        };
      if (g.AlibiVoicesSheet) return resolve(g.AlibiVoicesSheet);
      s.src = V.chunk;
      s.onload = () => (g.AlibiVoicesSheet ? resolve(g.AlibiVoicesSheet) : fail());
      s.onerror = fail;
      document.head.append(s);
    }));
  // Only a player's own action reports a failed load; places and flushes stay silent.
  const use = (fn, quiet) =>
    ensure()
      .then(fn)
      .catch(() => {
        const t = !quiet && $('#toasts');
        if (t) t.innerHTML = '<div class="toast error">Feedback could not open. Try again.</div>';
      });
  // Flush after the first render (idle), when back online and when the page is shown again.
  // A loaded chunk always flushes (its queue may live only in memory when storage fails).
  const kick = () => {
    if (!eligible) return;
    if (g.AlibiVoicesSheet) return g.AlibiVoicesSheet.flush();
    try {
      if (g.localStorage.getItem('alibi:voices:queue:v1')) use((s) => s.flush(), 1);
    } catch {}
  };
  g.addEventListener?.('online', kick);
  document.addEventListener(
    'visibilitychange',
    () => document.visibilityState === 'visible' && kick(),
  );
  // A place the chunk fills: at once when it is loaded, else as soon as it loads.
  const slot = (el, where, id) => {
    if (!el) return;
    el.insertAdjacentHTML(where, `<section id="${id}" data-vo></section>`);
    if (g.AlibiVoicesSheet) g.AlibiVoicesSheet[id]($('#' + id));
    else use((s) => $('#' + id) && s[id]($('#' + id)), 1);
  };
  function decorate(run, records) {
    A.run = run;
    A.records = records;
    if (!started) ((started = 1), (g.requestIdleCallback || setTimeout)(kick));
    document.querySelectorAll('[data-vo]').forEach((el) => el.remove());
    $('.top-actions')?.lastElementChild?.insertAdjacentHTML(
      'beforebegin',
      `<button type="button" class="round" id="vo-open" data-vo data-voice="open" aria-label="Feedback" title="Feedback">${icon('witness')}</button>`,
    );
    $('.play-secondary')?.insertAdjacentHTML(
      'beforeend',
      `<button type="button" class="btn ghost" id="vo-report" data-vo data-voice="report">${icon('flag')}Report a problem with this puzzle</button>`,
    );
    const end = eligible && official(run) && $('.play-end');
    if (end) {
      slot(end.querySelector('p'), 'afterend', 'vo-rate');
      slot(end, 'beforeend', 'vo-offer');
    }
    slot($('.settings-grid')?.children[1], 'afterend', 'vo-panel');
    slot(
      [...document.querySelectorAll('.privacy-copy h2')].find(
        (h) => h.textContent === 'Data removal.',
      ),
      'beforebegin',
      'vo-privacy',
    );
  }
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('[data-voice]'),
      a = el?.dataset.voice,
      o = official(A.run);
    if (a === 'open' || a === 'report')
      use((s) =>
        s.open(
          a === 'report' ? 'puzzle' : '',
          /^#\/(play|story)\//.test(g.location.hash) ? o?.subject : '',
        ),
      );
    if (a === 'survey') use((s) => s.survey());
  });
})();
