(function (G) {
  'use strict';
  // Keep fallback runs and pending transactions for the lifetime of this document.
  let challengeRegistry = null,
    challengeStore = null;
  G.AlibiQuietWing = {
    async mount(context) {
      const root = context.root;
      root.innerHTML = `<style>${context.css}</style><div class="qw-body"><div id="app"></div><div id="toast" role="status" aria-live="polite"></div><dialog id="modal" aria-labelledby="modal-title"></dialog><input id="file" type="file" accept="application/json,.json" hidden></div>`;
      const body = root.querySelector('.qw-body');
      const listeners = new AbortController();
      const downloads = new Set();
      let disposed = false;
      const timers = new Set();
      const setTimeout = (fn, ms) => {
        const id = G.setTimeout(() => {
          timers.delete(id);
          if (!disposed) fn();
        }, ms);
        timers.add(id);
        return id;
      };
      const clearTimeout = (id) => {
        G.clearTimeout(id);
        timers.delete(id);
      };
      const routePath = () => location.hash.replace(/^#\/quiet\/?/, '');
      const navigate = (path) => {
        location.hash = '/quiet/' + path;
      };
      const E = G.QWEngine,
        R = G.QWRealm,
        C = G.QWCity,
        P = G.QWPets,
        S = G.QWStore,
        $ = (q, r = root) => r.querySelector(q),
        $$ = (q, r = root) => [...r.querySelectorAll(q)],
        esc = (s) =>
          String(s).replace(
            /[&<>"']/g,
            (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
          );
      const A = {
        state: null,
        route: 'realm',
        renderer: null,
        type: 'cottage',
        palette: 'terracotta',
        rot: 0,
        tool: 'build',
        category: 'Homes',
        brush: 1,
        anchor: -1,
        blueprint: 'courtyard',
        selection: -1,
        history: [],
        future: [],
        petAction: 'idle',
        classic: 'hanoi3',
        classicSelected: null,
        challengeRegistry,
        challengeStore,
        seed: 'clover',
        artURLs: { ...context.media },
        artCache: {},
        gardenTimer: null,
        resizeObs: null,
      };
      G.QWApp = A;
      const ICONS = {
        realm: 'M3 20h18V8l-4-3-4 3-4-3-6 4z M7 12v3m5-3v3m5-3v3M10 20v-4h4v4',
        pets: 'M7 11 5 3l6 5h3l5-5-1 8c5 9-12 13-14 4q-1-3 3-4 M9 13h.1m6 0h.1m-5 3q2 2 4 0',
        garden: 'M12 21V10 M12 14C2 14 3 4 3 4s9 0 9 10 M12 11c0-8 8-9 8-9s2 9-8 9',
        classics: 'M6 3h12v4H6zM4 19h16v3H4z M9 7v5l-3 7m9-12v5l3 7M8 13h8',
        gallery: 'M3 4h18v17H3z M7 8h10v9H7z M7 15l4-4 3 3 3-2',
        journal: 'M4 4h13a3 3 0 0 1 3 3v14H7a3 3 0 0 1-3-3zm0 13h16M9 8h6m-6 4h6',
        settings:
          'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
        zen: 'M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6',
        undo: 'M9 6 3 12l6 6M3 12h11a6 6 0 0 1 6 6',
        redo: 'm15 6 6 6-6 6m6-6H10a6 6 0 0 0-6 6',
        download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
        rotate: 'M4 9a8 8 0 1 1 0 7M4 3v6h6',
        hand: 'M7 12V7a2 2 0 0 1 4 0V4a2 2 0 0 1 4 0v4a2 2 0 0 1 4 0v4a2 2 0 0 1 3 2l-2 6H9l-6-7q-1-3 2-2l2 1',
        sound: 'm3 9 5 0 5-5v16l-5-5H3zM17 8q4 4 0 8',
        heart: 'M12 20 3 11C-2 2 8 1 12 7c4-6 14-5 9 4z',
        home: 'M3 11 12 3l9 8M5 10v11h14V10M10 21v-7h4v7',
      };
      function icon(k) {
        return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[k] || ICONS.realm}"/></svg>`;
      }
      function toast(text) {
        const t = $('#toast');
        t.textContent = text;
        t.classList.add('show');
        clearTimeout(A.toastTimer);
        A.toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
      }
      function modal(title, html) {
        const d = $('#modal');
        d.innerHTML = `<div class="dialog-body"><button class="close" aria-label="Close dialog" data-close>×</button><h2 id="modal-title">${esc(title)}</h2>${html}</div>`;
        if (!d.open) d.showModal();
        $('[data-close]', d).onclick = () => d.close();
        d.addEventListener(
          'click',
          (e) => {
            if (e.target === d) d.close();
          },
          { once: true },
        );
        return d;
      }
      const soundscape = new G.QWSound();
      let audio;
      function feedback(kind = 'place') {
        if (A.state.settings.haptic && navigator.vibrate)
          navigator.vibrate(kind === 'win' ? [15, 40, 15] : 10);
        if (!A.state.settings.sound) return;
        if (G.QWExperience && !G.ALIBI_CONFIG.standalone) {
          soundscape.play(
            {
              erase: 'ui-remove-low',
              win: 'ui-complete-calm',
              treat: 'pet-treat',
              play: 'pet-play',
              nap: 'pet-rest',
              pet: 'pet-greeting',
              undo: 'ui-undo',
              redo: 'ui-redo',
            }[kind] || 'ui-place-wood',
          );
          return;
        }
        try {
          audio = audio || new (G.AudioContext || G.webkitAudioContext)();
          audio.resume().catch(() => {});
          let base =
            kind === 'erase'
              ? 220
              : kind === 'win'
                ? 523
                : 330 + [0, 62, 110, 164][(A.state.stats.built || 0) % 4];
          for (let i = 0; i < (kind === 'win' ? 3 : 1); i++) {
            let o = audio.createOscillator(),
              g = audio.createGain(),
              t = audio.currentTime + i * 0.1;
            o.type = 'sine';
            o.frequency.value = base * (i === 1 ? 1.25 : i === 2 ? 1.5 : 1);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.07, t + 0.008);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
            o.connect(g);
            g.connect(audio.destination);
            o.start(t);
            o.stop(t + 0.25);
          }
        } catch {}
      }
      function save() {
        const b = E.award(A.state, Date.now());
        if (b.length && !A.state.settings.zen)
          toast(
            'Journal stamp: ' +
              E.BADGES.find((x) => x[0] === b[0])[1] +
              (b.length > 1 ? ` + ${b.length - 1} more` : ''),
          );
        clearTimeout(A.saveTimer);
        A.dirty = true;
        A.saveStatus = { text: 'Saving…', status: 'saving' };
        const label = $('#save-status');
        if (label) label.textContent = 'Saving…';
        A.saveTimer = setTimeout(() => flush().catch(() => {}), 120);
      }
      async function flush() {
        clearTimeout(A.saveTimer);
        const quietSave = !A.dirty
          ? S.flush()
          : (() => {
              A.dirty = false;
              return S.write(A.state).catch((e) => {
                A.dirty = true;
                throw e;
              });
            })();
        await Promise.all([quietSave, A.challengeStore?.flush()]);
      }
      function styles() {
        const soundButton = $('[data-act="sound"]');
        if (soundButton) {
          soundButton.setAttribute(
            'aria-label',
            A.state.settings.sound ? 'Mute sound' : 'Enable sound',
          );
          soundButton.title = 'Sound ' + (A.state.settings.sound ? 'on' : 'off');
        }
        if (!A.state.settings.sound) {
          soundscape.stop();
          root.querySelectorAll('audio,video').forEach((media) => media.pause());
          A.ambience = '';
          const selection = $('#room-ambience');
          if (selection) selection.value = '';
        }
        body.classList.toggle('zen', A.state.settings.zen);
        body.classList.toggle('reduce', !A.state.settings.motion);
        A.renderer?.setMotion?.(A.state.settings.motion);
        A.petView?.setMotion(A.state.settings.motion);
      }
      function shell() {
        styles();
        $('#app').innerHTML =
          `<header class="top"><a class="logo" href="#/home" aria-label="Return to Alibi home">alibi<b>:</b></a><span class="brandline"></span><div><div class="header-note">AFTER HOURS / A PLACE OF YOUR OWN</div><span class="wing-name">The quiet wing</span></div><div class="top-right"><span class="save" id="save-status">${esc(A.saveStatus?.text || (S.info().blocked ? 'Save protected · export first' : S.info().mode === 'session' ? 'Session only · export to keep' : 'Saved on this device'))}</span><button class="iconbtn" data-act="sound" aria-label="${A.state.settings.sound ? 'Mute' : 'Enable'} sound" title="Sound ${A.state.settings.sound ? 'on' : 'off'}">${icon('sound')}</button><button class="iconbtn" data-act="zen" title="Enter Zen mode" aria-label="Enter Zen mode">${icon('zen')}</button><button class="iconbtn" data-act="settings" aria-label="Settings and backups">${icon('settings')}</button></div></header><div class="shell"><nav class="rail" aria-label="Quiet wing activities">${[
            ['realm', 'Realm'],
            ['pets', 'Companions'],
            ['garden', 'Garden'],
            ['classics', 'Classics'],
            ['challenges', 'Challenges'],
            ['gallery', 'Art room'],
            ['journal', 'Journal'],
            ['folio', 'Field notes'],
          ]
            .map(
              ([id, name]) =>
                `<button data-route="${id}" class="${A.route === id ? 'active' : ''}" ${A.route === id ? 'aria-current="page"' : ''}>${icon(id)}<span>${name}</span></button>`,
            )
            .join(
              '',
            )}<div class="rail-bottom"><a href="#/home">← Puzzle<br>cabinet</a></div></nav><main class="main" id="main" tabindex="-1"></main></div><button class="zen-exit" data-act="zen">Exit Zen</button>`;
        $('#app').onclick = async (e) => {
          const b = e.target.closest('button');
          if (!b) return;
          if (b.dataset.route) {
            navigate(b.dataset.route);
            return;
          }
          if (b.dataset.act === 'settings') settings();
          if (b.dataset.act === 'zen') {
            A.state.settings.zen = !A.state.settings.zen;
            styles();
            save();
            setTimeout(() => A.renderer?.resize(), 30);
          }
          if (b.dataset.act === 'sound') {
            A.state.settings.sound = !A.state.settings.sound;
            if (!A.state.settings.sound) {
              soundscape.stop();
              root.querySelectorAll('audio,video').forEach((media) => media.pause());
              A.ambience = '';
              const select = $('#room-ambience');
              if (select) select.value = '';
            }
            toast('Sound ' + (A.state.settings.sound ? 'on' : 'off'));
            b.setAttribute('aria-label', A.state.settings.sound ? 'Mute sound' : 'Enable sound');
            save();
            feedback();
          }
        };
        S.status((text, status) => {
          const t = $('#save-status');
          if (t) {
            t.textContent = text;
            t.className = 'save ' + status;
          }
          A.saveStatus = { text, status };
          if (status === 'error') toast(text);
        });
      }
      function header(eyebrow, title, text, extra = '') {
        const room = { pets: 'companion-room', garden: 'glasshouse-room', gallery: 'reading-room' }[
          A.route
        ];
        const art =
          !G.ALIBI_CONFIG.standalone && G.QWExperience?.editorial.find((a) => a.id === room);
        return `<section class="pagehead"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${text}</p></div>${extra}${art ? `<img class="room-illustration" src="${art.image}" alt="" width="1200" height="600">` : ''}</section>`;
      }
      function disposeActivity() {
        A.folio?.dispose();
        A.folio = null;
        clearInterval(A.gardenTimer);
        A.gardenTimer = null;
        clearTimeout(A.petTimer);
        A.petTimer = null;
        A.resizeObs?.disconnect();
        A.resizeObs = null;
        A.renderer?.dispose?.();
        A.previewRenderer?.dispose?.();
        A.previewRenderer = null;
        A.renderer = null;
        A.petView?.dispose();
        A.petView = null;
        A.petAction = 'idle';
        A.bouquetUndo = null;
      }
      function go() {
        if (disposed) return;
        const route = routePath().split('/')[0];
        A.route = [
          'realm',
          'pets',
          'garden',
          'classics',
          'challenges',
          'gallery',
          'journal',
          'folio',
        ].includes(route)
          ? route
          : 'realm';
        disposeActivity();
        A.classicSelected = null;
        shell();
        ({
          realm: realmPage,
          pets: petsPage,
          garden: gardenPage,
          classics: classicsPage,
          challenges: challengesPage,
          gallery: galleryPage,
          journal: journalPage,
          folio: () => {
            soundscape.stop();
            A.ambience = '';
            A.folio = G.QWFolio.mount($('#main'), () => {
              if (!A.state.settings.sound) {
                A.state.settings.sound = true;
                save();
              }
              $('[data-act="sound"]').setAttribute('aria-label', 'Mute sound');
            });
          },
        })[A.route]();
        if (A.route !== 'folio' && !G.ALIBI_CONFIG.standalone) {
          const atmosphere = document.createElement('label');
          atmosphere.className = 'ambient-choice';
          atmosphere.innerHTML = `Listen here <select id="room-ambience" aria-label="Background atmosphere"><option value="">Quiet</option>${[
            ['lamplight-library', 'Lamplit library'],
            ['coastal-window', 'Coastal window'],
            ['glasshouse-garden', 'Glasshouse'],
            ['evening-club', 'Evening club'],
          ]
            .map(([id, label]) => `<option value="ambience-${id}">${label}</option>`)
            .join('')}</select>`;
          $('#main').append(atmosphere);
          $('#room-ambience').value = A.ambience || '';
          $('#room-ambience').onchange = (event) => {
            A.ambience = event.target.value;
            if (A.ambience) {
              A.state.settings.sound = true;
              save();
              const button = $('[data-act="sound"]');
              button.setAttribute('aria-label', 'Mute sound');
            }
            soundscape.ambience(A.ambience);
          };
          const visit = document.createElement('aside');
          visit.className = 'room-visit';
          visit.innerHTML =
            '<span>A little more to discover: scenes, portraits, sound and short films.</span><a href="#/quiet/folio">Open field notes ↗</a>';
          if (A.route === 'realm' && !G.ALIBI_CONFIG.standalone) {
            const harbour = G.QWExperience.editorial.find((art) => art.id === 'harbour-room');
            if (harbour)
              visit.insertAdjacentHTML(
                'afterbegin',
                `<img src="${harbour.image}" alt="" width="180" height="90">`,
              );
          }
          $('#main').append(visit);
        }
      }
      function realmPage() {
        if (A.resizeObs) A.resizeObs.disconnect();
        A.renderer?.dispose?.();
        $('#main').innerHTML =
          header(
            '01 / THE REALM STUDIO',
            'Make a little somewhere.',
            'Place a house. Grow a street. There is nothing to keep up with.',
            `<span class="pill"><i class="dot"></i> No resources. No score. All pieces open.</span>`,
          ) +
          `<div class="city-toolbar"><button class="primary" data-ract="generate">Generate a world</button><span id="town-status" role="status"></span><label>Brush <select id="brush-size"><option value="1">1 plot</option><option value="3">3 × 3</option><option value="5">5 × 5</option></select></label><button data-ract="cancel-tool" id="cancel-tool" hidden>Cancel selection</button></div><div class="world-layout"><div><div class="world-wrap"><canvas id="realm" class="world-canvas" tabindex="0" aria-label="Realm builder. Arrow keys choose a plot, Enter applies the selected tool. Plus and minus zoom. Drag in pan mode."></canvas><div class="world-top"><div class="row"><button data-view="isometric" class="${A.state.scene.camera.view === 'isometric' ? 'active' : ''}">Isometric</button><button data-view="diorama" class="${A.state.scene.camera.view === 'diorama' ? 'active' : ''}">Diorama</button><button data-view="plan" class="${A.state.scene.camera.view === 'plan' ? 'active' : ''}">Plan</button></div><button data-ract="sky">${A.state.scene.sky === 'morning' ? 'Morning' : A.state.scene.sky === 'sunset' ? 'Golden hour' : 'Moonlight'}</button></div><div class="world-tools"><button data-ract="zoomout" aria-label="Zoom out">−</button><button data-ract="zoomin" aria-label="Zoom in">+</button><button data-ract="rotate" aria-label="Rotate camera">↻ View</button><button data-ract="pan" id="panbtn">Pan</button><button data-ract="fit">Fit</button></div><div class="world-caption"><strong id="realm-caption">${esc(A.state.scene.name)}</strong>${A.state.scene.size} × ${A.state.scene.size} plots · your little world</div><div class="world-companion">${P.svg(A.state.pets.selected, 'idle', 'Your companion visiting the realm')}</div><button class="pending-place primary" id="place" hidden>Place here</button></div><div class="world-foot"><span id="plot-status" aria-live="polite">Choose a piece below. Point to a plot to preview; click to place.</span><span class="row"><button class="iconbtn textbtn" data-ract="undo" title="Undo (Ctrl+Z)" aria-label="Undo realm edit">${icon('undo')}</button><button class="iconbtn textbtn" data-ract="redo" title="Redo (Ctrl+Y)" aria-label="Redo realm edit">${icon('redo')}</button><button class="iconbtn textbtn" data-ract="controls" aria-label="Builder controls">?</button><button class="iconbtn soft" data-ract="export" title="Export realm">${icon('download')}<span>Export</span></button></span></div></div><aside class="inspector" id="inspector"></aside></div><section class="tooltray" aria-label="Building pieces"><div class="tray-tabs">${['Homes', 'Castle', 'Countryside', 'Nature', 'Details', 'Modules', 'Plans', 'Ground', 'Tools'].map((x) => `<button data-category="${x}" class="${x === A.category ? 'active' : ''}">${x}</button>`).join('')}</div><div class="models" id="models"></div></section><details class="plot-controls"><summary>Choose a plot without the canvas</summary><div class="row"><label>Column <select id="plot-x">${Array.from({ length: A.state.scene.size }, (_, i) => `<option value="${i}">${i + 1}</option>`).join('')}</select></label><label>Row <select id="plot-y">${Array.from({ length: A.state.scene.size }, (_, i) => `<option value="${i}">${i + 1}</option>`).join('')}</select></label><button id="plot-apply">Apply selected tool</button></div><p id="plot-summary" role="status">Choose a row and column to inspect.</p></details><div class="toolbar-notice">Cubes can stack. A roof finishes the stack. Water accepts foundations, bridges and boats. <button class="textbtn" data-ract="palette" style="font-size:11px;min-height:28px;padding:2px 8px">Colours &amp; options</button></div>`;
        A.renderer = new R.Renderer($('#realm'));
        Object.assign(A.renderer, {
          angle: A.state.scene.camera.angle,
          view: A.state.scene.camera.view,
          zoom: A.state.scene.camera.zoom,
        });
        A.renderer.setScene(A.state.scene);
        A.renderer.setMotion?.(A.state.settings.motion);
        A.renderer.resize();
        A.resizeObs = new ResizeObserver(() => A.renderer?.resize());
        A.resizeObs.observe($('#realm'));
        drawModels();
        inspector();
        bindCanvas();
        $('#main').onclick = (e) => {
          const b = e.target.closest('button');
          if (!b) return;
          if (b.dataset.category) {
            A.category = b.dataset.category;
            $$('[data-category]').forEach((t) =>
              t.classList.toggle('active', t.dataset.category === A.category),
            );
            drawModels();
          }
          if (b.dataset.type) {
            A.type = b.dataset.type;
            A.tool = 'build';
            A.anchor = -1;
            drawModels();
            inspector();
            preview();
          }
          if (b.dataset.ground) {
            A.tool = 'paint';
            A.anchor = -1;
            A.ground = b.dataset.ground;
            drawModels();
            inspector();
          }
          if (b.dataset.tool) {
            A.tool = b.dataset.tool;
            A.anchor = -1;
            drawModels();
            inspector();
          }
          if (b.dataset.blueprint) {
            A.blueprint = b.dataset.blueprint;
            A.tool = 'stamp';
            A.anchor = -1;
            drawModels();
            inspector();
            preview();
          }
          if (b.dataset.view) {
            A.renderer.view = b.dataset.view;
            A.state.scene.camera.view = b.dataset.view;
            if (!A.state.stats.views.includes(b.dataset.view))
              A.state.stats.views.push(b.dataset.view);
            $$('[data-view]').forEach((t) =>
              t.classList.toggle('active', t.dataset.view === b.dataset.view),
            );
            A.renderer.render();
            save();
          }
          if (b.dataset.ract) realmAction(b.dataset.ract);
        };
        $('#brush-size').value = String(A.brush);
        $('#brush-size').onchange = (e) => {
          A.brush = Number(e.target.value);
        };
        townStatus();
        $('#place').onclick = () => applyAt();
        const selectPlot = () => {
          A.selection =
            Number($('#plot-y').value) * A.state.scene.size + Number($('#plot-x').value);
          preview();
        };
        $('#plot-x').onchange = selectPlot;
        $('#plot-y').onchange = selectPlot;
        $('#plot-apply').onclick = () => {
          selectPlot();
          applyAt();
          preview();
        };
      }
      function drawModels() {
        const c = $('#models');
        if (!c) return;
        if (A.category === 'Ground') {
          c.innerHTML = E.TERRAIN.map(
            (t) =>
              `<button class="model ${A.tool === 'paint' && A.ground === t ? 'selected' : ''}" data-ground="${t}"><div class="ground-sample" style="background:${{ meadow: '#a6b58d', path: '#d3be95', stone: '#b8b6a6', water: '#76a8a8', sand: '#dbc99b' }[t]}"></div>${t[0].toUpperCase() + t.slice(1)}</button>`,
          ).join('');
        } else if (A.category === 'Plans') {
          c.innerHTML = Object.entries(C.BLUEPRINTS)
            .map(
              ([id, b]) =>
                `<button class="model ${A.tool === 'stamp' && A.blueprint === id ? 'selected' : ''}" data-blueprint="${id}">${R.thumbnail(id === 'courtyard' ? 'keep' : id === 'hamlet' ? 'townhouse' : 'barn', A.palette)}${b.name}<small>${b.rows.length} × ${b.rows.length} plots</small></button>`,
            )
            .join('');
        } else if (A.category === 'Tools')
          c.innerHTML = [
            ['erase', 'Remove top', 'undo'],
            ['raise', 'Raise land', 'realm'],
            ['lower', 'Lower land', 'realm'],
            ['turn', 'Turn model', 'rotate'],
            ['inspect', 'Inspect plot', 'settings'],
            ['road', 'Connect road', 'realm'],
            ['move', 'Move building', 'hand'],
            ['copy', 'Copy building', 'realm'],
          ]
            .map(
              ([id, name, ic]) =>
                `<button class="model ${A.tool === id ? 'selected' : ''}" data-tool="${id}"><div style="height:76px;display:flex;justify-content:center;align-items:center">${icon(ic)}</div>${name}</button>`,
            )
            .join('');
        else
          c.innerHTML = Object.entries(E.TYPES)
            .filter(([, v]) => v[0] === A.category)
            .map(
              ([id, v]) =>
                `<button class="model ${A.tool === 'build' && A.type === id ? 'selected' : ''}" data-type="${id}" title="${v[2]}">${R.thumbnail(id, A.palette)}${v[1]}</button>`,
            )
            .join('');
      }
      function inspector() {
        const c = $('#inspector');
        if (!c) return;
        const build = A.tool === 'build',
          info = build
            ? E.TYPES[A.type]
            : [
                'Tools',
                {
                  erase: 'Remove top model',
                  raise: 'Raise land',
                  lower: 'Lower land',
                  turn: 'Turn model',
                  paint: 'Paint ' + A.ground,
                  inspect: 'Inspect a plot',
                  road: 'Connect a road',
                  move: 'Move a building',
                  copy: 'Copy a building',
                  stamp: C.BLUEPRINTS[A.blueprint].name,
                }[A.tool] || A.tool,
                'Choose a plot. Every change can be undone.',
              ];
        c.innerHTML = `<div class="eyebrow">${build ? 'SELECTED PIECE' : 'SELECTED TOOL'}</div><div class="preview-model">${build ? R.thumbnail(A.type, A.palette) : icon('realm')}</div><h3>${info[1]}</h3><p>${info[2]}</p><hr><div><label>Colour story</label><div class="swatches">${Object.entries(
          E.PALETTES,
        )
          .map(
            ([id, p]) =>
              `<button class="swatch ${id === A.palette ? 'active' : ''}" data-palette="${id}" style="background:${p[1]}" aria-label="${id}" title="${id}"></button>`,
          )
          .join(
            '',
          )}</div></div><div class="row"><button data-ract="turnpiece">Turn piece ↻</button></div><hr><div><label for="realmname">Realm name</label><input id="realmname" maxlength="64" value="${esc(A.state.scene.name)}"></div><div><label for="preset">Starting place</label><select id="preset"><option value="">Choose a new sketch…</option><option value="harbour">Little Bellweather</option><option value="garden">Walled garden</option><option value="empty">Empty island</option></select></div><p class="tiny">Changes save on this device. Export a realm file to take it with you.</p><button data-ract="backup" class="textbtn" style="margin-top:auto;font-size:11px">Backups &amp; import</button>`;
        c.onclick = (e) => {
          let b = e.target.closest('[data-palette]');
          if (b) {
            A.palette = b.dataset.palette;
            inspector();
            drawModels();
            preview();
          }
        };
        $('#realmname').onchange = (e) => {
          A.state.scene.name = e.target.value.trim() || 'Untitled realm';
          $('#realm-caption').textContent = A.state.scene.name;
          save();
        };
        $('#preset').onchange = (e) => {
          if (e.target.value) newPreset(e.target.value);
        };
      }
      function preview() {
        if (!A.renderer) return;
        let g = A.tool === 'build' ? { type: A.type, palette: A.palette, rot: A.rot } : null;
        A.renderer.paint(A.selection, g);
        const t = A.state.scene.tiles[A.selection];
        if (t) {
          $('#plot-status').textContent =
            `Plot ${(A.selection % A.state.scene.size) + 1}, ${Math.floor(A.selection / A.state.scene.size) + 1} · ${t.ground} · level ${t.height} · ${t.items.length ? t.items.map((x) => E.TYPES[x.type][1]).join(' + ') : 'empty'}`;
        } else
          $('#plot-status').textContent =
            'Choose a piece below. Point to a plot to preview; click to place.';
        if ($('#plot-summary')) $('#plot-summary').textContent = $('#plot-status').textContent;
        if ($('#cancel-tool')) $('#cancel-tool').hidden = A.anchor < 0;
        if (A.anchor >= 0) {
          const msg =
            A.tool === 'road' ? 'Choose the end of your road.' : 'Choose the destination plot.';
          $('#plot-status').textContent += ' · ' + msg;
          $('#plot-summary').textContent = $('#plot-status').textContent;
        }
      }
      function townStatus() {
        const node = $('#town-status');
        if (!node) return;
        const t = C.describe(A.state.scene);
        node.textContent = `${t.homes} homes · room for ${t.residents} · ${t.connected} on the main road · ${t.nature} green pieces`;
      }
      function generationDialog() {
        const d = modal(
          'Find your next little world',
          `<div class="generator-fields"><label>Landscape<select id="world-layout">${Object.entries(
            C.LAYOUTS,
          )
            .map(([id, name]) => `<option value="${id}">${name}</option>`)
            .join(
              '',
            )}</select></label><label>Map size<select id="world-size">${E.SIZES.map((n) => `<option value="${n}" ${n === 20 ? 'selected' : ''}>${n} × ${n}</option>`).join('')}</select></label><label>Seed<input id="world-seed" maxlength="64" value="bellweather"></label><label>Homes along roads<input id="world-density" type="range" min="0" max="100" value="50"></label></div><div class="row"><button id="world-preview">Preview this seed</button><button id="world-random">Surprise me</button></div><canvas id="world-preview-canvas" aria-label="Preview of the generated town"></canvas><p id="world-description" role="status"></p><p>Your current realm stays saved until you choose Use this world. You can undo the replacement during this visit. Export first to keep both.</p><div class="row"><button id="world-use" class="primary">Use this world</button><button id="world-keep">Keep my realm</button></div>`,
        );
        let candidate;
        A.previewRenderer?.dispose?.();
        const canvas = $('#world-preview-canvas'),
          renderer = new R.Renderer(canvas);
        A.previewRenderer = renderer;
        d.addEventListener(
          'close',
          () => {
            renderer.dispose?.();
            if (A.previewRenderer === renderer) A.previewRenderer = null;
          },
          { once: true },
        );
        const create = () => {
          try {
            candidate = C.generate({
              seed: $('#world-seed').value,
              layout: $('#world-layout').value,
              size: Number($('#world-size').value),
              density: Number($('#world-density').value) / 100,
            });
            renderer.setScene(candidate);
            renderer.resize();
            const t = C.describe(candidate);
            $('#world-description').textContent =
              `${candidate.name}: ${t.homes} homes, ${t.roadPlots} road plots. The same settings create the same town.`;
            $('#world-use').disabled = false;
          } catch (e) {
            candidate = null;
            $('#world-description').textContent = e.message;
            $('#world-use').disabled = true;
          }
        };
        $('#world-preview').onclick = create;
        $('#world-random').onclick = () => {
          $('#world-seed').value =
            'island-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
          create();
        };
        for (const id of ['world-layout', 'world-size', 'world-seed', 'world-density']) {
          $('#' + id).oninput = () => {
            candidate = null;
            $('#world-use').disabled = true;
            $('#world-description').textContent =
              'Preview these settings before replacing your realm.';
          };
        }
        $('#world-keep').onclick = () => d.close();
        $('#world-use').onclick = () => {
          if (!candidate) return;
          A.history.push({ whole: true, before: E.clone(A.state.scene), after: candidate });
          if (A.history.length > 100) A.history.shift();
          A.future = [];
          A.state.scene = candidate;
          A.selection = -1;
          A.anchor = -1;
          d.close();
          realmPage();
          save();
        };
        create();
      }
      function applyAt() {
        if (A.tool === 'inspect') {
          const t = A.state.scene.tiles[A.selection];
          toast(
            t
              ? `Plot ${(A.selection % A.state.scene.size) + 1}, ${Math.floor(A.selection / A.state.scene.size) + 1}: ${t.items.length ? t.items.map((x) => E.TYPES[x.type][1]).join(', ') : 'empty ' + t.ground}`
              : 'Choose a plot.',
          );
          return;
        }
        if (['road', 'move', 'copy'].includes(A.tool) && A.anchor < 0) {
          if (A.selection < 0) return toast('Choose a starting plot.');
          if (A.tool !== 'road' && !A.state.scene.tiles[A.selection].items.length)
            return toast('Choose a plot with a building first.');
          A.anchor = A.selection;
          preview();
          return;
        }
        const action = {
          kind: A.tool,
          index: A.selection,
          type: A.type,
          palette: A.palette,
          rot: A.rot,
          ground: A.ground,
        };
        const patch =
          A.tool === 'road'
            ? C.road(A.state.scene, A.anchor, A.selection)
            : ['move', 'copy'].includes(A.tool)
              ? C.transfer(A.state.scene, A.anchor, A.selection, A.tool === 'copy')
              : A.tool === 'stamp'
                ? C.stamp(A.state.scene, A.selection, A.blueprint, A.palette, A.rot)
                : ['paint', 'erase', 'raise', 'lower'].includes(A.tool)
                  ? C.area(A.state.scene, A.selection, A.brush, action)
                  : E.editScene(A.state.scene, action);
        if (patch.error) {
          toast(patch.error);
          return;
        }
        A.history.push(patch);
        if (A.history.length > 100) A.history.shift();
        A.future = [];
        A.state.scene = patch.whole ? E.clone(patch.after) : E.applyEdit(A.state.scene, patch);
        A.anchor = -1;
        if (A.tool === 'build') A.state.stats.built++;
        if (A.tool === 'erase') A.state.stats.removed++;
        A.renderer.setScene(A.state.scene);
        townStatus();
        preview();
        $('#place').hidden = true;
        const flash = $('#realm');
        flash.classList.remove('placed');
        void flash.offsetWidth;
        flash.classList.add('placed');
        feedback(A.tool === 'erase' ? 'erase' : 'place');
        save();
      }
      function realmUndo(redo = false) {
        const from = redo ? A.future : A.history,
          to = redo ? A.history : A.future;
        if (!from.length) {
          toast('Nothing to ' + (redo ? 'redo' : 'undo') + '.');
          return;
        }
        let p = from.pop();
        to.push(p);
        A.state.scene = p.whole
          ? E.clone(redo ? p.after : p.before)
          : E.applyEdit(A.state.scene, p, !redo);
        A.renderer.setScene(A.state.scene);
        $('#realm-caption').textContent = A.state.scene.name;
        A.selection = -1;
        A.anchor = -1;
        realmPage();
        save();
        feedback(redo ? 'redo' : 'undo');
      }
      function newPreset(id) {
        const d = modal(
          'Start a new sketch?',
          `<p>This replaces the realm on the canvas, not your companions or puzzle progress. You can undo it during this visit. Export first to keep a separate copy.</p><div class="row"><button id="new-confirm" class="primary">Use this sketch</button><button data-close2>Keep my realm</button></div>`,
        );
        $('#new-confirm').onclick = () => {
          let before = E.clone(A.state.scene),
            after = E.preset(id);
          A.history.push({ whole: true, before, after });
          A.future = [];
          A.state.scene = after;
          A.selection = -1;
          d.close();
          realmPage();
          save();
        };
        $('[data-close2]').onclick = () => d.close();
      }
      function realmAction(id) {
        let r = A.renderer;
        if (id === 'generate') return generationDialog();
        if (id === 'cancel-tool') {
          A.anchor = -1;
          preview();
          return;
        }
        if (id === 'undo') return realmUndo();
        if (id === 'redo') return realmUndo(true);
        if (id === 'zoomout' || id === 'zoomin') {
          r.zoom = E.clamp(r.zoom + (id === 'zoomin' ? 0.15 : -0.15), 0.55, 2.7);
          A.state.scene.camera.zoom = r.zoom;
          r.render();
          save();
        }
        if (id === 'rotate') {
          r.angle = (r.angle + 1) % 4;
          A.state.scene.camera.angle = r.angle;
          r.render();
          save();
        }
        if (id === 'fit') {
          r.pan = { x: 0, y: 0 };
          r.zoom = 1;
          A.state.scene.camera.zoom = 1;
          r.resize();
          save();
        }
        if (id === 'pan') {
          A.panMode = !A.panMode;
          $('#panbtn').classList.toggle('active', A.panMode);
          toast(A.panMode ? 'Drag to move the view. Toggle Pan again to build.' : 'Building mode.');
        }
        if (id === 'sky') {
          let skies = ['morning', 'sunset', 'night'];
          A.state.scene.sky = skies[(skies.indexOf(A.state.scene.sky) + 1) % 3];
          r.render();
          $('[data-ract="sky"]').textContent =
            A.state.scene.sky === 'morning'
              ? 'Morning'
              : A.state.scene.sky === 'sunset'
                ? 'Golden hour'
                : 'Moonlight';
          save();
        }
        if (id === 'turnpiece') {
          A.rot = (A.rot + 1) % 4;
          preview();
          toast('Piece rotated ' + A.rot * 90 + '°');
        }
        if (id === 'palette') paletteDialog();
        if (id === 'controls') builderHelp();
        if (id === 'export') exportDialog();
        if (id === 'backup') settings();
      }
      function bindCanvas() {
        const canvas = $('#realm'),
          pointers = new Map();
        let down = null,
          pinch = null,
          moved = false;
        canvas.oncontextmenu = (e) => e.preventDefault();
        const pos = (e) => {
          let b = canvas.getBoundingClientRect();
          return [e.clientX - b.left, e.clientY - b.top];
        };
        canvas.onpointerdown = (e) => {
          canvas.setPointerCapture(e.pointerId);
          pointers.set(e.pointerId, pos(e));
          down = { xy: pos(e), pan: { ...A.renderer.pan }, pointer: e.pointerId };
          moved = false;
          if (pointers.size === 2) {
            let v = [...pointers.values()];
            pinch = {
              distance: Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]),
              zoom: A.renderer.zoom,
            };
          }
        };
        canvas.onpointermove = (e) => {
          let p = pos(e);
          if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
          if (pointers.size === 2 && pinch) {
            let v = [...pointers.values()],
              dist = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]);
            A.renderer.zoom = E.clamp(
              (pinch.zoom * dist) / Math.max(10, pinch.distance),
              0.55,
              2.7,
            );
            A.renderer.render();
            moved = true;
            return;
          }
          if (down && e.buttons) {
            let dx = p[0] - down.xy[0],
              dy = p[1] - down.xy[1];
            if (Math.hypot(dx, dy) > 6) moved = true;
            if (A.panMode || e.button === 2 || e.buttons === 2 || e.pointerType === 'touch') {
              A.renderer.pan = { x: down.pan.x + dx, y: down.pan.y + dy };
              A.renderer.render();
              return;
            }
          }
          if (e.pointerType !== 'touch') {
            A.selection = A.renderer.pick(...p);
            preview();
          }
        };
        canvas.onpointerup = (e) => {
          pointers.delete(e.pointerId);
          if (pinch) {
            if (!pointers.size) {
              pinch = null;
              A.state.scene.camera.zoom = A.renderer.zoom;
              save();
            }
            down = null;
            return;
          }
          if (!moved && !A.panMode) {
            A.selection = A.renderer.pick(...pos(e));
            preview();
            if (e.pointerType === 'touch') {
              if (A.selection >= 0) {
                $('#place').hidden = false;
                $('#place').textContent =
                  A.tool === 'build' ? 'Place ' + E.TYPES[A.type][1] : 'Apply ' + A.tool;
              }
            } else applyAt();
          }
          down = null;
        };
        canvas.onpointercancel = (e) => {
          pointers.delete(e.pointerId);
          down = null;
          pinch = null;
        };
        canvas.onwheel = (e) => {
          e.preventDefault();
          A.renderer.zoom = E.clamp(A.renderer.zoom - e.deltaY * 0.001, 0.55, 2.7);
          A.renderer.render();
          A.state.scene.camera.zoom = A.renderer.zoom;
          save();
        };
        canvas.onkeydown = (e) => {
          const dirs = {
            ArrowLeft: -1,
            ArrowRight: 1,
            ArrowUp: -A.state.scene.size,
            ArrowDown: A.state.scene.size,
          };
          if (e.key in dirs) {
            e.preventDefault();
            A.selection = E.clamp(
              (A.selection < 0 ? Math.floor(A.state.scene.tiles.length / 2) : A.selection) +
                dirs[e.key],
              0,
              A.state.scene.tiles.length - 1,
            );
            preview();
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            applyAt();
          }
          if (e.key === '+') realmAction('zoomin');
          if (e.key === '-') realmAction('zoomout');
        };
      }
      function paletteDialog() {
        const d = modal(
          'Builder options',
          `<p>Choose a colour story. Rotate the piece independently of the camera.</p><div class="swatches" style="margin:20px 0">${Object.entries(
            E.PALETTES,
          )
            .map(
              ([id, p]) =>
                `<button class="swatch ${A.palette === id ? 'active' : ''}" style="background:${p[1]};width:40px;height:40px" data-col="${id}" aria-label="${id}"></button>`,
            )
            .join(
              '',
            )}</div><div class="row"><button id="rotpiece">Turn piece ↻</button><button id="newempty">New empty island</button><button id="newharbour">Harbour sketch</button><button id="newgarden">Garden sketch</button></div><label style="display:block;margin:18px 0">Realm name <input id="mobile-name" value="${esc(A.state.scene.name)}" maxlength="64"></label>`,
        );
        $$('[data-col]', d).forEach(
          (b) =>
            (b.onclick = () => {
              A.palette = b.dataset.col;
              inspector();
              drawModels();
              preview();
              d.close();
            }),
        );
        $('#rotpiece').onclick = () => realmAction('turnpiece');
        $('#newempty').onclick = () => newPreset('empty');
        $('#newharbour').onclick = () => newPreset('harbour');
        $('#newgarden').onclick = () => newPreset('garden');
        $('#mobile-name').onchange = (e) => {
          A.state.scene.name = e.target.value.trim() || 'Untitled realm';
          $('#realm-caption').textContent = A.state.scene.name;
          inspector();
          save();
        };
      }
      function builderHelp() {
        modal(
          'A little model-making',
          `<p><strong>Desktop:</strong> pick a piece, point to a plot to see its ghost, then click. Use Pan or right-drag to move the view; the mouse wheel zooms.</p><p><strong>Touch:</strong> tap a plot, then the placement button. Drag to pan. Pinch or use +/− to zoom. This prevents a drag from accidentally building a row of houses.</p><p><strong>Stacking:</strong> stone, timber and castle floors support another piece. A roof or complete building caps the stack. Four modules per plot, five terrain levels.</p><p><strong>Keyboard:</strong> focus the canvas, use arrow keys to select a plot and Enter to apply your tool. Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z redoes. The tools tray includes remove, height and inspect tools.</p><p>Isometric and diorama are fixed-angle orthographic views, with four camera rotations. Plan is overhead. The lit 3D view uses your graphics hardware when available. A flat-colour view keeps the same editing and export tools available on other browsers. Water motion pauses when hidden or reduced motion is requested.</p>`,
        );
      }
      function petsPage() {
        clearInterval(A.gardenTimer);
        clearTimeout(A.petTimer);
        A.petView?.dispose();
        const species = A.state.pets.selected,
          pet = P.INFO[species],
          name = A.state.pets.names[species];
        $('#main').innerHTML =
          header(
            '02 / THE COMPANION NOOK',
            'Good company. No obligations.',
            'They do not get hungry, ill or unhappy while you are away.',
          ) +
          `<div class="two-col"><div><div class="pet-stage" id="pet-stage" role="button" tabindex="0" aria-label="Pet ${esc(name)}"><div class="window-art"></div><div class="stage-note">“${species === 'cat' ? 'I saved you the warm side.' : species === 'fox' ? 'This leaf looked important.' : species === 'owl' ? 'Shall we stay a little longer?' : 'A small cloud, just for you.'}”</div><div id="pet-portrait">${P.svg(species, A.petAction, name)}</div></div><div class="pet-actions">${[
            ['pet', 'Pet'],
            ['treat', 'Treat'],
            ['play', 'Play'],
            ['groom', 'Brush'],
            ['nap', 'Nap'],
          ]
            .map(([id, label]) => `<button data-pet-action="${id}">${label}</button>`)
            .join('')}</div><div class="pet-choices">${Object.entries(P.INFO)
            .map(
              ([id, v]) =>
                `<button class="pet-choice ${id === species ? 'active' : ''}" data-species="${id}">${P.svg(id, 'idle', v.species)}${esc(A.state.pets.names[id])}</button>`,
            )
            .join(
              '',
            )}</div></div><aside class="panel"><div class="eyebrow">${pet.species}</div><h2 style="margin-top:10px">${esc(name)}</h2><p>${pet.note}</p><button id="rename-pet" class="textbtn" style="padding-left:0">Give a nickname</button><div class="bond"><i style="width:${Math.min(100, A.state.pets.bond[species] * 5)}%"></i></div><div class="micro subtle">${A.state.pets.bond[species]} moments together. Affection never decays.</div><div class="facts"><div><strong>${A.state.stats.species.length}/4</strong>Friends greeted</div><div><strong>${A.state.stats.walks}</strong>Strolls completed</div></div><hr style="border:none;border-top:1px solid var(--line);margin:23px 0"><h3>A small adventure</h3><p class="micro">Send a companion to collect a little keepsake. The walk finishes while this page is closed. No penalties, paid shortcuts or care schedule.</p><div id="trip-status"></div><p class="micro subtle" style="margin-top:20px">Animated animal portraits and an original cloud dragon. Pet, treat, play, brush or settle down for a nap. Illustrations stay available when 3D cannot load.</p></aside></div>`;
        A.petView = new G.QWPetView(
          $('#pet-portrait'),
          species,
          A.artURLs['pet-' + species],
          A.state.settings.motion,
        );
        $$('[data-species]').forEach(
          (b) =>
            (b.onclick = () => {
              A.state.pets.selected = b.dataset.species;
              A.state.scene.pet = b.dataset.species;
              A.petAction = 'idle';
              petsPage();
              save();
            }),
        );
        $$('[data-pet-action]').forEach((b) => (b.onclick = () => petAction(b.dataset.petAction)));
        $('#pet-stage').onclick = () => petAction('pet');
        $('#pet-stage').onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            petAction('pet');
          }
        };
        $('#rename-pet').onclick = () => {
          const d = modal(
            'A name for a friend',
            `<input id="pet-name" maxlength="30" value="${esc(name)}"><button id="save-name" class="primary">Keep name</button>`,
          );
          $('#save-name').onclick = () => {
            A.state.pets.names[species] = $('#pet-name').value.trim() || P.INFO[species].name;
            d.close();
            petsPage();
            save();
          };
        };
        tripUI();
        A.gardenTimer = setInterval(() => {
          if (!document.hidden) tripUI();
        }, 1000);
      }
      function petAction(id) {
        const s = A.state.pets.selected;
        A.petAction = id;
        if (Date.now() - (A.lastPet || 0) >= 450 || A.lastPetSpecies !== s) {
          A.state.pets.bond[s]++;
          A.state.stats.petActions++;
          A.lastPet = Date.now();
          A.lastPetSpecies = s;
        }
        if (!A.state.stats.species.includes(s)) A.state.stats.species.push(s);
        $('.bond i').style.width = Math.min(100, A.state.pets.bond[s] * 5) + '%';
        $('.bond + .micro').textContent =
          A.state.pets.bond[s] + ' moments together. Affection never decays.';
        $('.facts strong').textContent = A.state.stats.species.length + '/4';
        $('#pet-portrait .pet-svg').outerHTML = P.svg(s, id, A.state.pets.names[s]);
        A.petView?.setAction(id);
        $('#pet-stage').dataset.action = id;
        feedback(id);
        save();
        clearTimeout(A.petTimer);
        if (id !== 'nap')
          A.petTimer = setTimeout(() => {
            if (A.route === 'pets') {
              $('#pet-portrait .pet-svg').outerHTML = P.svg(
                A.state.pets.selected,
                'idle',
                A.state.pets.names[A.state.pets.selected],
              );
              A.petAction = 'idle';
              A.petView?.setAction('idle');
              $('#pet-stage').dataset.action = 'idle';
            }
          }, 3000);
      }
      function tripUI() {
        const c = $('#trip-status');
        if (!c) return;
        let trip = A.state.pets.trip;
        if (!trip) {
          if (c.dataset.mode === 'empty') return;
          c.dataset.mode = 'empty';
          c.innerHTML =
            '<div class="row"><select id="walk-length" style="padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--paper)"><option value="60000">A minute in the garden</option><option value="300000">Five-minute woodland stroll</option><option value="600000">Ten-minute hill walk</option></select><button id="walk-start" class="primary">Send on a stroll</button></div>';
          $('#walk-start').onclick = () => {
            A.state.pets.trip = {
              started: Date.now(),
              duration: +$('#walk-length').value,
              species: A.state.pets.selected,
            };
            c.dataset.mode = '';
            tripUI();
            save();
          };
        } else {
          let remaining = Math.max(0, trip.duration - (Date.now() - trip.started));
          if (remaining) {
            c.dataset.mode = 'walking';
            c.innerHTML = `<p class="micro">${esc(A.state.pets.names[trip.species])} is exploring. <strong>${duration(remaining)}</strong> to go.</p><div class="growth" style="width:100%"><span style="width:${E.clamp(100 - (remaining / trip.duration) * 100, 0, 100)}%"></span></div>`;
          } else if (c.dataset.mode !== 'ready') {
            c.dataset.mode = 'ready';
            c.innerHTML = `<p class="micro">${esc(A.state.pets.names[trip.species])} is back with a pressed leaf.</p><button class="primary" id="collect-trip">Welcome home</button>`;
            $('#collect-trip').onclick = () => {
              A.state.pets.trip = null;
              A.state.stats.walks++;
              A.state.garden.pressed++;
              feedback('win');
              save();
              petsPage();
              toast('A pressed leaf is tucked into your herbarium.');
            };
          }
        }
      }
      function duration(ms) {
        let s = Math.ceil(Math.max(0, ms) / 1000);
        return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
      }
      function flowerSVG(seed = 'clover', growth = 1) {
        const c = E.CROPS[seed].colour,
          sy = 40 + growth * 72;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 135" aria-hidden="true"><ellipse cx="64" cy="120" rx="39" ry="7" fill="#4c674320"/><path d="M35 86H94L86 119H44Z" fill="#bd8568" stroke="#7d725d"/><path d="M32 83H98V92H32Z" fill="#ce9c78" stroke="#7d725d"/><ellipse cx="65" cy="84" rx="26" ry="4" fill="#6e7457"/>${
          growth > 0
            ? `<g stroke="#658a60" stroke-width="2.5" stroke-linecap="round"><path d="M65 85V${100 - sy * 0.6}"/><path d="M65 65Q37 52 44 65Q52 79 65 71 M65 72Q89 53 85 67Q78 77 65 77" fill="#97b585"/></g>${
                growth > 0.5
                  ? `<g fill="${c}" stroke="#53695155" stroke-width="1">${Array.from(
                      { length: seed === 'lavender' ? 9 : 6 },
                      (_, i) => {
                        let a = (i * Math.PI) / 3,
                          x = seed === 'lavender' ? 65 + (i % 2 ? 4 : -4) : 65 + Math.cos(a) * 10,
                          y = seed === 'lavender' ? 65 - i * 3 : 100 - sy * 0.6 + Math.sin(a) * 10;
                        return `<ellipse cx="${x}" cy="${y}" rx="${seed === 'lavender' ? 5 : 8}" ry="${seed === 'lavender' ? 4 : 9}"/>`;
                      },
                    ).join('')}<circle cx="65" cy="${100 - sy * 0.6}" r="5" fill="#d5ac57"/></g>`
                  : ''
              }`
            : ''
        }</svg>`;
      }
      function gardenPage() {
        clearInterval(A.gardenTimer);
        $('#main').innerHTML =
          header(
            '03 / THE CONSERVATORY',
            'Leave room for things to grow.',
            'A small idle garden. Real elapsed time, no losses for staying away.',
          ) +
          `<div class="two-col"><section class="panel garden-stage"><div class="garden-caption">A few good things, taking their time.</div><div class="pots" id="pots"></div></section><aside class="panel"><div class="eyebrow">SEED TIN</div><h2 style="margin-top:9px">Something for the windowsill.</h2><p class="micro">Choose a seed, then an empty pot. Plants keep their progress when you close the app. A finished flower waits until you are ready.</p><div class="seed-choice">${Object.entries(
            E.CROPS,
          )
            .map(
              ([id, c]) =>
                `<button class="${A.seed === id ? 'active' : ''}" data-seed="${id}">${c.name}<small style="display:block;color:inherit;font-size:9px">${c.seconds / 60} min</small></button>`,
            )
            .join(
              '',
            )}</div><div class="facts"><div><strong id="herbarium-count">${A.state.garden.pressed}</strong>Pressed keepsakes</div><div><strong>${A.state.stats.harvests}</strong>Flowers gathered</div></div><div class="notice">No plant death, watering chores, resource shop or real-time server. Clock changes can affect this local toy; it is not a competitive economy.</div><button id="garden-calm" class="soft">Just watch for a moment</button><p class="micro subtle">The garden animates only while it is visible. Growth is a timestamp calculation, not a continuously running background task.</p></aside></div>`;
        $('.garden-stage').dataset.gardenStyle = A.state.garden.style;
        $('#main').insertAdjacentHTML(
          'beforeend',
          `<section class="panel herbarium-panel"><div class="section-head"><div><div class="eyebrow">YOUR PRESSED-FLOWER BOOK</div><h2>Keep a little of the season.</h2></div><button id="garden-gather" class="soft">Gather ready flowers</button></div><p class="micro">Gather a flower to add its specimen here. Earlier keepsakes stay in your total; only flowers gathered with this collection are identified by species.</p><div class="herbarium-specimens" id="herbarium-specimens"></div><div class="bouquet-layout"><div id="bouquet-art"></div><div><h3>A postcard from your garden</h3><p class="micro">Arrange any flowers you have discovered. Reuse them freely; your collection is never spent.</p><label>Postcard title <input id="bouquet-title" maxlength="40" value="${esc(A.state.garden.title)}"></label><button id="bouquet-title-save">Keep title</button><div id="bouquet-choices"></div><div class="row"><button id="bouquet-undo">Undo arrangement</button><button id="bouquet-export" class="primary">Save postcard · SVG</button></div><label>Garden setting <select id="garden-style"><option value="glasshouse">Glasshouse</option><option value="shore">By the shore</option></select></label><button id="garden-sow" class="soft">Plant selected seed in empty pots</button></div></div></section>`,
        );
        $('#garden-style').value = A.state.garden.style;
        $('#garden-style').onchange = () => {
          A.state.garden.style = $('#garden-style').value;
          $('.garden-stage').dataset.gardenStyle = A.state.garden.style;
          save();
        };
        $('#bouquet-title-save').onclick = () => {
          A.state.garden.title = $('#bouquet-title').value.trim() || 'A few good things';
          save();
          renderHerbarium();
        };
        $('#garden-sow').onclick = () => {
          const now = Date.now();
          let planted = 0;
          for (let i = 0; i < 6; i++) if (E.plant(A.state, i, A.seed, now)) planted++;
          A.state.stats.planted = (A.state.stats.planted || 0) + planted;
          if (planted) {
            save();
            renderPots();
            feedback();
          }
          toast(
            planted
              ? `${planted} empty pots planted. Existing plants kept.`
              : 'Every pot is already growing something.',
          );
        };
        $('#garden-gather').onclick = () => {
          const now = Date.now();
          let gathered = 0;
          for (let i = 0; i < 6; i++) if (E.harvest(A.state, i, now)) gathered++;
          if (gathered) {
            save();
            renderPots();
            renderHerbarium();
            feedback('win');
            $('#herbarium-count').textContent = A.state.garden.pressed;
          }
          toast(
            gathered
              ? `${gathered} flowers tucked into your collection.`
              : 'No flowers are ready yet. They will wait for you.',
          );
        };
        $('#bouquet-undo').onclick = () => {
          if (!A.bouquetUndo) return;
          A.state.garden.bouquet = A.bouquetUndo;
          A.bouquetUndo = null;
          save();
          renderHerbarium();
        };
        $('#bouquet-export').onclick = () =>
          download(
            new Blob([bouquetSVG()], { type: 'image/svg+xml' }),
            'alibi-garden-postcard.svg',
          );
        renderHerbarium();
        $('#main').insertAdjacentHTML(
          'beforeend',
          `<aside class="garden-inspiration"><figure><img src="${G.ALIBI_MEDIA?.['conservatory-study'] || ''}" alt="Side of a Greenhouse by George Cochran Lambdin" loading="eager" width="650" height="826"><figcaption><a href="https://www.metmuseum.org/art/collection/search/11393" target="_blank" rel="noopener noreferrer">George Cochran Lambdin · Side of a Greenhouse</a><br>1870–80 (?) · The Met · Public Domain</figcaption></figure><div><div class="eyebrow">FROM THE MUSEUM WALL</div><h2>Some things reward a second look.</h2><p>Real paint, real leaves, a patch of window light. A small piece of the museum to keep beside your own growing things.</p><a href="#/quiet/gallery">Spend a moment in the art room →</a></div></aside>`,
        );
        $$('[data-seed]').forEach(
          (b) =>
            (b.onclick = () => {
              A.seed = b.dataset.seed;
              $$('[data-seed]').forEach((t) => t.classList.toggle('active', t === b));
            }),
        );
        $('#garden-calm').onclick = () => {
          A.state.settings.zen = true;
          styles();
          save();
        };
        renderPots();
        A.gardenTimer = setInterval(() => {
          if (!document.hidden) renderPots();
        }, 1000);
      }
      function renderPots() {
        const c = $('#pots');
        if (!c) return;
        const focused = root.activeElement?.dataset.pot;
        let now = Date.now();
        c.innerHTML = A.state.garden.pots
          .map((p, i) => {
            let g = E.growth(p, now);
            return `<button class="pot" data-pot="${i}" aria-label="Pot ${i + 1}: ${p ? E.CROPS[p.seed].name + (g >= 1 ? ' ready to collect' : ', growing') : 'empty, plant ' + E.CROPS[A.seed].name}">${flowerSVG(p?.seed || 'clover', p ? g : 0)}<strong>${p ? E.CROPS[p.seed].name : 'Empty pot'}</strong><small>${p ? (g >= 1 ? 'Ready to gather' : duration(E.CROPS[p.seed].seconds * 1000 * (1 - g)) + ' to bloom') : 'Tap to plant'}</small><div class="growth"><span style="width:${g * 100}%"></span></div></button>`;
          })
          .join('');
        $$('[data-pot]').forEach(
          (b) =>
            (b.onclick = () => {
              let i = +b.dataset.pot,
                p = A.state.garden.pots[i];
              if (!p) {
                E.plant(A.state, i, A.seed, Date.now());
                A.state.stats.planted = (A.state.stats.planted || 0) + 1;
                feedback();
                save();
                renderPots();
              } else if (E.harvest(A.state, i, Date.now())) {
                feedback('win');
                save();
                renderPots();
                $('#herbarium-count').textContent = A.state.garden.pressed;
                renderHerbarium();
                toast('A bloom for your herbarium.');
              } else toast('Still growing. It will wait for you when it is ready.');
            }),
        );
        if (focused !== undefined)
          $('[data-pot="' + focused + '"]')?.focus({ preventScroll: true });
      }
      function pressedArt(seed) {
        const index = { clover: 0, lavender: 2, sunflower: 3, poppy: 1, daisy: 3, bluebell: 2 }[
          seed
        ];
        let art = G.QWCalmArt.art(index);
        if (seed === 'sunflower') art = art.replaceAll('#f1e9cb', '#efc457');
        if (seed === 'bluebell') art = art.replaceAll('#9d95b5', '#839fc4');
        return art;
      }
      function bouquetSVG() {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" role="img" aria-label="${esc(A.state.garden.title)}"><rect width="600" height="420" rx="10" fill="#f8f0df"/><rect x="18" y="18" width="564" height="384" rx="4" fill="none" stroke="#c6bd9e"/><text x="300" y="70" text-anchor="middle" fill="#466d61" font-family="Georgia,serif" font-size="24">${esc(A.state.garden.title)}</text>${A.state.garden.bouquet.map((seed, i) => (seed ? pressedArt(seed).replace('<svg ', `<svg x="${48 + i * 168}" y="115" width="168" height="190" `) : `<circle cx="${132 + i * 168}" cy="210" r="44" fill="none" stroke="#d9cfb5" stroke-dasharray="3 7"/>`)).join('')}<text x="300" y="365" text-anchor="middle" fill="#73816b" font-family="Georgia,serif" font-size="14">A small season, kept. · Alibi</text></svg>`;
      }
      function renderHerbarium() {
        const holder = $('#herbarium-specimens');
        if (!holder) return;
        holder.innerHTML = Object.entries(E.CROPS)
          .map(
            ([id, crop]) =>
              `<article class="specimen ${A.state.garden.collection[id] ? 'discovered' : ''}">${pressedArt(id)}<strong>${crop.name}</strong><span class="micro">${A.state.garden.collection[id] || 'Not yet gathered'}</span></article>`,
          )
          .join('');
        $('#bouquet-art').innerHTML = bouquetSVG();
        $('#bouquet-choices').innerHTML = A.state.garden.bouquet
          .map(
            (seed, i) =>
              `<label>Flower ${i + 1} <select data-bouquet-slot="${i}"><option value="">Leave empty</option>${Object.entries(
                E.CROPS,
              )
                .filter(([id]) => A.state.garden.collection[id] > 0)
                .map(
                  ([id, crop]) =>
                    `<option value="${id}" ${seed === id ? 'selected' : ''}>${crop.name}</option>`,
                )
                .join('')}</select></label>`,
          )
          .join('');
        $$('[data-bouquet-slot]').forEach(
          (select) =>
            (select.onchange = () => {
              const slot = +select.dataset.bouquetSlot;
              A.bouquetUndo = E.clone(A.state.garden.bouquet);
              if (E.arrangeBloom(A.state, slot, select.value || null)) {
                save();
                renderHerbarium();
                $(`[data-bouquet-slot="${slot}"]`).focus({ preventScroll: true });
              }
            }),
        );
        $('#bouquet-undo').disabled = !A.bouquetUndo;
        const count = $('.garden-stage + aside .facts div:nth-child(2) strong');
        if (count) count.textContent = A.state.stats.harvests;
      }
      const CLASSICS = {
        'tideglass-morning': {
          title: 'Tideglass',
          kind: 'Colour pouring · morning',
          art: 'well',
          text: 'Gather each colour and symbol in a full glass of its own. Choose a glass, then pour onto the same top symbol or into an empty glass. A pour moves as many matching top layers as will fit.',
          note: 'No timer or move limit. Empty glasses are breathing room. Undo any move.',
        },
        'tideglass-dusk': {
          title: 'Evening tide',
          kind: 'Colour pouring · four colours',
          art: 'boat',
          text: 'Arrange four colours into separate full glasses. Choose a source and a destination. Only matching top layers can join; empty glasses accept any colour.',
          note: 'Symbols repeat the colour information. A nudge examines the current arrangement.',
        },
        'pairs-meadow': {
          title: 'The pressed meadow',
          kind: 'Matching pairs · botanical',
          art: 'tree',
          text: 'Turn over two cards and find their matching botanical illustrations. A mismatch stays visible until you choose the next card. Matched pairs remain face up.',
          note: 'Eight pairs, no timer. Take as long as you like to remember a small detail.',
        },
        'pairs-shore': {
          title: 'Beachcomber',
          kind: 'Matching pairs · coastal',
          art: 'boat',
          text: 'Find eight pairs of small things from the shore. Turn two cards at a time. Matching pictures stay in your collection; a mismatch waits until your next choice.',
          note: 'No disappearing cards, countdown or penalties. Undo reveals whenever you need.',
        },
        hanoi3: {
          title: 'The three towers',
          kind: 'Hanoi · three discs',
          text: 'Move every disc to the right-hand peg. Move one top disc at a time. A larger disc can never rest on a smaller one.',
          note: 'The three-disc puzzle needs at least seven moves.',
          art: 'tower',
        },
        hanoi4: {
          title: 'A longer climb',
          kind: 'Hanoi · four discs',
          text: 'The same three pegs, with one more disc. Move the full tower to the right-hand peg without putting a larger disc on a smaller one.',
          note: 'Four discs need at least fifteen moves.',
          art: 'spire',
        },
        hanoi5: {
          title: 'The patient tower',
          kind: 'Hanoi · five discs',
          text: 'Move the tower from the left peg to the right. Only the top disc of a peg may move, and it must land on an empty peg or a larger disc.',
          note: 'Five discs need at least thirty-one moves.',
          art: 'keep',
        },
        river: {
          title: 'A difficult crossing',
          kind: 'Wolf, goat & cabbage',
          text: 'Take everyone to the right bank. The ferryman carries at most one passenger. Without him, the wolf eats the goat, and the goat eats the cabbage.',
          note: 'Tap a passenger to cross with them, or the ferryman to cross alone. Unsafe crossings are blocked and explained.',
          art: 'boat',
        },
        jugs: {
          title: 'Precisely four',
          kind: 'The water-jug problem',
          text: 'Measure exactly four litres using a three-litre jug and a five-litre jug. Fill, empty or pour until the source is empty or the destination is full.',
          note: 'There are no hidden measuring marks or partial pours.',
          art: 'well',
        },
        queens: {
          title: 'A quiet court',
          kind: 'The eight queens',
          text: 'Place eight queens so that none share a row, column or diagonal. Tap a queen to remove it. Attacked squares are shaded automatically.',
          note: 'There are multiple valid arrangements. The board accepts every legal one.',
          art: 'keep',
        },
        magic: {
          title: 'Fifteen everywhere',
          kind: 'The Lo Shu square',
          text: 'Arrange the numbers one to nine so that each row, each column and both diagonals sum to fifteen. Tap two tiles to swap them.',
          note: 'All rotations and reflections of a valid magic square are accepted.',
          art: 'library',
        },
        knight: {
          title: 'Every square',
          kind: 'A 5 × 5 knight’s tour',
          text: 'Visit all twenty-five squares exactly once. A knight moves two squares along one axis, then one along the other. Start wherever you like.',
          note: 'Highlighted squares are legal next moves, not a promise that the tour can still be finished. Undo is part of the puzzle.',
          art: 'inn',
        },
        'slide-town': {
          title: 'The scattered postcard',
          kind: 'Sliding picture · original art',
          text: 'Slide a tile beside the empty space to restore the picture. Tiles keep their original orientation. The tiny numbers help you see the intended order.',
          note: 'This arrangement is produced by legal moves from a solved board, so it is solvable.',
          art: 'townhouse',
        },
      };
      function classicsPage() {
        const id = routePath().split('/')[1];
        if (id && (CLASSICS[id] || /^slide-(wave|portrait|bedroom|sunday)$/.test(id))) {
          A.classic = id;
          classicPage();
          return;
        }
        $('#main').innerHTML =
          header(
            '04 / THE CLASSICAL CABINET',
            'Old ideas. Fresh little rooms.',
            'Hand-built interfaces for mathematical classics. Original instructions, no copied commercial puzzle packs.',
          ) +
          `<div class="card-grid">${Object.entries(CLASSICS)
            .map(
              ([id, q], i) =>
                `<button class="activity-card" data-play="${id}"><div class="art" style="background:${['#e6e7d4', '#dedfce', '#e5ddcd', '#d0e0d8', '#dce6dd', '#e6dbc6'][i % 6]}">${R.thumbnail(q.art, ['terracotta', 'sage', 'lavender'][i % 3])}</div><div class="info"><span class="tag">${q.kind}</span><h3>${q.title}</h3><p>${q.text.slice(0, 94)}…</p><span class="pill">${A.state.stats.solves.includes(id) ? 'Completed' : A.state.classics[id]?.actions?.length ? 'Continue' : 'Open puzzle'} →</span></div></button>`,
            )
            .join(
              '',
            )}</div><div class="artifact-footer"><span style="display:flex;align-items:center;gap:12px"><img src="${context.media.keeper}" width="32" height="48" alt="A small court keeper from Kenney’s CC0 Castle Kit">Classic rules, newly written software and presentation.</span><button id="classics-challenges" class="textbtn" style="font-size:10px">Curated challenges</button><button id="classics-sources" class="textbtn" style="font-size:10px">About the sources</button></div>`;
        $$('[data-play]').forEach(
          (b) => (b.onclick = () => navigate('classics/' + b.dataset.play)),
        );
        $('#classics-sources').onclick = () =>
          modal(
            'A classical shelf',
            `<p>These are new implementations of established recreational mathematics: Hanoi, wolf–goat–cabbage, water jugs, eight queens, the Lo Shu magic square, knight’s tours and sliding tiles.</p><p>The brief texts, layouts and graphics here are newly written. No claim is made that these are original puzzle inventions or that a unique solution exists for every family.</p><p>Source notes and historical references are in <a href="${esc(context.sources || './quiet-wing-sources.html')}" target="_blank" rel="noopener">the asset and puzzle ledger</a>. The Hanoi minimum follows 2ⁿ − 1; the software tests solve all configured finite instances independently.</p>`,
          );
        $('#classics-challenges').onclick = () => navigate('challenges');
      }
      function challengesPage() {
        const requested = routePath().split('/')[1] || '';
        if (
          !G.ALIBI_CHALLENGE_DATA ||
          !G.AlibiChallenges ||
          !G.AlibiChallengeLauncher ||
          !G.AlibiChallengeStore
        ) {
          $('#main').innerHTML = header(
            '05 / CURATED CHALLENGES',
            'A fresh set is still arriving.',
            'This release does not include the trusted challenge pack. Return to the classical cabinet and try another puzzle.',
          );
          return;
        }
        try {
          A.challengeRegistry ||= G.AlibiChallenges.create(G.ALIBI_CHALLENGE_DATA, {
            quiet: E,
            club: G.AlibiClubEngines,
          });
          challengeRegistry = A.challengeRegistry;
        } catch (error) {
          $('#main').innerHTML = header(
            '05 / CURATED CHALLENGES',
            'The challenge pack is protected.',
            esc(error.message),
          );
          return;
        }
        if (!requested) {
          const entries = A.challengeRegistry.entries();
          $('#main').innerHTML =
            header(
              '05 / CURATED CHALLENGES',
              'Fixed starts. Your own route.',
              'Each challenge rebuilds from its recorded start and your legal moves. Existing classics and Club games keep their own saves.',
            ) +
            `<div class="card-grid">${entries.map((c) => `<button class="activity-card" data-challenge-id="${esc(c.id)}"><div class="info"><span class="tag">${esc(c.family)}</span><h3>${esc(c.title)}</h3><p>${esc(c.instruction).slice(0, 112)}…</p><span class="pill">Open challenge →</span></div></button>`).join('')}</div>`;
          $$('[data-challenge-id]').forEach(
            (button) =>
              (button.onclick = () => navigate('challenges/' + button.dataset.challengeId)),
          );
          return;
        }
        let challenge;
        try {
          challenge = A.challengeRegistry.get(requested);
        } catch {
          navigate('challenges');
          return;
        }
        $('#main').innerHTML =
          header(
            '05 / ' + esc(challenge.family),
            esc(challenge.title),
            'A trusted start, your legal replay.',
            `<button id="challenge-back" class="soft">← All challenges</button>`,
          ) +
          '<div class="row"><button id="challenge-export" class="soft">Export challenge</button><button id="challenge-import" class="soft">Restore challenge</button><button id="challenge-recovery" class="soft">Export pre-restore save</button><input id="challenge-file" type="file" accept="application/json,.json" hidden></div><p class="micro subtle">These controls cover this challenge only. Cabinet, Club and Quiet Wing backups remain separate.</p><div id="challenge-host"></div>';
        $('#challenge-back').onclick = () => navigate('challenges');
        const host = $('#challenge-host');
        A.challengeStore ||= G.AlibiChallengeStore.create(A.challengeRegistry);
        challengeStore = A.challengeStore;
        A.challengeStore
          .open()
          .then(() => A.challengeStore.read(challenge.id))
          .catch((error) => {
            toast(error.message);
            return null;
          })
          .then((saved) => {
            if (disposed || A.route !== 'challenges' || routePath().split('/')[1] !== challenge.id)
              return;
            A.challengeHandle = G.AlibiChallengeLauncher.mount(
              host,
              A.challengeRegistry,
              challenge.id,
              saved,
              (run) => A.challengeStore.write(run).catch((error) => toast(error.message)),
            );
          });
        $('#challenge-export').onclick = () => exportChallenge(A.challengeHandle?.save());
        $('#challenge-recovery').onclick = async () => {
          try {
            exportChallenge(await A.challengeStore.recovery(challenge.id), 'previous');
          } catch (error) {
            toast(error.message);
          }
        };
        $('#challenge-import').onclick = () => $('#challenge-file').click();
        $('#challenge-file').onchange = async () => {
          const file = $('#challenge-file').files?.[0];
          if (!file) return;
          try {
            if (file.size > 3 * 1024 * 1024) throw Error('Challenge save exceeds 3 MB.');
            if (!G.AlibiValidateImport) throw Error('Background validation is unavailable.');
            const imported = await G.AlibiValidateImport({
              type: 'challenge-run',
              text: await file.text(),
            });
            if (imported.challengeId !== challenge.id)
              throw Error('Choose a save for this exact challenge.');
            await A.challengeStore.restore(imported);
            A.challengeHandle?.dispose();
            A.challengeHandle = G.AlibiChallengeLauncher.mount(
              host,
              A.challengeRegistry,
              challenge.id,
              imported,
              (run) => A.challengeStore.write(run).catch((error) => toast(error.message)),
            );
            toast('Challenge save restored. The previous save remains available for export.');
          } catch (error) {
            toast(error.message);
          }
          $('#challenge-file').value = '';
        };
      }
      function exportChallenge(run, suffix = 'challenge') {
        if (!run) {
          toast('Finish opening this challenge before exporting it.');
          return;
        }
        const link = document.createElement('a');
        link.href = URL.createObjectURL(
          new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' }),
        );
        link.download = 'alibi-' + suffix + '-' + run.challengeId + '.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      }
      function getClassic() {
        let run = A.state.classics[A.classic];
        if (!run) {
          run = { state: E.classicInitial(A.classic), actions: [] };
          A.state.classics[A.classic] = run;
        }
        return run;
      }
      function classicPage() {
        const id = A.classic,
          run = getClassic(),
          s = run.state,
          q = CLASSICS[id] || {
            title: ARTS[id.slice(6)].title,
            kind: 'A picture, in pieces',
            text: CLASSICS['slide-town'].text,
            note: CLASSICS['slide-town'].note,
          };
        $('#main').innerHTML =
          header(
            '04 / ' + esc(q.kind),
            esc(q.title),
            'Take your time. Illegal moves explain themselves.',
            `<button id="classic-back" class="soft">← All classics</button>`,
          ) +
          `<div class="classic-layout"><div><section class="panel classic-board" id="classic-board"></section><div id="classic-message" class="classic-notice" aria-live="polite">${s.moves} moves · ${esc(q.note)}</div></div><aside class="panel rules"><div class="eyebrow">THE RULES</div><h3 style="margin-top:10px">One small challenge.</h3><p>${q.text}</p><p class="subtle">${q.note}</p><div class="row"><button id="classic-undo">Undo</button><button id="classic-reset">Start again</button><button id="classic-hint">A nudge</button></div><p class="micro" id="classic-helper">Your legal moves and progress save on this device.</p><div id="classic-result"></div></aside></div>`;
        $('#classic-back').onclick = () => navigate('classics');
        $('#classic-undo').onclick = () => {
          if (!run.actions.length) return;
          run.actions.pop();
          replayClassic(run);
          A.classicSelected = null;
          drawClassic();
          save();
        };
        $('#classic-reset').onclick = () => {
          const d = modal(
            'Start this puzzle again?',
            `<p>This resets only this puzzle’s moves. Your completed journal stamp stays.</p><button id="reset-confirm" class="primary">Start again</button>`,
          );
          $('#reset-confirm').onclick = () => {
            run.actions = [];
            run.state = E.classicInitial(id);
            A.classicSelected = null;
            d.close();
            drawClassic();
            save();
          };
        };
        $('#classic-hint').onclick = () => classicHint();
        drawClassic();
      }
      function replayClassic(run) {
        let s = E.classicInitial(A.classic);
        for (const a of run.actions) s = E.classicMove(s, a).state;
        run.state = s;
      }
      function playMove(action) {
        let run = getClassic(),
          r = E.classicMove(run.state, action);
        if (r.error) {
          $('#classic-message').textContent = r.error;
          feedback('erase');
          return;
        }
        run.actions.push(action);
        run.state = r.state;
        A.classicSelected = null;
        if (r.won && !A.state.stats.solves.includes(A.classic)) {
          A.state.stats.solves.push(A.classic);
          feedback('win');
        } else feedback();
        drawClassic();
        save();
      }
      function drawClassic() {
        const s = getClassic().state,
          b = $('#classic-board'),
          won = E.classicWon(s);
        $('#classic-message').textContent =
          `${s.moves} moves${won ? ' · Complete. Nicely done.' : ' · No timer. Undo whenever you need.'}`;
        $('#classic-result').innerHTML = won
          ? `<div class="result"><div class="eyebrow">FILE CLOSED</div><h3>You found a way.</h3><p class="micro">${s.moves} legal moves. Your stamp is in the journal.</p><button class="primary" id="next-classic">Back to the cabinet</button></div>`
          : '';
        if (won) $('#next-classic').onclick = () => navigate('classics');
        if (s.family === 'pour') {
          const colours = ['#d49b7b', '#8faaa0', '#a299bd', '#cbb871'],
            symbols = ['●', '◆', '✦', '▰'];
          b.innerHTML = `<div class="tideglass-board"><div class="tideglasses">${s.jars
            .map(
              (jar, i) =>
                `<button class="tideglass ${A.classicSelected === i ? 'selected' : ''}" data-glass="${i}" aria-label="Glass ${i + 1}: ${
                  jar.length
                    ? jar
                        .slice()
                        .reverse()
                        .map((v) => ['coral circle', 'sage diamond', 'lilac star', 'gold bar'][v])
                        .join(', ') + ' from top to bottom'
                    : 'empty'
                }" aria-pressed="${A.classicSelected === i}"><span class="glass-layers" style="--capacity:${s.capacity}">${Array.from(
                  { length: s.capacity },
                  (_, layer) => {
                    const v = jar[s.capacity - 1 - layer];
                    return `<span class="glass-layer" style="${v === undefined ? '' : '--liquid:' + colours[v]}">${v === undefined ? '' : symbols[v]}</span>`;
                  },
                ).join('')}</span><strong>${i + 1}</strong></button>`,
            )
            .join(
              '',
            )}</div><p class="micro subtle">Top layers pour first. Match the symbol, or use an empty glass.</p></div>`;
          $$('[data-glass]').forEach(
            (button) =>
              (button.onclick = () => {
                const index = +button.dataset.glass;
                if (A.classicSelected === null) {
                  A.classicSelected = index;
                  drawClassic();
                  $('#classic-message').textContent = 'Now choose a destination glass.';
                } else if (A.classicSelected === index) {
                  A.classicSelected = null;
                  drawClassic();
                } else playMove({ from: A.classicSelected, to: index });
                $(`[data-glass="${index}"]`)?.focus({ preventScroll: true });
              }),
          );
        } else if (s.family === 'pairs') {
          const theme = s.id.endsWith('shore') ? 'shore' : 'meadow',
            names = G.QWCalmArt.names(theme);
          b.innerHTML = `<div class="pair-board">${s.cards
            .map((value, i) => {
              const matched = s.matched.includes(i),
                open = matched || s.open.includes(i);
              return `<button class="pair-card ${open ? 'revealed' : ''} ${matched ? 'matched' : ''}" data-calm-cell="${i}" aria-label="Card ${i + 1}: ${open ? names[value] + (matched ? ', matched' : '') : 'face down'}" aria-pressed="${open}">${open ? G.QWCalmArt.art(value, theme) : '<span class="card-back-mark" aria-hidden="true">✧</span>'}<span class="pair-caption">${open ? names[value] : i + 1}</span></button>`;
            })
            .join('')}</div>`;
          $$('[data-calm-cell]').forEach(
            (button) =>
              (button.onclick = () => {
                const cell = +button.dataset.calmCell;
                playMove({ cell });
                $(`[data-calm-cell="${cell}"]`)?.focus({ preventScroll: true });
              }),
          );
        } else if (s.id.startsWith('hanoi')) {
          b.innerHTML = `<div class="pegs">${s.pegs
            .map(
              (peg, i) =>
                `<button class="peg ${A.classicSelected === i ? 'selected' : ''}" data-peg="${i}" aria-label="Peg ${i + 1}, ${peg.join(', ') || 'empty'}">${peg
                  .slice()
                  .reverse()
                  .map(
                    (n) =>
                      `<span class="disc" style="width:${30 + n * 12}%;background:${['#a3b59b', '#d6b46d', '#b88269', '#9bacb7', '#b4a5be'][n - 1]}"></span>`,
                  )
                  .join(
                    '',
                  )}<span class="pegname">${['Start', 'Rest', 'Destination'][i]}</span></button>`,
            )
            .join('')}</div>`;
          $$('[data-peg]').forEach(
            (t) =>
              (t.onclick = () => {
                let k = +t.dataset.peg;
                if (A.classicSelected === null) {
                  if (!s.pegs[k].length) {
                    $('#classic-message').textContent =
                      'That peg is empty. Choose a peg with a disc.';
                    return;
                  }
                  A.classicSelected = k;
                  drawClassic();
                  $('#classic-message').textContent = 'Now choose where the top disc should go.';
                } else if (A.classicSelected === k) {
                  A.classicSelected = null;
                  drawClassic();
                } else playMove({ from: A.classicSelected, to: k });
              }),
          );
        } else if (s.id === 'river') {
          const names = ['Ferryman', 'Wolf', 'Goat', 'Cabbage'];
          b.innerHTML = `<div class="river">${[0, 1].map((side, j) => `${j ? '<div class="river-water"><span style="font-size:32px">⌁</span>At most one<br>passenger</div>' : ''}<div class="bank"><strong style="text-align:center;font-size:10px;margin-bottom:auto;letter-spacing:.1em">${side ? 'FAR BANK' : 'HOME BANK'}</strong>${s.side.map((v, i) => (v === side ? `<button data-passenger="${i}" ${i && s.side[i] !== s.side[0] ? 'disabled' : ''}>${names[i]}${i === 0 ? ' · cross alone' : ''}</button>` : '')).join('')}</div>`).join('')}</div>`;
          $$('[data-passenger]').forEach(
            (t) => (t.onclick = () => playMove({ item: +t.dataset.passenger })),
          );
        } else if (s.id === 'jugs') {
          b.innerHTML = `<div class="jugs">${s.v.map((v, i) => `<div class="jug-col"><div class="jug" style="height:${i ? 210 : 150}px"><div class="water" style="height:${(v / [3, 5][i]) * 100}%"></div><span class="litres">${v} L</span></div><p class="micro">${[3, 5][i]} litre jug</p><div class="row">${['fill', 'pour', 'empty'].map((kind) => `<button data-jug="${i}" data-kind="${kind}">${kind[0].toUpperCase() + kind.slice(1)}${kind === 'pour' ? ' →' : ''}</button>`).join('')}</div></div>`).join('')}</div>`;
          $$('[data-jug]').forEach(
            (t) => (t.onclick = () => playMove({ i: +t.dataset.jug, kind: t.dataset.kind })),
          );
        } else if (s.id === 'queens' || s.id === 'knight') {
          let n = s.id === 'queens' ? 8 : 5;
          b.innerHTML = `<div class="boardgrid chess" style="grid-template-columns:repeat(${n},1fr)">${Array.from(
            { length: n * n },
            (_, k) => {
              let x = k % n,
                y = Math.floor(k / n),
                cls = (x + y) % 2 ? 'dark' : '',
                text = '',
                label = `Row ${y + 1}, column ${x + 1}`;
              if (s.id === 'queens') {
                let selected = s.q.includes(k),
                  attack = s.q.some(
                    (p) =>
                      p % 8 === x ||
                      Math.floor(p / 8) === y ||
                      Math.abs((p % 8) - x) === Math.abs(Math.floor(p / 8) - y),
                  );
                cls += ' ' + (selected ? 'queen' : attack ? 'attacked' : '');
                text = selected ? '♛' : '';
                label += selected ? ', queen' : attack ? ', attacked' : '';
              } else {
                let at = s.path.indexOf(k),
                  last = s.path.at(-1),
                  legal =
                    last === undefined ||
                    Math.abs((k % 5) - (last % 5)) *
                      Math.abs(Math.floor(k / 5) - Math.floor(last / 5)) ===
                      2;
                if (at >= 0) {
                  cls += ' visited';
                  text = at + 1;
                } else if (legal) cls += ' legal';
                label += at >= 0 ? ', visit ' + (at + 1) : legal ? ', legal move' : '';
              }
              return `<button data-cell="${k}" class="${cls}" aria-label="${label}">${text}</button>`;
            },
          ).join('')}</div>`;
          $$('[data-cell]').forEach((t) => (t.onclick = () => playMove({ cell: +t.dataset.cell })));
        } else if (s.id === 'magic') {
          b.innerHTML = `<div class="boardgrid" style="grid-template-columns:repeat(3,1fr);max-width:350px">${s.values.map((n, i) => `<button data-magic="${i}" class="${A.classicSelected === i ? 'picked' : ''}" style="font-size:40px;background:#e2ca91">${n}</button>`).join('')}</div>`;
          $$('[data-magic]').forEach(
            (t) =>
              (t.onclick = () => {
                let k = +t.dataset.magic;
                if (A.classicSelected === null) {
                  A.classicSelected = k;
                  drawClassic();
                } else if (k === A.classicSelected) {
                  A.classicSelected = null;
                  drawClassic();
                } else playMove({ from: A.classicSelected, to: k });
              }),
          );
        } else if (s.id.startsWith('slide-')) {
          const key = s.id.slice(6),
            url = A.artURLs[key] || A.artURLs.town;
          b.innerHTML = `<div style="width:100%;max-width:440px"><div class="museum-solve" style="grid-template-columns:repeat(3,1fr)">${s.tiles.map((n, k) => `<button data-slide="${k}" class="${n ? '' : 'blank'}" style="${n ? `background-image:url('${url}');background-position:${((n - 1) % 3) * 50}% ${Math.floor((n - 1) / 3) * 50}%;` : ''}" aria-label="${n ? 'Slide tile ' + n : 'Empty space'}">${n ? `<span style="float:left;margin:5px;padding:3px 6px;border-radius:5px;font-size:10px;background:#fffbedb8">${n}</span>` : ''}</button>`).join('')}</div>${key !== 'town' && !A.artURLs[key] ? '<p class="micro notice">Museum image is not loaded here. The original Alibi town is shown instead. Open the art record and load its image first.</p>' : ''}</div>`;
          $$('[data-slide]').forEach(
            (t) => (t.onclick = () => playMove({ cell: +t.dataset.slide })),
          );
        }
      }
      function classicHint() {
        const s = getClassic().state;
        if (s.family === 'pour') {
          const answer = G.QWCalm.solve(s),
            next = answer.actions?.[0];
          modal(
            'A pour to consider',
            `<p>${next ? `Try pouring glass ${next.from + 1} into glass ${next.to + 1}. This starts a legal route from your current arrangement.` : answer.limited ? 'This arrangement needs more searching than the hint budget allows. Try undoing a few moves to recover an empty glass.' : answer.actions ? 'Every colour is already home.' : 'No route remains from this arrangement. Undo a pour to make space again.'}</p><p class="micro subtle">A bounded search checks legal pours from this board. It does not apply the move for you.</p>`,
          );
          return;
        }
        if (s.family === 'pairs') {
          modal(
            'Notice one small detail',
            '<p>Try remembering a picture together with its row and column. Turn a card you have not seen, then look for its partner. A mismatch stays visible until your next choice, so there is time to study it.</p><p class="micro subtle">This note does not inspect the hidden pictures.</p>',
          );
          return;
        }
        let msg;
        if (s.id.startsWith('hanoi'))
          msg =
            'Move the top ' +
            (s.n - 1) +
            ' discs to the resting peg so that the largest disc can travel to its destination. Solve the smaller tower first; the same idea repeats inside it.';
        else if (s.id === 'river') {
          if (s.moves === 0)
            msg =
              'The goat is involved in both unsafe pairs. Taking it first leaves the wolf safely with the cabbage.';
          else
            msg =
              'The boat may return with a passenger. Bringing someone back is sometimes the only safe progress.';
        } else if (s.id === 'jugs')
          msg =
            'Try filling the five-litre jug, then use the three-litre jug to remove three. Keep the two litres rather than throwing them away.';
        else if (s.id === 'queens')
          msg =
            'Try exactly one queen in each row. The challenge is choosing columns so that the two diagonal directions remain clear.';
        else if (s.id === 'magic')
          msg =
            'The centre must be five. Opposite cells through the centre add to ten. The corners are even numbers.';
        else if (s.id === 'knight')
          msg =
            'A square with only one onward move is easy to strand. Inspect the least-connected remaining squares before leaving this part of the board.';
        else
          msg =
            'Restore the upper row first, then work around the empty space in a small loop. The numbers show each tile’s final position.';
        modal(
          'A nudge, not a reveal',
          `<p>${msg}</p><p class="micro subtle">This is a hand-authored strategy note. It is not a board-specific solvability guarantee.</p>`,
        );
      }
      const ARTS = {
        wave: {
          title: 'The Great Wave',
          artist: 'Katsushika Hokusai',
          date: 'ca. 1830–32',
          museum: 'The Metropolitan Museum of Art',
          record: 'https://www.metmuseum.org/art/collection/search/45434',
          api: 'https://collectionapi.metmuseum.org/public/collection/v1/objects/45434',
          image:
            'https://collectionapi.metmuseum.org/api/collection/v1/iiif/45434/134438/main-image',
          rights: 'Public Domain, Met Open Access',
          note: 'An indigo-and-paper palette for a harbour. An actual museum reproduction, not a style imitation.',
        },
        portrait: {
          title: 'Self-Portrait',
          artist: 'Vincent van Gogh',
          date: '1887',
          museum: 'Art Institute of Chicago',
          record: 'https://www.artic.edu/artworks/80607/self-portrait',
          api: 'https://api.artic.edu/api/v1/artworks/80607',
          aic: 80607,
          rights: 'Verify is_public_domain in the AIC API before download',
          note: 'A portrait for the club’s art room, with the artist credited as artist rather than a fictional witness.',
        },
        bedroom: {
          title: 'The Bedroom',
          artist: 'Vincent van Gogh',
          date: '1889',
          museum: 'Art Institute of Chicago',
          record: 'https://www.artic.edu/artworks/28560/the-bedroom',
          api: 'https://api.artic.edu/api/v1/artworks/28560',
          aic: 28560,
          rights: 'Verify is_public_domain in the AIC API before download',
          note: 'A useful reference for intimate, slightly askew rooms and warm-coloured objects.',
        },
        sunday: {
          title: 'A Sunday on La Grande Jatte — 1884',
          artist: 'Georges Seurat',
          date: '1884–86',
          museum: 'Art Institute of Chicago',
          record: 'https://www.artic.edu/artworks/27992/a-sunday-on-la-grande-jatte-1884',
          api: 'https://api.artic.edu/api/v1/artworks/27992',
          aic: 27992,
          rights: 'Verify is_public_domain in the AIC API before download',
          note: 'A public-domain candidate for the slow-looking room and a pointillist palette study.',
        },
      };
      G.QW_ARTS = ARTS;
      function galleryPage() {
        $('#main').innerHTML =
          header(
            '05 / THE ART ROOM',
            'The art room.',
            'Museum sources, named artists, clear provenance. Included images work offline. Each work links to its museum record.',
          ) +
          `<div class="notice"><strong>The game works without these downloads.</strong> Available museum images are included with this activity for offline play. Unavailable images are marked below.</div><div class="card-grid">${Object.entries(
            ARTS,
          )
            .map(
              ([id, a]) =>
                `<article class="artcard"><div class="art-frame" id="frame-${id}">${A.artURLs[id] ? `<img src="${A.artURLs[id]}" alt="${esc(a.title)} by ${esc(a.artist)}">` : `<div class="art-placeholder">${id === 'portrait' ? 'The portrait room' : id === 'wave' ? 'Indigo &amp; paper' : id === 'bedroom' ? 'A room to think' : 'An afternoon, unhurried'}<small style="display:block;font:10px system-ui;margin-top:10px">Museum image not downloaded</small></div>`}</div><span class="eyebrow">${esc(a.artist)}</span><h3>${esc(a.title)}</h3><p>${a.note}</p><div class="art-credit">${a.date} · ${a.museum}<br>${a.rights}</div><div class="row" style="margin-top:16px"><button data-load-art="${id}" class="soft">${A.artURLs[id] ? 'Included offline' : 'Image unavailable'}</button><button data-art-record="${id}">Record ↗</button><button data-art-play="${id}">Tile puzzle →</button></div></article>`,
            )
            .join(
              '',
            )}</div><section class="panel" style="margin-top:24px"><div class="eyebrow">OPEN ASSET WORKBENCH</div><h2 style="margin-top:9px">A supply cupboard, not a dependency.</h2><p class="micro">The town combines Kenney CC0 castle and fantasy building models with original landscape pieces. Houses assemble from separate walls, windows, doors and roofs. The small court keeper uses a Kenney CC0 sprite.</p><a href="${esc(context.sources || './quiet-wing-sources.html')}" target="_blank" rel="noopener">Open the source, licence and download ledger →</a></section>`;
        $$('[data-load-art]').forEach((b) => (b.onclick = () => loadArt(b.dataset.loadArt, b)));
        $$('[data-art-record]').forEach(
          (b) =>
            (b.onclick = () => {
              let id = b.dataset.artRecord;
              if (!A.state.stats.artSeen.includes(id)) A.state.stats.artSeen.push(id);
              save();
              G.open(ARTS[id].record, '_blank', 'noopener,noreferrer');
            }),
        );
        $$('[data-art-play]').forEach(
          (b) =>
            (b.onclick = () => {
              let id = b.dataset.artPlay;
              if (!A.artURLs[id]) {
                toast(
                  'Load the museum image first. The local town puzzle is available offline in Classics.',
                );
                return;
              }
              navigate('classics/slide-' + id);
            }),
        );
      }
      async function loadArt(id) {
        toast(
          A.artURLs[id]
            ? 'This image is included for offline play.'
            : 'This museum image is not included in this release. The local town puzzle is available.',
        );
      }
      function badgeSVG(id, earned = false) {
        const stamp = G.AlibiAssets?.badge(id, earned);
        if (stamp) return stamp;
        const types = {
          'first-stone': 'stone',
          hamlet: 'cottage',
          borough: 'townhouse',
          castle: 'keep',
          gardener: 'tree',
          architect: 'timber',
          wanderer: 'pine',
          seed: 'farm',
          pressed: 'flowers',
          herbarium: 'orchard',
          hanoi: 'tower',
          ferryman: 'boat',
          measure: 'well',
          queens: 'keep',
          'lo-shu': 'library',
          knight: 'inn',
          scholar: 'library',
        };
        let ic = ['hello', 'menagerie', 'kindred'].includes(id)
          ? 'pets'
          : id === 'new-angle'
            ? 'rotate'
            : id === 'maker'
              ? 'realm'
              : 'gallery';
        const body = types[id]
          ? R.thumbnail(
              types[id],
              id === 'castle' || id === 'queens' ? 'lavender' : 'terracotta',
            ).replace(
              'viewBox="0 0 120 110"',
              'x="23" y="15" width="54" height="55" viewBox="0 0 120 110"',
            )
          : `<g transform="translate(29 23) scale(1.75)" fill="none" stroke="${earned ? '#586b52' : '#aab4a4'}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[ic]}"/></g>`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="${esc(id)} stamp"><path d="M32 66 27 97 49 84 72 97 67 66" fill="${earned ? '#9baf91' : '#d9dbcf'}"/><circle cx="50" cy="44" r="37" fill="${earned ? '#e2c88b' : '#e6e6da'}" stroke="${earned ? '#ad8f53' : '#bbc4b5'}" stroke-width="2"/><circle cx="50" cy="44" r="29" fill="none" stroke="${earned ? '#ac8d55' : '#b7c1b1'}" stroke-dasharray="2 3"/><g opacity="${earned ? 1 : 0.38}">${body}</g></svg>`;
      }

      function journalPage() {
        const count = Object.keys(A.state.badges).length;
        $('#main').innerHTML =
          header(
            '06 / YOUR FIELD JOURNAL',
            'Small things, remembered.',
            `${count} of ${E.BADGES.length} stamps. Local achievements, no public rankings and no streak to maintain.`,
            `<button id="journal-export" class="soft">Export backup</button>`,
          ) +
          `<div class="badge-grid">${E.BADGES.map(([id, name, text]) => `<article class="badge ${A.state.badges[id] ? 'earned' : ''}">${badgeSVG(id, !!A.state.badges[id])}<h3>${name}</h3><p>${text}</p><span class="date">${A.state.badges[id] ? 'Collected ' + new Date(A.state.badges[id]).toLocaleDateString() : 'Not yet collected'}</span></article>`).join('')}</div><div class="artifact-footer"><span>These stamps are for your own journal. Backups can be edited; no competitive integrity is claimed.</span><button class="textbtn" id="journal-zen" style="font-size:10px">I prefer no badges</button></div>`;
        $('#journal-export').onclick = () => exportBackup();
        $('#journal-zen').onclick = () => {
          A.state.settings.zen = true;
          save();
          navigate('realm');
        };
      }
      function download(blob, name) {
        const url = URL.createObjectURL(blob),
          a = document.createElement('a');
        downloads.add(url);
        a.href = url;
        a.download = name;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          downloads.delete(url);
        }, 30000);
      }
      function textFile(text, name, type = 'text/plain') {
        download(new Blob([text], { type }), name);
      }
      // Small uncompressed ZIP writer for OBJ + MTL. Browser-native, deterministic, no package.
      function zipFiles(files) {
        let crcTable = Array.from({ length: 256 }, (_, n) => {
          for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
          return n >>> 0;
        });
        const encoder = new TextEncoder(),
          parts = [],
          central = [];
        let offset = 0;
        const crc = (data) => {
          let c = 0xffffffff;
          for (let b of data) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
          return (c ^ 0xffffffff) >>> 0;
        };
        const block = (size) => {
          let b = new Uint8Array(size);
          return { b, v: new DataView(b.buffer) };
        };
        for (let [name, content] of Object.entries(files)) {
          let n = encoder.encode(name),
            d = encoder.encode(content),
            c = crc(d),
            h = block(30);
          h.v.setUint32(0, 0x04034b50, true);
          h.v.setUint16(4, 20, true);
          h.v.setUint32(14, c, true);
          h.v.setUint32(18, d.length, true);
          h.v.setUint32(22, d.length, true);
          h.v.setUint16(26, n.length, true);
          parts.push(h.b, n, d);
          let z = block(46);
          z.v.setUint32(0, 0x02014b50, true);
          z.v.setUint16(4, 20, true);
          z.v.setUint16(6, 20, true);
          z.v.setUint32(16, c, true);
          z.v.setUint32(20, d.length, true);
          z.v.setUint32(24, d.length, true);
          z.v.setUint16(28, n.length, true);
          z.v.setUint32(42, offset, true);
          central.push(z.b, n);
          offset += 30 + n.length + d.length;
        }
        let count = Object.keys(files).length,
          len = central.reduce((n, b) => n + b.length, 0),
          end = block(22);
        end.v.setUint32(0, 0x06054b50, true);
        end.v.setUint16(8, count, true);
        end.v.setUint16(10, count, true);
        end.v.setUint32(12, len, true);
        end.v.setUint32(16, offset, true);
        return new Blob([...parts, ...central, end.b], { type: 'application/zip' });
      }
      A.zipFiles = zipFiles;
      function exportDialog() {
        const d = modal(
          'A little realm, to keep',
          `<p>These exports use your actual scene. There is no server or watermark service.</p><div class="export-grid"><button data-export="png"><strong>Postcard · PNG</strong><small>A raster image of this view.</small></button><button data-export="svg"><strong>Illustration · SVG</strong><small>Editable vector polygons.</small></button><button data-export="json"><strong>Realm · JSON</strong><small>Reopen and keep building later.</small></button><button data-export="obj"><strong>3D model · OBJ + MTL</strong><small>A ZIP for Blender and other editors.</small></button></div><p class="micro subtle">OBJ stores geometry and colours, not companion animation, camera pan, sound or a simulation. PNG uses the current viewport resolution. SVG includes visible geometry, not hidden surfaces.</p>`,
        );
        $$('[data-export]', d).forEach(
          (b) =>
            (b.onclick = () => {
              const kind = b.dataset.export,
                r = A.renderer,
                name = A.state.scene.name.replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'realm';
              if (kind === 'json')
                textFile(
                  JSON.stringify(A.state.scene, null, 2),
                  name + '.realm.json',
                  'application/json',
                );
              if (kind === 'svg') textFile(r.svg(), name + '.svg', 'image/svg+xml');
              if (kind === 'png') {
                r.paint(-1);
                r.canvas.toBlob((blob) => {
                  if (blob) download(blob, name + '.png');
                  else toast('Image export failed. Try SVG.');
                });
              }
              if (kind === 'obj') {
                const out = r.obj();
                download(
                  zipFiles({
                    'realm.obj': out.obj,
                    'realm.mtl': out.mtl,
                    'README.txt':
                      'Alibi Quiet Wing. Z-up; one unit per plot. Import realm.obj with realm.mtl next to it. Geometry and colours only.\n',
                  }),
                  name + '-3d.zip',
                );
                A.state.stats.objExports = (A.state.stats.objExports || 0) + 1;
              }
              A.state.stats.exports++;
              save();
              feedback('win');
              d.close();
            }),
        );
      }
      function exportBackup() {
        textFile(
          JSON.stringify(
            {
              kind: 'alibi-quiet-wing-backup',
              schema: 1,
              exportedAt: new Date().toISOString(),
              state: A.state,
            },
            null,
            2,
          ),
          'alibi-quiet-wing-backup.json',
          'application/json',
        );
        toast('Quiet Wing backup exported. All saves are available from Settings & saves.');
      }
      function settings() {
        const s = A.state.settings;
        const d = modal(
          'Make yourself comfortable',
          `${[
            [
              'sound',
              'Gentle sound',
              'Small generated tones after a deliberate action. No autoplay music.',
            ],
            ['haptic', 'Haptic taps', 'Best-effort vibration on supported devices.'],
            ['motion', 'Companion motion', 'Also respects the system’s reduced-motion setting.'],
            ['zen', 'Zen mode', 'Remove the surrounding product while keeping activity controls.'],
          ]
            .map(
              ([id, name, note]) =>
                `<label class="setting"><span><strong>${name}</strong><p>${note}</p></span><input type="checkbox" data-setting="${id}" ${s[id] ? 'checked' : ''}></label>`,
            )
            .join(
              '',
            )}<h3 style="margin-top:24px">Keep your place</h3><p>Quiet Wing offline files: ${G.AlibiActivities.diagnostics().offline ? 'Ready' : 'Not ready. Visit online, then reopen this panel.'}</p><p class="micro">This wing has its own save namespace. It does not migrate or change the original Puzzle Cabinet or Club databases.</p><div class="row"><button id="backup-export" class="primary">Export wing backup</button><button id="raw-export">Export raw recovery</button><button id="recovery-export">Export previous save</button><a href="#/settings">All Alibi saves</a><button id="backup-import">Import backup or realm</button><button id="persistent-storage">Request durable storage</button></div><p class="micro subtle" id="storage-detail">${S.info().mode === 'indexeddb' ? 'IndexedDB with revision checks and bounded waits.' : S.info().mode === 'local' ? 'Browser localStorage fallback. Use one tab at a time.' : 'Session only. Export before leaving.'} Browser data can still be cleared. Export before changing domain, browser or device.</p><div class="row"><a href="#/home">← Back to Alibi</a><span class="spacer"></span><a href="${esc(context.sources || './quiet-wing-sources.html')}" target="_blank" rel="noopener">Sources &amp; licences</a></div>`,
        );
        $$('[data-setting]', d).forEach(
          (i) =>
            (i.onchange = () => {
              A.state.settings[i.dataset.setting] = i.checked;
              styles();
              save();
              setTimeout(() => A.renderer?.resize(), 20);
              if (i.dataset.setting === 'sound') feedback();
            }),
        );
        $('#backup-export').onclick = exportBackup;
        $('#raw-export').onclick = async () => {
          try {
            textFile(
              JSON.stringify(await S.raw()),
              'alibi-quiet-wing-raw.json',
              'application/json',
            );
          } catch (e) {
            toast(e.message);
          }
        };
        $('#recovery-export').onclick = async () => {
          try {
            const r = await S.recovery();
            if (!r?.state) throw Error('No previous restore copy is available.');
            textFile(
              JSON.stringify({ kind: 'alibi-quiet-wing-backup', schema: 1, state: r.state }),
              'alibi-quiet-wing-recovery.json',
              'application/json',
            );
          } catch (e) {
            toast(e.message);
          }
        };
        $('#backup-import').onclick = () => {
          $('#file').value = '';
          $('#file').click();
        };
        $('#persistent-storage').onclick = async () => {
          let ok = false;
          try {
            ok = await navigator.storage?.persist?.();
          } catch {}
          $('#storage-detail').textContent = ok
            ? 'The browser granted persistence. This is not a cloud backup.'
            : 'Persistence was unavailable or not granted. Keep exporting backups.';
        };
      }
      async function reviewImport(f) {
        if (!f) return;
        if (f.size > 2_000_000) {
          toast('The import limit is 2 MB. Your current save has not changed.');
          return;
        }
        try {
          const { isRealm, next } = await G.AlibiValidateImport({
            type: 'quiet-import',
            text: await f.text(),
          });
          const d = modal(
            'Review import',
            `<p>${isRealm ? 'Replace the current realm with' : 'Restore the entire Quiet Wing from'} <strong>${esc(isRealm ? next.name : next.scene.name)}</strong>?</p><p class="micro">An internal recovery copy is kept before a wing restore. A downloadable backup is still the safer copy. Existing Alibi puzzle and Club databases are untouched.</p><div class="row"><button id="before-import">Export current backup</button><button id="confirm-import" class="primary">${isRealm ? 'Replace realm' : 'Restore wing'}</button></div>`,
          );
          $('#before-import').onclick = exportBackup;
          $('#confirm-import').onclick = async () => {
            try {
              await flush();
              if (S.info().mode !== 'indexeddb')
                throw Error('Restore requires IndexedDB. Export this session first.');
              if (isRealm) {
                A.history.push({ whole: true, before: E.clone(A.state.scene), after: next });
                A.future = [];
                const restored = { ...A.state, scene: next };
                await S.replace(restored);
                A.state = restored;
              } else {
                await S.replace(next);
                A.state = next;
                A.history = [];
                A.future = [];
              }
              d.close();
              go();
              toast('Import complete.');
            } catch (err) {
              toast(err.message);
            }
          };
        } catch (e) {
          toast('Import rejected: ' + e.message);
        }
      }
      $('#file').onchange = (e) => reviewImport(e.target.files[0]);
      root.addEventListener(
        'keydown',
        (e) => {
          if (e.key === 'Escape' && !$('#modal').open && A.state?.settings.zen) {
            A.state.settings.zen = false;
            styles();
            save();
            A.renderer?.resize();
          }
          if (
            A.route === 'realm' &&
            !['INPUT', 'TEXTAREA', 'SELECT'].includes(root.activeElement?.tagName) &&
            (e.ctrlKey || e.metaKey) &&
            (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')
          ) {
            e.preventDefault();
            realmUndo(e.key.toLowerCase() === 'y' || e.shiftKey);
          }
        },
        { signal: listeners.signal },
      );

      document.addEventListener(
        'visibilitychange',
        () => {
          body.classList.toggle('hidden-tab', document.hidden);
          if (document.hidden) {
            clearInterval(A.gardenTimer);
            A.gardenTimer = null;
            clearTimeout(A.petTimer);
            A.petTimer = null;
            flush().catch(() => {});
            audio?.suspend().catch(() => {});
          } else if (A.route === 'pets' || A.route === 'garden') go();
        },
        { signal: listeners.signal },
      );
      G.addEventListener(
        'pagehide',
        () => {
          flush().catch(() => {});
          soundscape.stop();
          audio?.suspend();
        },
        { signal: listeners.signal },
      );
      async function init() {
        let result = G.QWRetainedState ? { saved: null, ...S.info() } : await S.open();
        A.state = G.QWRetainedState || result.saved || E.newState(Date.now());
        if (!A.state.stats.views.includes(A.state.scene.camera.view))
          A.state.stats.views.push(A.state.scene.camera.view);
        if (G.matchMedia('(prefers-reduced-motion: reduce)').matches)
          A.state.settings.motion = false;
        A.dirty = G.QWRetainedDirty || false;
        go();
        if (result.blocked)
          toast(
            'An unreadable save was preserved. This session is read-only; export before recovery.',
          );
        if (location.protocol === 'file:')
          toast('Local-file preview. Use HTTPS for reliable saving and installation.');
      }

      A.flush = flush;
      A.toast = toast;
      A.exportBackup = exportBackup;
      A.drawClassic = drawClassic;
      A.playMove = playMove;
      A.applyAt = applyAt;
      A.badgeSVG = badgeSVG;
      A.flowerSVG = flowerSVG;
      const handle = {
        route: () => {
          go();
          if (G.QWPendingImport) {
            const f = G.QWPendingImport;
            delete G.QWPendingImport;
            reviewImport(f);
          }
        },
        flush,
        state: () => A.state,
        dispose() {
          disposed = true;
          soundscape.dispose();
          G.QWRetainedState =
            A.dirty || S.info().mode === 'session' || S.info().blocked ? A.state : null;
          G.QWRetainedDirty = A.dirty;
          listeners.abort();
          for (const id of timers) G.clearTimeout(id);
          timers.clear();
          disposeActivity();
          clearTimeout(A.saveTimer);
          clearTimeout(A.toastTimer);
          audio?.close().catch(() => {});
          for (const url of downloads) URL.revokeObjectURL(url);
          S.status(() => {});
          root.innerHTML = '';
        },
      };
      try {
        await init();
        if (G.QWPendingImport) {
          const file = G.QWPendingImport;
          delete G.QWPendingImport;
          await reviewImport(file);
        }
        return handle;
      } catch (e) {
        handle.dispose();
        throw e;
      }
    },
  };
})(window);
