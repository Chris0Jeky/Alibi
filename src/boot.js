/* Keep startup failures recoverable without clearing device-local progress. */
(function () {
  'use strict';

  const routeAliases = Object.freeze({
    games: (tail) => ['salon', ...tail],
    space: () => ['settings'],
    wing: (tail) => ['quiet', ...tail],
    castle: (tail) => ['quiet', 'castle', ...(tail.length ? tail : ['map'])],
    wrenmere: (tail) => ['quiet', 'castle', ...(tail.length ? tail : ['map'])],
  });
  const knownRoutes = new Set([
    'home',
    'library',
    'play',
    'casebooks',
    'story',
    'journal',
    'settings',
    'workshop',
    'privacy',
    'changelog',
    'salon',
    'lab',
    'club',
    'quiet',
  ]);

  function hashParts() {
    const raw = String(location.hash || '').replace(/^#\/?/, ''),
      [path, ...queryParts] = raw.split('?');
    return {
      raw,
      parts: path.split('/').filter(Boolean),
      query: queryParts.length ? `?${queryParts.join('?')}` : '',
    };
  }

  function normalizeHashAlias() {
    const { parts, query } = hashParts(),
      alias = routeAliases[parts[0]?.toLowerCase()];
    if (!alias) return false;
    const targetParts = alias(parts.slice(1)),
      target = `#/${targetParts.join('/')}${query}`;
    if (target === location.hash) return false;
    history.replaceState(history.state, '', target);
    return true;
  }

  function unknownRoute() {
    const { raw, parts } = hashParts(),
      root = parts[0]?.toLowerCase();
    if (!root || knownRoutes.has(root) || routeAliases[root]) return null;
    return { raw, root };
  }

  function routeLink(label, href, secondary = false) {
    const link = document.createElement('a');
    link.className = `btn${secondary ? ' secondary' : ''}`;
    link.href = href;
    link.textContent = label;
    return link;
  }

  function renderUnknownRoute() {
    const missing = unknownRoute(),
      main = document.getElementById('main');
    if (!missing || !main || document.getElementById('route-not-found')) return false;

    const panel = document.createElement('section');
    panel.id = 'route-not-found';
    panel.className = 'empty route-not-found';
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-labelledby', 'route-not-found-title');

    const eyebrow = document.createElement('div');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'ROOM NOT FOUND';
    const title = document.createElement('h1');
    title.id = 'route-not-found-title';
    title.textContent = 'That door is not on the map.';
    const note = document.createElement('p');
    note.textContent =
      'This address does not match an Alibi room. Your saved progress is unchanged.';
    const address = document.createElement('p');
    address.className = 'fine';
    address.textContent = 'Unmatched address: ';
    const code = document.createElement('code');
    code.textContent = String(location.hash || `#/${missing.raw}`);
    address.append(code);
    const actions = document.createElement('div');
    actions.className = 'row actions';
    actions.append(
      routeLink('Return to your desk', '#/home'),
      routeLink('Browse puzzles', '#/library', true),
    );
    panel.append(eyebrow, title, note, address, actions);
    main.replaceChildren(panel);
    document.title = 'Room not found · Alibi';
    if (
      !document.activeElement ||
      document.activeElement === document.body ||
      document.activeElement === document.documentElement
    )
      main.focus({ preventScroll: true });
    return true;
  }

  let routeObserver = null;
  function watchUnknownRoutes() {
    if (!routeObserver && typeof globalThis.MutationObserver === 'function') {
      const target = document.getElementById('app') || document.documentElement;
      if (target) {
        routeObserver = new globalThis.MutationObserver(renderUnknownRoute);
        routeObserver.observe(target, { childList: true, subtree: true });
      }
    }
    renderUnknownRoute();
  }

  normalizeHashAlias();
  globalThis.addEventListener?.('hashchange', () => {
    if (!normalizeHashAlias()) renderUnknownRoute();
  });

  const timer = setTimeout(() => {
    if (globalThis.AlibiDiagnostics) return;
    const app = document.getElementById('app');
    if (!app || document.getElementById('boot-recovery')) return;
    const panel = document.createElement('section');
    panel.id = 'boot-recovery';
    panel.className = 'panel';
    panel.setAttribute('role', 'alert');
    const title = document.createElement('h2');
    title.textContent = 'Taking longer than expected.';
    const note = document.createElement('p');
    note.textContent =
      'Close other Alibi windows, then retry. Your saved progress has not been cleared. If this keeps happening, refresh the app files while online; this keeps your puzzles and saves.';
    const retry = document.createElement('button');
    retry.className = 'btn';
    retry.textContent = 'Retry opening';
    retry.onclick = () => location.reload();
    const refresh = document.createElement('button');
    refresh.className = 'btn secondary';
    refresh.textContent = 'Refresh app files';
    refresh.onclick = async () => {
      refresh.disabled = true;
      try {
        if (!navigator.onLine) throw Error('Connect to the internet before refreshing app files.');
        const registrations = (await navigator.serviceWorker?.getRegistrations()) || [];
        for (const registration of registrations) {
          if (registration.scope === new URL('./', location.href).href)
            await registration.unregister();
        }
        if ('caches' in globalThis) {
          for (const name of await caches.keys()) {
            if (name.startsWith('alibi-shell-')) await caches.delete(name);
          }
        }
        location.reload();
      } catch (error) {
        note.textContent = error.message;
        refresh.disabled = false;
      }
    };
    panel.append(title, note, retry, refresh);
    app.append(panel);
  }, 12000);
  globalThis.AlibiBootReady = () => {
    clearTimeout(timer);
    document.getElementById('boot-recovery')?.remove();
    watchUnknownRoutes();
  };
})();
