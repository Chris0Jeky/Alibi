(function () {
  'use strict';
  const $ = (id) => document.getElementById(id),
    aliases = {
      __proto__: null,
      games: (x) => ['salon', ...x],
      space: () => ['settings'],
      wing: (x) => ['quiet', ...x],
      castle: (x) => ['quiet', 'castle', ...(x.length ? x : ['map'])],
      wrenmere: (x) => ['quiet', 'castle', ...(x.length ? x : ['map'])],
    },
    known =
      /^(home|library|play|casebooks|story|journal|settings|workshop|privacy|changelog|salon|lab|club|quiet)$/,
    pathRoutes = {
      __proto__: null,
      privacy: 'privacy',
      about: 'about',
      login: 'login',
    };
  function normalizePath() {
    if (location.hash) return;
    const target = pathRoutes[location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase()];
    if (!target) return;
    history.replaceState(history.state, '', `#/${target}${location.search}`);
  }
  function normalize() {
    const [path, ...q] = location.hash.replace(/^#\/?/, '').split('?'),
      p = path.split('/').filter(Boolean),
      alias = aliases[p[0]?.toLowerCase()];
    if (!alias) return;
    history.replaceState(
      history.state,
      '',
      `#/${alias(p.slice(1)).join('/')}${q.length ? `?${q.join('?')}` : ''}`,
    );
  }
  function show() {
    const r = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0].toLowerCase(),
      main = $('main');
    if (!r || known.test(r) || !main) return;
    if ($('route-not-found')) return;
    main.innerHTML =
      '<section id="route-not-found" class="empty" role="status"><h1>That door is not on the map.</h1><p>That address is not an Alibi room. Your saved progress is unchanged.</p><code id="route-not-found-hash"></code><div class="row actions"><a class="btn" href="#/home">Your desk</a><a class="btn secondary" href="#/library">Puzzles</a></div></section>';
    $('route-not-found-hash').textContent = location.hash;
    document.title = 'Room not found · Alibi';
    main.focus();
  }
  normalizePath();
  normalize();
  addEventListener('hashchange', normalize);
  const isAndroidTarget = globalThis.ALIBI_BUILD_TARGET === 'android',
    timer = setTimeout(() => {
      if (globalThis.AlibiDiagnostics) return;
      const app = $('app');
      if (!app || $('boot-recovery')) return;
      app.insertAdjacentHTML(
        'beforeend',
        isAndroidTarget
          ? '<section id="boot-recovery" class="panel" role="alert"><h2>Still opening.</h2><p>Close and reopen the bundled Android app, then retry. Your saves are unchanged.</p><button class="btn">Retry opening</button></section>'
          : '<section id="boot-recovery" class="panel" role="alert"><h2>Still opening.</h2><p>Close other Alibi windows and retry. Your saves are unchanged. Refresh app files online if this continues.</p><button class="btn">Retry opening</button><button class="btn secondary">Refresh app files</button></section>',
      );
      const panel = $('boot-recovery'),
        [retry, refresh] = panel.querySelectorAll('button');
      retry.onclick = () => location.reload();
      if (!refresh) return;
      refresh.onclick = async () => {
        refresh.disabled = true;
        try {
          if (!navigator.onLine) throw Error('Go online to refresh app files.');
          for (const r of (await navigator.serviceWorker?.getRegistrations()) || [])
            if (r.scope === new URL('.', location).href) await r.unregister();
          if (globalThis.caches)
            for (const n of await caches.keys())
              if (n.startsWith('alibi-shell-')) await caches.delete(n);
          location.reload();
        } catch (e) {
          panel.querySelector('p').textContent = e.message;
          refresh.disabled = false;
        }
      };
    }, 12000);
  globalThis.AlibiBootReady = () => {
    clearTimeout(timer);
    $('boot-recovery')?.remove();
    new MutationObserver(show).observe($('app'), { childList: true });
    show();
  };
})();
