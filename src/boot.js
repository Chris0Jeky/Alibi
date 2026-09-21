(function () {
  'use strict';

  const aliases = {
      games: (tail) => ['salon', ...tail],
      space: () => ['settings'],
      wing: (tail) => ['quiet', ...tail],
      castle: (tail) => ['quiet', 'castle', ...(tail.length ? tail : ['map'])],
      wrenmere: (tail) => ['quiet', 'castle', ...(tail.length ? tail : ['map'])],
    },
    known = /^(home|library|play|casebooks|story|journal|settings|workshop|privacy|changelog|salon|lab|club|quiet)$/;

  function normalize() {
    const raw = String(location.hash || '').replace(/^#\/?/, ''),
      [path, ...query] = raw.split('?'),
      parts = path.split('/').filter(Boolean),
      alias = aliases[parts[0]?.toLowerCase()];
    if (!alias) return false;
    const target = `#/${alias(parts.slice(1)).join('/')}${query.length ? `?${query.join('?')}` : ''}`;
    if (target === location.hash) return false;
    history.replaceState(history.state, '', target);
    return true;
  }

  function showMissing() {
    const root = String(location.hash || '')
        .replace(/^#\/?/, '')
        .split(/[/?]/)[0]
        .toLowerCase(),
      main = document.getElementById('main');
    if (
      !root ||
      known.test(root) ||
      aliases[root] ||
      !main ||
      document.getElementById('route-not-found')
    )
      return;
    main.innerHTML =
      '<section id="route-not-found" class="empty route-not-found" role="status"><div class="eyebrow">ROOM NOT FOUND</div><h1>That door is not on the map.</h1><p>This address does not match an Alibi room. Your saved progress is unchanged.</p><p class="fine">Unmatched address: <code id="route-not-found-hash"></code></p><div class="row actions"><a class="btn" href="#/home">Return to your desk</a><a class="btn secondary" href="#/library">Browse puzzles</a></div></section>';
    document.getElementById('route-not-found-hash').textContent = String(location.hash || '#/');
    document.title = 'Room not found · Alibi';
    main.focus({ preventScroll: true });
  }

  normalize();
  globalThis.addEventListener?.('hashchange', normalize);

  const timer = setTimeout(() => {
    if (globalThis.AlibiDiagnostics) return;
    const app = document.getElementById('app');
    if (!app || document.getElementById('boot-recovery')) return;
    app.insertAdjacentHTML(
      'beforeend',
      '<section id="boot-recovery" class="panel" role="alert"><h2>Taking longer than expected.</h2><p>Close other Alibi windows, then retry. Your saved progress has not been cleared. If this keeps happening, refresh the app files while online; this keeps your puzzles and saves.</p><button class="btn" type="button">Retry opening</button><button class="btn secondary" type="button">Refresh app files</button></section>',
    );
    const panel = document.getElementById('boot-recovery'),
      note = panel.querySelector('p'),
      [retry, refresh] = panel.querySelectorAll('button');
    retry.onclick = () => location.reload();
    refresh.onclick = async () => {
      refresh.disabled = true;
      try {
        if (!navigator.onLine) throw Error('Connect to the internet before refreshing app files.');
        for (const registration of (await navigator.serviceWorker?.getRegistrations()) || [])
          if (registration.scope === new URL('./', location.href).href)
            await registration.unregister();
        if (globalThis.caches)
          for (const name of await caches.keys())
            if (name.startsWith('alibi-shell-')) await caches.delete(name);
        location.reload();
      } catch (error) {
        note.textContent = error.message;
        refresh.disabled = false;
      }
    };
  }, 12000);

  globalThis.AlibiBootReady = () => {
    clearTimeout(timer);
    document.getElementById('boot-recovery')?.remove();
    const app = document.getElementById('app');
    if (app && globalThis.MutationObserver)
      new MutationObserver(showMissing).observe(app, { childList: true, subtree: true });
    showMissing();
  };
})();
