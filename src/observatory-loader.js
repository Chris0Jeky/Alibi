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
  g.addEventListener('hashchange', () => g.PulseboardUsage?.track?.('page.view'));
  const inject = () => {
    const tag = document.createElement('script');
    tag.src = url;
    document.head.append(tag);
  };
  if (document.readyState === 'complete') inject();
  else globalThis.addEventListener('load', inject, { once: true });
})();
