// Loads the Observatory consent control after the page has finished loading. The artifact ships as
// its own hashed asset outside the offline shell, so it never joins the initial bundle or its budgets. The
// artifact itself refuses standalone exports, automated browsers, DNT/GPC signals and foreign origins.
(function () {
  const g = globalThis,
    url = g.ALIBI_OBSERVATORY_URL;
  if (!url || g.ALIBI_CONFIG?.standalone !== false || typeof document === 'undefined') return;
  g.addEventListener('hashchange', () => {
    g.PulseboardUsage?.resetJourney?.();
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
