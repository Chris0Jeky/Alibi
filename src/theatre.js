/* A presentation-only stage: no game clocks, rules, saves or completion predicates live here. */
(function (G) {
  'use strict';
  const config = G.ALIBI_THEATRE || { scenes: [], audio: [], films: [] };
  const byId = new Map(config.scenes.map((s) => [s.id, s]));
  const escape = (s) =>
    String(s || '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const shapes = {
    beacon: 'M16 54 22 19h20l6 35M18 19 32 7l14 12M25 27h14v9H25M9 56h46M25 12V6m14 6V6',
    leaf: 'M32 57V27M32 40C9 43 6 19 10 9c20 1 23 14 22 31Zm0 4c0-23 11-32 22-31 4 15-5 31-22 31Z',
    train:
      'M16 45V14q16-10 32 0v31H16ZM22 18h20v14H22M22 39h2m16 0h2M22 45l-9 14m29-14 9 14M17 53h30',
    compass:
      'M32 5v8m0 38v8M5 32h8m38 0h8M51 32a19 19 0 1 1-38 0 19 19 0 0 1 38 0ZM24 40l5-13 11-3-5 13-11 3Z',
    book: 'M32 17Q16 8 7 14v36q13-7 25 1 12-8 25-1V14q-9-6-25 3Zm0 0v34M14 23l11 2m-11 7 11 2m14-9 11-2m-11 11 11-2',
    key: 'M29 22a11 11 0 1 1-22 0 11 11 0 0 1 22 0Zm-3 7 27 27m-9-9 7-7m-15-1 7-7',
    star: 'M32 4v56M8 18l48 28M8 46l48-28M24 9l8 8 8-8M24 55l8-8 8 8M8 28l11-3-3-11M56 36l-11 3 3 11M8 36l11 3-3 11M56 28l-11-3 3-11',
    harbour: 'M6 45h52l-9 12H15ZM32 45V8l20 28H32M4 62q7-6 14 0t14 0 14 0 14 0',
  };
  const emblem = (id) =>
    `<svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${shapes[id] || shapes.book}"/></svg>`;
  let choice = 'follow',
    movement = true,
    scene = config.scenes[0],
    route = { page: 'home' },
    sound = false;
  let context,
    localGain,
    oscillator,
    noise,
    recording,
    transferTimer,
    eventTimer,
    filmDialog,
    filmTimer,
    lastCue = -Infinity;
  try {
    choice = byId.has(localStorage.getItem('alibi-room'))
      ? localStorage.getItem('alibi-room')
      : 'follow';
    movement = localStorage.getItem('alibi-room-motion') !== 'off';
  } catch {}
  function reduced() {
    return (
      !movement ||
      document.documentElement.dataset.reduced === 'true' ||
      G.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.body.classList.contains('club-zen')
    );
  }
  function choose(r, puzzle) {
    if (byId.has(choice)) return byId.get(choice);
    const hero = document.querySelector('[data-theatre-story]')?.dataset.theatreStory;
    if (r.page === 'home' && byId.has(hero)) return byId.get(hero);
    const book = G.ALIBI_CASEBOOKS?.find((b) => b.id === (r.book || r.id));
    if (book && byId.has(book.artwork)) return byId.get(book.artwork);
    if (r.page === 'quiet')
      return config.scenes.find((s) => s.quiet.includes(r.id)) || byId.get('reading-room');
    if (r.page === 'lab' || r.id === 'borough') return byId.get('harbour');
    if (r.id === 'duel') return byId.get('glasshouse');
    if (r.id === 'archive') return byId.get('briar-house');
    return (
      config.scenes.find((s) => s.families.includes(puzzle?.type || r.id)) ||
      byId.get('reading-room')
    );
  }
  function source(s) {
    return (s.curation ? G.ALIBI_CURATION_MEDIA : G.ALIBI_MEDIA)?.[s.art] || '';
  }
  function layers(s) {
    return `<div class="theatre-weather weather-${s.motion}" aria-hidden="true"><span class="theatre-glow"></span>${Array.from({ length: 8 }, (_, i) => `<i style="--particle:${i}"></i>`).join('')}</div>`;
  }
  function credit(s) {
    const a = G.ALIBI_DELIVERY?.[s.detail];
    return a?.credit
      ? `<a data-adaptive-credit hidden href="${escape(a.source)}" target="_blank" rel="noopener noreferrer">${escape(a.credit)}</a>`
      : '';
  }
  function bar() {
    return `<aside class="theatre-rail" aria-label="Room atmosphere"><span class="theatre-rail-title">${emblem(scene?.motif)}<span>${escape(scene?.title || 'The club')}<small>AN IMAGINED PLACE · YOUR OWN PACE</small></span></span><div class="theatre-controls"><button type="button" data-theatre-sound aria-pressed="${sound}">Room sound ${sound ? 'on' : 'off'}</button><button type="button" data-theatre-motion aria-pressed="${movement}">${movement ? 'Still the room' : 'Let it breathe'}</button><button type="button" data-theatre-data aria-pressed="${G.AlibiDelivery?.mode() === 'local'}">${G.AlibiDelivery?.mode() === 'local' ? 'Painted edition' : 'Rich edition'}</button></div></aside>`;
  }
  function room(story) {
    const s = byId.get(choice) || byId.get(story) || scene || config.scenes[0];
    if (!s) return '';
    return `<section class="theatre-room" aria-label="The listening room"><div class="theatre-heading"><div><span class="eyebrow">A CLUB WITH MANY MOODS</span><h2>Stay for the atmosphere.</h2></div><span class="theatre-ticket">ART · SOUND · LITTLE WORLDS</span></div><div class="theatre-stage" data-theatre-stage="${s.id}"><img data-adaptive-image="${s.detail || ''}" src="${escape(source(s))}" alt="${escape(s.title)} · atmospheric artwork" width="1400" height="935" loading="lazy" decoding="async">${layers(s)}<div class="theatre-stage-copy">${emblem(s.motif)}<h3>${escape(s.title)}</h3><p>${escape(s.subtitle)}</p><button type="button" data-theatre-moment>Notice a little detail ↗</button></div>${credit(s)}${s.curation ? `<span class="theatre-local-credit">Utagawa Hiroshige · The Met · Public Domain</span>` : ''}</div><div class="theatre-scene-list" aria-label="Choose a room"><button type="button" data-theatre-scene="follow" aria-pressed="${choice === 'follow'}">Follow my visit</button>${config.scenes.map((s) => `<button type="button" data-theatre-scene="${s.id}" aria-pressed="${choice === s.id}">${emblem(s.motif)}${escape(s.title)}</button>`).join('')}</div><p class="theatre-note">Choose a room to carry its mood with you, or let each visit set the scene. Art and a locally composed soundscape work offline. Room sound starts only when you choose it.</p><details class="theatre-screenings"><summary>The screening room · ${config.films.length ? 'four short films' : 'hosted edition'}</summary><p>${config.films.length ? 'Original Alibi motion studies. Films stream on request;' : 'Short films are available in the hosted edition;'} you can still explore the rooms, games and local artwork without them.</p><div>${config.films.map((film, i) => `<button type="button" data-theatre-film="${film.id}"><span>0${i + 1} / SHORT FILM</span><strong>${escape(film.title.replace(/^Alibi [—–] /, ''))}</strong><small>${film.duration}s · Play film ↗</small></button>`).join('')}</div></details></section>`;
  }
  function stopSound() {
    clearTimeout(transferTimer);
    if (recording) {
      recording.pause();
      recording.removeAttribute('src');
      recording.load();
      recording = null;
    }
    try {
      oscillator?.stop();
      noise?.stop();
    } catch {}
    oscillator = noise = localGain = null;
    context?.close().catch(() => {});
    context = null;
  }
  async function startSound() {
    stopSound();
    if (!sound || reduced() || document.hidden || !scene) return;
    const AC = G.AudioContext || G.webkitAudioContext;
    if (!AC) {
      sound = false;
      refreshControls();
      return;
    }
    const ctx = (context = new AC());
    lastCue = -Infinity;
    try {
      await ctx.resume();
    } catch {
      sound = false;
      refreshControls();
      return;
    }
    if (context !== ctx || !sound || document.hidden) return;
    // An original, scene-specific local bed is immediately usable even without media downloads.
    localGain = ctx.createGain();
    localGain.gain.value = 0.08;
    localGain.connect(ctx.destination);
    oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = scene.notes[0] / 2;
    const tone = ctx.createGain();
    tone.gain.value = 0.16;
    oscillator.connect(tone).connect(localGain);
    oscillator.start();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate),
      samples = buffer.getChannelData(0);
    let seed = scene.notes[0],
      last = 0;
    for (let i = 0; i < samples.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      last = last * 0.96 + ((seed / 4294967296) * 2 - 1) * 0.04;
      samples[i] = last;
    }
    noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = ['rain', 'tide'].includes(scene.motion) ? 900 : 300;
    noise.connect(filter).connect(localGain);
    noise.start();
    const asset = config.audio.find((a) => a.id === scene.ambience);
    if (
      !asset ||
      G.ALIBI_CONFIG?.standalone ||
      G.navigator.onLine === false ||
      G.AlibiDelivery.mode() === 'local' ||
      G.navigator.connection?.saveData ||
      /^(slow-)?2g$/.test(G.navigator.connection?.effectiveType || '')
    )
      return;
    const audio = (recording = new Audio(asset.url));
    audio.loop = true;
    audio.volume = 0.18;
    audio.preload = 'none';
    const failed = () => {
      if (recording !== audio) return;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      recording = null;
      if (context === ctx && localGain) localGain.gain.setTargetAtTime(0.08, ctx.currentTime, 0.2);
    };
    audio.onplaying = () => {
      if (context === ctx && localGain) {
        clearTimeout(transferTimer);
        localGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
      }
    };
    audio.onerror = failed;
    audio.onwaiting = audio.onstalled = () => {
      clearTimeout(transferTimer);
      transferTimer = setTimeout(failed, 4000);
    };
    transferTimer = setTimeout(failed, 4000);
    audio.play().catch(failed);
  }
  function cue(kind) {
    if (!sound || !context || document.hidden) return;
    const ctx = context,
      now = ctx.currentTime;
    if (now - lastCue < 0.12) return;
    lastCue = now;
    const notes = kind === 'complete' ? scene.notes : [scene.notes[kind === 'place' ? 1 : 0]];
    notes.forEach((frequency, i) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain(),
        t = now + i * 0.13;
      o.frequency.value = frequency;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.5);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    });
  }
  function refreshControls() {
    document.querySelectorAll('[data-theatre-sound]').forEach((b) => {
      b.setAttribute('aria-pressed', String(sound));
      b.textContent = 'Room sound ' + (sound ? 'on' : 'off');
    });
    document.querySelectorAll('[data-theatre-motion]').forEach((b) => {
      b.setAttribute('aria-pressed', String(movement));
      b.textContent = movement ? 'Still the room' : 'Let it breathe';
    });
    document.querySelectorAll('[data-theatre-data]').forEach((b) => {
      const local = G.AlibiDelivery.mode() === 'local';
      b.setAttribute('aria-pressed', String(local));
      b.textContent = local ? 'Painted edition' : 'Rich edition';
    });
    document.body.dataset.theatreStill = String(reduced() || document.hidden);
    if (reduced() || document.hidden) {
      sound = false;
      stopSound();
      document.querySelectorAll('[data-theatre-sound]').forEach((b) => {
        b.textContent = 'Room sound off';
        b.setAttribute('aria-pressed', 'false');
      });
    }
  }
  function attach(r = route, puzzle) {
    route = r;
    const next = choose(r, puzzle),
      changed = next?.id !== scene?.id;
    scene = next || scene;
    document.body.dataset.theatreScene = scene?.id || 'reading-room';
    document.querySelectorAll('.club-hero').forEach((hero) => {
      if (!hero.querySelector('.theatre-weather') && scene)
        hero.insertAdjacentHTML('beforeend', layers(scene));
    });
    const title = document.querySelector('.theatre-rail-title');
    if (title)
      title.innerHTML = `${emblem(scene?.motif)}<span>${escape(scene?.title)}<small>AN IMAGINED PLACE · YOUR OWN PACE</small></span>`;
    refreshControls();
    if (changed && sound) void startSound();
  }
  function moment(kind = 'notice') {
    const stage = document.querySelector('.theatre-stage') || document.querySelector('.club-hero');
    if (stage && !reduced()) {
      stage.classList.remove('theatre-event');
      void stage.offsetWidth;
      stage.classList.add('theatre-event');
      clearTimeout(eventTimer);
      eventTimer = setTimeout(() => stage.classList.remove('theatre-event'), 2400);
    }
    cue(kind === 'complete' ? 'complete' : 'place');
    if (kind === 'notice') {
      const target = document.querySelector('.theatre-stage-copy p');
      if (target)
        target.textContent = {
          rain: 'A sweep of light finds the rain, then slips back out to sea.',
          pollen: 'Something stirs among the leaves. The lamp keeps its quiet watch.',
          tracks: 'A distant window passes like a small, warm constellation.',
          tide: 'The water redraws the edge of the world, one ripple at a time.',
          dust: 'Paper, wood, lamplight. A room made of small things worth noticing.',
          snow: 'Another flake settles outside. Inside, the story stays warm.',
        }[scene.motion];
    }
  }
  function closeFilm() {
    clearTimeout(filmTimer);
    if (!filmDialog) return;
    const video = filmDialog.querySelector('video');
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    filmDialog.close();
    filmDialog.remove();
    filmDialog = null;
  }
  function film(id) {
    const item = config.films.find((a) => a.id === id);
    if (!item) return;
    sound = false;
    stopSound();
    refreshControls();
    closeFilm();
    const dialog = (filmDialog = document.createElement('dialog'));
    dialog.className = 'theatre-dialog';
    dialog.innerHTML = `<button type="button" class="btn secondary" data-close-film>Close film</button><h2>${escape(item.title)}</h2><video controls playsinline preload="none" poster="${escape(G.ALIBI_MEDIA?.['club-reading-room'])}" aria-label="${escape(item.title)}"></video><p role="status">${G.navigator.onLine === false ? 'This film needs a connection. Your rooms and games remain available offline.' : 'Loading this short film…'}</p><p>Original Alibi motion study · no spoken audio. Lamplight, geometric worlds and small moments of discovery. Explore the same worlds in the Quiet Wing.</p><a href="#/quiet/folio">Open the Field notes collection ↗</a>`;
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector('[data-close-film]').onclick = closeFilm;
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeFilm();
    });
    const video = dialog.querySelector('video'),
      status = dialog.querySelector('[role=status]');
    if (G.navigator.onLine !== false && !G.ALIBI_CONFIG?.standalone) {
      video.src = item.url;
      filmTimer = setTimeout(() => {
        if (filmDialog === dialog && video.readyState < 3) {
          video.pause();
          video.removeAttribute('src');
          video.load();
          status.textContent =
            'The film took too long to arrive. Close it and try again when your connection is ready.';
        }
      }, 8000);
      video.onplaying = () => {
        clearTimeout(filmTimer);
        status.textContent = 'Playing · ' + item.duration + ' seconds';
      };
      video.onerror = () => {
        clearTimeout(filmTimer);
        status.textContent =
          'The film is unavailable. The rooms and games are still yours to explore.';
      };
      video.play().catch((error) => {
        if (filmDialog !== dialog) return;
        status.textContent =
          error.name === 'NotAllowedError'
            ? 'Press play when you are ready.'
            : 'The film is unavailable. Your rooms and games remain available offline.';
      });
    }
  }
  document.addEventListener('click', (event) => {
    const b = event.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-theatre-sound')) {
      sound = !sound;
      refreshControls();
      if (sound) void startSound();
      else stopSound();
    }
    if (b.hasAttribute('data-theatre-motion')) {
      movement = !movement;
      try {
        localStorage.setItem('alibi-room-motion', movement ? 'on' : 'off');
      } catch {}
      refreshControls();
      if (sound) void startSound();
    }
    if (b.hasAttribute('data-theatre-data')) {
      G.AlibiDelivery.setMode(G.AlibiDelivery.mode() === 'local' ? 'auto' : 'local');
      refreshControls();
      if (sound) void startSound();
    }
    if (b.hasAttribute('data-theatre-scene')) {
      choice = byId.has(b.dataset.theatreScene) ? b.dataset.theatreScene : 'follow';
      try {
        localStorage.setItem('alibi-room', choice);
      } catch {}
      scene = choose(route);
      const old = document.querySelector('.theatre-room');
      if (old) {
        old.outerHTML = room();
        document.querySelector(`button[data-theatre-scene="${choice}"]`)?.focus();
      }
      attach();
      G.AlibiDelivery.observe();
      if (sound) void startSound();
    }
    if (b.hasAttribute('data-theatre-moment')) moment();
    if (b.hasAttribute('data-theatre-film')) film(b.dataset.theatreFilm);
    if (['value', 'mark', 'club-build', 'club-place', 'undo', 'redo'].includes(b.dataset.action))
      cue('place');
  });
  G.addEventListener('hashchange', () => {
    closeFilm();
    clearTimeout(eventTimer);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      sound = false;
      stopSound();
      filmDialog?.querySelector('video')?.pause();
    }
    refreshControls();
  });
  G.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', refreshControls);
  G.AlibiTheatre = {
    bar,
    room,
    attach,
    moment,
    choose,
    scenes: config.scenes,
    diagnostics: () => ({
      scene: scene?.id,
      choice,
      sound,
      localAudio: !!context,
      streamingAudio: !!recording,
      still: reduced(),
    }),
  };
})(globalThis);
