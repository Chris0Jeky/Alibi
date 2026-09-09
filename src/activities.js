/* Optional activities own their UI lifecycle. The root owns routing and service-worker updates. */
(function (G) {
  'use strict';
  let loaded,
    castleLoaded,
    active = null,
    activeKind = null,
    activeHost = null,
    epoch = 0,
    offline = false,
    caching = null,
    operation = Promise.resolve(),
    preferences = null;
  const config = () => G.ALIBI_QUIET_CONFIG;
  const copyPreferences = (value) => (value ? { ...value } : null);
  async function loadSource(c) {
    if (!c) throw Error('This activity is unavailable in the current build.');
    if (c.source) {
      const url = URL.createObjectURL(new Blob([c.source], { type: 'text/javascript' }));
      try {
        await script(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    } else await script(c.script);
  }
  async function load() {
    if (G.AlibiQuietWing) return;
    if (!loaded)
      loaded = loadSource(config()).catch((error) => {
        loaded = null;
        throw error;
      });
    await loaded;
  }
  async function loadCastle() {
    if (G.AlibiCastle) return;
    if (!castleLoaded)
      castleLoaded = loadSource(config()?.castle).catch((error) => {
        castleLoaded = null;
        throw error;
      });
    await castleLoaded;
  }
  function script(url) {
    return new Promise((resolve, reject) => {
      const tag = document.createElement('script');
      const timer = setTimeout(() => {
        tag.remove();
        reject(Error('Activity download timed out. Retry online.'));
      }, 15000);
      tag.src = url;
      tag.onload = () => {
        clearTimeout(timer);
        tag.remove();
        resolve();
      };
      tag.onerror = () => {
        clearTimeout(timer);
        tag.remove();
        reject(Error('Activity could not load. Retry online.'));
      };
      document.head.append(tag);
    });
  }
  async function cachePack() {
    const c = config();
    if (!c.files || !G.caches) return;
    const name = 'alibi-quiet-wing-pack-' + c.build;
    try {
      const cache = await caches.open(name);
      if (!(await Promise.all(c.files.map((url) => cache.match(url)))).every(Boolean)) {
        try {
          await cache.addAll(
            c.files.map(
              (url) => new Request(url, { cache: 'reload', signal: AbortSignal.timeout(15000) }),
            ),
          );
        } catch (e) {
          await caches.delete(name);
          throw e;
        }
      }
      offline = true;
      const keys = (await caches.keys()).filter((k) => k.startsWith('alibi-quiet-wing-pack-'));
      const keep = new Set([name, ...keys.filter((k) => k !== name).slice(-1)]);
      await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
    } catch {
      offline = false;
    }
  }
  async function disposeActive() {
    if (!active) return;
    try {
      await active.flush();
    } catch {}
    try {
      active.dispose();
    } finally {
      active = activeKind = activeHost = null;
    }
  }
  function enter(host, options = {}) {
    if (options.preferences) preferences = copyPreferences(options.preferences);
    const kind = G.location?.hash?.startsWith('#/quiet/castle') ? 'castle' : 'quiet';
    const token = ++epoch;
    operation = operation
      .catch(() => {})
      .then(async () => {
        if (token !== epoch || !host.isConnected) return;
        if (active && activeKind === kind && activeHost === host) {
          active.setPreferences?.(preferences);
          active.route();
          return;
        }
        await disposeActive();
        if (kind === 'castle') await loadCastle();
        else await load();
        const c = config();
        const css =
          kind === 'castle'
            ? ''
            : (c.cssSource ??
              (await fetch(c.css, { signal: AbortSignal.timeout(15000) }).then((r) => {
                if (!r.ok) throw Error('Activity styles could not load.');
                return r.text();
              })));
        if (token !== epoch || !host.isConnected) return;
        const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
        const activity = kind === 'castle' ? G.AlibiCastle : G.AlibiQuietWing;
        const handle = await activity.mount({
          root,
          css,
          media: c.media,
          sources: c.sources,
          preferences,
        });
        if (token !== epoch || !host.isConnected) {
          handle.dispose();
          return;
        }
        active = handle;
        activeKind = kind;
        activeHost = host;
        if (kind === 'castle') G.AlibiCastle.cachePack();
        else if (!caching)
          caching = cachePack().finally(() => {
            caching = null;
          });
      });
    return operation;
  }
  function leave() {
    ++epoch;
    operation = operation.catch(() => {}).then(disposeActive);
    return operation;
  }
  async function flush() {
    const challengeStore = G.QWApp?.challengeStore;
    if (challengeStore) {
      await challengeStore.flush();
      if (challengeStore.info().mode === 'session' || challengeStore.info().protected)
        throw Error(
          'Return to Challenges and export or resolve its session saves before updating.',
        );
    }
    if (active) await active.flush();
    if (activeKind !== 'castle') await G.AlibiCastle?.flush();
    if (activeKind !== 'quiet' && G.QWRetainedDirty)
      throw Error('Return to Quiet Wing and export its unsaved session before updating.');
    if (G.QWApp && G.QWStore.info().mode === 'session')
      throw Error('Quiet Wing is session-only. Export it before updating.');
    if (G.QWStore?.info().blocked)
      throw Error('Export or resolve Quiet Wing recovery before updating.');
  }
  function setPreferences(value) {
    preferences = copyPreferences(value);
    active?.setPreferences?.(preferences);
  }
  G.AlibiActivities = {
    enter,
    leave,
    flush,
    load,
    loadCastle,
    setPreferences,
    diagnostics: () => ({
      loaded: !!G.AlibiQuietWing,
      active: !!active,
      offline: activeKind === 'castle' ? (G.AlibiCastle?.offline() ?? false) : offline,
      kind: activeKind,
    }),
  };
})(globalThis);
