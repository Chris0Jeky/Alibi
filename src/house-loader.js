/* Opt-in presentation facade; no polling, DOM observers, save writers or engine changes. */
(function (G) {
  'use strict';
  const club = G.AlibiClub;
  const original = { init: club.init, home: club.home, afterRender: club.afterRender };
  let bridge,
    experience,
    pending,
    error = '';
  const active = () =>
    /^#\/?home\?/.test(location.hash) &&
    new URLSearchParams(location.hash.split('?')[1]).get('ux') === 'house';
  function loadAsset(tag, url, source) {
    return new Promise((resolve, reject) => {
      const node = document.createElement(source ? (tag === 'link' ? 'style' : tag) : tag);
      const finish = (ok) => {
        clearTimeout(timer);
        node.onload = node.onerror = null;
        if (ok) resolve();
        else {
          node.remove();
          reject(
            Error('The house preview could not load. Return to the classic desk or try again.'),
          );
        }
      };
      const timer = setTimeout(() => finish(false), 15000);
      if (source) {
        node.textContent = source;
        document.head.append(node);
        finish(true);
      } else {
        if (tag === 'link') {
          node.rel = 'stylesheet';
          node.href = url;
        } else node.src = url;
        node.onload = () => finish(true);
        node.onerror = () => finish(false);
        document.head.append(node);
      }
    });
  }
  function load() {
    if (pending || experience) return;
    const cfg = G.ALIBI_HOUSE_CONFIG;
    if (!cfg) {
      error = 'This build does not include the house preview.';
      bridge.render();
      return;
    }
    error = '';
    pending = Promise.all([
      loadAsset('link', cfg.css, cfg.cssSource),
      loadAsset('script', cfg.script, cfg.source),
    ])
      .then(() => {
        experience = G.AlibiHouse.create(bridge, club);
      })
      .catch(() => {
        error =
          'The house preview could not load. Your saved puzzles are unchanged. Try again or return to the classic desk.';
      })
      .finally(() => {
        pending = null;
        if (active()) bridge.render();
      });
  }
  club.init = async function (api) {
    const result = await original.init(api);
    bridge = api;
    return result;
  };
  club.home = function () {
    if (!active())
      return (
        `<section class="panel" aria-label="House experience preview"><div class="row"><div><strong>A new way into Alibi</strong><p>Try the Wrenmere desk: a quieter puzzle finder and a small mystery in the house itself.</p></div><a class="btn secondary" href="#/home?ux=house">Try the new desk →</a></div></section>` +
        original.home()
      );
    if (experience) return experience.home();
    return `<section class="panel"><h1>The Wrenmere desk</h1><p role="status">${error || 'Opening the house preview…'}</p>${error ? '<button class="btn secondary" data-house-retry>Try again</button>' : ''}<a class="btn secondary" href="#/home">Return to the classic desk</a></section>`;
  };
  club.afterRender = function (route) {
    original.afterRender(route);
    document.body.dataset.house = active() && !!experience ? 'true' : 'false';
    document.documentElement.dataset.house = document.body.dataset.house;
    if (active() && experience) document.body.classList.remove('club-home');
    if (active() && !experience && !error) load();
    experience?.afterRender(route);
  };
  document.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-house-retry]')) load();
  });
  G.AlibiHouseLoader = {
    diagnostics: () => ({
      ready: !!experience,
      error,
      pending: !!pending,
      study: experience?.diagnostics(),
    }),
  };
})(globalThis);
