// Loads the Observatory consent control after the page has finished loading. The artifact ships as
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
  // Nothing is buffered: while sharing is off the state resets and calls are dropped. Consent changes, a
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
  // The generated control is the only element with this id; any change inside it is a consent transition.
  document.addEventListener(
    'change',
    (e) => e.target?.closest?.('#pulseboard-usage-sharing') && reset(),
    true,
  );
  g.addEventListener('hashchange', () => {
    reset();
    g.PulseboardUsage?.track?.('page.view');
  });
  const inject = () => {
    const tag = document.createElement('script');
    tag.src = url;
    document.head.append(tag);
  };
  if (document.readyState === 'complete') inject();
  else globalThis.addEventListener('load', inject, { once: true });
})();
