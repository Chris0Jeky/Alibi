/* The player's field notes: intentional media, never achievement or puzzle evidence. */
(function (G) {
  'use strict';
  const esc = (v) =>
    String(v).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  function mount(host) {
    const data = G.QWExperience;
    const events = new AbortController();
    let view,
      disposed = false,
      generation = 0;
    const tabs = [
      ['rooms', 'Little worlds'],
      ['models', 'Model cabinet'],
      ['portraits', 'Club portraits'],
      ['companions', 'Companion sketches'],
      ['audio', 'Listening room'],
      ['films', 'Screening room'],
    ];
    host.innerHTML = `<section class="folio-intro"><span class="eyebrow">07 / FIELD NOTES</span><h1>A world in the details.</h1><p>Little places to turn in your hands. Faces imagined in ink. A sound at the end of a page. Take your time.</p></section><nav class="folio-tabs" aria-label="Field notes">${tabs.map(([id, title]) => `<button data-folio-tab="${id}">${title}</button>`).join('')}</nav><div id="folio-content"></div><footer class="folio-footer"><p>Original Alibi artwork and sound. Retained architectural pieces by Kenney, CC0. <a href="${esc(G.ALIBI_QUIET_CONFIG.sources)}" target="_blank" rel="noopener">Full credits ↗</a></p><button id="folio-offline">Keep field notes offline · ${(data.bytes / 1024 / 1024).toFixed(1)} MB</button><span id="folio-download-status" role="status">Films stream only when played.</span></footer>`;
    const $ = (q) => host.querySelector(q);
    const content = $('#folio-content');
    function stopMedia() {
      view?.dispose();
      view = null;
      content.querySelectorAll('audio,video').forEach((m) => {
        m.pause();
        m.removeAttribute('src');
        m.load();
      });
    }
    function modelPanel(item) {
      view?.dispose();
      view = null;
      const stage = $('#folio-stage');
      stage.innerHTML = `<img src="${esc(item.image)}" alt="${esc(item.title)}" decoding="async">`;
      $('#folio-model-title').textContent = item.title;
      $('#folio-model-credit').textContent = item.credit;
      $('#folio-model-status').textContent = 'Illustrated view. Open 3D to turn this piece.';
      $('#folio-open-3d').onclick = () => {
        view?.dispose();
        $('#folio-model-status').textContent = 'Opening 3D…';
        view = new G.QWSceneView(stage, item.model, (text) => {
          if (!disposed && $('#folio-model-status')) $('#folio-model-status').textContent = text;
        });
      };
    }
    function models(items, rooms) {
      content.innerHTML = `<section class="folio-model-layout"><div class="folio-view"><div class="folio-stage" id="folio-stage"></div><div class="folio-view-caption"><div><h2 id="folio-model-title"></h2><small id="folio-model-credit"></small></div><button id="folio-open-3d">Open 3D</button></div><div class="folio-turn"><button data-turn="-1" aria-label="Turn model left">← Turn</button><button data-turn="1" aria-label="Turn model right">Turn →</button><button data-zoom="-0.1" aria-label="Zoom model out">−</button><button data-zoom="0.1" aria-label="Zoom model in">+</button></div><p id="folio-model-status" class="micro" role="status"></p></div><div class="folio-pieces">${rooms ? '<p>Three small worlds, composed from the same architectural vocabulary as your realm. Build your own <a href="#/quiet/realm">in the studio ↗</a>.</p>' : '<label>Find a piece <input id="folio-model-search" type="search" placeholder="Tower, tree, roof…"></label>'}<div class="folio-piece-grid">${items.map((a, i) => `<button data-piece="${i}" aria-pressed="${i === 0}"><img src="${esc(a.image)}" alt="" loading="lazy" width="120" height="90"><span>${esc(a.title)}</span></button>`).join('')}</div></div></section>`;
      modelPanel(items[0]);
      content.querySelectorAll('[data-piece]').forEach(
        (b) =>
          (b.onclick = () => {
            content
              .querySelectorAll('[data-piece]')
              .forEach((p) => p.setAttribute('aria-pressed', String(p === b)));
            modelPanel(items[+b.dataset.piece]);
          }),
      );
      content
        .querySelectorAll('[data-turn]')
        .forEach((b) => (b.onclick = () => view?.turn((+b.dataset.turn * Math.PI) / 6)));
      content
        .querySelectorAll('[data-zoom]')
        .forEach((b) => (b.onclick = () => view?.magnify(+b.dataset.zoom)));
      if ($('#folio-model-search'))
        $('#folio-model-search').oninput = (event) => {
          const query = event.target.value.toLowerCase();
          content
            .querySelectorAll('[data-piece]')
            .forEach(
              (b) => (b.hidden = !items[+b.dataset.piece].title.toLowerCase().includes(query)),
            );
        };
    }
    function companions() {
      content.innerHTML = `<p class="folio-lede">Four friends, drawn in paper and ink. These are expression studies; your companions and their names are waiting <a href="#/quiet/pets">next door ↗</a>.</p><div class="folio-companions">${data.companions
        .map(
          (a) =>
            `<article><img id="folio-pet-${a.id}" src="${a.states.idle}" alt="${esc(a.title)} · idle" width="300" height="300"><h2>${esc(a.title)}</h2><label>Expression<select data-expression="${a.id}">${Object.keys(
              a.states,
            )
              .map((s) => `<option value="${s}">${s}</option>`)
              .join('')}</select></label></article>`,
        )
        .join('')}</div>`;
      content.querySelectorAll('[data-expression]').forEach(
        (select) =>
          (select.onchange = () => {
            const pet = data.companions.find((a) => a.id === select.dataset.expression);
            const image = $('#folio-pet-' + pet.id);
            image.src = pet.states[select.value];
            image.alt = pet.title + ' · ' + select.value;
          }),
      );
    }
    function audio() {
      content.innerHTML = `<p class="folio-lede">Paper, wood and a distant tide. Press play to listen. Only one sound plays at a time; leaving this room stops it.</p><div class="folio-audio-grid">${data.audio.map((a) => `<article><span class="eyebrow">${a.loop ? 'A LITTLE ATMOSPHERE' : 'A SMALL GESTURE'}</span><h2>${esc(a.id.replace(/^(ui|pet|ambience)-/, '').replaceAll('-', ' '))}</h2><p>${esc(a.title)}</p><audio controls preload="none" src="${a.url}" aria-label="${esc(a.id)}"></audio></article>`).join('')}</div>`;
    }
    function films() {
      const groups = new Map();
      data.films.forEach((a) => {
        const id = a.id.replace(/-(landscape|portrait)$/, '');
        groups.set(id, [...(groups.get(id) || []), a]);
      });
      content.innerHTML = `<p class="folio-lede">Small films from Alibi. Soundless, unhurried, and yours to start.</p><div class="folio-film-grid">${[...groups].map(([id, cuts]) => `<article><video controls playsinline preload="none" poster="${cuts[0].image}" src="${cuts[0].url}" aria-label="${esc(cuts[0].title)}"></video><div><h2>${esc(cuts[0].title.replace(/ \(landscape\)$/, ''))}</h2><p>${cuts[0].duration} seconds · silent</p>${cuts.length > 1 ? `<label>Framing<select data-film="${id}">${cuts.map((a) => `<option value="${a.id}">${a.id.endsWith('portrait') ? 'Portrait' : 'Landscape'}</option>`).join('')}</select></label>` : ''}</div></article>`).join('')}</div>`;
      content.querySelectorAll('[data-film]').forEach(
        (select) =>
          (select.onchange = () => {
            const cut = data.films.find((a) => a.id === select.value),
              video = select.closest('article').querySelector('video');
            video.pause();
            video.src = cut.url;
            video.poster = cut.image;
            video.setAttribute('aria-label', cut.title);
            video.load();
          }),
      );
    }
    function portraits() {
      content.innerHTML = `<p class="folio-lede">An imagined club, open to every kind of curiosity. Original fictional portraits, independent of the people and evidence in your casebooks.</p><div class="folio-portraits">${data.editorial
        .filter((a) => !a.id.endsWith('-room'))
        .map(
          (a) =>
            `<figure><img src="${esc(a.image)}" alt="${esc(a.title)} — original fictional club portrait" loading="lazy" width="480" height="600"><figcaption><span class="eyebrow">THE ALIBI CLUB</span><h2>${esc(a.title)}</h2></figcaption></figure>`,
        )
        .join('')}</div>`;
    }
    function show(id) {
      generation++;
      stopMedia();
      host
        .querySelectorAll('[data-folio-tab]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.folioTab === id)));
      (
        ({
          rooms: () => models(data.scenes, true),
          models: () => models(data.modules, false),
          companions,
          audio,
          films,
          portraits,
        })[id] || portraits
      )();
    }
    host
      .querySelectorAll('[data-folio-tab]')
      .forEach((b) => (b.onclick = () => show(b.dataset.folioTab)));
    // Capturing play also handles native media controls, including keyboard playback.
    content.addEventListener(
      'play',
      (event) => {
        content.querySelectorAll('audio,video').forEach((m) => {
          if (m !== event.target) m.pause();
        });
        if (document.hidden) event.target.pause();
      },
      { capture: true, signal: events.signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) content.querySelectorAll('audio,video').forEach((m) => m.pause());
      },
      { signal: events.signal },
    );
    $('#folio-offline').onclick = async () => {
      const button = $('#folio-offline'),
        status = $('#folio-download-status');
      button.disabled = true;
      status.textContent = 'Keeping artwork, models and sounds…';
      const name = 'alibi-folio-' + data.build;
      try {
        if (!G.caches) throw Error('Cache unavailable');
        const cache = await caches.open(name);
        // Bounded batches avoid hundreds of concurrent decodes/downloads on a phone.
        for (let i = 0; i < data.files.length; i += 4) {
          if (disposed) throw Error('Cancelled');
          await Promise.all(
            data.files.slice(i, i + 4).map(async (url) => {
              if (!(await cache.match(url))) {
                const r = await fetch(url, {
                  signal: AbortSignal.any([events.signal, AbortSignal.timeout(15000)]),
                });
                if (!r.ok) throw Error('Download failed');
                await cache.put(url, r);
              }
            }),
          );
          status.textContent = `Keeping field notes · ${Math.min(i + 4, data.files.length)} / ${data.files.length}`;
        }
        // Retain one prior edition for still-open tabs, as the other app packs do.
        const keys = (await caches.keys()).filter((key) => key.startsWith('alibi-folio-'));
        const keep = new Set([name, ...keys.filter((key) => key !== name).slice(-1)]);
        await Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)));
        if (!disposed)
          status.textContent =
            'Artwork, models and sounds are ready offline. Films need a connection.';
      } catch {
        if (!disposed)
          status.textContent =
            'Download paused. Reconnect and retry to finish keeping field notes.';
      } finally {
        if (!disposed) button.disabled = false;
      }
    };
    show('rooms');
    return {
      dispose() {
        disposed = true;
        generation++;
        events.abort();
        stopMedia();
      },
    };
  }
  G.QWFolio = { mount };
})(globalThis);
