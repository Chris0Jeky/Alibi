// Host glue for the Pulseboard SDK v3 (observatory/pulseboard.js). The web build emits the SDK as its
// own hashed deferred asset outside the offline shell; the SDK owns consent, the Beta bar and delivery,
// and stays inert off the primary origin and in automated browsers. This file only:
// - keeps the persistent #pulseboard-slot (the SDK's [data-pulseboard-slot]) inside the Settings or
//   Privacy panel, so the collapsed Beta button renders inline there and never floats over a board;
// - releases the reserved top bar space when the SDK never ran (offline, blocked, Android);
// - reports hash routes through Pulseboard.route with the registered route names;
// - reports a bounded puzzle journey: aggregate counts plus Journeys events whose props are official
//   puzzle ids and numbers only (never answers, boards, notes or typed text).
// Every call is guarded, so the game is unchanged when window.Pulseboard is undefined or throws.
(function () {
  const g = globalThis;
  if (g.ALIBI_CONFIG?.standalone !== false || typeof document === 'undefined') return;
  const sdk = () => {
    const p = g.Pulseboard;
    return p && typeof p.track === 'function' && typeof p.count === 'function' ? p : null;
  };
  const routeOf = (hash) => {
    const [page = '', section = ''] = String(hash || '')
      .slice(2)
      .split(/[/?]/);
    return !page || page === 'home'
      ? 'home'
      : page === 'play' || page === 'story'
        ? 'puzzle'
        : page === 'quiet'
          ? section === 'castle'
            ? 'castle'
            : 'quiet-wing'
          : 'other';
  };
  // Only official catalogue ids leave the device; imported or workshop puzzles carry authored ids.
  let official;
  const puzzleId = (run) => {
    const id = run?.puzzle?.id;
    if (!official) {
      official = new Set();
      for (const p of g.ALIBI_CATALOG?.puzzles || [])
        if (typeof p?.id === 'string') official.add(p.id);
    }
    return typeof id === 'string' && official.has(id) ? id : 'custom';
  };
  const whole = (n) => (Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), 864000) : 0);
  // One attempt opens on the first real board change and closes at most once: a conflicted check or a
  // committed completion. Repeated checks, undo/redo reviews and hints never open or close one. A restart
  // (puzzle.abandoned) drops the open attempt without emitting. A new run, a route change or a consent
  // change resets the local state; nothing is buffered while the SDK is absent or everything is off.
  let run, open, fails, hints, gate;
  const reset = () => ((open = null), (fails = hints = 0));
  reset();
  const emit = (p, event, props) => {
    let sent = false;
    try {
      sent = p.count(event) === true;
    } catch {}
    try {
      sent = p.track(event, props) === true || sent;
    } catch {}
    return sent;
  };
  g.AlibiJourney = (current, event, seconds) => {
    const p = sdk();
    let state = null;
    try {
      state = p?.consent?.get?.();
    } catch {}
    const key = state ? `${!!state.counts}${!!state.journeys}` : '';
    if (key !== gate) ((gate = key), reset());
    if (run !== current) ((run = current), reset());
    if (!p || !state || (!state.counts && !state.journeys)) return (reset(), false);
    if (event === 'puzzle.abandoned') return (reset(), true);
    if (event && !/^(puzzle\.(started|failed|completed)|hint\.requested)$/.test(event))
      return false;
    const puzzle = puzzleId(current);
    if (!event || event === 'puzzle.started') {
      if (open) return true;
      open = puzzle;
      emit(p, 'puzzle.started', { puzzle });
      return true;
    }
    if (event === 'hint.requested') return emit(p, event, { puzzle, hint: ++hints });
    if (!open) return false;
    open = null;
    const time = whole(seconds);
    if (event === 'puzzle.failed')
      return emit(p, event, { puzzle, seconds: time, attempts: ++fails });
    const attempts = fails + 1;
    const used = hints;
    reset();
    return emit(p, event, { puzzle, seconds: time, hints: used, attempts });
  };
  // The SDK renders its Beta button into #pulseboard-slot. The app parks it on the body (hidden) before
  // replacing its content and moves it into #usage-sharing-slot after rendering Settings or Privacy.
  g.AlibiUsageSlot = (rescue) => {
    try {
      const el = document.getElementById?.('pulseboard-slot');
      if (!el) return false;
      const slot = rescue ? null : document.getElementById?.('usage-sharing-slot');
      if (slot) {
        if (el.parentElement !== slot) slot.prepend(el);
      } else if (el.parentElement !== document.body) document.body.append(el);
      el.hidden = !slot;
      return true;
    } catch {
      return false;
    }
  };
  g.addEventListener('hashchange', () => {
    reset();
    try {
      sdk()?.route?.(routeOf(g.location?.hash));
    } catch {}
  });
  // After every deferred script ran: without an SDK nothing will release the reserved bar space, and
  // with one the page view it recorded at mount was for 'home', so a deep link names its real route.
  // This bundle is itself deferred (readyState 'interactive', SDK not yet run), so wait for
  // DOMContentLoaded, with load as a fallback; settle runs once.
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    try {
      const p = sdk();
      if (!p) {
        const bar = document.querySelector?.('[data-pulseboard-bar]');
        if (bar) {
          bar.hidden = true;
          if (bar.style) bar.style.height = bar.style.minHeight = '0';
        }
        return;
      }
      const route = routeOf(g.location?.hash);
      if (route !== 'home') p.route?.(route);
    } catch {}
  };
  if (document.readyState === 'complete') settle();
  else {
    document.addEventListener('DOMContentLoaded', settle, { once: true });
    g.addEventListener('load', settle, { once: true });
  }
})();
