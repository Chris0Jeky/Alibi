/* One presentation owner. Delegates puzzle commands and settings to Alibi's existing bridge. */
(function (G) {
  'use strict';
  const M = G.AlibiHouseModel;
  const V = G.AlibiHouseView;
  function create(bridge, club) {
    let study = M.study();
    let limit = 12;
    let lastHash = '';
    let returnTo = '';
    let modalOrigin = null;
    let returnFocus = '';
    let returnLimit = 12;
    let focusFrame = 0;
    let postRouteFocus = '';
    let visibilityFrame = 0;
    const lifetime = new AbortController();
    const options = { signal: lifetime.signal };
    const active = () => M.locationState(location.hash).active;
    const refresh = (focus) => {
      bridge.render();
      (document.getElementById(focus) || document.getElementById('main'))?.focus({
        preventScroll: true,
      });
    };
    function snapshot() {
      const route = M.locationState(location.hash);
      const puzzles = bridge.all();
      const records = bridge.records();
      const data = G.AlibiUI.data;
      const diagnostics = club.diagnostics();
      const games = M.gameRuns(diagnostics.state, G.AlibiClubEngines);
      return {
        roomAudioAvailable: !!G.ALIBI_THEATRE?.audio?.length,
        roomSound: !!G.AlibiTheatre?.diagnostics().sound,
        storage: G.AlibiDiagnostics?.getStatus()?.mode || 'unknown',
        resume: M.nextActivity(records, games),
        route,
        puzzles,
        records,
        study,
        limit,
        recent: M.recent(records),
        first: M.firstPuzzle(puzzles, records),
        games,
        settings: bridge.settings(),
        media: G.ALIBI_MEDIA || {},
        names: Object.fromEntries(M.families.map((f) => [f, data[f]?.title || f])),
        icons: {
          scene: '♟',
          dossier: '▤',
          witness: '◈',
          binary: '☾',
          nonogram: '▦',
          bridges: '⌁',
          lightup: '☼',
          sudoku: '9',
        },
      };
    }
    function showObservation(title, text, source) {
      modalOrigin = { hash: location.hash, id: source.id };
      bridge.dialog(
        title,
        `<div class="hx-modal">${source.dataset.room ? G.AlibiHouseComponents.engraving(source.dataset.room) : G.AlibiHouseComponents.icon('mail')}<p>${V.esc(text)}</p><p class="hx-footnote">Added to the desk study in your notebook. This study is session-only.</p></div>`,
        [{ label: 'Back to the desk study', action: 'close-dialog', secondary: true }],
        'hx-sheet',
      );
    }
    document.addEventListener(
      'click',
      (event) => {
        const root = event.target.closest?.('.hx-experience, #dialog.hx-sheet');
        if (!root || !active()) return;
        const anchor = event.target.closest('a');
        if (anchor?.getAttribute('href')?.match(/^#\/(play|salon)\//)) {
          returnTo = location.hash;
          returnFocus = anchor.id;
          returnLimit = limit;
        }
        const button = event.target.closest('[data-house-action]');
        if (!button || button.disabled) return;
        const action = button.dataset.houseAction;
        if (action === 'filters') {
          modalOrigin = { hash: location.hash, id: button.id };
          bridge.dialog('Narrow the collection', V.filters(snapshot()), [], 'hx-sheet');
          document.querySelector('#hx-filter-form select')?.focus();
        } else if (action === 'filter-reset') {
          document.querySelectorAll('#hx-filter-form select').forEach((el) => {
            el.value = '';
          });
          document.querySelector('#hx-filter-form select')?.focus();
        } else if (action === 'play') {
          const key = button.dataset.key;
          const record = bridge.records().find((r) => r.key === key);
          const puzzle = record?.puzzle || bridge.all().find((p) => M.key(p) === key);
          if (!puzzle)
            return bridge.toast(
              'That puzzle is no longer available. Your existing saves are unchanged.',
              true,
            );
          returnTo = location.hash;
          returnFocus = button.id;
          returnLimit = limit;
          bridge.navigate('play', M.key(puzzle));
        } else if (action === 'letter') {
          study = M.reduce(study, { type: 'letter' });
          showObservation(
            'The envelope',
            '“Look east for the room that has stopped keeping time.” A small key is mentioned in the margin. Inspect the rooms before deciding where it was left.',
            button,
          );
        } else if (action === 'inspect') {
          const room = M.rooms.find((r) => r.id === button.dataset.room);
          if (!room) return;
          study = M.reduce(study, { type: 'inspect', id: room.id });
          showObservation(room.title, room.detail, button);
        } else if (action === 'hint') {
          study = M.reduce(study, { type: 'hint' });
          refresh(study.hint < 3 ? button.id : 'main');
        } else if (action === 'more') {
          limit += 12;
          refresh('hx-more');
        }
      },
      options,
    );
    document.addEventListener(
      'submit',
      (event) => {
        if (!active()) return;
        const form = event.target;
        if (['hx-search-form', 'hx-filter-form'].includes(form.id)) {
          event.preventDefault();
          const data = new FormData(form);
          if (form.id === 'hx-filter-form') {
            modalOrigin = null;
            document.getElementById('dialog').close();
            postRouteFocus = 'hx-filters-open';
          }
          const hash = M.url({
            view: 'puzzles',
            ...Object.fromEntries(
              ['q', 'family', 'progress', 'level'].map((field) => [
                field,
                String(data.get(field) || '').trim(),
              ]),
            ),
          });
          if (location.hash === hash) {
            const id = postRouteFocus || 'hx-query';
            postRouteFocus = '';
            refresh(id);
          } else location.hash = hash;
        } else if (form.id === 'hx-answer-form') {
          event.preventDefault();
          const answer = new FormData(form).get('answer');
          if (!answer) return document.getElementById('hx-answer')?.focus();
          study = M.reduce(study, { type: 'answer', id: answer });
          refresh('hx-answer');
          if (study.solved)
            bridge.toast(
              'Desk study complete. The east window and the removed clock point to the Map Room.',
            );
        }
      },
      options,
    );
    document.addEventListener(
      'close',
      (event) => {
        if (event.target.id !== 'dialog' || !modalOrigin) return;
        const origin = modalOrigin;
        modalOrigin = null;
        if (location.hash === origin.hash && active()) refresh(origin.id);
      },
      { ...options, capture: true },
    );
    function keepFocusVisible() {
      cancelAnimationFrame(visibilityFrame);
      visibilityFrame = requestAnimationFrame(() => {
        const el = document.activeElement,
          dock = document.querySelector('.hx-mobile');
        if (
          !active() ||
          !el?.closest('.hx-content') ||
          !dock ||
          getComputedStyle(dock).position !== 'fixed'
        )
          return;
        const r = el.getBoundingClientRect(),
          edge = dock.getBoundingClientRect().top;
        if (r.bottom > edge - 12)
          window.scrollBy({ top: r.bottom - edge + 16, behavior: 'instant' });
      });
    }
    function keyboardInset() {
      const vv = G.visualViewport;
      const editing = document.activeElement?.matches(
        '.hx-experience input:not([type=checkbox]), .hx-experience select, #dialog.hx-sheet input, #dialog.hx-sheet select',
      );
      document.body.dataset.houseKeyboard =
        active() && !!editing && !!vv && vv.height < innerHeight * 0.75 ? 'true' : 'false';
    }
    document.addEventListener(
      'focusin',
      () => {
        keepFocusVisible();
        keyboardInset();
      },
      options,
    );
    document.addEventListener('focusout', keyboardInset, options);
    G.visualViewport?.addEventListener('resize', keyboardInset, options);
    document.addEventListener(
      'error',
      (event) => {
        if (event.target.matches?.('img[data-house-art]'))
          event.target.classList.add('hx-art-unavailable');
      },
      { ...options, capture: true },
    );
    return {
      home() {
        if (lastHash !== location.hash) {
          lastHash = location.hash;
          limit = returnTo === location.hash ? returnLimit : 12;
        }
        return V.render(snapshot());
      },
      afterRender(route) {
        keyboardInset();
        if (!active() && modalOrigin) {
          modalOrigin = null;
          document.querySelector('#dialog.hx-sheet[open]')?.close();
        }
        if (active()) {
          if (postRouteFocus) {
            const id = postRouteFocus,
              hash = location.hash;
            postRouteFocus = '';
            requestAnimationFrame(() => {
              if (active() && location.hash === hash) document.getElementById(id)?.focus();
            });
          }
          document
            .querySelectorAll(
              '.hx-experience [data-house-action], .hx-experience a[href^="#/salon/"]',
            )
            .forEach((el, i) => {
              if (!el.id)
                el.id = `hx-action-${el.dataset.houseAction || 'game'}-${el.dataset.room || el.dataset.key || 'control'}-${i}`;
            });
          if (returnTo === location.hash && returnFocus) {
            const hash = returnTo,
              id = returnFocus;
            cancelAnimationFrame(focusFrame);
            focusFrame = requestAnimationFrame(() => {
              if (location.hash !== hash || !active()) return;
              document.getElementById(id)?.focus();
              returnTo = '';
              returnFocus = '';
            });
          }
        }
        document.getElementById('hx-return')?.remove();
        if (returnTo && ['play', 'salon'].includes(route.page)) {
          const nav = document.createElement('nav');
          nav.id = 'hx-return';
          nav.className = 'hx-return';
          nav.setAttribute('aria-label', 'Return to your house activity');
          const a = document.createElement('a');
          a.href = returnTo;
          a.textContent = '← Back to your desk activity';
          nav.append(a);
          document.getElementById('main')?.prepend(nav);
        } else if (!active()) returnTo = '';
      },
      diagnostics: () => ({ study: { ...study, visited: [...study.visited] }, limit }),
      dispose() {
        lifetime.abort();
        cancelAnimationFrame(visibilityFrame);
        document.body.dataset.houseKeyboard = 'false';
        cancelAnimationFrame(focusFrame);
        document.getElementById('hx-return')?.remove();
      },
    };
  }
  G.AlibiHouse = { create };
})(globalThis);
