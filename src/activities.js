/* Optional activities own their UI lifecycle. The root owns routing and service-worker updates. */
(function (G) {
  'use strict';
  const loads = {};
  let active = null,
    activeKind = null,
    activeHost = null,
    epoch = 0,
    offline = false,
    caching = null,
    operation = Promise.resolve(),
    preferences = null,
    practice = null;
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
  const activityFor = (kind) =>
    G[
      {
        quiet: 'AlibiQuietWing',
        castle: 'AlibiCastle',
        eclipse: 'AlibiEclipse',
        timeline: 'AlibiTimeline',
      }[kind]
    ];
  async function loadActivity(kind) {
    if (activityFor(kind)) return;
    if (!loads[kind])
      loads[kind] = loadSource(kind === 'quiet' ? config() : config()?.[kind]).catch((error) => {
        delete loads[kind];
        throw error;
      });
    await loads[kind];
  }
  const load = () => loadActivity('quiet');
  const loadCastle = () => loadActivity('castle');
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
    const kind =
      /^#\/quiet\/(castle|eclipse|timeline)(?:\/|$|\?)/.exec(G.location?.hash || '')?.[1] ||
      'quiet';
    if (kind === 'castle' && Object.prototype.hasOwnProperty.call(options, 'practice'))
      practice = options.practice || null;
    const token = ++epoch;
    operation = operation
      .catch(() => {})
      .then(async () => {
        if (token !== epoch || !host.isConnected) return;
        if (active && activeKind === kind && activeHost === host) {
          active.setPreferences?.(preferences);
          if (kind === 'castle') active.setPractice?.(practice);
          active.route();
          return;
        }
        await disposeActive();
        await loadActivity(kind);
        const c = config();
        const css =
          kind !== 'quiet'
            ? ''
            : (c.cssSource ??
              (await fetch(c.css, { signal: AbortSignal.timeout(15000) }).then((r) => {
                if (!r.ok) throw Error('Activity styles could not load.');
                return r.text();
              })));
        if (token !== epoch || !host.isConnected) return;
        const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
        const activity = activityFor(kind);
        const handle = await activity.mount({
          root,
          css,
          media: c.media,
          sources: c.sources,
          preferences,
          practice: kind === 'castle' ? practice : null,
        });
        if (token !== epoch || !host.isConnected) {
          handle.dispose();
          return;
        }
        active = handle;
        activeKind = kind;
        activeHost = host;
        if (kind !== 'quiet') activity.cachePack();
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
    if (activeKind !== 'eclipse') await G.AlibiEclipse?.flush();
    if (activeKind !== 'timeline') await G.AlibiTimeline?.flush();
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
  function setPractice(value) {
    practice = value || null;
    if (activeKind === 'castle') active?.setPractice?.(practice);
  }
  function focusDestination() {
    return !!active?.focusDestination?.();
  }
  G.AlibiActivities = {
    // Trusted build-time configuration only; shared by optional presentation packs.
    loadSource,
    enter,
    leave,
    flush,
    load,
    loadCastle,
    setPreferences,
    setPractice,
    focusDestination,
    diagnostics: () => ({
      loaded: !!G.AlibiQuietWing,
      active: !!active,
      offline:
        activeKind && activeKind !== 'quiet'
          ? (activityFor(activeKind)?.offline() ?? false)
          : offline,
      kind: activeKind,
    }),
  };
})(globalThis);
