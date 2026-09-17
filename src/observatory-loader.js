// Loads the Observatory consent control after the page has finished loading. The artifact ships as
// its own hashed asset outside the offline shell, so it never joins the initial bundle or its budgets. The
// artifact itself refuses standalone exports, automated browsers, DNT/GPC signals and foreign origins.
(function () {
  const g = globalThis,
    url = g.ALIBI_OBSERVATORY_URL;
  if (!url || g.ALIBI_CONFIG?.standalone !== false || typeof document === 'undefined') return;

  const context = () => {
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
  g.ALIBI_OBSERVATORY_CONTEXT = context;

  let attemptOpen = false;
  const active = () =>
    context().route === 'puzzle' && g.PulseboardUsage?.status?.().active === true;
  const emit = (event) => {
    if (!active()) {
      attemptOpen = false;
      return false;
    }
    return g.PulseboardUsage.track(event) === true;
  };
  const begin = () => {
    if (!active()) {
      attemptOpen = false;
      return false;
    }
    if (attemptOpen) return true;
    attemptOpen = emit('puzzle.started');
    return attemptOpen;
  };
  const finish = (event) => {
    if (!begin()) return false;
    const sent = emit(event);
    if (sent) attemptOpen = false;
    return sent;
  };
  const reset = () => {
    attemptOpen = false;
  };
  g.ALIBI_OBSERVATORY_JOURNEY = Object.freeze({
    begin,
    complete: () => finish('puzzle.completed'),
    fail: () => finish('puzzle.failed'),
    hint: () => begin() && emit('hint.requested'),
    reset,
  });

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
