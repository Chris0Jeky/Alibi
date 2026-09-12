/* Optional pack bootstrap. No save data, shell-cache mutation or runtime remote origins. */
(function (G) {
  'use strict';
  const h = G.AlibiHouseLoader, cfg = G.ALIBI_HOUSE_CONFIG;
  async function stylesheet() {
    if (cfg.cssSource) {
      const el = document.createElement('style');
      el.textContent = cfg.cssSource;
      document.head.append(el);
      return;
    }
    await new Promise((resolve, reject) => {
      const el = document.createElement('link');
      const finish = (ok) => {
        clearTimeout(timer);
        el.onload = el.onerror = null;
        if (ok) resolve();
        else { el.remove(); reject(Error('Preview stylesheet unavailable.')); }
      };
      const timer = setTimeout(() => finish(false), 15000);
      el.rel = 'stylesheet'; el.href = cfg.css;
      el.onload = () => finish(true); el.onerror = () => finish(false);
      document.head.append(el);
    });
  }
  function offlineLabel() {
    const el = document.querySelector('[data-house-offline]');
    if (el) el.textContent = h.offline ? 'Preview files cached for offline use' : 'Offline preview copy not ready';
  }
  async function cachePack() {
    if (!cfg.files || !G.caches) return;
    const prefix = 'alibi-house-pack-', name = prefix + cfg.build;
    try {
      const cache = await caches.open(name);
      if (!(await Promise.all(cfg.files.map(url => cache.match(url)))).every(Boolean)) {
        try {
          await cache.addAll(cfg.files.map(url => new Request(url, { cache: 'reload', signal: AbortSignal.timeout(15000) })));
        } catch (error) {
          await caches.delete(name);
          throw error;
        }
      }
      h.offline = true;
      const keys = (await caches.keys()).filter(key => key.startsWith(prefix));
      const keep = new Set([name, ...keys.filter(key => key !== name).slice(-1)]);
      await Promise.all(keys.filter(key => !keep.has(key)).map(key => caches.delete(key)));
    } catch { h.offline = false; }
    // Do not re-render a form or steal focus when background caching finishes.
    offlineLabel();
  }
  (async () => {
    await stylesheet();
    const experience = G.AlibiHouse.create(h.bridge, G.AlibiClub);
    h.offline = cfg.files ? false : null;
    h.home = () => experience.home();
    h.afterRender = route => {
      const enabled = h.active();
      document.body.dataset.house = document.documentElement.dataset.house = String(enabled);
      if (enabled) document.body.classList.remove('club-home');
      experience.afterRender(route);
    };
    h.diagnostics = () => ({ ready: true, pending: !!h.pending, error: h.error, offline: h.offline, study: experience.diagnostics() });
    h.pending = false;
    if (h.active()) h.bridge.render();
    cachePack();
  })().catch(() => {
    h.pending = false; h.error = true;
    if (h.active()) h.bridge.render();
  });
})(globalThis);
