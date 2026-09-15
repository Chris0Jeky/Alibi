// Loads the Observatory consent control after the page has finished loading. The artifact ships as
// its own hashed asset outside the offline shell, so it never joins the initial bundle or its budgets. The
// artifact itself refuses standalone exports, automated browsers, DNT/GPC signals and foreign origins.
(function () {
  const url = globalThis.ALIBI_OBSERVATORY_URL;
  if (!url || globalThis.ALIBI_CONFIG?.standalone !== false || typeof document === 'undefined')
    return;
  function routeContext() {
    const [page = '', section = ''] = String(globalThis.location?.hash || '')
      .replace(/^#\/?/, '')
      .split(/[/?]/);
    const route =
      !page || page === 'home'
        ? 'home'
        : page === 'play' || page === 'story'
          ? 'puzzle'
          : page === 'quiet' && section === 'castle'
            ? 'castle'
            : page === 'quiet'
              ? 'quiet-wing'
              : 'other';
    return { route, release: globalThis.ALIBI_CONFIG?.version };
  }
  globalThis.ALIBI_OBSERVATORY_CONTEXT = routeContext;
  globalThis.addEventListener('hashchange', () =>
    globalThis.PulseboardUsage?.track?.('page.view'),
  );
  const inject = () => {
    const tag = document.createElement('script');
    tag.src = url;
    document.head.append(tag);
  };
  if (document.readyState === 'complete') inject();
  else globalThis.addEventListener('load', inject, { once: true });
})();