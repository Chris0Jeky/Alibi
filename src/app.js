/* Alibi's device-local application shell. Engines and storage have no UI dependencies. */
(async function () {
  'use strict';
  const C = globalThis.AlibiCore,
    X = C.extras,
    E = C.registry,
    U = globalThis.AlibiUI,
    M = U.data,
    icon = U.icon,
    art = U.art,
    cfg = globalThis.ALIBI_CONFIG,
    starter = globalThis.ALIBI_CATALOG,
    books = globalThis.ALIBI_CASEBOOKS;
  const $ = (s) => document.querySelector(s),
    esc = (v) =>
      String(v ?? '').replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
      ),
    range = C.range;
  const B = (label, action, ic = '', cls = '', attrs = '') =>
    `<button class="btn ${cls}" data-action="${action}" ${attrs}>${ic ? icon(ic) : ''}${label}</button>`;
  const round = (action, ic, label, attrs = '') =>
    `<button class="round" data-action="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${attrs}>${icon(ic)}</button>`;
  const tool = (label, action, ic = '', active = false, attrs = '') =>
    `<button class="tool ${active ? 'active' : ''}" data-action="${action}" ${active ? 'aria-pressed="true"' : ''} ${attrs}>${ic ? icon(ic) : ''}${label}</button>`;
  const store = await new AlibiStorage.Store().init();
  let settings = {
    theme: 'light',
    timer: false,
    sound: false,
    haptics: false,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    contrast: false,
    largeText: false,
    autoCross: true,
  };
  let prefs = { seen: [], favorites: [] },
    packs = [starter],
    records = new Map(),
    revs = new Map(),
    queue = Promise.resolve(),
    pendingSaves = 0,
    saveError = '',
    storageFatal = '',
    quarantined = 0,
    current = null,
    route = { page: 'home', id: '', book: '' },
    routeFocusSerial = 0,
    routeFocusRequests = new Map(),
    selectedCell = 0,
    bridgeAnchor = null,
    selectedPerson = null,
    sceneMarkMode = 'place',
    pencil = false,
    brush = 1,
    paused = false,
    checking = false,
    feedback = '',
    evidenceTab = 'clues',
    dossierTab = 0,
    trailValue = 1,
    zoomed = false,
    accuseChoice = null,
    sessionSeconds = 0,
    library = { venue: '', search: '', group: 'all', difficulty: 'all', status: 'all', limit: 24 },
    workTab = 'scene',
    draft = null,
    draftVerified = false,
    draftShowSolution = false,
    draftMode = 'room',
    draftPaint = 0,
    draftObject = 'plant',
    draftBusy = false,
    pendingBackup = null,
    installEvent = null,
    registration = null,
    offlineReady = false,
    waitingUpdate = false,
    updateRequested = false,
    toastTimer = null,
    lesson = null,
    hintAction = null,
    drag = null,
    lastPointerAt = 0,
    routeSerial = 0,
    rendering = false;
  let caseReturn = null,
    makerFields = {
      title: 'An unexpected guest',
      setting: 'A house after dark',
      story:
        'Five people stayed after dinner. Only four heard the clock strike midnight. Reconstruct their positions and find who shared the victim’s room.',
      names: 'Iris, Theo, Mina, Otto, Evelyn',
      seed: String(Math.floor(Math.random() * 99999) + 1),
    };
  function keyFor(p) {
    return p.id + '@' + p.revision;
  }
  function all() {
    return packs.flatMap((p) => p.puzzles);
  }
  function find(id) {
    return all().find((p) => p.id === id);
  }
  function rec(p) {
    return records.get(keyFor(p));
  }
  function solved(r) {
    return !!(r?.firstCompletedAt || r?.completedAt);
  }
  function activeRecords() {
    return [...records.values()]
      .filter((r) => r.moves > 0 && !r.completedAt)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const { validSettings, validateRun, validateBackup } = AlibiBackupValidation(C, starter);
  function isCurrentCompletion(run, puzzle) {
    try {
      const projected = globalThis.AlibiClub?.projected?.(puzzle, run.state)?.state || run.state;
      return !!E[puzzle.type].complete(puzzle, projected);
    } catch {
      return false;
    }
  }
  async function readCommittedRuns() {
    if (storageFatal || saveError || store.mode === 'session')
      throw Error('Saved progress is unavailable.');
    await enqueueSave();
    await queue;
    if (storageFatal || saveError || pendingSaves) throw Error('Saved progress is not settled.');
    return (await store.getAll('runs')).map((run) => C.clone(run));
  }
  function openPractice(puzzleId, roomId) {
    const binding = globalThis.AlibiCastlePractice?.roomFor?.(roomId);
    let puzzle = null;
    if (typeof puzzleId === 'string') {
      const [id, revision] = puzzleId.split('@');
      puzzle = starter.puzzles.find(
        (candidate) =>
          candidate.id === id && (!revision || candidate.revision === Number(revision)),
      );
    }
    if (!binding || !puzzle || puzzle.type !== binding.family) return false;
    caseReturn = {
      puzzleKey: keyFor(puzzle),
      roomId: binding.roomId,
      label: binding.label,
      target: binding.implemented
        ? `#/quiet/castle/room/${encodeURIComponent(binding.roomId)}`
        : '#/quiet/castle/directory',
    };
    navigate('play', keyFor(puzzle));
    return true;
  }
  const practice = globalThis.AlibiCastlePractice?.create?.({
    catalogue: starter,
    readRuns: readCommittedRuns,
    validateRun,
    isCurrentCompletion,
    onOpen: openPractice,
  });
  try {
    if (store.fatal) throw Error(store.problem);
    settings = { ...settings, ...validSettings(await store.get('meta', 'settings')) };
    const pr = await store.get('meta', 'preferences');
    if (pr) {
      if (Array.isArray(pr.seen)) prefs.seen = pr.seen.filter((t) => C.TYPES.includes(t));
      if (Array.isArray(pr.favorites))
        prefs.favorites = pr.favorites
          .filter((s) => typeof s === 'string' && s.length < 90)
          .slice(0, 3000);
    }
    for (const p of await store.getAll('packs'))
      try {
        const safe = C.validatePack(p, false);
        if (
          packs.some((x) => x.id === safe.id) ||
          safe.puzzles.some((p) => all().some((q) => q.id === p.id))
        )
          throw Error('Pack ID collision');
        packs.push(safe);
      } catch {
        quarantined++;
      }
    for (const r of await store.getAll('runs'))
      try {
        validateRun(r);
        records.set(r.key, r);
        revs.set(r.key, r.rev);
      } catch {
        quarantined++;
      }
    const d = await store.get('meta', 'workshop-draft');
    if (d) {
      try {
        draft = C.validateSceneDraft(d.puzzle);
        draftVerified = false;
      } catch {
        quarantined++;
      }
    }
  } catch (e) {
    storageFatal = e.message;
  }
  function theme() {
    const dark =
      settings.theme === 'night' ||
      (settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'night' : 'light';
    document.documentElement.dataset.reduced = settings.reducedMotion;
    document.documentElement.dataset.contrast = settings.contrast;
    document.documentElement.dataset.large = settings.largeText;
    globalThis.AlibiActivities?.setPreferences?.(settings);
  }
  theme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', theme);
  function toast(message, error = false) {
    clearTimeout(toastTimer);
    $('#toasts').innerHTML = `<div class="toast ${error ? 'error' : ''}">${esc(message)}</div>`;
    toastTimer = setTimeout(() => ($('#toasts').innerHTML = ''), 5500);
  }
  function closeDialog() {
    const d = $('#dialog');
    if (d.open) d.close();
    lesson = null;
  }
  function dialog(title, body, actions = [], cls = '') {
    const d = $('#dialog');
    d.className = cls;
    d.innerHTML = `<button class="dialog-close" data-action="close-dialog" aria-label="Close">${icon('close')}</button><h2 id="dialog-title">${esc(title)}</h2>${body}<div class="dialog-actions">${actions.map((a) => B(a.label, a.action, a.icon || '', `${a.secondary ? 'secondary' : ''} ${a.danger ? 'danger' : ''} ${a.solo ? 'solo' : ''}`, a.attrs || '')).join('')}</div>`;
    if (!d.open) d.showModal();
  }
  function navigate(page, id = '', book = '') {
    if (page === 'library' && !id)
      library = {
        venue: '',
        search: '',
        group: 'all',
        difficulty: 'all',
        status: 'all',
        limit: 24,
      };
    const h = `#/${page}${id ? '/' + encodeURIComponent(id) : ''}${book ? '?book=' + encodeURIComponent(book) : ''}`;
    const focusSerial = ++routeFocusSerial;
    if (location.hash === h) loadRoute(focusSerial);
    else {
      routeFocusRequests.set(h, focusSerial);
      location.hash = h;
    }
  }
  function requestLinkFocus(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    const link = e
      .composedPath()
      .find(
        (node) => node instanceof HTMLAnchorElement && node.getAttribute('href')?.startsWith('#/'),
      );
    if (!link || link.target || link.hasAttribute('download')) return;
    const hash = link.hash;
    if (!hash.startsWith('#/')) return;
    const focusSerial = ++routeFocusSerial;
    if (location.hash === hash) {
      e.preventDefault();
      loadRoute(focusSerial).catch((error) => toast(error.message, true));
    } else routeFocusRequests.set(hash, focusSerial);
  }
  function getRun(p) {
    const key = keyFor(p);
    if (records.has(key)) return records.get(key);
    const r = {
      schemaVersion: 1,
      key,
      rev: 0,
      puzzle: C.clone(p),
      state: E[p.type].initial(p),
      undo: [],
      redo: [],
      moves: 0,
      hints: 0,
      elapsed: 0,
      completedAt: null,
      firstCompletedAt: null,
      updatedAt: new Date().toISOString(),
      note: '',
    };
    records.set(key, r);
    revs.set(key, 0);
    return r;
  }
  function saveLabel() {
    return `<span id="save-state" class="save-state ${saveError ? 'error' : ''}">${icon(saveError ? 'flag' : store.mode === 'session' ? 'device' : 'check')}${esc(saveError ? 'Not saved' : pendingSaves ? 'Saving…' : store.mode === 'session' ? 'Session only' : 'Saved on this device')}</span>`;
  }
  function setSaveLabel() {
    const el = $('#save-state');
    if (el) el.outerHTML = saveLabel();
  }
  function enqueueSave() {
    if (!current || storageFatal || saveError) return queue;
    current.elapsed = sessionSeconds;
    const snapshot = C.clone(current);
    pendingSaves++;
    const el = $('#save-state');
    if (el) el.textContent = 'Saving…';
    queue = queue.then(async () => {
      try {
        if (saveError) return;
        const saved = await store.saveRun(snapshot, revs.get(snapshot.key) || 0);
        revs.set(snapshot.key, saved.rev);
        const local = records.get(snapshot.key);
        if (local) {
          local.rev = saved.rev;
          local.updatedAt = saved.updatedAt;
        }
        channel?.postMessage({ type: 'saved', key: snapshot.key, rev: saved.rev });
      } catch (e) {
        saveError = e.message;
        render();
        toast(e.message, true);
      } finally {
        pendingSaves--;
        setSaveLabel();
      }
    });
    return queue;
  }
  function savePreferences() {
    return store
      .put('meta', 'preferences', C.clone(prefs))
      .catch((e) => toast('Preferences could not be saved: ' + e.message, true));
  }
  const channel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('alibi-saves') : null;
  channel?.addEventListener('message', async (e) => {
    if (e.data?.type === 'restored') {
      saveError =
        'Progress was restored in another tab. Export this session or reload before playing.';
      render();
      return;
    }
    if (e.data?.type === 'saved') {
      if (e.data.key === current?.key && e.data.rev > (revs.get(current.key) || 0)) {
        saveError =
          'This puzzle changed in another tab. Export this session or reload its latest save.';
        render();
        return;
      }
      const r = await store.get('runs', e.data.key);
      if (r) {
        try {
          validateRun(r);
          records.set(r.key, r);
          revs.set(r.key, r.rev);
          if (!current) render();
        } catch {}
      }
    }
  });
  function difficulty(level, p) {
    p = p || current?.puzzle;
    const at = ['Gentle', 'Steady', 'Tricky'].indexOf(level);
    const curationDifficulty = globalThis.AlibiCuration?.difficulty,
      label =
        (typeof curationDifficulty === 'function' && curationDifficulty(p)) ||
        (p?.id?.startsWith('curated-') ? `${level} · provisional` : level);
    return `<span class="difficulty"><span class="bars" aria-hidden="true">${range(3)
      .map((i) => `<i class="${i <= at ? 'on' : ''}"></i>`)
      .join('')}</span>${esc(label)}</span>`;
  }
  function timing(p) {
    const curationTiming = globalThis.AlibiCuration?.timing,
      value = typeof curationTiming === 'function' ? curationTiming(p) : p?.minutes;
    return Number.isInteger(value) && value > 0 ? `${value} min` : '';
  }
  function puzzleMeta(p) {
    return [timing(p), p.type === 'witness' ? '' : `${p.size} × ${p.size}`]
      .filter(Boolean)
      .join(' · ');
  }
  function time(sec) {
    sec = Math.floor(sec);
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function progress(p, r) {
    if (!r) return 0;
    if (r.completedAt) return 100;
    const s = r.state,
      n = p.size,
      N = n * n;
    let v = 0;
    if (p.type === 'bridges')
      v =
        C.bridges.counts(C.bridges.graph(p), s.cells).filter((v, i) => v === p.islands[i].count)
          .length / p.islands.length;
    else if (p.type === 'scene') v = Object.keys(s.placements).length / n;
    else if (p.type === 'dossier')
      v = X.dossierAssignments(p, s).filter((v) => v >= 0).length / (2 * n);
    else if (p.type === 'witness')
      v = s.marks.filter((v) => v >= 0).length / (p.statements.length + 1);
    else if (p.type === 'nonogram')
      v =
        s.cells.filter((v) => v === 1).length /
        Math.max(
          1,
          p.rowClues.flat().reduce((a, b) => a + b, 0),
        );
    else if (p.type === 'tents') v = s.cells.filter((v) => v === 1).length / p.trees.length;
    else if (p.type === 'lightup')
      v = X.litCells(p, s).size / p.walls.filter((v) => v === -2).length;
    else if (p.type === 'aquarium')
      v =
        X.aquariumCells(p, s).reduce((a, b) => a + b, 0) /
        Math.max(
          1,
          p.rowTargets.reduce((a, b) => a + b, 0),
        );
    else if (p.type === 'network') v = X.networkInfo(p, s).connected.size / N;
    else v = s.cells.filter((v) => (p.type === 'binary' ? v >= 0 : v > 0)).length / N;
    return Math.max(0, Math.min(95, Math.round(v * 100)));
  }
  function navItem(label, ic, page, id = '', count = '') {
    const active =
      route.page === page &&
      (page === 'library'
        ? route.id === id
        : page === 'quiet'
          ? id
            ? route.id === id
            : route.id !== 'castle'
          : true);
    return `<button class="nav-item ${active ? 'active' : ''}" data-action="navigate" data-page="${page}" data-id="${id}" ${active ? 'aria-current="page"' : ''}>${icon(ic)}<span>${esc(label)}</span>${count !== '' ? `<span class="count">${count}</span>` : active ? '<span class="dot"></span>' : ''}</button>`;
  }
  function sidebar() {
    return `<aside class="sidebar"><button class="brand" data-action="navigate" data-page="home" aria-label="Alibi home"><span class="wordmark">alibi<i>:</i></span><small>A little room to think</small></button><nav aria-label="Main navigation">${navItem('Your desk', 'home', 'home')}${navItem('The puzzle collection', 'library', 'library', '', all().length)}${navItem('Mystery casebooks', 'book', 'casebooks', '', books.length)}${navItem('The games room', 'sun', 'salon', '', 'NEW')}${navItem('Club journal', 'heart', 'club')}${navItem('The quiet wing', 'garden', 'quiet')}${navItem('Wrenmere Castle', 'home', 'quiet', 'castle')}<div class="nav-section">Find your kind of puzzle</div><div class="nav-types">${['bridges', 'scene', 'dossier', 'witness', 'nonogram', 'lightup', 'tents', 'aquarium', 'network', 'trail', 'sudoku', 'binary', 'futoshiki'].map((t) => navItem(M[t].title, M[t].icon, 'library', t, all().filter((p) => p.type === t).length)).join('')}</div></nav><div class="sidebar-bottom">${navItem('Your journal', 'journal', 'journal')}${navItem('The workshop', 'workshop', 'workshop')}${navItem('Settings & saves', 'settings', 'settings')}<div class="sidebar-foot"><div class="row"><span class="dot"></span>${offlineReady ? 'Ready to play offline' : 'No account. No hurry.'}</div>Original puzzles. Yours to explore.</div></div></aside>`;
  }
  function mobileNav() {
    if (route.page === 'play' && current)
      return `<nav class="mobile-nav play-nav" aria-label="Puzzle tools"><button data-action="back-to-collection">${icon('back')}<span>Collection</span></button><button data-action="quick-panel" data-value="clues">${icon('dossier')}<span>${['scene', 'dossier'].includes(current.puzzle.type) ? 'Evidence' : 'Guide'}</span></button><button data-action="quick-panel" data-value="notes">${icon('pencil')}<span>My notes</span></button><button data-action="undo" ${current.undo.length ? '' : 'disabled'}>${icon('undo')}<span>Undo</span></button><button data-action="hint">${icon('lightup')}<span>Hint</span></button></nav>`;
    return `<nav class="mobile-nav" aria-label="Mobile navigation">${[
      ['home', 'home', 'Your desk'],
      ['library', 'library', 'Puzzles'],
      ['casebooks', 'book', 'Casebooks'],
      ['salon', 'sun', 'Games room'],
      ['settings', 'more', 'Your space'],
      ['quiet', 'home', 'Castle', 'castle'],
    ]
      .map(([p, ic, label, id = '']) => {
        const active = route.page === p && (!id || route.id === id);
        return `<button class="${active ? 'active' : ''}" data-action="navigate" data-page="${p}" data-id="${id}" ${active ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></button>`;
      })
      .join('')}</nav>`;
  }
  function footer() {
    return `<footer class="footer"><span>alibi: &nbsp; A little room to think.</span><span class="footer-links"><button data-action="navigate" data-page="changelog">What’s new</button><button data-action="navigate" data-page="privacy">Privacy & credits</button><button data-action="feedback-report">Report a puzzle issue</button><span>v${esc(cfg.version)}</span></span></footer>`;
  }
  function shell(content) {
    const label =
      route.page === 'play'
        ? M[current?.puzzle.type]?.title
        : {
            home: 'Your desk',
            library: route.id ? M[route.id]?.title : 'The puzzle collection',
            casebooks: books.find((b) => b.id === route.id)?.title || 'Mystery casebooks',
            journal: 'Your journal',
            workshop: 'The workshop',
            settings: 'Settings & saves',
            privacy: 'Privacy & credits',
            changelog: 'What’s new',
            salon: 'The games room',
            lab: 'The living atlas',
            club: 'Club journal',
          }[route.page] || 'Your desk';
    return `<div class="shell ${route.page === 'play' ? 'playing' : ''}">${sidebar()}<div class="main-wrap"><header class="topbar"><button class="mobile-brand" data-action="navigate" data-page="home" aria-label="Alibi home"><span class="wordmark">alibi<i>:</i></span></button><div class="breadcrumb">The puzzle club <span>/</span><strong>${esc(label)}</strong></div><div class="top-actions"><span class="device-status">${icon(offlineReady ? 'check' : 'device')}${offlineReady ? 'Offline ready' : store.mode === 'session' ? 'This session only' : 'On this device'}</span>${round('club-zen', 'moon', 'Toggle Zen mode')}${round('install', 'download', 'Install Alibi')}${round('navigate', 'settings', 'Settings', 'data-page="settings"')}</div></header>${waitingUpdate ? `<div class="banner"><span>A new version is ready. Save your place before switching.</span>${B('Save & update', 'apply-update', 'refresh', 'small')}</div>` : ''}${saveError || storageFatal ? `<div class="banner warn"><span>${esc(storageFatal || saveError)}</span><div class="row">${B('Export backup', 'export', 'download', 'small secondary')}${B('Reload', 'reload', 'refresh', 'small secondary')}</div></div>` : ''}${quarantined ? `<div class="banner warn"><span>${quarantined} stored record${quarantined === 1 ? ' needs' : 's need'} attention. They have not been deleted. Export your data before making changes.</span>${B('Export raw backup', 'export', 'download', 'small secondary')}</div>` : ''}${globalThis.AlibiTheatre.bar()}<main id="main" class="main" tabindex="-1">${content}${footer()}</main></div>${mobileNav()}</div>`;
  }
  function openAttrs(p, book = '') {
    return `data-id="${esc(keyFor(p))}" ${book ? `data-book="${esc(book)}"` : ''}`;
  }
  function puzzleCard(p) {
    const r = rec(p),
      inProgress = r && r.moves > 0 && !r.completedAt,
      fav = prefs.favorites.includes(p.id);
    const highlight =
      globalThis.ALIBI_MEDIA?.[globalThis.AlibiAssets.highlights[p.id]] ||
      globalThis.AlibiCuration.cover?.(p);
    return `<article class="puzzle-card"><button class="fav ${fav ? 'active' : ''}" data-action="favorite" data-id="${esc(p.id)}" aria-label="${fav ? 'Remove' : 'Add'} ${esc(p.title)} ${fav ? 'from' : 'to'} favorites" aria-pressed="${fav}">${icon('heart')}</button><button class="card-open" data-action="open" ${openAttrs(p)}><div class="card-art">${
      highlight
        ? `<img class="puzzle-highlight" src="${esc(highlight)}" width="320" height="240" alt="" loading="lazy" decoding="async">`
        : AlibiClub.portrait(
            p.type,
            [...p.id].reduce((n, c) => n + c.charCodeAt(0), 0),
          )
    }${inProgress ? '<span class="badge">In progress</span>' : solved(r) ? `<span class="badge">${icon('check')} Solved</span>` : ''}</div><div class="card-body"><div class="card-family">${esc(M[p.type].title)}</div><h3>${esc(p.title)}</h3><div class="card-meta">${difficulty(p.difficulty, p)}<span>${puzzleMeta(p)}</span></div></div></button></article>`;
  }
  function bookCard(b, i) {
    const count = b.chapters.filter((c) => solved(rec(find(c.id)))).length,
      units = b.format === 'anthology' ? 'records' : 'chapters';
    return `<button class="book-card" data-action="navigate" data-page="casebooks" data-id="${b.id}"><div class="book-cover">${caseArt(b.id)}<span class="book-number">CASE FILE / 0${i + 1}</span></div><div class="book-info"><h3>${esc(b.title)}</h3><p>${esc(b.tagline)}</p><div class="book-progress">${b.chapters.map((c) => `<i class="${solved(rec(find(c.id))) ? 'done' : ''}"></i>`).join('')}<span>${count} / ${b.chapters.length} ${units}</span></div></div></button>`;
  }
  function caseArt(id, eager = false) {
    const source = globalThis.ALIBI_MEDIA?.[books.find((b) => b.id === id)?.artwork || id];
    return source
      ? `<img class="case-art" src="${esc(source)}" width="1536" height="1024" alt="" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`
      : art(books.find((b) => b.id === id)?.icon || 'scene');
  }
  function familyCard(t) {
    const m = M[t],
      ps = all().filter((p) => p.type === t);
    return `<button class="family-card ${m.color}" data-action="navigate" data-page="library" data-id="${t}"><span class="family-icon">${icon(m.icon)}</span><span class="family-count">${ps.length} puzzles</span><h3>${m.title}</h3><p>${m.line}</p></button>`;
  }
  function daily() {
    const d = new Date(),
      str = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    let h = 0;
    for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return ['mystery', 'visual', 'classic'].map((g, i) => {
      const ps = starter.puzzles.filter((p) => M[p.type].group === g);
      return ps[(h + i * 19) % ps.length];
    });
  }
  function home() {
    return AlibiClub.home();
  }
  function legacyHome() {
    const r = activeRecords()[0],
      p = r?.puzzle || find('scene-01');
    const featured = books.find((b) => b.id === 'last-light-at-bellweather') || books[0],
      chapter = featured.chapters.find((c) => !solved(rec(find(c.id)))) || featured.chapters[0];
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    const completed = [...records.values()].filter(solved).length;
    return `<div class="welcome"><div><div class="eyebrow">THE PUZZLE CABINET</div><h1>${r ? 'A thread to pick up.' : 'What will you uncover?'}</h1></div><span class="date">${esc(date)}<small>${completed ? completed + ' puzzles solved' : 'Take your time. Find your way.'}</small></span></div>
    <section class="hero-row"><div class="hero case-feature"><div class="feature-image">${caseArt(featured.id, true)}</div><div class="feature-copy"><div class="eyebrow"><span class="dot"></span> NEW / THE BELLWEATHER FILE</div><h2>The last light<br>at Bellweather.</h2><p>A storm beyond the causeway.<br>A keeper’s secret waiting in the dark.</p><div class="feature-actions">${B('Explore the case', 'navigate', 'arrow', 'cream', `data-page="casebooks" data-id="${featured.id}"`)}<span>${featured.chapters.length} chapters · Mystery & deduction</span></div></div></div>
    <div class="resume-card"><div class="eyebrow">${r ? 'YOUR OPEN CASE' : 'YOUR FIRST CASE'}</div><div class="resume-icon">${icon(r ? M[p.type].icon : 'compass')}</div><h3>${r ? esc(p.title) : 'Five people.<br> One missing alibi.'}</h3><p>${r ? 'Your board and notes are right where you left them.' : 'Place the guests. Follow the evidence. Find who was in the wrong room.'}</p><div class="resume-meta">${r ? r.moves + ' moves · ' + esc(M[p.type].title) : 'A gentle introduction · Guided lesson'}</div>${B(r ? 'Continue puzzle' : 'Start a case', 'open', 'arrow', '', openAttrs(p))}</div></section>
    <div class="home-facts"><span>${icon('library')}<strong>${all().length}</strong> puzzles</span><span>${icon('compass')}<strong>${C.TYPES.length}</strong> ways to think</span><span>${icon('device')}Play offline</span></div>
    <div class="section-head"><div><div class="eyebrow">CHOOSE YOUR ATMOSPHERE</div><h2>Where shall we go?</h2></div></div><div class="destination-grid"><button class="destination" data-action="navigate" data-page="library" data-id="bridges"><img src="${esc(globalThis.ALIBI_MEDIA.cartographer)}" alt="" width="1536" height="1024" loading="lazy"><div><span class="eyebrow">NEW / EIGHT ISLAND MAPS</span><h3>The cartographer’s desk</h3><p>Count the crossings. Connect a world.</p><span class="destination-link">Play Tidal bridges ${icon('arrow')}</span></div></button><button class="destination" data-action="navigate" data-page="library" data-id="lightup"><img src="${esc(globalThis.ALIBI_MEDIA['quiet-town'])}" alt="" width="1536" height="1024" loading="lazy"><div><span class="eyebrow">A QUIETER KIND OF DISCOVERY</span><h3>When the town goes still</h3><p>A little light, a little logic. No hurry.</p><span class="destination-link">Explore Lanterns ${icon('arrow')}</span></div></button></div>
    <div class="section-head"><div><div class="eyebrow">A LITTLE DISCOVERY, EVERY DAY</div><h2>Your daily three.</h2></div>${B('All puzzles', 'navigate', 'arrow', 'ghost', 'data-page="library"')}</div><div class="daily-grid">${daily()
      .map(
        (p, i) =>
          `<button class="daily-card" data-action="open" ${openAttrs(p)}><div class="daily-art">${art(p.type, p)}</div><div><div class="tag">${['The deduction', 'The picture', 'The pattern'][i]}</div><h3>${esc(p.title)}</h3><small>${esc(M[p.type].title)}${timing(p) ? ` · ${timing(p)}` : ''}${solved(rec(p)) ? ' · Solved' : ''}</small></div>${icon('chevron')}</button>`,
      )
      .join('')}</div>
    <div class="section-head"><div><div class="eyebrow">SETTLE INTO A CASE FILE</div><h2>Every detail tells a story.</h2><p>${books.length} casebooks. Follow a longer thread, one discovery at a time.</p></div>${B('All casebooks', 'navigate', 'arrow', 'ghost', 'data-page="casebooks"')}</div><div class="book-grid">${books.map(bookCard).join('')}</div>
    <div class="section-head"><div><div class="eyebrow">FIND YOUR NEXT FAVOURITE</div><h2>${C.TYPES.length} ways to think.</h2></div></div><div class="family-grid">${['bridges', 'scene', 'dossier', 'witness', 'nonogram', 'lightup', 'tents', 'aquarium', 'network', 'trail', 'sudoku', 'binary', 'futoshiki'].map(familyCard).join('')}</div>
    <div class="club-note">${icon('workshop')}<div><h3>A case of your own.</h3><p>Build a floor plan, write the clues, and test your mystery in the workshop.</p></div>${B('Open workshop', 'navigate', 'arrow', 'ghost', 'data-page="workshop"')}</div>`;
  }
  function libraryPage() {
    const type = route.id,
      m = M[type];
    if (
      !type &&
      !library.search &&
      library.status === 'all' &&
      !library.venue &&
      library.group === 'all' &&
      library.difficulty === 'all' &&
      !library.browseAll
    )
      return `<div class="page-head"><div><div class="eyebrow">FIND YOUR NEXT FAVOURITE</div><h1>The puzzle collection.</h1><p>Choose a game, then find your next level. Every puzzle is available from the start.</p></div>${B('Browse all puzzles', 'browse-all', 'library', 'secondary', 'id="library-browse-all" data-focus-fallback="main"')}</div><div class="family-grid">${C.TYPES.map(familyCard).join('')}</div><section class="club-news"><div class="news-heading"><div><span class="eyebrow">OR CHOOSE A SETTING</span><h2>Four places to follow your curiosity.</h2><p>Standalone puzzles in illustrated collections.</p></div></div>${globalThis.AlibiCuration.collectionCards('', true)}</section>`;
    let ps = all().filter(
      (p) =>
        (!type || p.type === type) &&
        (!library.venue || globalThis.AlibiCuration.get(p)?.venue === library.venue) &&
        (library.group === 'all' || M[p.type].group === library.group) &&
        (library.difficulty === 'all' || p.difficulty === library.difficulty),
    );
    if (library.search.trim()) {
      const q = library.search.toLowerCase().trim();
      ps = ps.filter((p) =>
        `${p.title} ${p.subtitle} ${M[p.type].title} ${M[p.type].tag}`.toLowerCase().includes(q),
      );
    }
    ps = ps.filter((p) => {
      const r = rec(p);
      return (
        library.status === 'all' ||
        (library.status === 'new' && !r?.moves) ||
        (library.status === 'started' && r?.moves > 0 && !r.completedAt) ||
        (library.status === 'solved' && solved(r)) ||
        (library.status === 'favorites' && prefs.favorites.includes(p.id))
      );
    });
    return `<div class="page-head"><div><div class="eyebrow">${m ? m.tag : 'Pick something that catches your eye'}</div><h1>${m ? esc(m.title) + '.' : 'The puzzle collection.'}</h1><p>${m ? esc(m.line) : 'Mysteries, number games and visual logic. Every puzzle is available from the start.'}</p></div>${B(m ? 'All puzzles' : 'Your favorites', m ? 'navigate' : 'favorites-filter', m ? 'back' : 'heart', 'secondary', m ? 'data-page="library"' : '')}</div>${m ? `<div class="family-intro">${icon(m.icon)}<p>${esc(m.goal)}</p>${B('Learn to play', 'lesson', 'book', 'secondary small', `data-type="${type}"`)}</div>` : ''}${m ? globalThis.AlibiAtmosphere.family(type) : ''}${globalThis.AlibiCuration.collectionPicker(library.venue)}<div class="filters"><div class="filter-top"><div class="search-field">${icon('search')}<input id="library-search" type="search" placeholder="Search titles, types or settings…" aria-label="Search puzzles" value="${esc(library.search)}"></div><select id="difficulty-filter" aria-label="Difficulty"><option value="all">Every difficulty</option>${['Gentle', 'Steady', 'Tricky'].map((d) => `<option ${library.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}</select><select id="status-filter" aria-label="Progress filter">${[
      ['all', 'All puzzles'],
      ['new', 'Not started'],
      ['started', 'In progress'],
      ['solved', 'Solved'],
      ['favorites', 'Favorites'],
    ]
      .map(
        ([v, l]) => `<option value="${v}" ${library.status === v ? 'selected' : ''}>${l}</option>`,
      )
      .join('')}</select>${
      !type
        ? `<select id="family-filter" aria-label="Puzzle type"><option value="">Every puzzle type</option>${Object.entries(
            M,
          )
            .map(([t, d]) => `<option value="${t}">${d.title}</option>`)
            .join('')}</select>`
        : ''
    }</div>${
      !type
        ? `<div class="chips" aria-label="Puzzle collections">${[
            ['all', 'Everything', 'library'],
            ['mystery', 'Mystery & deduction', 'scene'],
            ['visual', 'Visual & spatial', 'nonogram'],
            ['classic', 'Numbers & patterns', 'sudoku'],
          ]
            .map(
              ([g, l, ic]) =>
                `<button id="library-filter-${g}" class="chip ${library.group === g ? 'active' : ''}" data-action="group-filter" data-value="${g}" aria-pressed="${library.group === g}">${icon(ic)}${l}</button>`,
            )
            .join('')}</div>`
        : ''
    }<div id="library-filter-status" class="filter-meta" tabindex="-1"><span>${ps.length} puzzle${ps.length === 1 ? '' : 's'} · ${m ? 'Choose a level below.' : 'No locked levels. Follow your curiosity.'}</span>${B('Reset filters', 'reset-filters', '', 'ghost small', 'id="library-reset-filters" data-focus-fallback="library-filter-status"')}</div></div><div class="puzzle-grid">${ps.length ? ps.slice(0, library.limit).map(puzzleCard).join('') : `<div class="empty"><h2>No matches just yet.</h2><p>Try a different title, puzzle type or progress filter.</p>${B('Clear the filters', 'reset-filters', 'refresh', 'secondary', 'id="library-clear-filters" data-focus-fallback="library-filter-status"')}</div>`}</div>${ps.length > library.limit ? `<div class="show-more">${B(`Show ${Math.min(24, ps.length - library.limit)} more puzzles`, 'show-more', 'arrow', 'secondary', 'id="library-show-more" data-focus-fallback="library-filter-status"')}</div>` : ''}<p class="cover-note">Difficulty and time labels are estimates. Puzzle previews are decorative, not solutions.</p>`;
  }
  function casebooksPage() {
    const b = books.find((b) => b.id === route.id);
    if (!b)
      return `<div class="page-head"><div><div class="eyebrow">A longer thread to follow</div><h1>Mystery casebooks.</h1><p>Stormbound lighthouses, silent houses and midnight departures. Open a file and follow the evidence.</p></div></div>${globalThis.AlibiAtmosphere.family('bridges')}<div class="book-grid full-books">${books.map(bookCard).join('')}</div><div class="club-note">${icon('book')}<div><h3>Every part of a casebook is yours to open.</h3><p>Follow Bellweather’s continuous investigation in order, or follow your curiosity through the earlier standalone records.</p></div></div>`;
    const done = b.chapters.filter((c) => solved(rec(find(c.id)))).length,
      next = b.chapters.find((c) => !solved(rec(find(c.id)))) || b.chapters[0],
      anthology = b.format === 'anthology',
      units = anthology ? 'records' : 'chapters';
    const chapterTimes = b.chapters.map((c) => find(c.id)).map(timing),
      caseTime = chapterTimes.every(Boolean)
        ? `${chapterTimes.reduce((sum, label) => sum + Number.parseInt(label, 10), 0)} minute estimate`
        : '';
    return `${B('All casebooks', 'navigate', 'back', 'ghost small', 'data-page="casebooks"')}<div class="case-header cinematic-case"><div class="case-illustration">${caseArt(b.id, true)}</div><div class="case-opening"><div class="eyebrow">${esc(b.setting)}</div><h1>${esc(b.title)}.</h1><p>${esc(b.intro)}</p>${B(done === b.chapters.length ? 'Revisit the casebook' : done ? (anthology ? 'Continue to the next record' : 'Continue the casebook') : anthology ? 'Open the first record' : 'Open the first chapter', 'open', 'arrow', 'cream', openAttrs(find(next.id), b.id))}<span class="case-duration">${b.chapters.length} ${units}${caseTime ? ` · ${caseTime}` : ''}</span></div></div>${b.cast?.length ? `<section class="cast-file"><div><div class="eyebrow">PEOPLE IN THE FILE</div><h2>Everyone has a place.</h2></div><div class="cast-list">${b.cast.map((person) => `<div class="cast-person"><span class="cast-initial" aria-hidden="true">${esc(person.name.slice(0, 1))}</span><div><strong>${esc(person.name)}</strong><small>${esc(person.role)}</small></div></div>`).join('')}</div></section>` : ''}<div class="section-head"><h2>${anthology ? 'The records.' : 'The case file.'}</h2><span class="tag">${done} / ${b.chapters.length} ${units} complete</span></div><div class="chapter-list">${b.chapters
      .map((c, i) => {
        const p = find(c.id),
          finished = solved(rec(p));
        return `<article class="chapter-entry ${finished ? 'finished' : ''}"><button class="chapter" data-action="open" ${openAttrs(p, b.id)}><span class="chapter-num">${finished ? icon('check') : String(i + 1).padStart(2, '0')}</span><span class="chapter-copy"><small>${esc(c.time || M[p.type].title)}${timing(p) ? ` · ${timing(p)}` : ''}</small><strong>${esc(c.name)}</strong><span>${esc(c.brief)}</span></span>${icon('arrow')}</button>${finished && c.revelation ? `<div class="chapter-revelation"><span class="eyebrow">EVIDENCE ESTABLISHED</span><p>${esc(c.revelation)}</p></div>` : ''}</article>`;
      })
      .join(
        '',
      )}</div>${done === b.chapters.length ? `<div class="case-ending"><div class="eyebrow">${anthology ? 'Anthology complete' : 'Casebook complete'}</div><h2>${anthology ? 'The records are filed.' : 'The file is in order.'}</h2><p>${esc(b.ending)}</p>${B('Choose another casebook', 'navigate', 'arrow', 'ghost', 'data-page="casebooks"')}</div>` : ''}`;
  }
  function chapterAtmosphere(p) {
    const b = books.find((book) => book.id === route.book),
      c = b?.chapters.find((chapter) => chapter.id === p.id);
    const media = globalThis.ALIBI_MEDIA;
    if (c)
      return `<section class="chapter-atmosphere"><img src="${esc(media[b.artwork || b.id])}" alt="" width="1536" height="1024"><div><span class="eyebrow">${esc(b.title)} / ${String(b.chapters.indexOf(c) + 1).padStart(2, '0')}</span><p>${esc(c.brief)}</p></div></section>`;
    if (p.type === 'bridges')
      return `<section class="chapter-atmosphere cartography"><img src="${esc(media.cartographer)}" alt="" width="1536" height="1024"><div><span class="eyebrow">THE CARTOGRAPHER’S DESK</span><p>${esc(p.story || 'Every crossing brings the islands a little closer.')}</p></div></section>`;
    return '';
  }
  function practiceReturnBanner(p) {
    if (!caseReturn || !p || caseReturn.puzzleKey !== keyFor(p)) return '';
    return `<div class="info-note practice-return" role="status"><span>Practice shelf · ${esc(caseReturn.label)}</span>${B('Return to Wrenmere', 'return-to-castle', 'back', 'secondary small')}</div>`;
  }
  function storyPage() {
    const book = books.find((b) => b.id === route.book),
      chapter = book?.chapters.find((c) => c.id === route.id.split('@')[0]);
    if (!chapter)
      return `<div class="empty"><h1>Choose a casebook.</h1>${B('Casebooks', 'navigate', 'book', '', 'data-page="casebooks"')}</div>`;
    const puzzle = find(chapter.id),
      done = solved(rec(puzzle)),
      finished = book.chapters.every((c) => solved(rec(find(c.id)))),
      index = book.chapters.indexOf(chapter),
      anthology = book.format === 'anthology',
      unit = anthology ? 'RECORD' : 'CHAPTER',
      completionLabel = anthology ? 'ANTHOLOGY COMPLETE' : 'EPILOGUE',
      completionTitle = anthology ? 'The records are filed.' : 'The file is in order.',
      formatNote = anthology
        ? '<p class="story-format-note">Standalone record. Open any record in any order; completed records stay available in the case file.</p>'
        : '',
      completedText = anthology
        ? 'This record is complete. The solved evidence stays in the anthology file.'
        : 'Another record is complete. The case file keeps your discovery.';
    return `<article class="story-page">${B('Back to case file', 'navigate', 'back', 'secondary', `data-page="casebooks" data-id="${esc(book.id)}"`)}<div class="case-illustration">${caseArt(book.id, true)}</div><div class="eyebrow">${esc(book.title)} · ${finished ? completionLabel : `${unit} ${index + 1} OF ${book.chapters.length}`}</div><h1>${esc(finished ? completionTitle : chapter.name)}</h1>${formatNote}${!done && index === 0 ? `<p>${esc(book.intro)}</p>` : ''}<p>${esc(done ? chapter.revelation || completedText : chapter.brief)}</p>${finished ? `<p>${esc(book.ending)}</p>` : ''}<div class="story-actions">${finished ? B('Choose another casebook', 'navigate', 'arrow', '', 'data-page="casebooks"') : done ? B(anthology ? 'Continue to the next record' : 'Continue the story', 'story-next', 'arrow') : B('Continue to puzzle', 'story-play', 'arrow', '', openAttrs(puzzle, book.id))}${done ? B('Revisit this puzzle', 'story-play', 'book', 'secondary', openAttrs(puzzle, book.id)) : ''}</div></article>`;
  }
  function chapterReveal(p) {
    const b = books.find((book) => book.id === route.book),
      c = b?.chapters.find((chapter) => chapter.id === p.id);
    return c?.revelation
      ? `<div class="chapter-reveal"><img src="${esc(globalThis.ALIBI_MEDIA.evidence)}" alt="" width="1536" height="1024"><div><span class="eyebrow">A NEW PIECE OF EVIDENCE</span><p>${esc(c.revelation)}</p></div></div>`
      : '';
  }
  function journalPage() {
    const rs = [...records.values()],
      complete = rs.filter(solved),
      ongoing = activeRecords(),
      fav = all().filter((p) => prefs.favorites.includes(p.id));
    return `<div class="page-head"><div><div class="eyebrow">The little discoveries add up</div><h1>Your journal.</h1><p>No league tables. Just the puzzles you’ve enjoyed and the threads you’ve left open.</p></div>${B('Back up progress', 'export', 'download', 'secondary')}</div><div class="stat-grid"><div class="stat-card"><strong>${complete.length}</strong><span>Puzzles solved</span></div><div class="stat-card"><strong>${ongoing.length}</strong><span>In progress</span></div><div class="stat-card"><strong>${new Set(complete.map((r) => r.puzzle.type)).size} <small>/ ${C.TYPES.length}</small></strong><span>Game types explored</span></div><div class="stat-card"><strong>${books.filter((b) => b.chapters.every((c) => solved(rec(find(c.id))))).length}</strong><span>Casebooks completed</span></div></div>${ongoing.length ? `<div class="section-head"><h2>Pick up the thread.</h2><span class="tag">Most recently played first</span></div><div class="puzzle-grid">${ongoing.map((r) => puzzleCard(r.puzzle)).join('')}</div>` : `<div class="empty"><h2>A fresh page.</h2><p>Start any puzzle. Your unfinished boards and personal notes will be waiting here.</p>${B('Find a puzzle', 'navigate', 'arrow', '', 'data-page="library"')}</div>`}${fav.length ? `<div class="section-head"><h2>Saved for a quieter moment.</h2></div><div class="puzzle-grid">${fav.map(puzzleCard).join('')}</div>` : ''}<div class="section-head"><h2>Your collection, explored.</h2></div><div class="family-grid">${Object.entries(
      M,
    )
      .map(([t, m]) => {
        const total = all().filter((p) => p.type === t).length,
          done = new Set(complete.filter((r) => r.puzzle.type === t).map((r) => r.puzzle.id)).size;
        return `<button class="family-card ${m.color}" data-action="navigate" data-page="library" data-id="${t}"><span class="family-icon">${icon(m.icon)}</span><h3>${m.title}</h3><div class="journal-meter"><div style="width:${Math.min(100, (done / Math.max(1, total)) * 100)}%"></div></div><p>${done} / ${total} solved</p></button>`;
      })
      .join('')}</div>${
      complete.length
        ? `<div class="section-head"><h2>The solved pile.</h2></div><div class="puzzle-grid">${complete
            .slice()
            .reverse()
            .map((r) => puzzleCard(r.puzzle))
            .join('')}</div>`
        : ''
    }`;
  }
  function toggle(key, label, note) {
    return `<div class="setting-row"><label for="setting-${key}">${label}<small>${note}</small></label><input type="checkbox" id="setting-${key}" data-setting="${key}" ${settings[key] ? 'checked' : ''}></div>`;
  }
  function settingsPage() {
    return `<div class="page-head"><div><div class="eyebrow">Make yourself comfortable</div><h1>Your space.</h1><p>How it looks, how it feels, and how your progress stays with you.</p></div>${B('The workshop', 'navigate', 'workshop', 'secondary', 'data-page="workshop"')}</div><div class="settings-grid"><section class="panel"><h2>A comfortable desk.</h2><div class="setting-row"><label for="theme-select">Appearance<small>Choose paper, evening, or your device preference.</small></label><select id="theme-select"><option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Paper</option><option value="night" ${settings.theme === 'night' ? 'selected' : ''}>Evening</option><option value="system" ${settings.theme === 'system' ? 'selected' : ''}>System</option></select></div>${toggle('contrast', 'Stronger contrast', 'Darker borders and more distinct text.')}${toggle('largeText', 'Larger clue text', 'More readable evidence and instructions.')}${toggle('reducedMotion', 'Reduce motion', 'Remove decorative transitions and animation.')}${toggle('timer', 'Show the timer', 'Optional. Time never affects a result.')}${toggle('sound', 'Soft interaction sounds', 'Synthesised locally. No audio downloads.')}${toggle('haptics', 'Light haptics', 'A small tap on supported devices.')}${AlibiClub.assistBar()}<p class="fine">Mint-dotted marks are derived, not saved as manual notes. Changing their premise removes them.</p></section><section class="panel"><h2>Cabinet, Club, Quiet Wing and castle.</h2><p>Export these four device-local save stores together. The downloaded manifest lists what was included and warns if a section could not be read. Curated challenge replays are separate: open each challenge to export its replay. Restore one section at a time, with a recovery copy for that section. Restores across these stores are not one transaction.</p><div class="row actions">${B('Export cabinet, Club, Wing & castle', 'export-all', 'download')}${B('Review combined backup', 'import-all', 'upload', 'secondary')}${B('Quiet Wing recovery', 'navigate', 'refresh', 'secondary', 'data-page="quiet" data-id="realm"')}</div><input id="all-backup-input" type="file" accept="application/json,.json" hidden></section><section class="panel"><h2>Games-room progress.</h2><p>The experimental games room has a separate save. Export this as well as your cabinet backup before changing devices.</p><div class="row actions">${B('Export Club save', 'club-export', 'download')}${B('Restore Club save', 'club-import', 'upload', 'secondary')}${B('Club recovery copy', 'club-recovery', 'refresh', 'secondary')}${B('Club journal', 'navigate', 'book', 'ghost', 'data-page="club"')}</div></section><section class="panel"><h2>Your progress is yours.</h2><p>Boards and notes stay in this browser on this device. There is no cloud account or automatic cross-device backup.</p><div class="data-list"><div><span>Save storage</span><strong>${store.mode === 'indexeddb' ? 'IndexedDB · device-local' : store.mode === 'local' ? 'localStorage fallback' : 'This session only'}</strong></div><div><span>Saved puzzles</span><strong>${records.size}</strong></div><div><span>Favorite puzzles</span><strong>${prefs.favorites.length}</strong></div><div><span>Custom packs</span><strong>${packs.length - 1}</strong></div></div><div class="row actions">${B('Export backup', 'export', 'download')}${B('Restore backup', 'import-backup', 'upload', 'secondary')}</div><div class="row actions">${B('Protect local storage', 'persist', 'lock', 'ghost small')}${B('Recovery copy', 'recovery', 'refresh', 'ghost small')}</div><p class="fine" style="margin:16px 0 0">Clearing site data, changing browser profiles, changing the website address or losing the device can make local progress unavailable. Keep an exported backup elsewhere. A persistence request is not a cloud backup.</p></section><section class="panel"><h2>Make it feel like an app.</h2><p>Open the deployed HTTPS address on Android. Install from your browser’s menu to put Alibi on your home screen.</p><div class="data-list"><div><span>Offline files</span><strong>${offlineReady ? 'Ready' : cfg.standalone ? 'Local preview only' : 'Preparing / not ready'}</strong></div><div><span>Display</span><strong>${matchMedia('(display-mode: standalone)').matches ? 'Installed app' : 'Browser tab'}</strong></div><div><span>Version</span><strong>${esc(cfg.version)} · ${esc(cfg.build.slice(0, 8))}</strong></div><div><span>Updates</span><strong>${waitingUpdate ? 'Ready to install' : 'None waiting'}</strong></div></div><div class="row actions">${B('Install Alibi', 'install', 'download')}${B('Check for updates', 'check-update', 'refresh', 'secondary')}</div><p class="fine" style="margin-top:16px">${cfg.standalone ? 'This self-contained file is for trying the game. The hosted build provides the install manifest, service worker and coherent offline updates.' : 'Load the app online once, wait for “Offline ready”, then test reopening it in airplane mode. Your browser still controls storage availability.'}</p></section><section class="panel"><h2>A cabinet that can grow.</h2><p>${starter.puzzles.length} starter puzzles, ${C.TYPES.length} game families and ${books.length} anthology casebooks. Use the workshop to make original scene drafts, edit rooms and clues, verify the solution, and share JSON packs.</p><div class="row actions">${B('Open the workshop', 'navigate', 'workshop', '', 'data-page="workshop"')}${B('Replay a lesson', 'choose-lesson', 'book', 'secondary')}</div><div class="divider"></div><h3>Something not behaving as expected?</h3><p style="font-size:11px;margin-top:9px">Export a small issue report with the puzzle ID, app version and current board. Review it before sharing; it is not sent anywhere automatically.</p><div class="row actions">${B('Create issue report', 'feedback-report', 'flag', 'ghost small')}${B('Privacy & credits', 'navigate', 'arrow', 'ghost small', 'data-page="privacy"')}</div></section></div>`;
  }
  function privacyPage() {
    return `<div class="privacy-copy"><div class="eyebrow">The small print, in plain language</div><h1>Privacy & credits.</h1><h2>Your device is the save file.</h2><p>Alibi stores game progress, notes, settings and custom puzzle packs in your browser. It does not create an account, send gameplay to an analytics service, load advertising or make AI calls. Backup and issue-report exports are files you choose to save and share.</p><p>The hosting provider still receives ordinary web requests, including your IP address and request metadata, when you load the site or check for updates. Its logging and retention depend on the operator’s hosting configuration. This page describes this static build, not every possible future deployment.</p><h2>Offline, not indestructible.</h2><p>The installed version caches its application files for offline play. Browser storage can be cleared or become unavailable. An installed icon is not a guarantee of permanent storage. Export backups, and keep the same production address when publishing updates.</p><h2>Original content, familiar rules.</h2><p>The scene-deduction format is inspired by Murdoku by Manuel Garand. These are original scenarios and original interface illustrations, not copied Murdoku puzzles, artwork or an affiliated product. Other games use familiar logic-puzzle rules. The puzzle previews are decorative illustrations, not a promise that the pictured arrangement is playable.</p><p>“Alibi” is a working product name. This bundle does not establish trademark clearance or grant rights to third-party names. The app runs from static files with bundled code, illustrations, fonts and controls. In the Rich edition, visible artwork can request credited photographs from Unsplash or Pexels. Those providers receive ordinary request metadata, including your IP address; no gameplay or cookies are sent by the image loader. Choose Painted edition in the room controls to stop these optional requests. Verified detail can be reused offline, while the complete local painting always remains available. Films stream from this site only when you ask to play them. Room sound is off by default and has a locally composed offline version. The optional Quiet Wing includes licensed 3D models and museum reproductions, with credits in its source ledger. The original casebook covers were made with AI image generation. SVG puzzle previews, install icons and synthesised interface sounds are bundled locally.</p><h2>Explore the puzzle tradition.</h2><p>Our new Tidal bridges family uses the familiar Hashi rules, studied through <a href="https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/bridges.html" target="_blank" rel="noopener noreferrer">Simon Tatham’s Bridges manual</a>. Alibi’s engine, island maps and illustrations are original. No Tatham code or puzzle data is bundled.</p><p>For more variety, visit <a href="https://www.chiark.greenend.org.uk/~sgtatham/puzzles/" target="_blank" rel="noopener noreferrer">Simon Tatham’s Portable Puzzle Collection</a>, a free collection published under the MIT license. This opens an external website; its games and progress are separate from Alibi and need their own initial online visit.</p><h2>What the quality checks mean.</h2><p>The starter catalogue is solver-checked for exactly one solution under the implemented rules. Difficulty and time estimates have not been calibrated through a formal player study. Bellweather follows a single authored investigation. The earlier casebooks collect standalone records. Neither uses branching dialogue or simulated suspects. Optional reveals use the stored solution and are counted.</p><h2>Accessibility.</h2><p>The app includes keyboard controls, visible focus, reduced motion, stronger contrast, larger clue text and non-colour labels. Spatial grids are not a fully nonvisual puzzle experience. Physical-device and assistive-technology testing are still part of a public release checklist.</p><h2>Project and support.</h2><p>Alibi is maintained by <a href="https://github.com/Chris0Jeky/Alibi" target="_blank" rel="noopener noreferrer">Chris0Jeky</a>. Report a problem through <a href="https://github.com/Chris0Jeky/Alibi/issues" target="_blank" rel="noopener noreferrer">GitHub Issues</a>; keep personal notes and full progress backups private. The public source currently has no reuse license.</p><h2>After Hours: optional private rooms.</h2><p>The games-room prototype stores its own progress separately from the puzzle cabinet. Export both backups when moving devices. Personal records and stamps stay local. No public leaderboard, cloud save or account service is enabled.</p><p>Only when you configure and use the optional room API are your moves sent to that server. A room keeps its board, version, move identifiers and hashed seat credentials for up to 24 hours. The creation quota uses a salted daily IP hash. Hosting request metadata may have a separate retention policy. Room credentials are not included in Club exports. The static app does not contact a room server before you configure it.</p><h2>Data removal.</h2><p>Export anything you need first. Your browser’s site-data controls can remove the app’s local storage and offline cache. That removal is not reversible unless you have a backup.</p>${B('Back to your space', 'navigate', 'back', 'secondary', 'data-page="settings"')}</div>`;
  }
  function token(person, p, small = false) {
    return `<span class="person-token person-${person.color} ${person.id === p.victim ? 'victim' : ''}" aria-hidden="true">${person.id === p.victim ? icon('close') : esc(person.name.slice(0, 1))}</span>`;
  }
  function peoplePalette(p, s) {
    return `<div class="people-palette" aria-label="Choose a person">${p.people.map((person) => `<button class="person-btn person-${person.color} ${selectedPerson === person.id ? 'active' : ''}" data-action="person" data-id="${person.id}" aria-pressed="${selectedPerson === person.id}" title="${esc(person.name)} · ${esc(person.role)}">${token(person, p)}<span class="person-name">${esc(person.name)}</span><small>${person.id === p.victim ? 'Victim' : s.placements[person.id] === undefined ? 'Not placed' : `${String.fromCharCode(65 + (s.placements[person.id] % p.size))}${Math.floor(s.placements[person.id] / p.size) + 1}`}</small>${s.placements[person.id] !== undefined ? `<span class="placed">${icon('check')}</span>` : ''}</button>`).join('')}</div>`;
  }
  function boardCell(p, s, i, errors) {
    const n = p.size,
      r = Math.floor(i / n),
      c = i % n,
      t = p.type;
    let content = '',
      cls = 'cell',
      style = '',
      disabled = false,
      extra = '';
    if (r === 0) cls += ' top-edge';
    if (c === 0) cls += ' left-edge';
    if (r === n - 1) cls += ' bottom-edge';
    if (c === n - 1) cls += ' right-edge';
    if (errors.has(i)) cls += ' error';
    let label = `Row ${r + 1}, column ${String.fromCharCode(65 + c)}`;
    if (t === 'scene') {
      const room = p.rooms[i],
        person = p.people.find((w) => s.placements[w.id] === i),
        obj = p.objects.find((o) => o.cell === i),
        ex = (s.notes[selectedPerson] || []).includes(i),
        candidates = p.people.filter((person) => s.candidates?.[i]?.includes(person.id)),
        exclusions = p.people.filter((person) => s.notes[person.id]?.includes(i)),
        crossed = s.crosses?.includes(i);
      cls += ' scene-cell';
      style = `background:var(--room-${room});`;
      if (c === 0 || p.rooms[i - 1] !== room) style += 'border-left:2px solid var(--board-border);';
      if (r === 0 || p.rooms[i - n] !== room) style += 'border-top:2px solid var(--board-border);';
      if (c === n - 1 || p.rooms[i + 1] !== room)
        style += 'border-right:2px solid var(--board-border);';
      if (r === n - 1 || p.rooms[i + n] !== room)
        style += 'border-bottom:2px solid var(--board-border);';
      if (person?.id === selectedPerson) cls += ' selected';
      label += `, ${p.roomNames[room]}, ${obj ? 'blocked by ' + obj.name : person ? person.name : ex ? 'excluded for selected person' : 'empty'}`;
      content = `<span class="room-code">${String.fromCharCode(65 + room)}</span>${obj ? icon(obj.kind, 'furniture') : person ? token(person, p) : ex ? '<span class="excluded">×</span>' : ''}`;
      if (!obj && !person) {
        content = `<span class="room-code">${String.fromCharCode(65 + room)}</span>${crossed ? '<span class="excluded">×</span>' : ''}<span class="scene-candidates">${candidates.map((person) => `<span>${esc(person.name[0])}</span>`).join('')}${exclusions.map((person) => `<span>${esc(person.name[0])}×</span>`).join('')}</span>`;
      }
      if (crossed) label += ', board cross';
      if (candidates.length)
        label += ', candidates: ' + candidates.map((person) => person.name).join(', ');
      if (exclusions.length)
        label += ', excluded: ' + exclusions.map((person) => person.name).join(', ');
      disabled = !!obj;
    } else if (t === 'sudoku' || t === 'futoshiki' || t === 'trail') {
      const val = s.cells[i],
        given = !!p.givens[i];
      if (given) cls += ' given';
      if (i === selectedCell) cls += ' selected';
      if (t === 'sudoku' || t === 'futoshiki') {
        if (i !== selectedCell && (r === Math.floor(selectedCell / n) || c === selectedCell % n))
          cls += ' peer';
        if (val && val === s.cells[selectedCell] && i !== selectedCell) cls += ' same-value';
      }
      if (t === 'sudoku') {
        if ((c + 1) % p.boxCols === 0) style += 'border-right:2px solid var(--board-border);';
        if ((r + 1) % p.boxRows === 0) style += 'border-bottom:2px solid var(--board-border);';
      }
      if (t === 'trail') {
        cls += ' trail-cell';
        if (val === 1) cls += ' start';
        if (val === n * n) cls += ' finish';
        if (c < n - 1 && val && s.cells[i + 1] && Math.abs(val - s.cells[i + 1]) === 1)
          content += '<i class="trail-connector horizontal"></i>';
        if (r < n - 1 && val && s.cells[i + n] && Math.abs(val - s.cells[i + n]) === 1)
          content += '<i class="trail-connector vertical"></i>';
      }
      if (val) content += `<span class="value">${val}</span>`;
      else if (s.notes[i]?.length)
        content += `<span class="notes-grid">${range(9)
          .map((k) => `<span>${s.notes[i].includes(k + 1) ? k + 1 : ''}</span>`)
          .join('')}</span>`;
      if (given) content += '<i class="given-mark" aria-hidden="true"></i>';
      label += `, ${val || 'empty'}${given ? ', fixed clue' : ''}`;
      if (given) extra += ' aria-readonly="true"';
      if (t === 'futoshiki')
        for (const q of p.inequalities)
          if (Math.min(q.a, q.b) === i) {
            const other = Math.max(q.a, q.b),
              sign = q.a === i ? q.op : q.op === '<' ? '>' : '<';
            content += `<span class="ineq ${other === i + n ? 'vertical' : ''}" aria-hidden="true">${esc(sign)}</span>`;
            label += `, ${q.a === i ? (q.op === '<' ? 'less than' : 'greater than') : q.op === '<' ? 'greater than' : 'less than'} neighbouring cell ${String.fromCharCode(65 + (other % n))}${Math.floor(other / n) + 1}`;
          }
    } else if (t === 'binary') {
      const v = s.cells[i],
        given = p.givens[i] !== -1;
      cls += ` binary-cell ${v === 0 ? 'sun-cell' : v === 1 ? 'moon-cell' : ''}`;
      if (given) cls += ' given';
      if (i === selectedCell) cls += ' selected';
      content = v === 0 ? icon('sun') : v === 1 ? icon('moon') : '';
      if (given) content += '<i class="given-mark"></i>';
      label += `, ${v === 0 ? 'sun' : v === 1 ? 'moon' : 'empty'}${given ? ', fixed clue' : ''}`;
    } else if (t === 'nonogram') {
      const v = s.cells[i];
      cls += ` nono-cell paint-cell ${v === 1 ? 'filled' : ''}`;
      content = v === 0 ? '<span class="cross">×</span>' : '';
      label += `, ${v === 1 ? 'filled' : v === 0 ? 'crossed out' : 'unknown'}`;
      if ((c + 1) % 5 === 0) style += 'border-right:2px solid var(--board-border);';
      if ((r + 1) % 5 === 0) style += 'border-bottom:2px solid var(--board-border);';
    } else if (t === 'lightup') {
      const w = p.walls[i],
        lit = X.litCells(p, s).has(i);
      if (w !== -2) {
        cls += ' light-wall';
        content = w >= 0 ? w : '';
        disabled = true;
        label += `, ${w >= 0 ? 'wall needing ' + w + ' adjacent lanterns' : 'wall'}`;
      } else {
        cls +=
          ' light-floor paint-cell' + (lit ? ' lit' : '') + (s.cells[i] === 1 ? ' lantern' : '');
        content =
          s.cells[i] === 1
            ? icon('lightup')
            : s.cells[i] === 0
              ? '<span class="cross">×</span>'
              : '';
        label += `, ${s.cells[i] === 1 ? 'lantern' : s.cells[i] === 0 ? 'no lantern' : 'empty'}, ${lit ? 'lit' : 'unlit'}`;
      }
    } else if (t === 'tents') {
      if (p.trees.includes(i)) {
        cls += ' tent-tree';
        content = icon('tree');
        disabled = true;
        label += ', tree';
      } else {
        cls +=
          ' tent-cell paint-cell' + (s.cells[i] === 1 ? ' tent' : s.cells[i] === 0 ? ' grass' : '');
        content = s.cells[i] === 1 ? icon('tents') : s.cells[i] === 0 ? icon('grass') : '';
        label += `, ${s.cells[i] === 1 ? 'tent' : s.cells[i] === 0 ? 'grass' : 'unknown'}`;
      }
    } else if (t === 'aquarium') {
      const tank = p.tanks[i],
        wet = X.aquariumCells(p, s),
        iswet = wet[i];
      cls += ' water-cell' + (iswet ? ' wet' : '');
      if (iswet && (r === 0 || p.tanks[i - n] !== tank || !wet[i - n])) cls += ' waterline';
      if (c === 0 || p.tanks[i - 1] !== tank) style += 'border-left:2px solid var(--board-border);';
      if (r === 0 || p.tanks[i - n] !== tank) style += 'border-top:2px solid var(--board-border);';
      if (c === n - 1 || p.tanks[i + 1] !== tank)
        style += 'border-right:2px solid var(--board-border);';
      if (r === n - 1 || p.tanks[i + n] !== tank)
        style += 'border-bottom:2px solid var(--board-border);';
      content = `<span class="tank-code">${String.fromCharCode(65 + tank)}</span>${iswet && i % 3 === 0 ? '<i class="bubble"></i>' : ''}`;
      label += `, tank ${String.fromCharCode(65 + tank)}, ${iswet ? 'water' : 'dry'}`;
    } else if (t === 'network') {
      const info = X.networkInfo(p, s),
        mask = info.masks[i],
        live = info.connected.has(i);
      cls += ' network-cell' + (live ? ' live' : '');
      if (i === selectedCell) cls += ' selected';
      const lines = X.bits
        .map((b, d) =>
          mask & b
            ? `<path class="pipe" d="M50 50L${[50, 104, 50, -4][d]} ${[-4, 50, 104, 50][d]}"/>`
            : '',
        )
        .join('');
      content = `<svg class="pipe-art" viewBox="0 0 100 100" aria-hidden="true">${lines}<circle class="pipe-center" cx="50" cy="50" r="7"/>${i === p.source ? '<circle class="source-halo" cx="50" cy="50" r="17"/>' : ''}</svg>`;
      if (p.locked.includes(i)) {
        disabled = true;
        content += '<span class="locked-corner">●</span>';
      }
      label += `, connectors ${X.bits
        .map((b, d) => (mask & b ? ['north', 'east', 'south', 'west'][d] : ''))
        .filter(Boolean)
        .join(
          ', ',
        )}, ${live ? 'connected to source' : 'not connected'}${i === p.source ? ', source' : ''}`;
    }
    return `<button id="cell-${i}" class="${cls}" data-action="cell" data-cell="${i}" aria-label="${esc(label)}" ${disabled ? 'disabled' : ''} ${extra} style="${style}" tabindex="${!disabled && i === selectedCell ? '0' : '-1'}">${content}</button>`;
  }
  function enabledCell(p, i) {
    if (p.type === 'bridges') return p.islands.some((island) => island.cell === i);
    if (p.type === 'scene') return !p.objects.some((o) => o.cell === i);
    if (p.type === 'lightup') return p.walls[i] === -2;
    if (p.type === 'tents') return !p.trees.includes(i);
    if (p.type === 'network') return !p.locked.includes(i);
    return true;
  }
  function board(p, s) {
    if (p.type === 'bridges') return bridgesBoard(p, s);
    if (p.type === 'witness') return witnessBoard(p, s);
    if (p.type === 'dossier') return dossierBoard(p, s);
    const n = p.size,
      N = n * n,
      errs = checking ? new Set(E[p.type].validate(p, s).flatMap((e) => e.cells || [])) : new Set();
    let heads = '',
      rows = '',
      cw = 28,
      ch = 23,
      counts = null;
    if (p.type === 'nonogram') {
      cw = Math.max(34, Math.max(...p.rowClues.map((c) => c.length)) * 13 + 10);
      ch = Math.max(35, Math.max(...p.colClues.map((c) => c.length)) * 16 + 7);
    }
    if (['tents', 'aquarium'].includes(p.type))
      counts = X.lineCounts(p, p.type === 'aquarium' ? X.aquariumCells(p, s) : s.cells);
    heads =
      '<div></div>' +
      range(n)
        .map((c) =>
          p.type === 'nonogram'
            ? `<div class="nono-clue col ${C.equal(C.runs(range(n).map((r) => s.cells[r * n + c])), p.colClues[c]) ? 'met' : ''}" aria-label="Column ${String.fromCharCode(65 + c)} clues ${p.colClues[c].join(', ')}">${p.colClues[c].map((v) => `<span>${v}</span>`).join('')}</div>`
            : counts
              ? `<div class="axis target ${counts.cols[c] === p.colTargets[c] ? 'met' : counts.cols[c] > p.colTargets[c] ? 'over' : ''}" aria-label="Column ${String.fromCharCode(65 + c)}: ${counts.cols[c]} of ${p.colTargets[c]}">${p.colTargets[c]}</div>`
              : `<div class="axis">${String.fromCharCode(65 + c)}</div>`,
        )
        .join('');
    for (let r = 0; r < n; r++) {
      rows +=
        p.type === 'nonogram'
          ? `<div class="nono-clue ${C.equal(C.runs(s.cells.slice(r * n, (r + 1) * n)), p.rowClues[r]) ? 'met' : ''}" aria-label="Row ${r + 1} clues ${p.rowClues[r].join(', ')}">${p.rowClues[r].map((v) => `<span>${v}</span>`).join('')}</div>`
          : counts
            ? `<div class="axis target ${counts.rows[r] === p.rowTargets[r] ? 'met' : counts.rows[r] > p.rowTargets[r] ? 'over' : ''}" aria-label="Row ${r + 1}: ${counts.rows[r]} of ${p.rowTargets[r]}">${p.rowTargets[r]}</div>`
            : `<div class="axis">${r + 1}</div>`;
      for (let c = 0; c < n; c++) rows += boardCell(p, s, r * n + c, errs);
    }
    return `<div class="board-scroll ${zoomed ? 'zoomed' : ''}" data-scroll-key="board"><div class="grid-shell ${p.type === 'scene' ? 'scene-shell' : p.type === 'nonogram' ? 'nono-shell' : ''}" style="--n:${n};--clue-width:${cw}px;--clue-height:${ch}px" role="group" aria-label="${esc(M[p.type].title)} puzzle board">${heads}${rows}</div></div>${zoomed ? '<p class="control-note">Larger squares. Scroll sideways to pan the board.</p>' : ''}${boardLegend(p, s)}`;
  }
  function boardLegend(p, s) {
    if (p.type === 'scene')
      return `<div class="room-legend">${p.roomNames.map((name, i) => `<span class="room-label"><i style="background:var(--room-${i})">${String.fromCharCode(65 + i)}</i>${esc(name)}</span>`).join('')}</div><div class="counter-line"><span><strong>${Object.keys(s.placements).length} / ${p.size}</strong> people placed</span><span>One person per row and column</span></div>`;
    if (p.type === 'network') {
      const info = X.networkInfo(p, s);
      return `<div class="counter-line"><span><strong>${info.connected.size} / ${p.size ** 2}</strong> tiles connected</span><span><strong>${info.open.length}</strong> tiles with open ends</span></div>`;
    }
    if (p.type === 'lightup')
      return `<div class="counter-line"><span><strong>${X.litCells(p, s).size} / ${p.walls.filter((w) => w === -2).length}</strong> floor squares lit</span><span>Crossed beams are allowed</span></div>`;
    if (p.type === 'aquarium')
      return '<div class="board-legend">Letters identify tanks · Edge numbers count water squares</div>';
    if (p.type === 'tents')
      return `<div class="counter-line"><span><strong>${s.cells.filter((v) => v === 1).length} / ${p.trees.length}</strong> tents placed</span><span>No touching, even diagonally</span></div>`;
    if (p.type === 'nonogram')
      return '<div class="board-legend"><span class="row"><i class="tiny-square"></i> Filled</span><span>× Definitely empty</span><span>Blank = undecided</span></div>';
    if (p.type === 'trail')
      return `<div class="counter-line"><span><strong>${s.cells.filter((v) => v > 0).length} / ${p.size ** 2}</strong> numbers placed</span><span>Every consecutive pair shares an edge</span></div>`;
    return `<div class="board-legend"><span class="row"><i class="tiny-square fixed"></i> Printed clue</span><span class="row"><i class="tiny-square"></i> Your entry</span><span>${p.type === 'futoshiki' ? 'Pointed end = smaller number' : p.type === 'binary' ? 'Sun → moon → blank' : 'Pencil mode for possibilities'}</span></div>`;
  }
  function bridgesBoard(p, s) {
    const g = C.bridges.graph(p),
      totals = C.bridges.counts(g, s.cells),
      n = p.size;
    const anchor = p.islands.findIndex((island) => island.cell === bridgeAnchor);
    const neighbours = new Set(
      anchor < 0
        ? []
        : g.incident[anchor].map((j) => (g.edges[j].a === anchor ? g.edges[j].b : g.edges[j].a)),
    );
    const lines = g.edges
      .map((e, i) => {
        if (!s.cells[i]) return '';
        const a = g.xy[e.a],
          b = g.xy[e.b];
        return (s.cells[i] === 2 ? [-7, 7] : [0])
          .map(
            (offset) =>
              `<line x1="${(a.x + 1) * 100 + (e.horizontal ? 0 : offset)}" y1="${(a.y + 1) * 100 + (e.horizontal ? offset : 0)}" x2="${(b.x + 1) * 100 + (e.horizontal ? 0 : offset)}" y2="${(b.y + 1) * 100 + (e.horizontal ? offset : 0)}"/>`,
          )
          .join('');
      })
      .join('');
    return `<div class="board-scroll" data-scroll-key="bridges"><div class="bridge-map" style="--islands-size:${n}" role="group" aria-label="Tidal bridges puzzle board"><svg viewBox="0 0 ${(n + 1) * 100} ${(n + 1) * 100}" aria-hidden="true" class="bridge-lines">${lines}</svg>${p.islands.map((island, i) => `<button id="cell-${island.cell}" class="cell island ${bridgeAnchor === island.cell ? 'anchored' : ''} ${neighbours.has(i) ? 'reachable' : ''} ${totals[i] === island.count ? 'satisfied' : totals[i] > island.count ? 'over' : ''}" style="left:${((g.xy[i].x + 1) / (n + 1)) * 100}%;top:${((g.xy[i].y + 1) / (n + 1)) * 100}%" data-action="cell" data-cell="${island.cell}" tabindex="${selectedCell === island.cell ? 0 : -1}" aria-pressed="${bridgeAnchor === island.cell}" aria-label="Island ${C.bridges.coordinate(p, i)}, needs ${island.count} bridges, has ${totals[i]}${bridgeAnchor === island.cell ? ', selected' : ''}"><strong>${island.count}</strong><small>${C.bridges.coordinate(p, i)}</small>${totals[i] === island.count ? '<span class="island-check" aria-hidden="true">✓</span>' : ''}</button>`).join('')}</div></div><p class="bridge-prompt" role="status">${anchor < 0 ? 'Choose an island to begin a connection.' : `From ${C.bridges.coordinate(p, anchor)}: choose a highlighted neighbour.`}</p><div class="counter-line"><span><strong>${totals.filter((v, i) => v === p.islands[i].count).length} / ${p.islands.length}</strong> island counts satisfied</span><span>One connected network</span></div>`;
  }
  function dossierBoard(p, s) {
    const n = p.size,
      a = X.dossierAssignments(p, s);
    return `<div class="dossier-tabs" role="group" aria-label="Evidence categories">${p.categories.map((cat, k) => `<button class="chip ${dossierTab === k ? 'active' : ''}" data-action="dossier-tab" data-value="${k}" aria-pressed="${dossierTab === k}">${esc(cat.name)}${a.slice(k * n, (k + 1) * n).every((v) => v >= 0) ? ' ✓' : ''}</button>`).join('')}</div><div class="logic-table" role="group" aria-label="People and ${esc(p.categories[dossierTab].name)} logic grid"><div></div>${p.categories[dossierTab].values.map((v) => `<div class="logic-col">${esc(v)}</div>`).join('')}${range(
      n,
    )
      .map(
        (r) =>
          `<div class="logic-row"><span class="initial">${esc(p.people[r][0])}</span>${esc(p.people[r])}</div>${range(
            n,
          )
            .map((c) => {
              const i = dossierTab * n * n + r * n + c,
                v = s.marks[i];
              return `<button id="mark-${i}" class="logic-cell ${v === 1 ? 'yes' : v === 0 ? 'no' : ''}" data-action="mark" data-cell="${i}" aria-label="${esc(p.people[r])}, ${esc(p.categories[dossierTab].values[c])}, ${v === 1 ? 'yes' : v === 0 ? 'no' : 'unknown'}">${v === 1 ? icon('check') : v === 0 ? '×' : ''}</button>`;
            })
            .join('')}`,
      )
      .join(
        '',
      )}</div><div class="logic-summary">${p.people.map((name, i) => `<div><strong>${esc(name)}</strong><span>${esc(a[i] >= 0 ? p.categories[0].values[a[i]] : 'Room unknown')} · ${esc(a[n + i] >= 0 ? p.categories[1].values[a[n + i]] : 'Object unknown')}</span></div>`).join('')}</div>`;
  }
  function witnessBoard(p, s) {
    return `<div class="witness-rule"><strong>Exactly ${p.trueCount} ${p.trueCount === 1 ? 'statement is' : 'statements are'} true.</strong><span>The other ${p.statements.length - p.trueCount} ${p.statements.length - p.trueCount === 1 ? 'is' : 'are'} false. One person took the missing object.</span></div><div class="statement-list">${p.statements.map((cl, i) => `<div class="statement"><div><div class="speaker">Account ${i + 1} · ${esc(cl.speaker)}</div><p>“${esc(X.witnessText(p, cl))}”</p></div><button class="truth-mark ${s.marks[i] === 1 ? 'true' : s.marks[i] === 0 ? 'false' : ''}" data-action="mark" data-cell="${i}" aria-label="Mark account ${i + 1}, currently ${s.marks[i] === 1 ? 'true' : s.marks[i] === 0 ? 'false' : 'unknown'}" title="Cycle true, false, unknown">${s.marks[i] === 1 ? 'T' : s.marks[i] === 0 ? 'F' : '?'}</button></div>`).join('')}</div><p class="control-note">Tap ? → T → F to keep notes. Your marks are hypotheses, not verdicts.</p>`;
  }
  function controls(p, s) {
    const t = p.type;
    let content = '';
    if (t === 'bridges')
      return `<div class="toolrow">${tool('Clear selection', 'erase', 'close', false, bridgeAnchor === null ? 'disabled' : '')}</div><p class="control-note">Repeat a pair: one bridge → two → none. Arrow keys move between islands; Enter selects. Delete cancels the selection.</p>`;
    if (t === 'sudoku' || t === 'futoshiki') {
      content = `<div class="numberpad" style="--keys:${p.size > 6 ? 5 : p.size}">${range(p.size)
        .map((i) => {
          const count = s.cells.filter((value) => value === i + 1).length;
          const placed = count === p.size;
          return `<button class="number-key ${placed ? 'digit-placed' : ''}" data-action="value" data-value="${i + 1}" aria-label="${pencil ? 'Pencil note' : 'Enter'} ${i + 1}, ${count} of ${p.size} placed">${i + 1}${placed ? '<small aria-hidden="true">✓</small>' : ''}</button>`;
        })
        .join(
          '',
        )}</div><div class="toolrow">${tool(pencil ? 'Cell notes: on' : 'Cell notes: off', 'pencil', 'pencil', pencil)}${tool('Erase', 'erase', 'erase')}</div><p class="control-note">${pencil ? 'Notes mode: select an empty square, then tap numbers to add or remove small candidates.' : 'Select a square, then a number. Turn on Cell notes to try small candidates.'} A tick means all ${p.size} copies are placed, not that they are correct. Keyboard: 1–${p.size}, N for notes, Delete to erase.</p>`;
    } else if (t === 'scene')
      content = `<div class="toolrow" aria-label="Scene marking mode">${[
        ['place', 'Place people'],
        ['candidate', 'Letter notes'],
        ['exclude', 'Person exclusions'],
        ['board-cross', 'Board X'],
      ]
        .map(([mode, label]) =>
          tool(
            label,
            'scene-mode',
            mode === 'place' ? 'scene' : 'pencil',
            sceneMarkMode === mode,
            `data-value="${mode}"`,
          ),
        )
        .join(
          '',
        )}${tool('Remove selected', 'erase', 'erase')}</div><p class="control-note">${sceneMarkMode === 'board-cross' ? 'Tap any empty square to add or remove a board X. No person selection is needed.' : sceneMarkMode === 'candidate' ? 'Choose a person above, then tap empty squares to add or remove their initial as a possibility.' : sceneMarkMode === 'exclude' ? 'Choose a person, then tap empty squares to mark their initial with ×. Other people’s marks remain visible.' : 'Choose a person, then an empty square. Tap a placed person to select or remove them.'} All marks are your working notes, not checked answers. Notes beneath a person reappear when you remove them.</p>`;
    else if (t === 'binary')
      content = `<div class="toolrow">${tool('Sun', 'symbol', 'sun', brush === 0, 'data-value="0"')}${tool('Moon', 'symbol', 'moon', brush === 1, 'data-value="1"')}${tool('Cycle', 'symbol', 'refresh', brush === 'cycle', 'data-value="cycle"')}${tool('Erase', 'symbol', 'erase', brush === -1, 'data-value="-1"')}</div><p class="control-note">${brush === 'cycle' ? 'Tap a square: sun → moon → blank.' : 'The selected symbol is a brush. Tap a square to place it.'} Printed symbols cannot change.</p>`;
    else if (['nonogram', 'tents', 'lightup'].includes(t)) {
      const fill = t === 'tents' ? 'Tent' : t === 'lightup' ? 'Lantern' : 'Fill',
        mark = t === 'tents' ? 'Grass' : 'Cross';
      content = `<div class="toolrow">${tool(fill, 'brush', t === 'tents' ? 'tents' : t === 'lightup' ? 'lightup' : 'nonogram', brush === 1, 'data-value="1"')}${tool(mark, 'brush', t === 'tents' ? 'grass' : 'close', brush === 0, 'data-value="0"')}${tool('Erase', 'brush', 'erase', brush === -1, 'data-value="-1"')}</div><p class="control-note">Tap or drag to ${brush === 1 ? fill.toLowerCase() : brush === 0 ? mark.toLowerCase() : 'erase'}. Tap an identical mark to clear it. Scroll outside the board.</p>`;
    } else if (t === 'aquarium')
      content = `<div class="toolrow">${tool('Set waterline', 'brush', 'aquarium', brush === 1, 'data-value="1"')}${tool('Drain tank', 'brush', 'erase', brush === 0, 'data-value="0"')}</div><p class="control-note">Tap at a height to fill that tank downwards. Tap its current top water row to lower it.</p>`;
    else if (t === 'network')
      content = `<div class="toolrow">${tool('Turn left', 'turn-left', 'undo')}${tool('Turn right', 'turn-right', 'redo')}</div><p class="control-note">Tap to turn clockwise. Right-click or Shift+Enter turns anticlockwise. Arrows move selection.</p>`;
    else if (t === 'dossier')
      content = `<div class="toolrow">${tool('Yes', 'brush', 'check', brush === 1, 'data-value="1"')}${tool('No', 'brush', 'close', brush === 0, 'data-value="0"')}${tool('Cycle', 'brush', 'refresh', brush === 'cycle', 'data-value="cycle"')}${tool('Erase', 'brush', 'erase', brush === -1, 'data-value="-1"')}</div><p class="control-note">${AlibiClub.assistance() === 'tidy' ? 'A ✓ projects reversible exclusions. Mint dots mark automatic notes.' : 'Automatic exclusions are off.'} Use both category tabs.</p>`;
    else if (t === 'trail')
      content = `<div class="numberpad trail-pad" data-scroll-key="trail-keys">${range(p.size ** 2)
        .map(
          (i) =>
            `<button class="number-key ${trailValue === i + 1 ? 'active' : ''} ${s.cells.includes(i + 1) ? 'used' : ''}" data-action="trail-value" data-value="${i + 1}" ${p.givens.includes(i + 1) ? 'disabled' : ''} aria-label="Choose ${i + 1}${s.cells.includes(i + 1) ? ', already placed' : ''}">${i + 1}</button>`,
        )
        .join(
          '',
        )}</div><div class="toolrow">${tool(brush === -1 ? 'Erasing' : 'Next: ' + trailValue, 'trail-mode', brush === -1 ? 'erase' : 'trail', brush !== -1)}${tool('Erase', 'brush', 'erase', brush === -1, 'data-value="-1"')}</div><p class="control-note">Choose a number, then a square. The next unused number is selected automatically.</p>`;
    return `<div class="controls">${content}</div>`;
  }
  function evidence(p, s) {
    const hasClues = ['scene', 'dossier'].includes(p.type);
    let content = '';
    if (evidenceTab === 'notes') {
      content = `<h2>Your working notes.</h2><p style="margin-bottom:15px">Thoughts, possibilities, a thread to come back to. These notes stay with this puzzle.</p><label class="sr-only" for="play-notes">Personal puzzle notes</label><textarea class="notes-box" id="play-notes" maxlength="5000" placeholder="What do you know so far?">${esc(current.note)}</textarea><p class="evidence-foot">Saved on this device with the board. ${current.note.length} / 5,000 characters.</p>`;
    } else if (evidenceTab === 'rules') {
      content = `<h2>How it works.</h2><p>${esc(M[p.type].gesture)}</p><div class="guide-rules">${M[p.type].rules.map((r) => `<div class="guide-rule">${esc(r)}</div>`).join('')}</div><div class="guide-tip"><strong>A good starting point</strong><br>${esc(M[p.type].tip)}</div><div style="margin-top:18px">${B('Try the mini lesson', 'lesson', 'book', 'secondary wide', `data-type="${p.type}"`)}</div>`;
    } else if (hasClues) {
      content = `<div class="eyebrow">${esc(p.subtitle)}</div><h2>${p.type === 'scene' ? 'The evidence.' : 'The case notes.'}</h2><div class="case-intro">${esc(p.story)}</div><div class="row between" style="margin-bottom:12px"><h3 style="font-size:11px">${p.clues.length} reliable clues</h3><span class="tag" style="font-size:9px">Every clue is true</span></div><div class="evidence-list">${p.clues.map((cl, i) => `<button class="clue ${s.clueMarks.includes(i) ? 'marked' : ''}" data-action="clue" data-index="${i}" aria-pressed="${s.clueMarks.includes(i)}"><span class="checkbox">${s.clueMarks.includes(i) ? icon('check') : ''}</span><span class="clue-text"><span class="clue-num">${String(i + 1).padStart(2, '0')}.</span>${esc(p.type === 'scene' ? C.clueText(p, cl) : X.dossierClue(p, cl))}</span></button>`).join('')}</div><p class="evidence-foot">Check clues off as you use them. These are your notes; checking a clue does not verify your answer.</p>`;
    } else {
      content = `<div class="eyebrow">${esc(M[p.type].tag)}</div><h2>${p.type === 'witness' ? 'The case file.' : 'A place to start.'}</h2>${p.story ? `<div class="case-intro">${esc(p.story)}</div>` : ''}<p>${esc(M[p.type].goal)}</p><div class="guide-tip"><strong>Your first deduction</strong><br>${esc(M[p.type].tip)}</div><div class="guide-rules">${M[
        p.type
      ].rules
        .slice(0, 2)
        .map((r) => `<div class="guide-rule">${esc(r)}</div>`)
        .join(
          '',
        )}</div><div style="margin-top:18px">${B('See the full rules', 'evidence-tab', 'book', 'secondary wide', 'data-value="rules"')}</div>${!prefs.seen.includes(p.type) ? B('Try a mini lesson', 'lesson', 'arrow', 'ghost wide', `data-type="${p.type}"`) : ''}`;
    }
    return `<div class="evidence-card"><div class="evidence-tabs" role="tablist" aria-label="Puzzle information">${[
      ['clues', hasClues ? 'Evidence' : 'Guide'],
      ['notes', 'My notes'],
      ['rules', 'Rules'],
    ]
      .map(
        ([v, l]) =>
          `<button class="evidence-tab ${evidenceTab === v ? 'active' : ''}" role="tab" aria-selected="${evidenceTab === v}" data-action="evidence-tab" data-value="${v}">${l}</button>`,
      )
      .join('')}</div><div class="evidence-body" role="tabpanel">${content}</div></div>`;
  }
  function quickPanel(tab = 'clues') {
    if (!current) return;
    const p = current.puzzle,
      has = ['scene', 'dossier'].includes(p.type);
    let body = '';
    if (tab === 'notes')
      body = `<p>These notes stay with this puzzle. You can return to the board without losing your place.</p><label for="quick-notes">Your working notes</label><textarea id="quick-notes" class="notes-box" maxlength="5000" placeholder="What do you know so far?">${esc(current.note)}</textarea>`;
    else if (has)
      body = `<p>${esc(p.story)}</p><div class="evidence-list">${p.clues.map((cl, i) => `<button class="clue ${current.state.clueMarks.includes(i) ? 'marked' : ''}" data-action="quick-clue" data-index="${i}" aria-pressed="${current.state.clueMarks.includes(i)}"><span class="checkbox">${current.state.clueMarks.includes(i) ? icon('check') : ''}</span><span class="clue-text"><span class="clue-num">${i + 1}.</span>${esc(p.type === 'scene' ? C.clueText(p, cl) : X.dossierClue(p, cl))}</span></button>`).join('')}</div><p class="fine">Check off clues as you use them. These checks are your notes, not answer verification.</p>`;
    else
      body = `<p>${esc(M[p.type].goal)}</p><div class="guide-rules">${M[p.type].rules.map((r) => `<div class="guide-rule">${esc(r)}</div>`).join('')}</div><div class="guide-tip">${esc(M[p.type].tip)}</div>`;
    dialog(
      tab === 'notes'
        ? 'My working notes.'
        : has
          ? 'Keep the evidence close.'
          : 'The rules, at a glance.',
      body,
      [{ label: 'Back to the board', action: 'close-dialog', icon: 'back' }],
      'quick-sheet',
    );
  }
  function accusation(p, s) {
    if (!['scene', 'dossier', 'witness'].includes(p.type)) return '';
    if (current.completedAt) return '';
    if (p.type === 'dossier' && !p.question)
      p = { ...p, question: 'Who carried the missing object?' };
    const ready =
      p.type === 'scene'
        ? C.sceneComplete(p, s)
        : p.type === 'dossier'
          ? X.dossierReady(p, s)
          : true;
    if (!ready)
      return `<div class="locked-question">${icon('lock')}${p.type === 'scene' ? 'Fit every person and clue to unlock your accusation.' : 'Complete both category grids before answering the final question.'}</div>`;
    const people =
      p.type === 'scene'
        ? p.people.filter((x) => x.id !== p.victim).map((x) => ({ id: x.id, name: x.name }))
        : p.people.map((name, id) => ({ name, id }));
    return `<section class="accusation"><div class="eyebrow">${p.type === 'witness' ? 'Test your conclusion' : 'The final deduction'}</div><h3>${esc(p.question || (p.type === 'scene' ? 'Who was alone with the victim?' : 'Who took the missing object?'))}</h3><p>${p.questionContext ? esc(p.questionContext) : p.type === 'scene' ? 'Only one suspect shares the victim’s room. Select them, then make your accusation.' : p.type === 'dossier' ? `The evidence links the theft to whoever carried the ${esc(p.categories[1].values[p.targetItem])}.` : 'Choose the only suspect who makes the truth count work. Your T/F notes do not affect the answer.'}</p><div class="accuse-options">${people.map((person) => B(esc(person.name), 'choose-accuse', '', 'secondary ' + (String(accuseChoice) === String(person.id) ? 'active' : ''), `data-id="${esc(person.id)}" aria-pressed="${String(accuseChoice) === String(person.id)}"`)).join('')}</div><div style="margin-top:13px">${B(p.type === 'witness' ? 'Submit conclusion' : 'Make accusation', 'submit-accuse', 'check', '', accuseChoice === null ? 'disabled' : '')}</div></section>`;
  }
  function playPage() {
    return AlibiClub.assistBar() + playPageInner();
  }
  function playPageInner() {
    if (!current) return '';
    const p = current.puzzle,
      s = AlibiClub.projected(p, current.state).state,
      m = M[p.type],
      name = p.people?.find?.((x) => x.id === selectedPerson)?.name,
      placement =
        p.type === 'scene'
          ? sceneMarkMode === 'board-cross'
            ? 'Tap an empty square to add or remove a board X.'
            : sceneMarkMode === 'candidate'
              ? `Mark possible squares for <strong>${esc(name)}</strong>.`
              : pencil
                ? `Rule out squares for <strong>${esc(name)}</strong>.`
                : `<strong>${esc(name)}</strong> is selected. Tap an empty square to place them.`
          : p.type === 'trail'
            ? brush === -1
              ? 'Tap an editable number to erase it.'
              : `Place <strong>${trailValue}</strong> in a square. The next unused number follows automatically.`
            : esc(m.gesture);
    return `${chapterAtmosphere(p)}${practiceReturnBanner(p)}<div class="play-head"><button class="round back-btn" data-action="back-to-collection" aria-label="${route.book ? 'Back to casebook' : 'Back to collection'}">${icon('back')}</button><div class="play-title"><div class="eyebrow">${esc(m.title)} ${route.book ? '· Casebook chapter' : ''}</div><h1>${esc(p.title)}</h1><div class="row">${difficulty(p.difficulty)}<span>${p.type === 'witness' ? p.statements.length + ' accounts' : p.size + ' × ' + p.size}</span>${settings.timer ? `<span id="timer">${time(sessionSeconds)}</span>` : ''}${saveLabel()}</div></div>${B('How to play', 'lesson', 'book', 'secondary', `data-type="${p.type}"`)}</div><div class="player-grid"><div class="board-column"><section class="board-card"><div class="board-heading"><div class="eyebrow">${current.completedAt ? 'Nicely solved' : p.type === 'scene' ? 'Reconstruct the scene' : p.type === 'dossier' ? 'Connect the evidence' : p.type === 'witness' ? 'Compare the accounts' : 'Your puzzle board'}</div><div class="row" style="gap:5px">${!['dossier', 'witness'].includes(p.type) ? round('zoom', 'zoom', zoomed ? 'Use normal board size' : 'Enlarge board') : ''}${round('pause', 'pause', 'Pause and hide the board')}</div></div>${current.completedAt ? `<div class="board-instruction">${icon('check')}<span><strong>${p.type === 'scene' || p.type === 'dossier' || p.type === 'witness' ? 'Case closed.' : 'Puzzle solved.'}</strong> Revisit your work, or move on to another puzzle.</span></div>` : `<div class="board-instruction">${icon(m.icon)}<span>${placement}</span></div>`}${p.type === 'scene' ? peoplePalette(p, s) : ''}<div class="board-wrap">${board(p, s)}</div>${current.completedAt ? '' : controls(p, s)}<div class="main-tools">${tool('Undo', 'undo', 'undo', false, current.undo.length ? '' : 'disabled')}${tool('Redo', 'redo', 'redo', false, current.redo.length ? '' : 'disabled')}${tool('Hint', 'hint', 'lightup')}${tool('Check', 'check', 'check')}</div>${feedback ? `<div class="feedback ${checking && E[p.type].validate(p, s).length ? 'error' : ''}" role="status">${esc(feedback)}</div>` : ''}${paused ? `<div class="paused-cover">${icon('pause')}<h2>Take your time.</h2><p>${store.mode === 'session' ? 'Your place is kept in this tab.' : 'Your place is saved on this device.'} There is no rush.</p>${B('Return to the puzzle', 'pause', 'play')}</div>` : ''}</section><div class="play-secondary">${B('Restart puzzle', 'restart', 'refresh', 'ghost small')}${globalThis.AlibiCuration.get(p) ? B('Curator notes', 'curation-notes', 'book', 'ghost small') : ''}${B('How to play', 'lesson', 'book', 'ghost small', `data-type="${p.type}"`)}</div>${accusation(p, s)}${current.completedAt ? `<div class="play-end"><h2>${route.book ? 'Another piece of the story.' : 'That satisfying “aha”.'}</h2><p>${current.hints ? `${current.hints} reveal${current.hints === 1 ? '' : 's'} used. Curiosity counts more than perfection.` : store.mode === 'session' ? 'Solved without a reveal. Export a backup to keep this session.' : 'Solved without a reveal. Your progress is saved on this device.'}</p>${B(route.book ? 'Continue the casebook' : 'Another ' + m.title.toLowerCase() + ' puzzle', 'next', 'arrow')}${B('Review the record', 'review-record', 'book', 'secondary')}${B('Back to collection', 'back-to-collection', '', 'ghost')}</div>` : ''}</div><aside class="evidence-column">${evidence(p, s)}<div class="info-note">${icon('device')}<span>${store.mode === 'session' ? 'This browser is keeping progress only in this tab. Export a backup before closing it.' : 'Progress saves as you play. No lives, no penalties, and no need to finish in one sitting.'}</span></div></aside></div>`;
  }
  function workshopPage() {
    return `<div class="page-head"><div><div class="eyebrow">Made to make room for more</div><h1>The workshop.</h1><p>Build a scene, reshape its floor plan, or import a whole new collection. Custom content stays on this device until you export it.</p></div></div><div class="chips workshop-tabs">${[
      ['scene', 'Scene maker', 'scene'],
      ['packs', 'Puzzle packs', 'dossier'],
      ['guide', 'Authoring guide', 'book'],
    ]
      .map(
        ([v, l, ic]) =>
          `<button class="chip ${workTab === v ? 'active' : ''}" data-action="work-tab" data-value="${v}">${icon(ic)}${l}</button>`,
      )
      .join(
        '',
      )}</div>${workTab === 'scene' ? sceneMaker() : workTab === 'packs' ? packDesk() : authorGuide()}`;
  }
  function sceneMaker() {
    return `<div class="workshop-grid"><section class="panel"><h2>A story of your own.</h2><p>Start with a solver-checked draft. Then edit rooms, furniture and clues in the visual editor below.</p><form id="scene-form"><div class="form-grid"><div class="field"><label for="draft-title">Case title</label><input id="draft-title" name="title" maxlength="90" value="${esc(makerFields.title)}" required></div><div class="field"><label for="draft-setting">Setting</label><input id="draft-setting" name="setting" maxlength="120" value="${esc(makerFields.setting)}" required></div><div class="field full"><label for="draft-story">Opening story</label><textarea id="draft-story" name="story" maxlength="1200" required>${esc(makerFields.story)}</textarea></div><div class="field full"><label for="draft-names">Five names, separated by commas</label><input id="draft-names" name="names" value="${esc(makerFields.names)}" required><span class="fine">The last person is the victim.</span></div><div class="field"><label for="draft-seed">Puzzle seed</label><input id="draft-seed" name="seed" type="number" min="1" max="2147483647" value="${esc(makerFields.seed)}" required></div><div class="field" style="align-self:end"><button type="submit" class="btn wide" ${draftBusy ? 'disabled' : ''}>${draftBusy ? '<span class="spinner"></span>' : icon('star')} Generate draft</button></div></div></form></section><section class="panel"><h2>From idea to playable.</h2><div class="workshop-step"><i>1</i><span><strong>Name the case.</strong> Set the scene, people and seed.</span></div><div class="workshop-step"><i>2</i><span><strong>Shape the floor plan.</strong> Paint rooms, move furniture and revise clues.</span></div><div class="workshop-step"><i>3</i><span><strong>Check the logic.</strong> Verify that the edited rules still allow exactly one solution.</span></div><div class="workshop-step"><i>4</i><span><strong>Play or share.</strong> Add it locally, or export a JSON pack for another player.</span></div><div class="verification"><strong>A useful boundary</strong><br>The generator provides a mechanical draft, not a fully edited mystery. Human playtesting still determines whether the clues feel elegant, the story makes sense, and the difficulty is right.</div><div class="docs-card"><h3>Already have a puzzle pack?</h3><p>Any supported puzzle family can be imported as data. Packs cannot execute code or fetch remote assets.</p>${B('Open the pack desk', 'work-tab', 'upload', 'secondary small', 'data-value="packs"')}</div></section></div>${draft ? draftEditor() : ''}`;
  }
  function draftEditor() {
    const p = draft;
    return `<section class="panel draft-editor"><div class="row between wrap" style="margin-bottom:16px"><div><div class="eyebrow">Visual scene editor</div><h2>${esc(p.title)}</h2></div><span class="badge ${draftVerified ? '' : 'amber'}">${draftVerified ? 'One unique solution verified' : 'Edited draft · recheck required'}</span></div><div class="draft-editor-grid"><div><div class="chips">${[
      ['room', 'Paint rooms'],
      ['furniture', 'Place furniture'],
    ]
      .map(
        ([v, l]) =>
          `<button class="chip ${draftMode === v ? 'active' : ''}" data-action="draft-mode" data-value="${v}">${l}</button>`,
      )
      .join('')}</div><div class="row wrap" style="margin-top:13px">${
      draftMode === 'room'
        ? p.roomNames
            .map(
              (name, i) =>
                `<button class="chip ${draftPaint === i ? 'active' : ''}" data-action="draft-paint" data-value="${i}">${String.fromCharCode(65 + i)} · ${esc(name)}</button>`,
            )
            .join('')
        : `<select id="draft-object" aria-label="Furniture">${[
            ['plant', 'Plant'],
            ['table', 'Table'],
            ['piano', 'Piano'],
            ['shelf', 'Bookshelf'],
            ['lamp', 'Lamp'],
            ['none', 'Remove furniture'],
          ]
            .map(
              ([v, l]) =>
                `<option value="${v}" ${draftObject === v ? 'selected' : ''}>${l}</option>`,
            )
            .join('')}</select>`
    }</div><div class="draft-board" aria-label="Editable floor plan">${range(25)
      .map((i) => {
        const o = p.objects.find((o) => o.cell === i),
          who = draftShowSolution ? p.people.find((x) => p.solution[x.id] === i) : null;
        return `<button class="draft-cell" data-action="draft-cell" data-cell="${i}" aria-label="Edit row ${Math.floor(i / 5) + 1}, column ${String.fromCharCode(65 + (i % 5))}, room ${esc(p.roomNames[p.rooms[i]])}" style="background:var(--room-${p.rooms[i]})"><span class="draft-room">${String.fromCharCode(65 + p.rooms[i])}</span>${who ? token(who, p) : o ? icon(o.kind) : ''}</button>`;
      })
      .join(
        '',
      )}</div><div class="row wrap">${B(draftShowSolution ? 'Hide author solution' : 'Show author solution', 'draft-solution', 'eye', 'secondary small')}</div><p class="fine" style="margin-top:12px">Click squares to edit. Room letters remain visible independently of colour. Editing invalidates the verification. The shown solution is the last verified arrangement.</p><div class="form-grid" style="margin-top:17px">${p.roomNames.map((name, i) => `<div class="field"><label for="room-name-${i}">Room ${String.fromCharCode(65 + i)}</label><input id="room-name-${i}" value="${esc(name)}" data-room-name="${i}" maxlength="40"></div>`).join('')}</div></div><div><h3 style="margin-bottom:12px">${p.clues.length} clues in this draft</h3><div class="draft-clues" data-scroll-key="draft-clues">${p.clues.map((cl, i) => `<div class="draft-clue"><span>${esc(C.clueText(p, cl))}</span>${round('remove-draft-clue', 'close', 'Remove clue', `data-index="${i}"`)}</div>`).join('')}</div><form id="clue-form" class="clue-builder"><div class="eyebrow">Add a clue</div><div class="row"><select name="who" id="clue-who" aria-label="Person">${p.people.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select><select name="kind" id="clue-kind" aria-label="Clue relation">${[
      ['room', 'Was in room'],
      ['notRoom', 'Not in room'],
      ['row', 'Was in row'],
      ['col', 'Was in column'],
      ['edge', 'On an outside edge'],
      ['notEdge', 'Not on an edge'],
      ['left', 'Left of person'],
      ['above', 'Above person'],
      ['sameRoom', 'Same room as'],
      ['differentRoom', 'Different room from'],
    ]
      .map(([v, l]) => `<option value="${v}">${l}</option>`)
      .join(
        '',
      )}</select><select name="value" id="clue-value" aria-label="Clue value">${p.roomNames.map((v, i) => `<option value="${i}">${esc(v)}</option>`).join('')}</select><button type="submit" class="btn small secondary">Add clue</button></div></form><div class="verification ${draftVerified ? '' : 'warn'}" id="draft-verification">${draftBusy ? '<span class="spinner"></span> Checking all possible arrangements…' : draftVerified ? 'Verified: these rules produce exactly one solution. Add the puzzle locally, or export it as a pack.' : 'The draft has not been verified since the last change. Check its logic before publishing.'}</div><div class="row actions">${B('Verify the logic', 'verify-draft', 'check', '', draftBusy ? 'disabled' : '')}${B('Add & play', 'add-draft', 'play', 'secondary', !draftVerified || draftBusy ? 'disabled' : '')}${B('Export pack', 'export-draft', 'download', 'secondary', !draftVerified || draftBusy ? 'disabled' : '')}</div><p class="fine" style="margin-top:15px">If there are multiple solutions, add a clue. If there are none, remove or correct a clue. Furniture must not invalidate a “next to” clue that refers to it.</p></div></div></section>`;
  }
  function packDesk() {
    return `<div class="workshop-grid"><section class="panel"><h2>Bring another collection.</h2><p>Import a JSON puzzle pack. The browser checks the format, rules and uniqueness in a background worker before adding anything.</p><div class="drop-zone">${icon('upload')}<p>A data-only pack for any supported puzzle family.</p>${B('Choose a JSON pack', 'import-pack', 'upload')}</div><p class="fine">Maximum 3 MB, 150 puzzles per pack. Imports cannot overwrite an existing puzzle ID. Validation is bounded and aborts safely if a pack is too expensive to check.</p><div class="row actions">${B('Export all starter examples', 'export-template', 'download', 'secondary')}${B('Authoring guide', 'work-tab', 'book', 'ghost', 'data-value="guide"')}</div></section><section class="panel"><h2>On your workbench.</h2><p>Installed custom packs stay local. To share one, export it and give the JSON file to another player.</p><div class="library-summary"><div class="mini-stat"><strong>${C.TYPES.length}</strong><small>Supported engines</small></div><div class="mini-stat"><strong>${packs.length - 1}</strong><small>Custom packs</small></div><div class="mini-stat"><strong>${all().length - starter.puzzles.length}</strong><small>Custom puzzles</small></div></div>${
      packs
        .slice(1)
        .map(
          (p) =>
            `<div class="pack-row">${icon('dossier')}<div><strong>${esc(p.title)}</strong><small>${p.puzzles.length} puzzles · v${p.version}</small></div>${B('Export', 'export-pack', 'download', 'secondary small', `data-id="${esc(p.id)}"`)}</div>`,
        )
        .join('') ||
      '<div class="verification">No custom packs yet. Make a scene in the editor or import a pack to begin.</div>'
    }</section></div>`;
  }
  function authorGuide() {
    return `<div class="workshop-grid"><section class="panel"><h2>Scenarios are data.</h2><p>A pack has an ID, title, version and list of puzzle definitions. Each puzzle has its own stable ID and revision, plus the fields its engine needs. Export the starter examples to see every supported format.</p><div class="guide-rules"><div class="guide-rule">Use a unique, lowercase ID such as my-puzzle-01. An imported pack must not collide with the installed collection.</div><div class="guide-rule">A solution is required for validation and optional reveals. The importer independently checks that the rules allow exactly one solution.</div><div class="guide-rule">Changing a published puzzle’s rules requires a new revision. Existing game saves keep a snapshot of their original puzzle.</div><div class="guide-rule">Text is plain text. There are no HTML snippets, remote asset URLs or executable puzzle plugins in imported packs.</div></div><div class="row actions">${B('Export starter examples', 'export-template', 'download')}${B('Open scene maker', 'work-tab', 'scene', 'secondary', 'data-value="scene"')}</div></section><section class="panel"><h2>Publish deliberately.</h2><p>Importing adds content to your device. It does not update the public website. For everyone to receive an official pack, add it to the source catalogue, run the tests, build the static release, then update the existing deployment.</p><div class="docs-card"><h3>A new family needs an engine.</h3><p>Implement initial state, actions, constraint checks, completion detection, a bounded solver, definition/state validation, a renderer and a mini lesson. The source bundle documents these extension points.</p></div><div class="docs-card"><h3>Before calling a puzzle finished</h3><p>Verify one solution, solve it without hints, check every clue, test on a narrow screen, and ask another person to play it. Uniqueness is necessary; it does not guarantee an enjoyable deduction path.</p></div><p class="fine" style="margin-top:17px">The full publishing bundle includes architecture, schemas, authoring examples, deployment steps, backup strategy, automated tests and an agent handoff.</p></section></div>`;
  }
  function render() {
    if (route.page === 'quiet') {
      if (!document.getElementById('quiet-host')) {
        $('#app').innerHTML =
          '<div id="quiet-update"></div><div id="quiet-host"><p style="padding:24px">Opening the quiet wing…</p></div>';
        globalThis.AlibiDelivery.observe();
        AlibiClub.afterRender(route);
        document.getElementById('zen-exit')?.remove();
      }
      document.getElementById('quiet-update').innerHTML =
        globalThis.AlibiTheatre.bar(true) +
        (waitingUpdate
          ? `<div class="banner"><span>A new version is ready.</span>${B('Save & update', 'apply-update', 'refresh', 'small')}</div>`
          : '');
      globalThis.AlibiTheatre.attach(route);
      return;
    }
    if (rendering) return;
    rendering = true;
    const active = document.activeElement,
      focusID = active?.id,
      focusFallbackID = active?.dataset.focusFallback,
      selection = ['INPUT', 'TEXTAREA'].includes(active?.tagName)
        ? [active.selectionStart, active.selectionEnd]
        : null,
      scroll = [...document.querySelectorAll('[data-scroll-key]')].map((el) => [
        el.dataset.scrollKey,
        el.scrollLeft,
        el.scrollTop,
      ]),
      disclosures = [...document.querySelectorAll('details[data-disclosure-key]')].map((el) => [
        el.dataset.disclosureKey,
        el.open,
      ]),
      sy = window.scrollY;
    let usedFocusFallback = false;
    const isFocusTarget = (el) =>
      el &&
      !el.hidden &&
      !el.disabled &&
      el.getAttribute('aria-hidden') !== 'true' &&
      el.getClientRects().length;
    try {
      const views = {
        home,
        library: libraryPage,
        casebooks: casebooksPage,
        story: storyPage,
        journal: journalPage,
        settings: settingsPage,
        workshop: workshopPage,
        privacy: privacyPage,
        changelog: () => globalThis.AlibiUpdates.page(),
        play: playPage,
        salon: () => AlibiClub.roomPage(route.id),
        club: () => AlibiClub.profile(),
        lab: () => AlibiClub.labPage(),
      };
      $('#app').innerHTML = shell((views[route.page] || home)());
      for (const [key, open] of disclosures) {
        const el = document.querySelector(`details[data-disclosure-key="${key}"]`);
        if (el) el.open = open;
      }
      theme();
      AlibiClub.afterRender(route);
      globalThis.AlibiTheatre.attach(route, current?.puzzle);
      globalThis.AlibiDelivery.observe();
      if (current)
        AlibiClub.decorateAssist(
          current.puzzle,
          current.state,
          selectedCell,
          selectedPerson,
          pencil,
        );
      for (const [key, x, y] of scroll) {
        const el = document.querySelector(`[data-scroll-key="${key}"]`);
        if (el) {
          el.scrollLeft = x;
          el.scrollTop = y;
        }
      }
      if (focusID) {
        const el = document.getElementById(focusID);
        if (isFocusTarget(el)) {
          el.focus({ preventScroll: true });
          if (selection && typeof el.setSelectionRange === 'function' && selection[0] !== null)
            try {
              el.setSelectionRange(...selection);
            } catch {}
        } else {
          const fallback = document.getElementById(focusFallbackID) || $('#main');
          if (isFocusTarget(fallback)) {
            fallback.focus();
            usedFocusFallback = true;
          }
        }
      }
      if (!usedFocusFallback && window.scrollY !== sy)
        window.scrollTo({ top: sy, behavior: 'instant' });
    } finally {
      rendering = false;
    }
  }
  function feedbackSound() {
    if (settings.haptics && navigator.vibrate) navigator.vibrate(7);
    if (!settings.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const a = feedbackSound.context || (feedbackSound.context = new AC());
      a.resume();
      const o = a.createOscillator(),
        g = a.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(590, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(410, a.currentTime + 0.065);
      g.gain.setValueAtTime(0.018, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.07);
      o.connect(g);
      g.connect(a.destination);
      o.start();
      o.stop(a.currentTime + 0.075);
    } catch {}
  }
  function blocked() {
    if (!current || paused) return true;
    if (storageFatal || saveError) {
      toast('Export this session or reload before making more changes.', true);
      return true;
    }
    if (current.completedAt) {
      toast('This puzzle is solved. Restart to play again, or use Undo to review a step.');
      return true;
    }
    return false;
  }
  function completion() {
    if (!current) return;
    const p = current.puzzle;
    if (
      E[p.type].complete(p, AlibiClub.projected(p, current.state).state) &&
      !current.completedAt
    ) {
      current.completedAt = new Date().toISOString();
      current.firstCompletedAt = current.firstCompletedAt || current.completedAt;
      globalThis.AlibiTheatre.moment('complete');
      paused = false;
      render();
      const mystery = ['scene', 'dossier', 'witness'].includes(p.type);
      let explanation =
        'Every constraint is satisfied. Your completed board and notes stay in your journal.';
      if (p.type === 'scene') {
        const id = C.murderer(p, current.state),
          who = p.people.find((x) => x.id === id),
          room = p.roomNames[p.rooms[current.state.placements[p.victim]]];
        explanation = `${who.name} was the only suspect in the ${room} with the victim. Every person and clue fits the reconstructed scene.`;
      } else if (p.type === 'dossier') {
        const a = X.dossierAssignments(p, current.state),
          who = p.people[a.slice(p.size).indexOf(p.targetItem)];
        explanation = `${who} carried the ${p.categories[1].values[p.targetItem]}. Both category grids fit every clue.`;
      } else if (p.type === 'witness') {
        const who = p.people[current.state.accused],
          trues = p.statements
            .map((cl, i) => (X.truth(cl, current.state.accused) ? i + 1 : null))
            .filter((v) => v !== null);
        explanation = `${who} is the only culprit who makes exactly ${p.trueCount} statements true. The true account${trues.length === 1 ? ' is' : 's are'} ${trues.join(', ')}.`;
      }
      dialog(
        mystery ? 'Case closed.' : 'That satisfying “aha”.',
        `<div class="success-icon">${icon('check')}</div><p>${esc(explanation)}</p>${chapterReveal(p)}<div class="success-facts"><div><strong>${current.moves}</strong><small>Moves made</small></div><div><strong>${current.hints}</strong><small>Reveals used</small></div><div><strong>${solved(current) ? '✓' : ''}</strong><small>${store.mode === 'session' ? 'In this session’s journal' : 'Saved in your journal'}</small></div></div>${route.book ? '<p>You have completed another chapter. Continue the casebook whenever you are ready.</p>' : ''}`,
        [
          {
            label: route.book ? 'Read the next page' : 'Another puzzle',
            action: 'next',
            icon: 'arrow',
          },
          { label: 'Review the record', action: 'review-record', secondary: true },
        ],
      );
    }
  }
  function commit(next, { reveal = false, history = true } = {}) {
    if (!current || C.equal(next, current.state)) return false;
    if (history) {
      current.undo.push(C.clone(current.state));
      current.undo = current.undo.slice(-80);
      current.redo = [];
    }
    current.state = next;
    current.moves++;
    if (reveal) current.hints++;
    checking = false;
    feedback = '';
    current.completedAt = null;
    feedbackSound();
    completion();
    enqueueSave();
    render();
    return true;
  }
  function act(action, opts = {}) {
    if (blocked()) return false;
    const p = current.puzzle,
      s = current.state;
    if (AlibiClub.assistance() !== 'off' && !action.pencil) {
      let why = '';
      if (action.type === 'set' && action.value >= 0)
        why = AlibiAssist.reason(p, s, action.cell, action.value);
      if (action.type === 'place' && s.placements[action.who] !== action.cell)
        why = AlibiAssist.reason(p, s, action.cell, null, action.who);
      if (p.type === 'dossier' && action.type === 'mark' && action.value === 1) {
        const projection = AlibiClub.projected(p, s);
        why = projection.derived[action.cell] || '';
      }
      if (why) {
        toast(why);
        return false;
      }
    }
    const next = E[current.puzzle.type].reduce(current.puzzle, current.state, {
      ...action,
      auto: false,
    });
    return commit(next, opts);
  }
  function nextTrail(s, p) {
    return (
      range(p.size ** 2)
        .map((i) => i + 1)
        .find((v) => !s.cells.includes(v) && !p.givens.includes(v)) || 1
    );
  }
  function onCell(index, reverse = false) {
    if (blocked()) return;
    const p = current.puzzle,
      s = current.state;
    if (!Number.isInteger(index) || index < 0 || index >= p.size ** 2 || !enabledCell(p, index))
      return;
    selectedCell = index;
    const t = p.type;
    if (t === 'bridges') {
      const from = bridgeAnchor;
      if (from === index) bridgeAnchor = null;
      else if (from === null) bridgeAnchor = index;
      else {
        const action = { type: 'connect', from, to: index, reverse };
        const next = E.bridges.reduce(p, s, action);
        if (next !== s) {
          bridgeAnchor = null;
          commit(next);
        } else {
          bridgeAnchor = index;
          toast('Choose the nearest island in the same row or column.');
        }
      }
      render();
      document.getElementById('cell-' + index)?.focus({ preventScroll: true });
      return;
    }
    if (t === 'scene') {
      const occupant = p.people.find((w) => s.placements[w.id] === index);
      if (occupant && (sceneMarkMode !== 'place' || pencil)) {
        toast('Choose an empty square for working notes.');
        return;
      }
      if (sceneMarkMode === 'candidate' || sceneMarkMode === 'board-cross') {
        act({ type: sceneMarkMode, who: selectedPerson, cell: index });
        return;
      }
      if (pencil) {
        act({ type: 'exclude', who: selectedPerson, cell: index });
        return;
      }
      if (occupant && occupant.id !== selectedPerson) {
        selectedPerson = occupant.id;
        render();
        toast(occupant.name + ' selected. Tap an empty square to move them.');
        return;
      }
      const person = selectedPerson;
      if (act({ type: 'place', who: person, cell: index })) {
        const unplaced = p.people.find(
          (w) => current.state.placements[w.id] === undefined && w.id !== person,
        );
        if (current.state.placements[person] !== undefined && unplaced)
          selectedPerson = unplaced.id;
        render();
      }
      return;
    }
    if (t === 'sudoku' || t === 'futoshiki') {
      render();
      document.getElementById('cell-' + index)?.focus({ preventScroll: true });
      return;
    }
    if (t === 'binary') {
      const v = reverse
        ? 0
        : brush === 'cycle'
          ? ((s.cells[index] + 2) % 3) - 1
          : s.cells[index] === brush
            ? -1
            : brush;
      act({ type: 'set', cell: index, value: v });
      return;
    }
    if (['nonogram', 'lightup', 'tents'].includes(t)) {
      const value = reverse ? 0 : s.cells[index] === brush ? -1 : brush;
      act({ type: 'set', cell: index, value });
      return;
    }
    if (t === 'aquarium') {
      const tank = p.tanks[index],
        rs = X.tankRows(p)[tank],
        level = rs.indexOf(Math.floor(index / p.size)) + 1,
        value = brush === 0 || reverse ? 0 : s.levels[tank] === level ? level - 1 : level;
      act({ type: 'level', tank, value });
      return;
    }
    if (t === 'network') {
      act({ type: 'rotate', cell: index, reverse });
      return;
    }
    if (t === 'trail') {
      if (act({ type: 'set', cell: index, value: brush === -1 ? 0 : trailValue })) {
        trailValue = nextTrail(current.state, p);
        render();
      }
      return;
    }
  }
  function erase() {
    if (blocked()) return;
    const p = current.puzzle;
    if (p.type === 'bridges') {
      bridgeAnchor = null;
      render();
      return;
    }
    if (p.type === 'scene') {
      const cell = current.state.placements[selectedPerson];
      if (cell !== undefined) act({ type: 'clear', cell });
      else toast('That person has not been placed yet.');
    } else if (p.type === 'sudoku' || p.type === 'futoshiki' || p.type === 'trail')
      act({ type: 'set', cell: selectedCell, value: 0 });
    else if (['nonogram', 'binary', 'lightup', 'tents'].includes(p.type))
      act({ type: 'set', cell: selectedCell, value: -1 });
  }
  function checkBoard() {
    if (!current || paused) return;
    checking = true;
    const p = current.puzzle,
      issues = E[p.type].validate(p, current.state);
    if (issues.length)
      feedback =
        issues[0].message +
        (issues.length > 1 ? ` (${issues.length} rule conflicts to revisit.)` : '');
    else if (E[p.type].complete(p, current.state)) feedback = 'Solved. Every rule is satisfied.';
    else if (p.type === 'scene' && C.sceneComplete(p, current.state))
      feedback = 'Every placement fits. Now identify the suspect in the victim’s room.';
    else if (p.type === 'dossier' && X.dossierReady(p, current.state))
      feedback = 'Both grids fit the clues. Use the final evidence to answer the final question.';
    else
      feedback =
        'No current rule conflicts found. This does not guarantee every entry is correct; the puzzle is not complete yet.';
    render();
  }
  function showHint() {
    if (!current) return;
    const hint = C.insights.deduction(current.puzzle, current.state);
    dialog(
      hint ? 'Follow the reasoning.' : 'A small nudge.',
      `<div class="hint-box">${hint ? `<div class="deduction-title">${esc(hint.rule)}</div>${esc(hint.message)}` : esc(M[current.puzzle.type].tip)}</div><p>${hint ? 'This follows the clues and your current board; it does not look at the stored answer. If an earlier entry is wrong, revisit it first.' : 'This is a general strategy, not a check against the hidden answer.'}</p><p class="fine">An optional reveal places one answer-based step. Reveals are counted, with no penalty.</p>`,
      [
        { label: 'Keep thinking', action: 'close-dialog', secondary: true },
        { label: 'Reveal one step', action: 'reveal-confirm', icon: 'eye' },
      ],
    );
  }
  function revealConfirm() {
    if (!current) return;
    const h = C.hint(current.puzzle, current.state);
    hintAction = h.action;
    dialog(
      'Reveal one step?',
      `<p>${esc(h.message)}</p><p class="fine">This suggestion consults the stored solution. Confirming places one correct answer or corrects one entry, and adds one to your reveal count.</p>`,
      [
        { label: 'Not yet', action: 'close-dialog', secondary: true },
        ...(h.action ? [{ label: 'Place this step', action: 'reveal-apply', icon: 'eye' }] : []),
      ],
    );
  }
  function reviewRecord() {
    if (!current?.completedAt) return;
    const rows = C.insights.recap(current.puzzle, current.state);
    dialog(
      'The completed record.',
      `<p>${esc(current.puzzle.title)}</p><ul class="debrief-list">${rows.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>`,
      [
        {
          label: route.book ? 'Read the next page' : 'Another puzzle',
          action: 'next',
          icon: 'arrow',
        },
        { label: 'Back to my board', action: 'close-dialog', secondary: true },
      ],
    );
  }
  function applyReveal() {
    if (!current || !hintAction) return;
    closeDialog();
    if (blocked()) return;
    let next;
    if (current.puzzle.type === 'network') {
      next = C.clone(current.state);
      next.rotations[hintAction.cell] = current.puzzle.solution[hintAction.cell];
    } else
      next = E[current.puzzle.type].reduce(current.puzzle, current.state, {
        ...hintAction,
        auto: false,
      });
    commit(next, { reveal: true });
    if (current.puzzle.type === 'trail') trailValue = nextTrail(current.state, current.puzzle);
    render();
  }
  function undo(redo = false) {
    if (!current || paused || saveError || storageFatal) return;
    const from = redo ? current.redo : current.undo,
      to = redo ? current.undo : current.redo;
    if (!from.length) return;
    to.push(C.clone(current.state));
    current.state = from.pop();
    current.completedAt = null;
    feedback = '';
    checking = false;
    accuseChoice = null;
    if (current.puzzle.type === 'trail') trailValue = nextTrail(current.state, current.puzzle);
    completion();
    enqueueSave();
    render();
  }
  function nextPuzzle() {
    closeDialog();
    if (current && route.book) {
      navigate('story', keyFor(current.puzzle), route.book);
      return;
    }
    if (!current) {
      navigate('library');
      return;
    }
    const ps = all().filter((p) => p.type === current.puzzle.type),
      i = ps.findIndex((p) => p.id === current.puzzle.id),
      rest = [...ps.slice(i + 1), ...ps.slice(0, i)],
      p = rest.find((p) => !solved(rec(p))) || rest[0];
    if (p) navigate('play', keyFor(p));
    else navigate('library', current.puzzle.type);
  }
  function startLesson(type, automatic = false) {
    if (!M[type]) return;
    lesson = { type, step: 0, done: false, marks: [], selected: false, automatic };
    renderLesson();
  }
  function renderLesson() {
    if (!lesson) return;
    const l = lesson,
      m = M[l.type];
    if (l.step === 0) {
      dialog(
        m.title + '.',
        `<div class="dialog-eyebrow">${m.tag} · A short hands-on lesson</div><div class="lesson-art">${art(l.type)}</div><p>${esc(m.goal)}</p><div class="hint-box">${esc(m.gesture)}</div><p class="fine">You can replay this lesson from the puzzle’s How to play button at any time.</p>`,
        [
          { label: 'Try a tiny example', action: 'lesson-example', icon: 'arrow' },
          { label: 'Start playing', action: 'lesson-finish', secondary: true },
        ],
      );
      return;
    }
    const lc = (i, content, cls = '', attrs = '') =>
      `<button class="lesson-cell ${cls}" data-action="lesson-tap" data-cell="${i}" ${attrs}>${content}</button>`;
    let demo = '';
    if (l.type === 'scene')
      demo = `<div class="lesson-options">${B('Iris', 'lesson-person', 'scene', l.selected ? '' : 'secondary')}</div><div class="lesson-grid" style="--cols:3">${range(
        9,
      )
        .map((i) =>
          lc(
            i,
            l.done && i === 5
              ? 'I'
              : `${String.fromCharCode(65 + (i % 3))}${Math.floor(i / 3) + 1}`,
            i === 5 ? (l.done ? 'correct' : 'target') : '',
          ),
        )
        .join('')}</div>`;
    if (l.type === 'dossier')
      demo = `<div class="lesson-text">Columns: Study · Hall · Kitchen<br>Rows: Iris · Theo · Mina</div><div class="lesson-grid" style="--cols:3">${range(
        9,
      )
        .map((i) =>
          lc(
            i,
            l.done ? (i === 0 ? '✓' : [1, 2, 3, 6].includes(i) ? '×' : '') : '',
            i === 0 ? (l.done ? 'correct' : 'target') : '',
          ),
        )
        .join('')}</div>`;
    if (l.type === 'sudoku' || l.type === 'futoshiki') {
      const vals = l.type === 'sudoku' ? [1, 2, 3, l.done ? 4 : '?'] : [1, 2, l.done ? 3 : '?', 4];
      demo = `<div class="lesson-grid" style="--cols:4">${vals.map((v, i) => `<span class="lesson-cell ${v === '?' ? 'target' : ''}">${v}</span>`).join('')}</div>${l.type === 'futoshiki' ? '<div class="lesson-text">2 &lt; □ &lt; 4</div>' : ''}<div class="lesson-options">${range(
        4,
      )
        .map((i) => B(String(i + 1), 'lesson-tap', '', 'secondary', `data-cell="${i + 1}"`))
        .join('')}</div>`;
    }
    if (l.type === 'bridges')
      demo = `<div class="bridge-lesson"><span>2</span><strong>${l.done ? '══' : '?'}</strong><span>2</span></div><div class="lesson-options">${[1, 2].map((v) => B(v + (v === 1 ? ' bridge' : ' bridges'), 'lesson-tap', '', 'secondary', `data-cell="${v}"`)).join('')}</div>`;
    if (l.type === 'binary')
      demo = `<div class="lesson-grid" style="--cols:3"><span class="lesson-cell">${icon('sun')}</span><span class="lesson-cell">${icon('sun')}</span><span class="lesson-cell target">${l.done ? icon('moon') : '?'}</span></div><div class="lesson-options">${B('Sun', 'lesson-tap', 'sun', 'secondary', 'data-cell="0"')}${B('Moon', 'lesson-tap', 'moon', 'secondary', 'data-cell="1"')}</div>`;
    if (l.type === 'nonogram')
      demo = `<div class="lesson-text"><strong>Row clue: 4</strong></div><div class="lesson-grid" style="--cols:5">${range(
        5,
      )
        .map((i) =>
          lc(
            i,
            i === 0 ? '×' : '',
            l.marks.includes(i) ? 'painted' : i ? 'target' : '',
            i === 0 ? 'disabled' : '',
          ),
        )
        .join('')}</div>`;
    if (l.type === 'witness')
      demo =
        '<div class="lesson-statement">“Iris took it.”</div><div class="lesson-statement">“Iris did not take it.”</div><div class="lesson-statement">“Theo took it.”</div><div class="lesson-options">' +
        ['Iris', 'Theo', 'Mina']
          .map((name, i) =>
            B(name, 'lesson-tap', '', l.done && i === 1 ? '' : 'secondary', `data-cell="${i}"`),
          )
          .join('') +
        '</div>';
    if (l.type === 'lightup')
      demo = `<div class="lesson-grid" style="--cols:5">${range(5)
        .map((i) =>
          lc(
            i,
            l.done && i === 0 ? icon('lightup') : '',
            l.done ? 'correct' : i === 0 ? 'target' : '',
          ),
        )
        .join('')}</div>`;
    if (l.type === 'tents')
      demo = `<div class="lesson-text">Row totals: 1, 0, 0</div><div class="lesson-grid" style="--cols:3">${range(
        9,
      )
        .map((i) =>
          lc(
            i,
            i === 4 ? icon('tree') : l.done && i === 1 ? icon('tents') : '',
            i === 1 ? (l.done ? 'correct' : 'target') : '',
            i === 4 ? 'disabled' : '',
          ),
        )
        .join('')}</div>`;
    if (l.type === 'aquarium')
      demo = `<div class="lesson-grid" style="--cols:2;gap:0;max-width:160px;border:2px solid var(--board-border)">${range(
        6,
      )
        .map((i) =>
          lc(
            i,
            i >= 2 && i < 4 ? 'Tap here' : '',
            l.done && i >= 2 ? 'wet' : i >= 2 && i < 4 ? 'target' : '',
          ),
        )
        .join('')}</div>`;
    if (l.type === 'network')
      demo = `<div class="lesson-grid" style="--cols:3">${range(3)
        .map((i) =>
          lc(
            i,
            `<svg viewBox="0 0 60 60" width="45" height="45" aria-hidden="true"><path d="${i === 1 && !l.done ? 'M30 0v60' : 'M0 30h60'}" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>`,
            i === 1 ? (l.done ? 'correct' : 'target') : '',
          ),
        )
        .join('')}</div>`;
    if (l.type === 'trail')
      demo = `<div class="lesson-grid" style="--cols:3">${range(3)
        .map((i) =>
          lc(
            i,
            i === 1 ? (l.done ? '2' : '?') : i + 1,
            i === 1 ? (l.done ? 'correct' : 'target') : '',
          ),
        )
        .join('')}</div>`;
    dialog(
      'Try it once.',
      `<div class="dialog-eyebrow">${m.title} · A miniature example</div><p>${esc(m.lesson)}</p><div class="lesson-demo">${demo}${l.done ? `<div class="lesson-success" role="status">${icon('check')} ${esc(m.lessonNote)}</div>` : '<div class="lesson-text">Use the example above. This does not change your puzzle.</div>'}</div><div class="lesson-progress"><i class="on"></i><i class="${l.done ? 'on' : ''}"></i></div>`,
      [
        {
          label: l.done ? 'Ready to play' : 'Skip example',
          action: 'lesson-finish',
          icon: l.done ? 'arrow' : '',
          secondary: !l.done,
        },
        { label: 'Back to introduction', action: 'lesson-intro', secondary: true },
      ],
    );
  }
  function lessonTap(i) {
    if (!lesson || lesson.done) return;
    const l = lesson,
      t = l.type;
    let correct = false;
    if (t === 'scene') {
      if (!l.selected) {
        toast('Choose Iris before placing her.');
        return;
      }
      correct = i === 5;
    } else if (t === 'dossier') correct = i === 0;
    else if (t === 'bridges') correct = i === 2;
    else if (t === 'sudoku') correct = i === 4;
    else if (t === 'futoshiki') correct = i === 3;
    else if (t === 'binary' || t === 'witness' || t === 'tents' || t === 'network' || t === 'trail')
      correct = i === 1;
    else if (t === 'lightup') correct = i === 0;
    else if (t === 'aquarium') correct = i === 2 || i === 3;
    else if (t === 'nonogram') {
      if (i >= 1 && i <= 4 && !l.marks.includes(i)) l.marks.push(i);
      correct = l.marks.length === 4;
      if (!correct) {
        renderLesson();
        return;
      }
    }
    if (correct) {
      l.done = true;
      feedbackSound();
      renderLesson();
    } else toast('Not quite. Compare that choice with the rule in the example.');
  }
  async function lessonFinish() {
    if (!lesson) return;
    const t = lesson.type;
    prefs.seen = [...new Set([...prefs.seen, t])];
    await savePreferences();
    closeDialog();
    if (current?.puzzle.type === t) {
      render();
      return;
    }
    const ps = all().filter((p) => p.type === t),
      p = ps.find((p) => !solved(rec(p))) || ps[0];
    if (p) navigate('play', keyFor(p));
  }
  function download(name, data, mime = 'application/json') {
    const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
        type: mime,
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  async function cabinetBackup() {
    await enqueueSave();
    await queue;
    const data = await store.export(),
      merged = new Map(data.runs.map((r) => [r.key, r]));
    for (const r of records.values()) merged.set(r.key, C.clone(r));
    if (current) merged.get(current.key).elapsed = sessionSeconds;
    data.runs = [...merged.values()];
    data.packs = [...new Map([...data.packs, ...packs.slice(1)].map((p) => [p.id, p])).values()];
    data.settings = settings;
    data.preferences = prefs;
    data.applicationVersion = cfg.version;
    return data;
  }
  async function exportBackup() {
    download(`alibi-backup-${new Date().toISOString().slice(0, 10)}.json`, await cabinetBackup());
    toast('Backup exported. Keep a copy outside this browser.');
  }
  let stagedAll = null;
  async function exportAll() {
    const cabinet = await cabinetBackup();
    const warnings = [];
    await AlibiClub.save().catch((e) =>
      warnings.push('Club save could not be flushed: ' + e.message),
    );
    let quiet = null,
      raw = null;
    try {
      if (globalThis.navigator?.onLine === false) throw Error('Quiet Wing is unavailable offline.');
      await AlibiActivities.load();
      if (AlibiActivities.diagnostics().kind === 'quiet' && globalThis.QWApp) {
        await globalThis.QWApp.flush();
        quiet = globalThis.QWApp.state;
      } else quiet = globalThis.QWRetainedState;
      if (!quiet && globalThis.QWStore) {
        quiet = (await globalThis.QWStore.open()).saved;
        raw = await globalThis.QWStore.raw();
      } else if (globalThis.QWStore) raw = await globalThis.QWStore.raw();
      if (quiet && !raw && globalThis.QWStore) raw = await globalThis.QWStore.raw();
      if (!quiet) throw Error('No committed Quiet Wing save is available.');
    } catch (e) {
      quiet = null;
      raw = null;
      warnings.push(
        'Quiet Wing was not included: ' + e.message + ' Export it separately when available.',
      );
    }
    const sections = { cabinet, club: AlibiClub.diagnostics().state },
      manifest = ['cabinet', 'club'];
    if (quiet) {
      sections.quiet = { kind: 'alibi-quiet-wing-backup', schema: 1, state: C.clone(quiet) };
      manifest.push('quiet');
    }
    try {
      await AlibiActivities.loadCastle();
      sections.castle = await globalThis.AlibiCastle.exportBackup();
      manifest.push('castle');
    } catch (error) {
      warnings.push(
        'Castle was not included: ' + error.message + ' Export the castle notebook separately.',
      );
    }
    download('alibi-all-saves.json', {
      format: 'alibi-all-saves',
      schema: 1,
      applicationVersion: cfg.version,
      exportedAt: new Date().toISOString(),
      manifest,
      scope: 'Device-local sections. Restore separately; no cross-database transaction.',
      sections,
      ...(raw ? { recovery: { quiet: raw } } : {}),
      warnings: [
        ...warnings,
        saveError,
        AlibiClub.diagnostics().saveError,
        globalThis.QWStore?.info().blocked
          ? 'Quiet Wing has protected stored data. Keep the raw recovery section.'
          : '',
      ].filter(Boolean),
    });
    const exported = manifest
      .map(
        (section) =>
          ({ cabinet: 'Cabinet', club: 'Club', quiet: 'Quiet Wing', castle: 'Castle' })[section],
      )
      .join(', ');
    toast(
      `${exported} exported. ${warnings.length ? warnings.join(' ') : 'Challenge replays remain separate.'}`,
      warnings.length > 0,
    );
  }
  async function stageAll(file) {
    if (file.size > 20 * 1024 * 1024) throw Error('Combined backup exceeds 20 MB.');
    const data = await inWorker({ type: 'combined-backup', text: await file.text() });
    stagedAll = data;
    dialog(
      'Choose a section to restore',
      `<p>All available sections passed validation. Nothing has been restored. Review one section at a time. Each restore keeps its own recovery copy; later failure cannot undo an earlier section. Keep this combined file and reopen it after a cabinet restore reloads Alibi.</p>${Array.isArray(data.warnings) && data.warnings.length ? `<p class="notice">Warnings: ${data.warnings.map((warning) => esc(warning)).join(' ')}</p>` : ''}`,
      [
        { label: 'Review cabinet restore', action: 'all-cabinet' },
        { label: 'Review Club restore', action: 'all-club' },
        ...(data.sections.quiet
          ? [{ label: 'Review Quiet Wing restore', action: 'all-quiet' }]
          : []),
        ...(data.sections.castle ? [{ label: 'Review castle restore', action: 'all-castle' }] : []),
        { label: 'Cancel', action: 'close-dialog', secondary: true },
      ],
    );
  }
  async function importBackup(file) {
    if (file.size > 16 * 1024 * 1024) throw Error('Backup exceeds the 16 MB safety limit.');
    pendingBackup = await inWorker({ type: 'cabinet-backup', text: await file.text() });
    const conflicts = pendingBackup.runs.filter((r) => records.has(r.key)).length;
    dialog(
      'Restore your progress.',
      `<p>This backup contains <strong>${pendingBackup.runs.length} saved puzzles</strong> and ${pendingBackup.packs.length} custom packs. ${conflicts} saved puzzle${conflicts === 1 ? ' already exists' : 's already exist'} on this device.</p><p><strong>Add missing only</strong> preserves every existing device save and adds records you do not have. <strong>Replace device data</strong> replaces all progress and custom packs with the backup.</p><p class="fine">Both use an atomic database transaction and retain a pre-restore recovery copy. Export your current progress first for an independent backup.</p>`,
      [
        { label: 'Add missing only', action: 'restore-merge', icon: 'upload' },
        { label: 'Replace device data', action: 'restore-replace', danger: true },
        { label: 'Export current progress', action: 'export', secondary: true },
        { label: 'Cancel', action: 'close-dialog', secondary: true },
      ],
    );
  }
  async function restoreBackup(replace = false) {
    if (!pendingBackup) return;
    if (store.mode !== 'indexeddb')
      throw Error(
        'Safe restoration requires IndexedDB. Open the deployed app in a normal browser, then restore.',
      );
    await queue;
    let b = pendingBackup;
    if (!replace) {
      const raw = await store.export(),
        runs = new Map(raw.runs.map((r) => [r.key, r])),
        combinedPacks = new Map(raw.packs.map((p) => [p.id, p]));
      for (const r of b.runs) if (!runs.has(r.key)) runs.set(r.key, r);
      for (const p of b.packs) {
        if (combinedPacks.has(p.id)) {
          if (!C.equal(combinedPacks.get(p.id), p))
            throw Error(
              'A pack with this ID differs on this device. Export it and resolve the pack version before merging.',
            );
        } else combinedPacks.set(p.id, p);
      }
      b = await inWorker({
        type: 'cabinet-backup',
        value: {
          ...b,
          runs: [...runs.values()],
          packs: [...combinedPacks.values()],
          settings,
          preferences: prefs,
        },
      });
    }
    await store.restore(b);
    pendingBackup = null;
    channel?.postMessage({ type: 'restored' });
    closeDialog();
    location.reload();
  }
  async function inWorker(message) {
    const workerText = globalThis.ALIBI_WORKER_SOURCE
      ? globalThis.ALIBI_WORKER_SOURCE
      : await globalThis.AlibiValidatorLoader.load(globalThis.ALIBI_WORKER_URL);
    return new Promise((resolve, reject) => {
      if (!window.Worker) throw Error('This browser does not support background validation.');
      const blob = new Blob([workerText], { type: 'text/javascript' }),
        url = URL.createObjectURL(blob),
        w = new Worker(url);
      let settled = false;
      const stop = () => {
        w.terminate();
        URL.revokeObjectURL(url);
        clearTimeout(timer);
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        stop();
        reject(
          Error(
            'Validation reached its 25-second safety limit. Use a smaller pack or simpler puzzle.',
          ),
        );
      }, 25000);
      w.onmessage = (e) => {
        if (settled) return;
        settled = true;
        stop();
        e.data.ok ? resolve(e.data.value) : reject(Error(e.data.error));
      };
      w.onerror = (e) => {
        if (settled) return;
        settled = true;
        stop();
        reject(Error(e.message || 'The validation worker could not start.'));
      };
      w.postMessage(message);
    });
  }
  async function installPack(p) {
    p = C.validatePack(p, false);
    if (packs.some((x) => x.id === p.id)) throw Error('A pack with that ID is already installed.');
    const existing = new Set(all().map((x) => x.id));
    if (p.puzzles.some((x) => existing.has(x.id)))
      throw Error('A puzzle ID in this pack is already in your collection. Use a distinct ID.');
    if (all().length + p.puzzles.length > 3000)
      throw Error('This prototype is limited to 3,000 local puzzles.');
    await store.put('packs', p.id, p);
    packs.push(p);
    render();
    toast(
      `${p.puzzles.length} puzzle${p.puzzles.length === 1 ? '' : 's'} added to your collection.`,
    );
  }
  async function importPack(file) {
    if (file.size > 3 * 1024 * 1024) throw Error('Pack exceeds 3 MB.');
    const data = JSON.parse(await file.text());
    dialog(
      'Checking the collection.',
      `<div class="busy"><span class="spinner"></span>Validating definitions and unique solutions…</div><p style="margin-top:17px">Nothing is installed until every puzzle passes. You can close this message; validation will finish in this session.</p>`,
    );
    const p = await inWorker({ type: 'pack', pack: data });
    await installPack(p);
    closeDialog();
    dialog(
      'A new collection is ready.',
      `<p><strong>${esc(p.title)}</strong> adds ${p.puzzles.length} verified puzzle${p.puzzles.length === 1 ? '' : 's'} to this device.</p>`,
      [
        {
          label: 'Play the first puzzle',
          action: 'open',
          icon: 'play',
          attrs: openAttrs(p.puzzles[0]),
        },
        { label: 'Keep browsing', action: 'close-dialog', secondary: true },
      ],
    );
  }
  function draftPack() {
    return {
      schemaVersion: 1,
      id: ('pack-' + draft.id).slice(0, 63),
      version: 1,
      title: draft.title,
      author: 'Local author',
      puzzles: [draft],
    };
  }
  async function saveDraft() {
    if (!draft) return;
    await store
      .put('meta', 'workshop-draft', { puzzle: draft })
      .catch((e) => toast(e.message, true));
  }
  function dirtyDraft() {
    draftVerified = false;
    saveDraft();
  }
  async function generateDraft(form) {
    if (draftBusy) return;
    const f = new FormData(form),
      names = String(f.get('names'))
        .split(',')
        .map((s) => s.trim()),
      seed = Number(f.get('seed'));
    if (names.length !== 5 || names.some((n) => !n || n.length > 30) || new Set(names).size !== 5)
      throw Error('Enter five distinct names, each 1–30 characters.');
    if (!Number.isInteger(seed) || seed < 1 || seed > 2147483647)
      throw Error('Use an integer seed from 1 to 2,147,483,647.');
    const options = {
      title: String(f.get('title')).trim(),
      setting: String(f.get('setting')).trim(),
      story: String(f.get('story')).trim(),
      names,
      seed,
    };
    draftBusy = true;
    render();
    try {
      draft = await inWorker({ type: 'generate', options });
      draft.authorSeed = seed;
      draftVerified = true;
      draftShowSolution = false;
      await saveDraft();
      render();
      document.querySelector('.draft-editor')?.scrollIntoView({
        behavior: settings.reducedMotion ? 'instant' : 'smooth',
        block: 'start',
      });
    } finally {
      draftBusy = false;
      render();
    }
  }
  async function verifyDraft() {
    if (!draft || draftBusy) return;
    draftBusy = true;
    render();
    try {
      draft = await inWorker({ type: 'draft', puzzle: draft });
      draftVerified = true;
      await saveDraft();
      toast('Verified. Exactly one arrangement satisfies these clues.');
    } catch (e) {
      draftVerified = false;
      throw e;
    } finally {
      draftBusy = false;
      render();
    }
  }
  function clueValues() {
    if (!draft) return;
    const kind = $('#clue-kind')?.value,
      select = $('#clue-value');
    if (!select) return;
    if (['edge', 'notEdge'].includes(kind)) {
      select.hidden = true;
      return;
    }
    select.hidden = false;
    select.innerHTML = ['left', 'above', 'sameRoom', 'differentRoom'].includes(kind)
      ? draft.people.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')
      : ['row', 'col'].includes(kind)
        ? range(5)
            .map(
              (i) =>
                `<option value="${i}">${kind === 'row' ? 'Row ' + (i + 1) : 'Column ' + String.fromCharCode(65 + i)}</option>`,
            )
            .join('')
        : draft.roomNames.map((v, i) => `<option value="${i}">${esc(v)}</option>`).join('');
  }
  function addClue(form) {
    if (!draft) return;
    const f = new FormData(form),
      kind = f.get('kind'),
      who = f.get('who'),
      value = f.get('value'),
      cl = { kind, who };
    if (['left', 'above', 'sameRoom', 'differentRoom'].includes(kind)) {
      if (value === who) throw Error('Choose two different people for a relational clue.');
      cl.other = value;
    } else if (!['edge', 'notEdge'].includes(kind)) cl.value = Number(value);
    if (draft.clues.length >= 40) throw Error('A scene supports at most 40 clues.');
    if (draft.clues.some((c) => C.equal(c, cl))) throw Error('That clue is already present.');
    draft.clues.push(cl);
    dirtyDraft();
    render();
  }
  async function install() {
    if (cfg.standalone) {
      dialog(
        'Install the published version.',
        `<p>This self-contained preview plays locally. Installation and offline updates use the separate Cloudflare upload build.</p><p>Publish that ZIP, open its permanent HTTPS address on Android, then use the browser menu’s <strong>Install app</strong> or <strong>Add to Home screen</strong> option.</p><p class="fine">Export progress from this preview first. A different website address has a different save store.</p>`,
        [
          { label: 'Got it', action: 'close-dialog' },
          { label: 'Export progress', action: 'export', secondary: true },
        ],
      );
      return;
    }
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
      installEvent = null;
      return;
    }
    dialog(
      'Keep Alibi on your home screen.',
      `<p><strong>Android:</strong> Open this address in Chrome or another install-capable browser. In its menu, choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p><p><strong>iPhone or iPad:</strong> Open it in Safari, use Share, then Add to Home Screen. Browser support and wording vary.</p><p class="fine">Wait for “Offline ready”, then test opening it in airplane mode. Installation does not create a cloud backup.</p>`,
      [
        { label: 'Got it', action: 'close-dialog' },
        {
          label: 'Settings & saves',
          action: 'navigate',
          attrs: 'data-page="settings"',
          secondary: true,
        },
      ],
    );
  }
  function issueReport() {
    const p = current?.puzzle;
    dialog(
      'Create a puzzle issue report.',
      `<p>Export the app version, browser information, puzzle definition and board state${p ? ' for <strong>' + esc(p.title) + '</strong>' : ''}. Personal puzzle notes are excluded.</p><p>Nothing is sent automatically. Review the file, then attach a small reproduction to <a href="https://github.com/Chris0Jeky/Alibi/issues" target="_blank" rel="noopener noreferrer">GitHub Issues</a>. Keep any personal information private.</p><p class="fine">The report includes the puzzle’s stored solution. Avoid opening it while still solving that puzzle.</p>`,
      [
        { label: 'Export report', action: 'export-issue', icon: 'download' },
        { label: 'Cancel', action: 'close-dialog', secondary: true },
      ],
    );
  }
  async function handleAction(el, e) {
    const a = el.dataset.action,
      v = el.dataset.value,
      id = el.dataset.id;
    if (a.startsWith('club-')) return AlibiClub.action(el, e);
    switch (a) {
      case 'navigate':
        closeDialog();
        navigate(el.dataset.page || 'home', id || '');
        break;
      case 'open':
        closeDialog();
        navigate(el.dataset.book ? 'story' : 'play', id, el.dataset.book || '');
        break;
      case 'story-play':
        navigate('play', id, el.dataset.book || '');
        break;
      case 'story-next': {
        const book = books.find((b) => b.id === route.book);
        const index = book?.chapters.findIndex((c) => c.id === route.id.split('@')[0]);
        const next =
          book &&
          (book.chapters.slice(index + 1).find((c) => !solved(rec(find(c.id)))) ||
            book.chapters.find((c) => !solved(rec(find(c.id)))));
        if (next) navigate('story', keyFor(find(next.id)), book.id);
        else navigate('casebooks', book?.id || '');
        break;
      }
      case 'return-to-castle': {
        const target = caseReturn?.target;
        caseReturn = null;
        if (target) location.hash = target;
        break;
      }
      case 'back-to-collection':
        caseReturn = null;
        if (route.book) navigate('casebooks', route.book);
        else navigate('library', current?.puzzle.type || '');
        break;
      case 'favorite':
        prefs.favorites = prefs.favorites.includes(id)
          ? prefs.favorites.filter((x) => x !== id)
          : [...prefs.favorites, id];
        await savePreferences();
        render();
        break;
      case 'group-filter':
        library.group = v;
        library.limit = 24;
        render();
        break;
      case 'favorites-filter':
        library.status = 'favorites';
        render();
        break;
      case 'browse-all':
        library.browseAll = true;
        render();
        break;
      case 'reset-filters':
        library = { search: '', group: 'all', difficulty: 'all', status: 'all', limit: 24 };
        render();
        break;
      case 'show-more': {
        const firstNewIndex = library.limit;
        library.limit += 24;
        render();
        document.querySelectorAll('.puzzle-card [data-action="open"]')[firstNewIndex]?.focus();
        break;
      }
      case 'person':
        selectedPerson = id;
        render();
        break;
      case 'cell':
        if (
          e?.detail &&
          Date.now() - lastPointerAt < 450 &&
          ['nonogram', 'lightup', 'tents'].includes(current?.puzzle.type)
        )
          break;
        onCell(Number(el.dataset.cell), !!e?.shiftKey && current?.puzzle.type === 'network');
        break;
      case 'value':
        if (current) act({ type: 'set', cell: selectedCell, value: Number(v), pencil });
        break;
      case 'pencil':
        pencil = !pencil;
        if (current?.puzzle.type === 'scene') sceneMarkMode = pencil ? 'exclude' : 'place';
        render();
        break;
      case 'scene-mode':
        sceneMarkMode = v;
        pencil = v === 'exclude';
        render();
        break;
      case 'erase':
        erase();
        break;
      case 'symbol':
      case 'brush':
        brush = v === 'cycle' ? 'cycle' : Number(v);
        render();
        break;
      case 'dossier-tab':
        dossierTab = Number(v);
        render();
        break;
      case 'mark':
        if (blocked()) break;
        {
          const i = Number(el.dataset.cell),
            s = current.state,
            type = current.puzzle.type,
            value =
              type === 'witness' || brush === 'cycle'
                ? s.marks[i] === -1
                  ? 1
                  : s.marks[i] === 1
                    ? 0
                    : -1
                : s.marks[i] === brush
                  ? -1
                  : brush;
          act({ type: 'mark', cell: i, value, auto: false });
        }
        break;
      case 'clue':
        if (current && !paused) {
          const n = Number(el.dataset.index);
          act({ type: 'clue', index: n });
        }
        break;
      case 'trail-value':
        trailValue = Number(v);
        brush = 1;
        render();
        break;
      case 'trail-mode':
        brush = 1;
        render();
        break;
      case 'turn-left':
        onCell(selectedCell, true);
        break;
      case 'turn-right':
        onCell(selectedCell, false);
        break;
      case 'quick-panel':
        quickPanel(v);
        break;
      case 'quick-clue':
        if (current && !paused && !current.completedAt) {
          act({ type: 'clue', index: Number(el.dataset.index) });
          quickPanel('clues');
        }
        break;
      case 'evidence-tab':
        evidenceTab = v;
        render();
        break;
      case 'undo':
        undo(false);
        break;
      case 'redo':
        undo(true);
        break;
      case 'check':
        checkBoard();
        break;
      case 'hint':
        showHint();
        break;
      case 'release-jump': {
        const entry = document.getElementById('release-' + v);
        entry?.focus({ preventScroll: true });
        entry?.scrollIntoView({ behavior: 'instant', block: 'start' });
        break;
      }
      case 'discover-collection':
        navigate('library');
        library.venue = v || '';
        library.browseAll = true;
        break;
      case 'curation-venue':
        library.venue = v || '';
        library.limit = 24;
        render();
        break;
      case 'curation-notes':
        if (current && globalThis.AlibiCuration.get(current.puzzle))
          dialog(
            'Curator notes.',
            globalThis.AlibiCuration.notes(current.puzzle, !!current.completedAt),
            [{ label: 'Back to puzzle', action: 'close-dialog' }],
          );
        break;
      case 'review-record':
        reviewRecord();
        break;
      case 'reveal-confirm':
        revealConfirm();
        break;
      case 'reveal-apply':
        applyReveal();
        break;
      case 'zoom':
        zoomed = !zoomed;
        render();
        break;
      case 'pause':
        paused = !paused;
        enqueueSave();
        render();
        break;
      case 'choose-accuse':
        accuseChoice = current?.puzzle.type === 'scene' ? id : Number(id);
        render();
        break;
      case 'submit-accuse':
        if (current && accuseChoice !== null) {
          act({ type: 'accuse', who: accuseChoice });
          if (!current.completedAt) checkBoard();
        }
        break;
      case 'restart':
        dialog(
          'Start this puzzle again?',
          `<p>This clears this board, pencil marks, notes and undo history. Your journal keeps any previous solved achievement for the puzzle.</p><p class="fine">Other puzzles and custom packs are not affected.</p>`,
          [
            { label: 'Keep my place', action: 'close-dialog', secondary: true },
            { label: 'Restart this puzzle', action: 'restart-confirm', danger: true },
          ],
        );
        break;
      case 'restart-confirm':
        if (current) {
          closeDialog();
          if (saveError || storageFatal) break;
          current.firstCompletedAt = current.firstCompletedAt || current.completedAt;
          globalThis.AlibiTheatre.moment('complete');
          current.state = E[current.puzzle.type].initial(current.puzzle);
          current.undo = [];
          current.redo = [];
          current.moves = 0;
          current.hints = 0;
          current.elapsed = 0;
          current.note = '';
          current.completedAt = null;
          sessionSeconds = 0;
          feedback = '';
          checking = false;
          paused = false;
          accuseChoice = null;
          selectedPerson = current.puzzle.people?.[0]?.id || null;
          if (current.puzzle.type === 'trail')
            trailValue = nextTrail(current.state, current.puzzle);
          enqueueSave();
          render();
        }
        break;
      case 'next':
        caseReturn = null;
        nextPuzzle();
        break;
      case 'lesson':
        startLesson(el.dataset.type || current?.puzzle.type);
        break;
      case 'choose-lesson':
        dialog(
          'Choose a little lesson.',
          `<p>Every game has a miniature interactive example.</p><div class="family-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:9px">${Object.entries(
            M,
          )
            .map(
              ([t, m]) =>
                `<button class="family-card" data-action="lesson" data-type="${t}"><span class="family-icon">${icon(m.icon)}</span><h3>${m.title}</h3></button>`,
            )
            .join('')}</div>`,
        );
        break;
      case 'lesson-example':
        if (lesson) {
          lesson.step = 1;
          renderLesson();
        }
        break;
      case 'lesson-intro':
        if (lesson) {
          lesson.step = 0;
          renderLesson();
        }
        break;
      case 'lesson-person':
        if (lesson) {
          lesson.selected = true;
          renderLesson();
        }
        break;
      case 'lesson-tap':
        lessonTap(Number(el.dataset.cell));
        break;
      case 'lesson-finish':
        await lessonFinish();
        break;
      case 'close-dialog':
        if (lesson) {
          prefs.seen = [...new Set([...prefs.seen, lesson.type])];
          savePreferences();
        }
        closeDialog();
        break;
      case 'install':
        await install();
        break;
      case 'export':
        await exportBackup();
        break;
      case 'export-all':
        await exportAll();
        break;
      case 'import-all':
        $('#all-backup-input').value = '';
        $('#all-backup-input').onchange = (e) => {
          if (e.target.files[0]) stageAll(e.target.files[0]).catch((e) => toast(e.message, true));
        };
        $('#all-backup-input').click();
        break;
      case 'all-cabinet':
        if (stagedAll)
          await importBackup(
            new File([JSON.stringify(stagedAll.sections.cabinet)], 'cabinet.json'),
          );
        break;
      case 'all-club':
        if (stagedAll) await AlibiClub.reviewBackup(stagedAll.sections.club);
        break;
      case 'all-castle':
        if (stagedAll?.sections.castle) {
          await AlibiActivities.loadCastle();
          closeDialog();
          await globalThis.AlibiCastle.prepareImport(stagedAll.sections.castle);
        }
        break;
      case 'all-quiet':
        if (stagedAll?.sections.quiet) {
          window.QWPendingImport = new File(
            [JSON.stringify(stagedAll.sections.quiet)],
            'quiet.json',
          );
          closeDialog();
          navigate('quiet', 'realm');
        }
        break;
      case 'import-backup':
        $('#backup-input').click();
        break;
      case 'restore-merge':
        await restoreBackup(false);
        break;
      case 'restore-replace':
        dialog(
          'Replace all device progress?',
          `<p>This will use the backup instead of the progress and packs currently on this device. A pre-restore copy is kept inside the database; an exported copy is safer still.</p>`,
          [
            { label: 'Cancel', action: 'close-dialog', secondary: true },
            { label: 'Replace with backup', action: 'restore-replace-confirm', danger: true },
          ],
        );
        break;
      case 'restore-replace-confirm':
        await restoreBackup(true);
        break;
      case 'recovery':
        {
          const data = await store.get('meta', 'pre-restore-backup');
          if (data) download('alibi-pre-restore-recovery.json', data);
          else toast('No restore has been performed on this device yet.');
        }
        break;
      case 'persist':
        {
          const granted = await navigator.storage?.persist?.();
          toast(
            granted
              ? 'Persistent storage granted. Still keep an exported backup.'
              : 'This browser did not grant persistence. Regular backups are still available.',
          );
        }
        break;
      case 'check-update':
        if (registration) {
          await registration.update();
          waitingUpdate = !!registration.waiting;
          render();
          toast(
            waitingUpdate
              ? 'A new version is ready. Use Save & update.'
              : 'No waiting update found.',
          );
        } else
          toast(
            cfg.standalone
              ? 'Updates are available in the deployed version, not this preview.'
              : 'Offline setup is not ready. Reload online and try again.',
          );
        break;
      case 'apply-update':
        await AlibiActivities.flush();
        await AlibiClub.save();
        if (AlibiClub.diagnostics().saveError)
          throw Error('Export or resolve the Club save problem before updating.');
        await enqueueSave();
        await queue;
        if (saveError)
          throw Error('The latest progress has not been saved. Export it before updating.');
        if (registration?.waiting) {
          updateRequested = true;
          registration.waiting.postMessage({ type: 'ACTIVATE' });
        }
        break;
      case 'reload':
        location.reload();
        break;
      case 'work-tab':
        workTab = v;
        render();
        break;
      case 'import-pack':
        $('#pack-input').click();
        break;
      case 'export-template':
        download('alibi-twelve-engine-examples.json', {
          schemaVersion: 1,
          id: 'my-first-pack',
          version: 1,
          title: 'Rename puzzle IDs before importing',
          author: 'Your name',
          puzzles: C.TYPES.map((t) => C.clone(starter.puzzles.find((p) => p.type === t))),
        });
        toast('Examples exported. Give copied puzzles unique IDs before importing.');
        break;
      case 'export-pack':
        {
          const p = packs.find((p) => p.id === id);
          if (p) download(p.id + '.json', p);
        }
        break;
      case 'draft-mode':
        draftMode = v;
        render();
        break;
      case 'draft-paint':
        draftPaint = Number(v);
        render();
        break;
      case 'draft-cell':
        if (draft) {
          const i = Number(el.dataset.cell);
          if (draftMode === 'room') draft.rooms[i] = draftPaint;
          else {
            const old = draft.objects.find((o) => o.cell === i);
            if (old && draft.clues.some((c) => c.kind === 'near' && c.value === i)) {
              toast(
                'A “next to” clue refers to that furniture. Remove the clue before moving it.',
                true,
              );
              break;
            }
            draft.objects = draft.objects.filter((o) => o.cell !== i);
            if (draftObject !== 'none') {
              if (draft.objects.length >= 12)
                throw Error('At most 12 furniture squares are supported.');
              draft.objects.push({
                cell: i,
                kind: draftObject,
                name: draftObject === 'shelf' ? 'bookshelf' : draftObject,
              });
            }
          }
          dirtyDraft();
          render();
        }
        break;
      case 'draft-solution':
        draftShowSolution = !draftShowSolution;
        render();
        break;
      case 'remove-draft-clue':
        if (draft) {
          draft.clues.splice(Number(el.dataset.index), 1);
          dirtyDraft();
          render();
        }
        break;
      case 'verify-draft':
        await verifyDraft();
        break;
      case 'add-draft':
        if (draft && draftVerified) {
          const p = draftPack();
          await installPack(p);
          navigate('play', keyFor(draft));
        }
        break;
      case 'export-draft':
        if (draft && draftVerified) download(draft.id + '.json', draftPack());
        break;
      case 'feedback-report':
        issueReport();
        break;
      case 'export-issue':
        download('alibi-issue-report.json', {
          format: 'alibi-issue-report',
          version: cfg.version,
          build: cfg.build,
          createdAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
          storage: store.mode,
          offlineReady,
          puzzle: current?.puzzle || null,
          state: current?.state || null,
          note: 'Describe what happened and what you expected here. Personal puzzle notes are not included.',
        });
        closeDialog();
        toast('Report exported. Review it before sharing.');
        break;
    }
  }
  document.addEventListener('click', (e) => {
    const skip = e.target.closest('.skip-link');
    if (skip) {
      e.preventDefault();
      $('#main')?.focus();
      return;
    }
    requestLinkFocus(e);
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    handleAction(el, e).catch((err) => {
      if ($('#dialog').open && !lesson) closeDialog();
      toast(err.message || 'That action could not finish.', true);
    });
  });
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'scene-form') {
      e.preventDefault();
      generateDraft(e.target).catch((err) => toast(err.message, true));
    }
    if (e.target.id === 'clue-form') {
      e.preventDefault();
      try {
        addClue(e.target);
      } catch (err) {
        toast(err.message, true);
      }
    }
  });
  let noteTimer = null;
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.closest('#scene-form') && el.name) {
      makerFields[el.name] = el.value;
    } else if (el.id === 'library-search') {
      library.search = el.value;
      library.limit = 24;
      render();
    } else if ((el.id === 'play-notes' || el.id === 'quick-notes') && current) {
      current.note = el.value.slice(0, 5000);
      clearTimeout(noteTimer);
      noteTimer = setTimeout(enqueueSave, 180);
    } else if (el.dataset.roomName !== undefined && draft) {
      const value = el.value.trim();
      if (value) {
        draft.roomNames[Number(el.dataset.roomName)] = value;
        dirtyDraft();
        draftVerified = false;
      }
    }
  });
  document.addEventListener('change', async (e) => {
    const el = e.target;
    try {
      if (el.dataset.setting) {
        settings[el.dataset.setting] = el.checked;
        await store.put('meta', 'settings', settings);
        theme();
        render();
        if (el.dataset.setting === 'sound' && settings.sound) feedbackSound();
      } else if (el.id === 'theme-select') {
        settings.theme = el.value;
        await store.put('meta', 'settings', settings);
        theme();
        render();
      } else if (el.id === 'difficulty-filter') {
        library.difficulty = el.value;
        library.limit = 24;
        render();
      } else if (el.id === 'status-filter') {
        library.status = el.value;
        library.limit = 24;
        render();
      } else if (el.id === 'family-filter') {
        library.group = 'all';
        navigate('library', el.value);
      } else if (el.id === 'draft-object') draftObject = el.value;
      else if (el.id === 'clue-kind') clueValues();
      else if (el.dataset.roomName !== undefined) {
        render();
      } else if (el.id === 'pack-input' && el.files[0]) {
        await importPack(el.files[0]);
        el.value = '';
      } else if (el.id === 'backup-input' && el.files[0]) {
        await importBackup(el.files[0]);
        el.value = '';
      }
    } catch (err) {
      if (!lesson) closeDialog();
      toast(err.message, true);
      if (el.type === 'file') el.value = '';
    }
  });
  // A drag stroke is one undo step. The same brush is used throughout the stroke.
  function paintTo(i) {
    if (!drag || !current || drag.key !== current.key || drag.visited.has(i)) return;
    drag.visited.add(i);
    if (AlibiClub.assistance() !== 'off' && drag.value === 1) {
      const why = AlibiAssist.reason(current.puzzle, current.state, i, 1);
      if (why) {
        toast(why);
        return;
      }
    }
    const next = E[current.puzzle.type].reduce(current.puzzle, current.state, {
      type: 'set',
      cell: i,
      value: drag.value,
    });
    if (!C.equal(next, current.state)) {
      current.state = next;
      selectedCell = i;
      checking = false;
      feedback = '';
      render();
    }
  }
  function endPaint() {
    if (!drag) return;
    const d = drag;
    drag = null;
    lastPointerAt = Date.now();
    if (!current || d.key !== current.key || C.equal(current.state, d.before)) return;
    current.undo.push(d.before);
    current.undo = current.undo.slice(-80);
    current.redo = [];
    current.moves++;
    current.completedAt = null;
    feedbackSound();
    completion();
    enqueueSave();
    render();
  }
  document.addEventListener(
    'pointerdown',
    (e) => {
      const el = e.target.closest('.paint-cell[data-cell]');
      if (
        !el ||
        el.disabled ||
        $('#dialog').open ||
        ![0, 2].includes(e.button) ||
        !current ||
        blocked()
      )
        return;
      e.preventDefault();
      const i = Number(el.dataset.cell),
        value =
          e.button === 2
            ? current.state.cells[i] === 0
              ? -1
              : 0
            : current.state.cells[i] === brush
              ? -1
              : brush;
      drag = { key: current.key, before: C.clone(current.state), value, visited: new Set() };
      lastPointerAt = Date.now();
      paintTo(i);
    },
    { passive: false },
  );
  document.addEventListener(
    'pointermove',
    (e) => {
      if (!drag) return;
      e.preventDefault();
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.paint-cell[data-cell]');
      if (el && !el.disabled) paintTo(Number(el.dataset.cell));
    },
    { passive: false },
  );
  document.addEventListener('pointerup', endPaint);
  document.addEventListener('pointercancel', endPaint);
  document.addEventListener('contextmenu', (e) => {
    const el = e.target.closest('[data-action="cell"]');
    if (!el || el.disabled) return;
    e.preventDefault();
    if (
      ['nonogram', 'lightup', 'tents'].includes(current?.puzzle.type) &&
      Date.now() - lastPointerAt < 450
    )
      return;
    onCell(Number(el.dataset.cell), true);
  });
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    if (!current || $('#dialog').open || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))
      return;
    const p = current.puzzle;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo(e.shiftKey);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      undo(true);
      return;
    }
    if (e.key.toLowerCase() === 'n' && ['scene', 'sudoku', 'futoshiki'].includes(p.type)) {
      e.preventDefault();
      pencil = !pencil;
      if (p.type === 'scene') sceneMarkMode = pencil ? 'exclude' : 'place';
      render();
      return;
    }
    if (e.key === 'Escape') {
      paused = !paused;
      enqueueSave();
      render();
      return;
    }
    if (paused) return;
    const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -p.size, ArrowDown: p.size }[e.key];
    if (d && !['dossier', 'witness'].includes(p.type)) {
      e.preventDefault();
      let next = selectedCell + d;
      if (p.type === 'bridges') {
        const x = selectedCell % p.size,
          y = Math.floor(selectedCell / p.size),
          horizontal = e.key === 'ArrowLeft' || e.key === 'ArrowRight',
          candidates = p.islands
            .map(({ cell }) => ({ cell, x: cell % p.size, y: Math.floor(cell / p.size) }))
            .filter(({ x: ix, y: iy }) =>
              horizontal
                ? iy === y && (d < 0 ? ix < x : ix > x)
                : ix === x && (d < 0 ? iy < y : iy > y),
            )
            .sort((a, b) =>
              d < 0 ? (horizontal ? b.x - a.x : b.y - a.y) : horizontal ? a.x - b.x : a.y - b.y,
            );
        next = candidates[0]?.cell ?? selectedCell;
      } else {
        while (next >= 0 && next < p.size ** 2 && !enabledCell(p, next)) next += d;
      }
      if (next >= 0 && next < p.size ** 2) selectedCell = next;
      render();
      document.getElementById('cell-' + selectedCell)?.focus({ preventScroll: true });
      return;
    }
    if (['Backspace', 'Delete'].includes(e.key)) {
      e.preventDefault();
      erase();
      return;
    }
    if (p.type === 'scene' && /^[1-5]$/.test(e.key)) {
      selectedPerson = p.people[Number(e.key) - 1]?.id || selectedPerson;
      render();
    }
    if (
      ['sudoku', 'futoshiki'].includes(p.type) &&
      /^[1-9]$/.test(e.key) &&
      Number(e.key) <= p.size
    ) {
      e.preventDefault();
      act({ type: 'set', cell: selectedCell, value: Number(e.key), pencil });
    }
    if (p.type === 'binary' && /^[01]$/.test(e.key)) {
      e.preventDefault();
      act({ type: 'set', cell: selectedCell, value: Number(e.key) });
    }
    if (e.key === 'Enter' && e.shiftKey && p.type === 'network') {
      e.preventDefault();
      onCell(selectedCell, true);
    }
  });
  $('#dialog').addEventListener('cancel', () => {
    if (lesson) {
      prefs.seen = [...new Set([...prefs.seen, lesson.type])];
      savePreferences();
      lesson = null;
    }
  });
  async function loadRoute(focusSerial = 0) {
    const serial = ++routeSerial;
    bridgeAnchor = null;
    endPaint();
    clearTimeout(noteTimer);
    await enqueueSave();
    if (serial !== routeSerial) return;
    const raw = location.hash.replace(/^#\/?/, ''),
      [path, query] = raw.split('?'),
      bits = path.split('/');
    let id = '';
    try {
      id = decodeURIComponent(bits[1] || '');
    } catch {}
    route = {
      page: bits[0] || 'home',
      id,
      book: new URLSearchParams(query || '').get('book') || '',
    };
    if (
      ![
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
      ].includes(route.page)
    )
      route.page = 'home';
    if (route.page !== 'play') caseReturn = null;
    if (route.page === 'library' && route.id && !M[route.id]) route.id = '';
    if (route.page === 'play') {
      const [pid, revision] = id.split('@'),
        catalog = find(pid),
        key = revision ? pid + '@' + Number(revision) : null,
        pinned = key ? records.get(key)?.puzzle : null,
        p =
          pinned ||
          (catalog && (!revision || catalog.revision === Number(revision)) ? catalog : null) ||
          (!revision ? [...records.values()].find((r) => r.puzzle.id === pid)?.puzzle : null);
      if (p) {
        if (caseReturn && caseReturn.puzzleKey !== keyFor(p)) caseReturn = null;
        current = getRun(p);
        sessionSeconds = current.elapsed;
        selectedCell = range(p.size ** 2).find((i) => enabledCell(p, i)) ?? 0;
        selectedPerson = p.people?.[0]?.id || null;
        sceneMarkMode = 'place';
        pencil = false;
        brush = ['binary', 'dossier'].includes(p.type) ? 'cycle' : 1;
        paused = false;
        checking = false;
        feedback = '';
        evidenceTab = 'clues';
        dossierTab = 0;
        zoomed = false;
        accuseChoice = current.state.accused ?? null;
        trailValue = p.type === 'trail' ? nextTrail(current.state, p) : 1;
        if (!books.some((b) => b.id === route.book)) route.book = '';
      } else {
        current = null;
        caseReturn = null;
        route.page = 'library';
        route.id = '';
        toast('That puzzle revision is not in this collection.', true);
      }
    } else current = null;
    if (route.page !== 'quiet') await AlibiActivities.leave();
    if (serial !== routeSerial) return;
    await AlibiClub.onRoute(route);
    if (serial !== routeSerial) return;
    render();
    if (route.page === 'quiet') {
      try {
        await AlibiActivities.enter(document.getElementById('quiet-host'), {
          preferences: settings,
          practice,
        });
      } catch (e) {
        const host = document.getElementById('quiet-host');
        if (host)
          (host.shadowRoot || host).innerHTML =
            `<p style="padding:24px">${esc(e.message)} <a href="#/home">Return to Alibi</a></p>`;
      }
    }
    if (serial !== routeSerial) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = current ? `${current.puzzle.title} · Alibi` : 'Alibi · A little room to think';
    if (current && !prefs.seen.includes(current.puzzle.type) && !storageFatal && !saveError)
      startLesson(current.puzzle.type, true);
    if (focusSerial && focusSerial === routeFocusSerial && !$('#dialog').open) {
      if (route.page !== 'quiet' || !AlibiActivities.focusDestination?.())
        $('#main')?.focus({ preventScroll: true });
    }
  }
  window.addEventListener('hashchange', () => {
    const focusSerial = routeFocusRequests.get(location.hash) || 0;
    routeFocusRequests.delete(location.hash);
    loadRoute(focusSerial).catch((e) => toast(e.message, true));
  });
  setInterval(() => {
    if (current && !paused && !document.hidden && !$('#dialog').open && !current.completedAt) {
      sessionSeconds++;
      if ($('#timer')) $('#timer').textContent = time(sessionSeconds);
      if (sessionSeconds % 15 === 0) enqueueSave();
    }
  }, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      endPaint();
      enqueueSave();
    }
  });
  window.addEventListener('pagehide', () => {
    endPaint();
    enqueueSave();
  });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e;
  });
  window.addEventListener('appinstalled', () =>
    toast('Alibi is installed. Your puzzles are ready on the home screen.'),
  );
  window.addEventListener('alibi-storage-change', () => {
    saveError = store.problem;
    render();
  });
  window.addEventListener('online', () =>
    toast('Back online. Your progress stayed on this device.'),
  );
  window.addEventListener('offline', () =>
    toast(
      offlineReady
        ? 'Offline, and ready to keep playing.'
        : 'This page can keep playing. Reopening may still need a connection.',
    ),
  );
  globalThis.AlibiValidateImport = inWorker;
  await AlibiClub.init({
    render,
    navigate,
    all,
    records: () => [...records.values()],
    settings: () => settings,
    current: () => current,
    apply: act,
    toast,
    dialog,
  });
  await loadRoute();
  globalThis.AlibiDiagnostics = {
    version: cfg.version,
    storage: store.mode,
    puzzleCount: all().length,
    getCurrent: () => (current ? C.clone(current) : null),
    getPracticeSnapshot: () =>
      practice?.snapshot?.() || Promise.resolve({ rooms: {}, available: false }),
    getCounts: () => ({
      puzzles: all().length,
      types: C.TYPES.length,
      records: records.size,
      customPacks: packs.length - 1,
      quarantined,
    }),
    getStatus: () => ({
      saveError,
      offlineReady,
      waitingUpdate,
      mode: store.mode,
      pending: !!drag,
      pendingSaves,
    }),
  };
  globalThis.AlibiBootReady?.();
  if (
    !cfg.standalone &&
    'serviceWorker' in navigator &&
    (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))
  ) {
    (async () => {
      try {
        registration = await navigator.serviceWorker.register('./sw.js', {
          updateViaCache: 'none',
        });
        function inspect() {
          waitingUpdate = !!registration.waiting;
          offlineReady = !!registration.active || !!navigator.serviceWorker.controller;
          render();
        }
        registration.addEventListener('updatefound', () => {
          const w = registration.installing;
          w?.addEventListener('statechange', () => {
            if (w.state === 'installed') inspect();
          });
        });
        navigator.serviceWorker.addEventListener('controllerchange', async () => {
          offlineReady = true;
          if (updateRequested) {
            await enqueueSave();
            await queue;
            if (!saveError) location.reload();
            else {
              updateRequested = false;
              render();
            }
          } else {
            waitingUpdate = false;
            render();
          }
        });
        await navigator.serviceWorker.ready;
        inspect();
      } catch (e) {
        console.warn('Offline setup:', e.message);
        toast('Offline setup did not finish. Online play and local saves still work.', true);
      }
    })();
  }
})().catch((error) => {
  console.error(error);
  const root = document.getElementById('app');
  if (root) {
    root.textContent = '';
    const box = document.createElement('div');
    box.className = 'boot';
    const h = document.createElement('h1');
    h.textContent = 'The cabinet could not open.';
    const p = document.createElement('p');
    p.textContent =
      'Your stored data has not been deliberately cleared. Reload the page or open the hosted app in a normal browser. Detail: ' +
      error.message;
    box.append(h, p);
    root.append(box);
  }
});
