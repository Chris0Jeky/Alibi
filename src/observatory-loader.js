// Loads the Observatory statistics control after the page has finished loading. The artifact ships as
// its own hashed asset outside the offline shell, so it never joins the initial bundle or its budgets. The
// artifact itself refuses standalone exports, automated browsers, DNT/GPC signals and foreign origins.
(function () {
  const g = globalThis,
    url = g.ALIBI_OBSERVATORY_URL;
  if (!url || g.ALIBI_CONFIG?.standalone !== false || typeof document === 'undefined') return;
  g.ALIBI_OBSERVATORY_CONTEXT = () => {
    const [page = '', section = ''] = (g.location?.hash || '').slice(2).split(/[/?]/);
    const route =
      !page || page === 'home'
        ? 'home'
        : page === 'play' || page === 'story'
          ? 'puzzle'
          : page === 'quiet'
            ? section === 'castle'
              ? 'castle'
              : 'quiet-wing'
            : 'other';
    return { route, release: g.ALIBI_CONFIG?.version };
  };
  // Bounded puzzle journey over the generated facade. It forwards only the fixed event names below: no
  // puzzle ids, answers, text, URLs or boards. Only a real board change opens an attempt; a conflicted
  // check or a committed completion closes an open one and is dropped otherwise (repeated checks, undo/redo
  // reviews), so one attempt yields at most one terminal. Hints are reported but never open an attempt.
  // A restart abandons the open attempt locally (puzzle.abandoned), which resets without emitting.
  // Nothing is buffered: while sharing is off the state resets and calls are dropped. Preference changes, a
  // remounted facade and route changes also reset.
  let usage, run, open;
  const reset = () => (run = open = null);
  g.AlibiJourney = (current, event) => {
    const u = g.PulseboardUsage;
    if (u !== usage) ((usage = u), reset());
    if (run !== current) ((run = current), (open = null));
    if (!u?.status?.().active) return (reset(), false);
    if (event === 'puzzle.abandoned') {
      open = null;
      return true;
    }
    if (event && !/^(puzzle\.(started|failed|completed)|hint\.requested)$/.test(event))
      return false;
    if (!event || event === 'puzzle.started') return open || (open = u.track('puzzle.started'));
    if (event === 'hint.requested') return u.track(event);
    if (!open) return false;
    open = null;
    return u.track(event);
  };
  // The generated control is the only element with this id; its switch changes the sharing preference.
  // Settings-first placement: the control lives in the Settings/Privacy slot, never as a popup.
  // Sharing still defaults on for eligible visits; the Settings box turns it off.
  const NOTICE = 'pulseboard-usage-sharing';
  const SLOT = 'usage-sharing-slot';
  document.addEventListener('change', (e) => e.target?.closest?.('#' + NOTICE) && reset(), true);
  // Moves the control into the rendered slot, or parks it hidden on the body. The app rescues it
  // before replacing its content so a re-render cannot destroy the control.
  g.AlibiUsageSlot = (rescue) => {
    try {
      const el = document.getElementById?.(NOTICE);
      if (!el) return false;
      const slot = rescue ? null : document.getElementById?.(SLOT);
      if (slot && el.parentElement !== slot) slot.replaceChildren(el);
      el.hidden = !slot;
      if (!slot && el.parentElement !== document.body) document.body.prepend(el);
      return true;
    } catch {
      return false;
    }
  };
  g.addEventListener('hashchange', () => {
    reset();
    g.PulseboardUsage?.track?.('page.view');
  });
  const inject = () => {
    const tag = document.createElement('script');
    tag.src = url;
    document.head.append(tag);
    if (!g.AlibiUsageSlot()) {
      try {
        const seen = new MutationObserver(() => g.AlibiUsageSlot() && seen.disconnect());
        seen.observe(document.body, { childList: true });
      } catch {}
    }
  };
  if (document.readyState === 'complete') inject();
  else globalThis.addEventListener('load', inject, { once: true });
})();
