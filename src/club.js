/* After-hours experience layer. Legacy puzzle definitions and saves remain untouched. */
(function (root) {
  'use strict';
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const B = (text, action, extra = '', cls = '') =>
    `<button ${['plan', 'walk', 'undo', 'redo', 'duel-mode', 'tictactoe-mode', 'archive-level', 'assist', 'lab-quality', 'build', 'block-piece', 'block-cell', 'mahjong-tile', 'domino-tile', 'domino-end', 'domino-draw', 'domino-pass', 'domino-use-seed'].includes(action) ? 'id="club-control-' + action + '-' + (extra.match(/data-(?:id|value)="([^"]*)"/)?.[1] || 'main') + '"' : ''} class="btn ${cls}" data-action="club-${action}" ${extra}>${text}</button>`;
  const go = (text, page, id = '', cls = '') =>
    `<button class="btn ${cls}" data-action="navigate" data-page="${page}" data-id="${id}">${text}</button>`;
  const cfg = () => root.ALIBI_CLUB_CONFIG || {};
  const day = () => new Date().toISOString().slice(0, 10);
  let bridge = null,
    db = null,
    rev = 0,
    storageMode = 'session',
    saveError = '',
    saveQueue = Promise.resolve(),
    loading = null;
  let state = {
    schema: 1,
    settings: { zen: false, assist: 'off', pinned: null },
    visit: 0,
    lastHero: -1,
    runs: {},
    records: [],
    stamps: [],
  };
  let route = { page: 'home' },
    hero = 0,
    selectedPlan = 0,
    selectedPlot = null,
    selectedBlockSlot = null,
    selectedDominoTile = null,
    selectedMahjongTile = null,
    previewCell = null,
    botWorker = null,
    botJob = 0,
    botPending = false,
    lab = null,
    room = null,
    roomAttempt = null,
    roomTimer = null,
    roomBusy = false,
    roomError = '',
    uiError = '';
  const stories = [
    {
      id: 'bellweather',
      title: 'The light went out.\nThe story didn’t.',
      tag: 'A NIGHT AT BELLWEATHER',
      copy: 'Six records. One missing logbook. Follow the tide back to the truth.',
      cta: 'Open the investigation',
      page: 'casebooks',
      target: 'last-light-at-bellweather',
      note: 'The harbour master left a light on for you.',
      weather: 'Rain over the causeway',
      palette: 'midnight',
    },
    {
      id: 'glasshouse',
      title: 'Some secrets\nneed room to grow.',
      tag: 'AN EVENING UNDER GLASS',
      copy: 'A quiet garden. Unquiet witnesses. Take a seat among the evidence.',
      cta: 'Enter the glasshouse',
      page: 'casebooks',
      target: 'glasshouse',
      note: 'Please do not water the evidence.',
      weather: 'Warm glass, cool evening',
      palette: 'garden',
    },
    {
      id: 'night-train',
      title: 'One more stop.\nOne less alibi.',
      tag: 'THE MIDNIGHT DEPARTURE',
      copy: 'The clock has stopped. The train hasn’t. There is still time to think.',
      cta: 'Board the sleeper',
      page: 'casebooks',
      target: 'night-train',
      note: 'Your ticket is tucked into the case file.',
      weather: 'Clear skies on the northbound line',
      palette: 'sleeper',
    },
    {
      id: 'cartographer',
      title: 'The world is small.\nThe possibilities aren’t.',
      tag: 'A TABLE BY THE WINDOW',
      copy: 'Connect islands, plan a little town, or outthink the person across the table.',
      cta: 'Visit the games room',
      page: 'salon',
      target: '',
      note: 'A fresh chart. A sharp pencil. No appointment needed.',
      weather: 'Low tide, long afternoon',
      palette: 'harbour',
    },
  ];
  function E() {
    return root.AlibiClubEngines;
  }
  function engine() {
    if (E()) return Promise.resolve(E());
    if (cfg().engineSource) {
      const script = document.createElement('script');
      script.textContent = cfg().engineSource;
      document.head.append(script);
      script.remove();
      return Promise.resolve(E());
    }
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = cfg().engine;
      s.onload = () => resolve(E());
      s.onerror = () => {
        loading = null;
        reject(Error('The games room did not finish loading. Reconnect and try again.'));
      };
      document.head.append(s);
    });
    return loading;
  }
  function notify(text, bad = false) {
    bridge?.toast(text, bad);
  }
  function render() {
    bridge?.render();
  }
  function validateSave(value) {
    return root.AlibiBackupValidation(root.AlibiCore, null, E, stories.length).validateSave(value);
  }
  async function init(api) {
    bridge = api;
    let foundSave = false;
    try {
      db = await new Promise((resolve, reject) => {
        const r = indexedDB.open('alibi-afterhours-v1', 1);
        let abandoned = false;
        const fail = () => {
          abandoned = true;
          clearTimeout(timer);
          reject(
            Object.assign(
              Error(
                'Club storage did not open. Close other Alibi windows and reload; existing saves are untouched.',
              ),
              { name: 'BlockedError' },
            ),
          );
        };
        const timer = setTimeout(fail, 8000);
        r.onupgradeneeded = () => {
          if (abandoned) r.transaction.abort();
          else r.result.createObjectStore('club');
        };
        r.onsuccess = () => {
          clearTimeout(timer);
          if (abandoned) r.result.close();
          else resolve(r.result);
        };
        r.onerror = () => {
          clearTimeout(timer);
          reject(r.error);
        };
        r.onblocked = fail;
      });
      const v = await new Promise((resolve, reject) => {
        const tx = db.transaction('club', 'readonly'),
          r = tx.objectStore('club').get('state');
        watch(tx, reject);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      if (v) {
        foundSave = true;
        if (!Number.isSafeInteger(v.rev) || v.rev < 1)
          throw Error('Unsupported Club save revision.');
        if (Object.keys(v.data?.runs || {}).length) await engine();
        state = validateSave(v.data);
        rev = v.rev;
      }
      storageMode = 'indexeddb';
      db.onversionchange = () => {
        db.close();
        saveError = 'The Club database changed in another tab. Export and reload.';
        notify(saveError, true);
      };
    } catch (e) {
      if (foundSave || e.name === 'BlockedError' || e.name === 'VersionError') {
        saveError =
          'The existing Club save could not be opened and was left untouched. This session is temporary; export before closing.';
        db?.close();
        db = null;
      } else
        try {
          const raw = localStorage.getItem('alibi-afterhours-v1');
          if (raw) {
            foundSave = true;
            await engine();
            const v = JSON.parse(raw);
            state = validateSave(v.data);
            rev = v.rev;
          }
          localStorage.setItem('alibi-club-probe', '1');
          localStorage.removeItem('alibi-club-probe');
          storageMode = 'local';
        } catch (_) {
          saveError = foundSave
            ? 'An existing Club save was left untouched because it could not be read. Export this temporary session before closing.'
            : 'Club progress is kept only in this tab. Export before closing it.';
        }
    }
    state.visit++;
    hero = state.settings.pinned ?? (state.lastHero + 1) % stories.length;
    state.lastHero = hero;
    await persist();
    const input = document.createElement('input');
    input.id = 'club-import';
    input.type = 'file';
    input.accept = '.json,application/json';
    input.hidden = true;
    document.body.append(input);
    input.onchange = async () => {
      try {
        if (!input.files?.[0]) return;
        if (input.files[0].size > 400000) throw Error('Club save is too large.');
        await engine();
        const next = await root.AlibiValidateImport({
          type: 'club-backup',
          text: await input.files[0].text(),
        });
        bridge.dialog(
          'Replace the Club save?',
          `<p>This replaces games-room progress and records, not your original puzzle cabinet saves. Export a copy first if needed.</p>`,
          [
            { label: 'Replace Club save', action: 'club-restore-confirm' },
            { label: 'Cancel', action: 'close-dialog', secondary: true },
          ],
        );
        root.__alibiPendingClub = next;
      } catch (e) {
        notify(e.message, true);
      } finally {
        input.value = '';
      }
    };
  }
  async function reviewBackup(value) {
    await engine();
    const next = await root.AlibiValidateImport({ type: 'club-backup', value });
    bridge.dialog(
      'Replace the Club save?',
      '<p>This replaces only Club progress. The previous committed Club save becomes its recovery copy.</p>',
      [
        { label: 'Replace Club save', action: 'club-restore-confirm' },
        { label: 'Cancel', action: 'close-dialog', secondary: true },
      ],
    );
    root.__alibiPendingClub = next;
  }
  function watch(tx, reject) {
    const timer = setTimeout(() => {
      reject(
        Error(
          'Club storage stopped responding. Export this session, close other Alibi windows and reload.',
        ),
      );
      try {
        tx.abort();
      } catch {}
    }, 8000);
    const finish = () => clearTimeout(timer);
    tx.addEventListener('complete', finish, { once: true });
    tx.addEventListener('error', finish, { once: true });
    tx.addEventListener(
      'abort',
      () => {
        finish();
        if (!tx.onabort) reject(tx.error || Error('Club storage transaction aborted.'));
      },
      { once: true },
    );
  }
  function persist(replacement = null) {
    const snapshot = clone(replacement || state);
    saveQueue = saveQueue
      .then(async () => {
        if (saveError && storageMode !== 'session') return;
        if (storageMode === 'indexeddb')
          await new Promise((resolve, reject) => {
            const tx = db.transaction('club', 'readwrite'),
              os = tx.objectStore('club'),
              get = os.get('state');
            watch(tx, reject);
            get.onsuccess = () => {
              if ((get.result?.rev || 0) !== rev) {
                tx.abort();
                return;
              }
              if (replacement && get.result) os.put(get.result, 'recovery');
              os.put({ rev: rev + 1, data: snapshot }, 'state');
            };
            tx.oncomplete = () => {
              rev++;
              resolve();
            };
            tx.onerror = () => reject(tx.error || Error('Club save failed.'));
            tx.onabort = () =>
              reject(
                Error('Club progress changed in another tab. Export this session, then reload.'),
              );
          });
        else if (storageMode === 'local') {
          const latest = JSON.parse(localStorage.getItem('alibi-afterhours-v1') || 'null');
          if ((latest?.rev || 0) !== rev)
            throw Error('Club progress changed in another tab. Export and reload.');
          localStorage.setItem(
            'alibi-afterhours-v1',
            JSON.stringify({ rev: ++rev, data: snapshot }),
          );
        }
      })
      .catch((e) => {
        saveError = e.message;
        notify(saveError, true);
        render();
      });
    return saveQueue;
  }
  function status() {
    return saveError
      ? `<div class="club-warning" role="alert">${esc(saveError)} ${B('Export Club save', 'export', '', 'small')}</div>`
      : '';
  }
  function save() {
    return persist();
  }
  function svg(body, label = '', view = '0 0 160 130') {
    return `<svg viewBox="${view}" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'} xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  }
  function building(type, mini = false) {
    const palettes = {
      home: ['#f3d1a2', '#ad6450'],
      garden: ['#9aaf89', '#355c54'],
      cafe: ['#f2ddbe', '#c37c53'],
      library: ['#b9cbd0', '#406773'],
      water: ['#b3d4d5', '#4c8f99'],
    };
    const [a, b] = palettes[type] || palettes.home;
    if (type === 'water')
      return svg(
        `<path fill="${a}" d="M15 45 80 13l65 32v50l-65 30-65-30z"/><path fill="${b}" opacity=".65" d="m15 71 65 30 65-30v24l-65 30-65-30z"/><g fill="none" stroke="#f5eddb" stroke-width="3"><path d="m35 58 20 9m13 6 21 10m3-31 29-13M45 90l24 11m34-9 14-7"/></g>`,
      );
    if (type === 'garden')
      return svg(
        `<path fill="#bbc0a1" d="m12 91 68-30 68 30-68 30z"/><path fill="${b}" d="m47 92 4-52h4l4 52zm60 8 2-61h4l2 61z"/><ellipse cx="52" cy="49" rx="27" ry="34" fill="${a}"/><ellipse cx="109" cy="45" rx="20" ry="29" fill="${b}"/><circle cx="43" cy="42" r="9" fill="#dbe0b4" opacity=".5"/><path stroke="#dedac0" stroke-width="5" d="m35 104 25 10m12-4 28-13"/>`,
      );
    return svg(
      `<path fill="#d2c6ae" d="m13 96 67-27 67 27-67 29z"/><path fill="${a}" d="m36 58 47 20v43l-47-21z"/><path fill="${b}" d="m83 78 45-22v44l-45 21z"/><path fill="${type === 'library' ? '#304e59' : '#774d48'}" d="m25 60 22-38 47 19 44 16-54 27z"/>${type === 'library' ? '<path fill="#b9cbd0" d="m43 34 46 16 35-16-43-15z"/><path stroke="#ecdfbf" stroke-width="6" d="M52 68v28m15-22v28m30-23v25m16-32v25"/>' : '<path fill="#f4d88f" d="m46 72 10 4v13l-10-4zm19 8 10 4v13l-10-4zm35 2 12-6v15l-12 6z"/>'}${type === 'cafe' ? '<path fill="#f9edcb" d="m84 82 46-21-1 10-44 22z"/><path stroke="#c47c66" stroke-width="4" d="m92 78 2 13m11-19 2 13m11-19 2 13"/>' : ''}`,
    );
  }
  function blockPieceArt(id) {
    const shape = E().blockCabinet.shape(id),
      width = Math.max(...shape.cells.map(([x]) => x)) + 1,
      height = Math.max(...shape.cells.map(([, y]) => y)) + 1;
    return `<span class="block-piece-art" style="--piece-w:${width};--piece-h:${height}" aria-hidden="true">${shape.cells.map(([x, y]) => `<i style="grid-column:${x + 1};grid-row:${y + 1}"></i>`).join('')}</span>`;
  }
  function dominoTileArt(id, cls = '') {
    const tile = E().dominoes.tile(id);
    return `<span class="domino-tile-art ${cls}" aria-hidden="true"><i>${tile.a}</i><b></b><i>${tile.b}</i></span>`;
  }
  function emblem(type, variant = 0) {
    if (['home', 'garden', 'cafe', 'library', 'water'].includes(type)) return building(type);
    if (type === 'regiongardens')
      return svg(
        '<rect x="20" y="15" width="120" height="100" rx="12" fill="#93b2a1"/><path d="M60 15v100M100 15v100M20 50h120M20 80h120" stroke="#f6efd9" stroke-width="4"/><g fill="#eac575" stroke="#355b52" stroke-width="3"><circle cx="40" cy="30" r="10"/><circle cx="120" cy="65" r="10"/><circle cx="80" cy="100" r="10"/></g>',
      );
    if (type === 'borough')
      return svg(
        `<path fill="#d5d1b3" d="m15 77 67-41 68 41-67 42z"/><g transform="translate(8,3) scale(.65)">${building('home').replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g><g transform="translate(74,40) scale(.48)">${building('garden').replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`,
      );
    if (type === 'duel')
      return svg(
        '<path d="m13 58 67-35 67 35v36l-67 33-67-33z" fill="#234c51"/><path d="m13 58 67-35 67 35-67 34z" fill="#658783"/><path d="m30 66 67-35m-50 44 67-35m-50 44 67-35M31 48l67 35M48 39l67 35M65 30l67 35" stroke="#b0bbaa" stroke-width="1"/><g fill="#e5b86f" stroke="#f6d994" stroke-width="2"><ellipse cx="64" cy="57" rx="14" ry="7"/><ellipse cx="95" cy="57" rx="14" ry="7"/></g><ellipse cx="80" cy="73" rx="14" ry="7" fill="#19333e"/>',
      );
    if (type === 'tictactoe')
      return svg(
        '<rect x="27" y="12" width="106" height="106" rx="8" fill="#e7d5b7" stroke="#476c69" stroke-width="3"/><path d="M62 18v94M98 18v94M33 53h94M33 89h94" stroke="#476c69" stroke-width="4"/><g fill="none" stroke="#b67854" stroke-width="5"><circle cx="45" cy="35" r="9"/><circle cx="116" cy="71" r="9"/><circle cx="81" cy="107" r="9"/></g><path d="m70 26 21 18m0-18L70 44m-35 35 21 18m0-18-21 18" stroke="#244e57" stroke-width="5" stroke-linecap="round"/>',
      );
    if (type === 'blockcabinet')
      return svg(
        '<rect x="20" y="14" width="120" height="102" rx="7" fill="#e2d6b9" stroke="#476c69" stroke-width="3"/><path d="M50 14v102M80 14v102M110 14v102M20 39h120M20 64h120M20 89h120" stroke="#476c69" stroke-width="2"/><g fill="#b67854"><rect x="25" y="19" width="20" height="15" rx="3"/><rect x="55" y="44" width="20" height="15" rx="3"/><rect x="85" y="69" width="20" height="15" rx="3"/><rect x="115" y="94" width="20" height="15" rx="3"/></g><path d="M33 126h94" stroke="#b99050" stroke-width="5" stroke-linecap="round"/>',
      );
    if (type === 'dominoes')
      return svg(
        '<rect x="26" y="19" width="49" height="91" rx="8" fill="#e2d6b9" stroke="#476c69" stroke-width="3" transform="rotate(-14 50 64)"/><path d="M34 64h39" stroke="#b67854" stroke-width="3" transform="rotate(-14 50 64)"/><circle cx="51" cy="45" r="6" fill="#b67854"/><circle cx="57" cy="83" r="6" fill="#b67854"/><rect x="82" y="19" width="49" height="91" rx="8" fill="#f2d590" stroke="#476c69" stroke-width="3" transform="rotate(14 107 64)"/><path d="M89 64h39" stroke="#b67854" stroke-width="3" transform="rotate(14 107 64)"/><circle cx="107" cy="44" r="6" fill="#b67854"/><circle cx="115" cy="84" r="6" fill="#b67854"/>',
      );
    if (type === 'mahjong')
      return svg(
        '<g stroke="#476c69" stroke-width="3"><rect x="26" y="34" width="52" height="81" rx="8" fill="#93b2a1"/><rect x="21" y="25" width="52" height="81" rx="8" fill="#e2d6b9"/><rect x="88" y="25" width="52" height="81" rx="8" fill="#93b2a1"/><rect x="83" y="16" width="52" height="81" rx="8" fill="#f6efd9"/></g><g font-family="Georgia" font-size="42" text-anchor="middle" fill="#244e57"><text x="47" y="79">A</text><text x="109" y="70">A</text></g>',
      );
    if (type === 'archive')
      return svg(
        '<path fill="#d4c7ad" d="m8 94 66-34 77 34-66 34z"/><path fill="#cf9f68" d="M42 51 82 72v47l-40-22z"/><path fill="#997850" d="m82 72 37-21v47l-37 21z"/><path fill="#e2bf89" d="m42 51 37-21 40 21-37 21z"/><path stroke="#775d44" stroke-width="3" fill="none" d="m51 63 23 47m0-34-23 16m38-13 23 8m-23 7 23-27"/><path fill="#f4e7c9" d="m53 66 14 7v14l-14-7z"/>',
      );
    if (type === 'lab')
      return svg(
        '<path fill="#38676e" d="m14 90 65-33 65 33-65 33z"/><path fill="#77aaa9" d="m14 90 65-33 65 33-65 33z" opacity=".4"/><path fill="#e2d6b9" d="m72 23 20 7 6 64-30-2z"/><path fill="#cf955d" d="m65 28 17-18 18 24z"/><path fill="#edcf7f" d="M73 34h17v13H73z"/><path fill="#e5d18d" opacity=".3" d="m79 40-72-30 3 54z"/><path stroke="#c3d0ba" d="m29 91 21 10m44 5 25-12"/>',
      );
    if (type === 'bridges')
      return svg(
        '<path d="M10 85Q40 110 73 84T149 90V120H10Z" fill="#99b6b2"/><g fill="none" stroke="#af936a" stroke-width="5"><path d="M36 47H120V94H36Z"/><path d="M36 54H113V94"/></g><g fill="#e6d8b9" stroke="#587b7c" stroke-width="2"><circle cx="36" cy="50" r="18"/><circle cx="119" cy="50" r="18"/><circle cx="36" cy="94" r="18"/><circle cx="119" cy="94" r="18"/></g><g font-family="Georgia" font-size="19" text-anchor="middle" fill="#244b53"><text x="36" y="57">3</text><text x="119" y="57">4</text><text x="36" y="101">2</text><text x="119" y="101">3</text></g>',
      );
    return root.AlibiUI.art(type, { size: 5, id: String(variant) });
  }
  function portrait(type, variant = 0) {
    return `<div class="club-portrait portrait-${type}" data-variant="${variant % 3}">${emblem(type, variant)}<span class="engraving-no">${String(variant + 1).padStart(2, '0')} / ALIBI</span></div>`;
  }
  function home() {
    const puzzles = bridge.all(),
      runs = bridge.records(),
      active = [
        ...runs.filter(bridge.activeRun),
        ...Object.entries(state.runs)
          .filter(([id, r]) => E() && r.log.length && !currentGame(id).done)
          .map(([id, r]) => ({
            clubId: id,
            updatedAt: r.updatedAt || '',
            puzzle: {
              type: id,
              title:
                id === 'duel'
                  ? 'Your unfinished Lantern Duel'
                  : id === 'borough'
                    ? 'Pocket Borough · ' + r.seed
                    : id === 'tictactoe'
                      ? 'Tic-Tac-Toe'
                      : id === 'blockcabinet'
                        ? 'Block Cabinet · ' + r.seed
                        : id === 'regiongardens'
                          ? 'Lantern Gardens · ' + E().regionGardens.layouts[r.level].title
                          : id === 'dominoes'
                            ? 'Draw Dominoes · ' + r.seed
                            : id === 'mahjong'
                              ? 'Mahjong Solitaire · ' + r.seed
                              : 'Archive Heist · ' + E().warehouse.maps[r.level].name,
            },
          })),
      ].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0],
      solved = runs.filter((r) => r.firstCompletedAt || r.completedAt).length,
      t = stories[hero],
      media = root.ALIBI_MEDIA || {};
    let target = t.target;
    if (t.id === 'glasshouse' || t.id === 'night-train')
      target = root.ALIBI_CASEBOOKS.find((b) => b.artwork === t.id)?.id || target;
    return `${status()}<section class="club-welcome"><div><span class="eyebrow">THE ALIBI PUZZLE CLUB <span class="club-new">AFTER HOURS / PREVIEW</span></span><h1>Make yourself at home.</h1></div><div class="club-weather"><span class="weather-dot"></span>${esc(t.weather)}<small>A fictional forecast. A real place to think.</small></div></section><div class="club-opening"><article class="club-hero palette-${t.palette}" data-theatre-story="${t.id}"><img data-adaptive-image="hero-${t.id}-photo" src="${esc(media[t.id])}" alt="" width="1536" height="1024" fetchpriority="high" decoding="async"><a data-adaptive-credit hidden href="${esc(root.ALIBI_DELIVERY?.['hero-' + t.id + '-photo']?.source)}" target="_blank" rel="noopener noreferrer">${esc(root.ALIBI_DELIVERY?.['hero-' + t.id + '-photo']?.credit)}</a><div class="hero-vignette"></div><div class="hero-topline"><span>TONIGHT’S EDITION <b>${String(hero + 1).padStart(2, '0')}</b></span><span class="hero-seal">A<br>CLUB</span></div><div class="hero-copy"><div class="eyebrow">${t.tag}</div><h2>${t.title.replace('\n', '<br>')}</h2><p>${t.copy}</p>${go(t.cta + ' <span>↗</span>', t.page, target, 'hero-cta')}</div><div class="hero-foot"><span>${esc(t.note)}</span><div>${B(state.settings.pinned === hero ? 'Unpin' : 'Pin this desk', 'pin', '', 'small quiet')}${B('Next edition →', 'rotate', '', 'small quiet')}</div></div></article><aside class="club-letter ${active ? 'has-run' : ''}"><div class="paperclip"></div><span class="eyebrow">LEFT ON YOUR DESK</span><div class="club-letter-art">${active ? emblem(active.puzzle.type) : emblem('archive')}</div><h2>${active ? 'Right where you left it.' : 'A note from the club.'}</h2><p>${active ? esc(active.puzzle.title) : 'You don’t have to solve everything. Just find something worth wondering about.'}</p><span class="letter-handwriting">${active ? 'The evidence can wait.' : 'The kettle is on.'}</span>${active ? (active.clubId ? go('Continue your game →', 'salon', active.clubId) : `<button class="btn" data-action="open" data-id="${esc(active.key)}">Continue your puzzle →</button>`) : go('Find my first puzzle →', 'library')}<div class="letter-bottom"><span>${solved} solved</span><span>${puzzles.length} to explore</span></div></aside></div>${root.AlibiCuration.news()}${root.AlibiTheatre.room(t.id)}${root.AlibiAtmosphere.invitation()}<div class="club-underhero"><span>◈ A new edition each visit. Your progress stays put.</span><span>NO ACCOUNT · NO LIVES · NO RUSH</span></div><section class="club-section"><div class="club-section-head"><div class="row"><span class="section-number">01</span><div><span class="eyebrow">A DIFFERENT WAY TO THINK</span><h2>Step into the games room.</h2></div></div>${go('All experiments ↗', 'salon', '', 'ghost small')}</div><div class="club-gamecards">${gameCard('duel', 'Lantern Duel', 'Outthink the other side. Keep the corners.', 'STRATEGY · SOLO OR TWO')}${gameCard('tictactoe', 'Tic-Tac-Toe', 'Make three in a row. Block the next idea.', 'CLASSIC · BOT OR TWO')}${gameCard('regiongardens', 'Lantern Gardens', 'One lantern in each row, column and garden.', 'REGIONS · SIX ORIGINAL BOARDS')}${gameCard('blockcabinet', 'Block Cabinet', 'Fit the pieces. Clear the lines. Keep the tray moving.', 'PUZZLE · 8×8 · SOLO')}${gameCard('dominoes', 'Draw Dominoes', 'Match the open ends. Draw carefully. Empty your hand first.', 'CLASSIC · OFFLINE KEEPER')}${gameCard('mahjong', 'Mahjong Solitaire', 'Match free pairs. Uncover the next layer.', 'TILES · SOLO · SEEDED')}${gameCard('borough', 'Pocket Borough', 'Eighteen plans. A town that is yours.', 'CITY BUILDER · SEEDED')}${gameCard('archive', 'Archive Heist', 'A little pushing. A lot of planning.', 'SPATIAL · 6 ROOMS')}${gameCard('lab', 'The living atlas', 'A pocket harbour, drawn by mathematics.', 'PLAYGROUND · CANVAS')}</div></section><section class="club-section"><div class="club-section-head"><div class="row"><span class="section-number">02</span><div><span class="eyebrow">TODAY’S CALLING CARD · ${day()}</span><h2>The same town. Your own approach.</h2></div></div></div><div class="club-daily"><div class="daily-illustration">${emblem('borough')}</div><div><span class="chip">DAILY SEED · UTC</span><h3>A small place by the water.</h3><p>Everyone using this date gets the same plots and plans. Build at your own pace, then share the seed. No timer, no lost streak.</p></div>${B('Build today’s borough ↗', 'daily', '', '')}</div></section><section class="club-section"><div class="club-section-head"><div class="row"><span class="section-number">03</span><div><span class="eyebrow">THE ORIGINAL CABINET</span><h2>Still plenty of mystery.</h2></div></div>${go('All ' + puzzles.length + ' puzzles ↗', 'library', '', 'ghost small')}</div><div class="club-categorycards">${['scene', 'bridges', 'dossier', 'nonogram', 'lightup', 'sudoku'].map((type, i) => `<button class="club-category" data-action="navigate" data-page="library" data-id="${type}">${portrait(type, i)}<strong>${root.AlibiUI.data[type].title}</strong><small>${puzzles.filter((p) => p.type === type).length} puzzles · ${type === 'scene' ? 'Follow the evidence' : 'Take your time'}</small></button>`).join('')}</div></section><section class="club-zen-card"><div><span class="eyebrow">OR LEAVE THE WORLD OUTSIDE</span><h2>Just you and the next good thought.</h2><p>Zen removes navigation, records, badges and decorative motion. Your clues and undo stay.</p></div>${B('Enter Zen →', 'zen', '', 'secondary')}</section>`;
  }
  function gameCard(id, title, description, tag) {
    return `<button class="club-gamecard" data-action="navigate" data-page="${id === 'lab' ? 'lab' : 'salon'}" data-id="${id === 'lab' ? '' : id}">${portrait(id)}<div class="gamecard-copy"><small>${tag}</small><h3>${title} <span>↗</span></h3><p>${description}</p></div></button>`;
  }
  async function onRoute(r) {
    route = r;
    uiError = '';
    selectedPlot = null;
    selectedBlockSlot = null;
    selectedDominoTile = null;
    selectedMahjongTile = null;
    previewCell = null;
    botJob++;
    botPending = false;
    if (botWorker) {
      botWorker.terminate();
      botWorker = null;
    }
    stopLab();
    stopPoll();
    if (r.page === 'salon' || r.page === 'club') {
      try {
        await engine();
        if (r.id === 'borough') {
          const query = new URLSearchParams(location.hash.split('?')[1] || ''),
            seed = query.get('seed');
          if (seed && (!state.runs.borough || state.runs.borough.seed !== E().seedText(seed))) {
            const validSeed = E().seedText(seed);
            if (state.runs.borough?.log.length && !currentGame('borough').done) {
              root.__clubReset = { id: 'borough', seed: validSeed };
              setTimeout(
                () =>
                  confirmation(
                    'Open the shared town?',
                    'This replaces your unfinished town. Export the Club save first to keep it.',
                    'reset-confirm',
                  ),
                100,
              );
            } else state.runs.borough = { seed: validSeed, log: [], redo: [] };
          }
        }
        ensureRun(r.id);
        if (r.id === 'duel') resumeRoom();
      } catch (e) {
        uiError = e.message;
      }
    }
  }
  function ensureRun(id) {
    if (!E()) return;
    if (id === 'duel' && !state.runs.duel) state.runs.duel = { mode: 'bot', log: [], redo: [] };
    if (id === 'tictactoe' && !state.runs.tictactoe)
      state.runs.tictactoe = { mode: 'bot', log: [], redo: [] };
    if (id === 'blockcabinet' && !state.runs.blockcabinet)
      state.runs.blockcabinet = { seed: 'BLOCK-01', log: [], redo: [] };
    if (id === 'dominoes' && !state.runs.dominoes)
      state.runs.dominoes = { seed: 'DOMINO-01', log: [], redo: [] };
    if (id === 'mahjong' && !state.runs.mahjong)
      state.runs.mahjong = { seed: 'MAHJONG-01', log: [], redo: [] };
    if (id === 'borough' && !state.runs.borough)
      state.runs.borough = { seed: 'EVENING-01', log: [], redo: [] };
    if (id === 'regiongardens' && !state.runs.regiongardens)
      state.runs.regiongardens = { level: 0, log: [], redo: [] };
    if (id === 'archive' && !state.runs.archive)
      state.runs.archive = { level: 0, log: [], redo: [] };
  }
  function currentGame(id) {
    const r = state.runs[id];
    if (!r) return null;
    if (id === 'duel') {
      let s = E().reversi.initial();
      for (const i of r.log) s = E().reversi.move(s, i);
      return s;
    }
    if (id === 'tictactoe') return E().tictactoe.replay(r.log);
    if (id === 'blockcabinet') return E().blockCabinet.replay(r.seed, r.log);
    if (id === 'regiongardens') return E().regionGardens.replay(r.level, r.log);
    if (id === 'dominoes') return E().dominoes.replay(r.seed, r.log);
    if (id === 'mahjong') return E().mahjong.replay(r.seed, r.log);
    if (id === 'borough') return E().borough.replay(r.seed, r.log);
    if (id === 'archive') {
      let s = E().warehouse.initial(r.level);
      for (const d of r.log) s = E().warehouse.move(s, d);
      return s;
    }
    return null;
  }
  function heading(title, kicker, description) {
    return `<div class="club-gameheading"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${description}</p></div><div class="row">${B('Zen', 'zen', '', 'secondary small')}${go('Games room', 'salon', '', 'ghost small')}</div></div>`;
  }
  function roomPage(id) {
    if (uiError)
      return `<div class="panel"><h1>The room is taking a moment.</h1><p>${esc(uiError)}</p>${go('Back to your desk', 'home')}</div>`;
    if (id === 'duel') return duelPage();
    if (id === 'tictactoe') return ticTacToePage();
    if (id === 'blockcabinet') return blockCabinetPage();
    if (id === 'mahjong') return mahjongPage();
    if (id === 'dominoes') return dominoPage();
    if (id === 'regiongardens') return regionGardensPage();
    if (id === 'borough') return boroughPage();
    if (id === 'archive') return archivePage();
    return `${heading('The games room.', 'AFTER HOURS · EXPERIMENTS', 'Different rules. The same room to think.')}${status()}<div class="club-gamecards room-cards">${gameCard('duel', 'Lantern Duel', 'A familiar territory game, with a patient opponent.', 'STRATEGY · BOT / TWO PLAYERS')}${gameCard('tictactoe', 'Tic-Tac-Toe', 'Make three in a row. Block the next idea.', 'CLASSIC · BOT / TWO PLAYERS')}${gameCard('regiongardens', 'Lantern Gardens', 'One lantern in each row, column and garden.', 'REGIONS · SIX ORIGINAL BOARDS')}${gameCard('blockcabinet', 'Block Cabinet', 'Fit the pieces. Clear the lines. Keep the tray moving.', 'PUZZLE · 8×8 · SOLO')}${gameCard('dominoes', 'Draw Dominoes', 'Match the open ends. Draw carefully. Empty your hand first.', 'CLASSIC · OFFLINE KEEPER')}${gameCard('mahjong', 'Mahjong Solitaire', 'Match free pairs. Uncover the next layer.', 'TILES · SOLO · SEEDED')}${gameCard('borough', 'Pocket Borough', 'Draft plans. Build neighbours. Make a better place.', 'CITY BUILDER · SEEDED')}${gameCard('archive', 'Archive Heist', 'Six original rooms. No pulling, no pressure.', 'SPATIAL PLANNING · UNDO FREELY')}${gameCard('lab', 'The living atlas', 'A live procedural harbour and its performance instruments.', 'GRAPHICS PLAYGROUND · NO SCORE')}</div><div class="club-two-panels"><section class="panel"><span class="eyebrow">A TABLE FOR TWO</span><h2>Actual play, not pretend players.</h2><p>Pass a game between two people on one device. Lantern Duel also supports an optional private-room server.</p>${go('Take a seat →', 'salon', 'duel')}${B('Online room settings', 'online-settings', '', 'secondary')}</section><section class="panel"><span class="eyebrow">YOUR OWN MEASURE</span><h2>Records without the noise.</h2><p>Personal bests, a little stamp book, and a daily seed. No fabricated rivals, no vanishing streaks, no global rank claims.</p>${go('Open the club journal →', 'club')}${B('Export Club save', 'export', '', 'secondary')}</section></div>`;
  }
  function ruleDetails(content, open = false) {
    return `<details class="club-rules" ${open ? 'open' : ''}><summary>How this works <span>+</span></summary>${content}</details>`;
  }
  function toolbar(id, r, extra = '') {
    return `<div class="club-playtools">${B('↶ Undo', 'undo', `data-id="${id}" ${r.log.length ? '' : 'disabled'}`, 'secondary')}${B('↷ Redo', 'redo', `data-id="${id}" ${r.redo.length ? '' : 'disabled'}`, 'secondary')}${B('Start again', 'restart', `data-id="${id}"`, 'ghost')}${extra}</div>`;
  }
  function duelPage() {
    ensureRun('duel');
    const online = !!room,
      s = online ? room.state : currentGame('duel'),
      r = state.runs.duel,
      score = E().reversi.score(s),
      legal = E().reversi.legal(s),
      yourTurn = !online || room.seat === s.turn,
      canMove =
        !s.done &&
        yourTurn &&
        (!online || room.joined) &&
        (online || r.mode === 'local' || s.turn === 1),
      capture = previewCell !== null ? E().reversi.flips(s, previewCell) : [];
    return `${heading('Lantern Duel.', 'THE GAMES ROOM / 01', 'Keep the corners. Read the room. Leave fewer choices.')}${status()}<div class="club-playlayout"><section class="club-boardpanel"><div class="duel-modes">${B('Against the keeper', 'duel-mode', 'data-value="bot"', !online && r.mode === 'bot' ? 'active' : 'secondary')}${B('Two at the table', 'duel-mode', 'data-value="local"', !online && r.mode === 'local' ? 'active' : 'secondary')}${B(online ? 'Private room ' + esc(room.code) : 'Private online room', 'online-settings', '', online ? 'active' : 'secondary')}</div><div class="duel-scores"><div class="${s.turn === 1 ? 'turn' : ''}"><i class="lantern-piece gold"></i><span>Gold <small>${online ? (room.seat === 1 ? 'You' : 'Opponent') : r.mode === 'bot' ? 'You' : 'First player'}</small></span><strong>${score.gold}</strong></div><span class="versus">VS</span><div class="${s.turn === -1 ? 'turn' : ''}"><i class="lantern-piece ink"></i><span>Ink <small>${online ? (room.seat === -1 ? 'You' : 'Opponent') : r.mode === 'bot' ? 'The keeper' : 'Second player'}</small></span><strong>${score.ink}</strong></div></div><div class="duel-grid" role="group" aria-label="Lantern Duel board, six rows and columns">${s.board.map((v, i) => `<button id="duel-${i}" class="duel-cell ${v ? 'occupied' : ''} ${!v && legal.includes(i) ? 'legal' : ''} ${capture.includes(i) ? 'capture-preview' : ''}" data-action="club-duel-cell" data-cell="${i}" ${canMove && !v && legal.includes(i) ? '' : 'disabled'} aria-label="Row ${Math.floor(i / 6) + 1}, column ${(i % 6) + 1}: ${v === 1 ? 'gold lantern' : v === -1 ? 'ink lantern' : legal.includes(i) ? `empty, legal move, flips ${E().reversi.flips(s, i).length}` : 'empty, unavailable'}">${v ? `<i class="lantern-piece ${v === 1 ? 'gold' : 'ink'}"></i>` : legal.includes(i) ? '<span class="legal-dot"></span>' : ''}</button>`).join('')}</div><div class="club-turn-status" role="status">${s.done ? `<strong>${score.gold === score.ink ? 'An even table.' : score.gold > score.ink ? 'Gold holds the room.' : 'Ink holds the room.'}</strong> Final score ${score.gold} – ${score.ink}.` : online && !room.joined ? 'Room open. Waiting for the second player.' : !yourTurn ? 'Your opponent is thinking.' : botPending ? 'The keeper is considering the corners…' : `${s.turn === 1 ? 'Gold' : 'Ink'} to move. ${legal.length} legal ${legal.length === 1 ? 'square' : 'squares'}.`}${s.passed && !s.done ? '<small>The other side had no legal move and passed automatically.</small>' : ''}</div>${online ? `<div class="club-playtools">${B('Refresh room', 'room-refresh', '', 'secondary')}${B('Leave room view', 'room-leave', '', 'ghost')}</div>` : toolbar('duel', r)}${roomError ? `<p class="club-warning">${esc(roomError)}</p>` : ''}</section><aside class="club-gameaside"><div class="desk-note"><span class="eyebrow">THE KEEPER’S NOTE</span><h2>A full board is not a plan.</h2><p>Capture along a straight line. Corners cannot be taken back. A big early move is not always a good one.</p><div class="tiny-diagram"><i class="lantern-piece gold"></i><i class="lantern-piece ink"></i><span>→</span><i class="lantern-piece gold"></i><i class="lantern-piece gold"></i></div></div>${ruleDetails('<p>Gold moves first. Place a lantern on a dotted square to enclose at least one opposing lantern between the new lantern and one of yours. All enclosed lanterns flip, in all eight directions.</p><p>You must play when you can. A player with no legal move passes automatically. When neither player can move, the side with more lanterns wins.</p><p>Undo against the keeper rewinds your move and the keeper’s reply. The keeper is a bounded game-tree search running in a worker, not an online language model.</p>', true)}<div class="club-local-note">${online ? 'Private room. The server validates turns. No ranking or matchmaking.' : r.mode === 'local' ? 'Two real players, one device. No network required.' : 'An offline opponent. Not another player.'}</div></aside></div>`;
  }
  function ticTacToePage() {
    ensureRun('tictactoe');
    const r = state.runs.tictactoe,
      s = currentGame('tictactoe'),
      winning = s.winner
        ? E().tictactoe.lines.find((line) => line.every((i) => s.board[i] === s.winner))
        : null,
      canMove = !s.done && (r.mode === 'local' || s.turn === 1),
      label = s.done
        ? s.winner === 1
          ? 'X wins.'
          : s.winner === -1
            ? 'O wins.'
            : 'A draw.'
        : s.turn === 1
          ? 'X to move.'
          : 'O to move.';
    return `${heading('Tic-Tac-Toe.', 'THE GAMES ROOM / 02', 'Make a line. Block the next idea.')}${status()}<div class="club-playlayout"><section class="club-boardpanel tic-panel"><div class="duel-modes tic-modes">${B('Against the keeper', 'tictactoe-mode', `data-value="bot" aria-pressed="${r.mode === 'bot'}"`, r.mode === 'bot' ? 'active' : 'secondary')}${B('Two at the table', 'tictactoe-mode', `data-value="local" aria-pressed="${r.mode === 'local'}"`, r.mode === 'local' ? 'active' : 'secondary')}</div><div class="duel-scores"><div class="${s.turn === 1 ? 'turn' : ''}"><span class="tic-player-mark tic-x">X</span><span>X <small>${r.mode === 'bot' ? 'You' : 'First player'}</small></span></div><span class="versus">VS</span><div class="${s.turn === -1 ? 'turn' : ''}"><span class="tic-player-mark tic-o">O</span><span>O <small>${r.mode === 'bot' ? 'The keeper' : 'Second player'}</small></span></div></div><div class="duel-grid tic-grid tictactoe-grid" role="group" aria-label="Tic-Tac-Toe board, three rows and columns">${s.board.map((v, i) => `<button id="tictactoe-${i}" class="duel-cell tic-cell tictactoe-cell ${v === 1 ? 'tic-x' : v === -1 ? 'tic-o' : ''} ${winning?.includes(i) ? 'winning' : ''}" data-action="club-tictactoe-cell" data-cell="${i}" ${canMove && !v ? '' : 'disabled'} aria-label="Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}: ${v === 1 ? 'X' : v === -1 ? 'O' : canMove ? 'empty, available' : 'empty, unavailable'}">${v ? `<span class="tic-mark">${v === 1 ? 'X' : 'O'}</span>` : ''}</button>`).join('')}</div><div id="tictactoe-status" class="club-turn-status tic-status" role="status" tabindex="-1"><strong>${label}</strong>${s.done ? ' The match is complete.' : botPending ? ' The keeper is thinking…' : ` ${r.mode === 'bot' && s.turn === -1 ? 'The keeper is thinking…' : 'Choose an empty square.'}`}</div>${toolbar('tictactoe', r)}</section><aside class="club-gameaside"><div class="desk-note"><span class="eyebrow">THE CLUB CARD</span><h2>Three makes a pattern.</h2><p>X moves first. Claim a row, column or diagonal before O can close it.</p>${emblem('tictactoe')}</div>${ruleDetails('<p>Choose an empty square to place X. Three in a row, column or diagonal wins.</p><p>Against the keeper, O searches every continuation, so it cannot be beaten. Two at the table passes the same device between players.</p>', true)}<div class="club-local-note">This game has its own Club save, replay, undo and redo. No network or cabinet record is involved.</div></aside></div>`;
  }
  function regionGardensPage() {
    ensureRun('regiongardens');
    const r = state.runs.regiongardens,
      s = currentGame('regiongardens'),
      p = E().regionGardens.layouts[r.level],
      bad = new Set(E().regionGardens.conflicts(s));
    return `${heading('Lantern Gardens.', 'THE GAMES ROOM', 'A place for each light. Room between neighbours.')}${status()}<div class="club-playlayout"><section class="club-boardpanel"><h2>${esc(p.title)}</h2><div class="region-board" data-scroll-key="region-garden-${r.level}" style="--garden-size:${p.size}" role="group" aria-label="Lantern Gardens board">${s.marks.map((v, i) => `<button id="garden-cell-${i}" class="region-cell ${bad.has(i) ? 'conflict' : ''}" style="--garden-color:var(--garden-${p.regions[i]})" data-action="club-garden-cell" data-cell="${i}" aria-pressed="${v === 1}" aria-label="Row ${Math.floor(i / p.size) + 1}, column ${(i % p.size) + 1}, garden ${String.fromCharCode(65 + p.regions[i])}: ${v === 1 ? 'lantern' : v === 2 ? 'excluded' : 'empty'}${bad.has(i) ? ', conflicts with another lantern' : ''}" ${s.done ? 'disabled' : ''}><small>${String.fromCharCode(65 + p.regions[i])}</small><span aria-hidden="true">${v === 1 ? '●' : v === 2 ? '×' : ''}</span></button>`).join('')}</div><p id="garden-status" tabindex="-1" role="status">${s.done ? 'All lanterns have a place. Garden complete.' : `${s.marks.filter((v) => v === 1).length} / ${p.size} lanterns placed. ${bad.size ? 'Outlined lanterns share a row, column or garden, or touch.' : 'Tap a square: lantern → exclusion → empty.'}`}</p>${toolbar('regiongardens', r)}</section><aside class="club-gameaside">${ruleDetails('<p>Place exactly one lantern in every row, column and lettered colour region. Lanterns must not touch, even at a corner. All squares belong to a region; most squares stay empty.</p><p>Tap a square to cycle lantern, exclusion cross and empty. Mistakes remain editable. Every garden has exactly one solution. Undo reopens a completed board.</p>', true)}<section class="panel"><h2>Choose a garden</h2>${E()
      .regionGardens.layouts.map((g, i) =>
        B(
          `${esc(g.title)} · ${g.size}×${g.size}${state.records.some((x) => x.type === 'regiongardens' && x.label === g.title) ? ' · Solved' : ''}`,
          'garden-level',
          `data-value="${i}" aria-pressed="${r.level === i}"`,
          'secondary small',
        ),
      )
      .join('')}</section></aside></div>`;
  }
  function dominoPage() {
    ensureRun('dominoes');
    const r = state.runs.dominoes,
      s = currentGame('dominoes'),
      selected = s.human.includes(selectedDominoTile) ? selectedDominoTile : null,
      legal = E().dominoes.legalMoves(s, 'human'),
      selectedMoves = selected === null ? [] : legal.filter((move) => move.tile === selected),
      ends = E().dominoes.ends(s),
      canDraw = !s.done && !legal.length && s.stock.length > 0,
      canPass = !s.done && !legal.length && !s.stock.length,
      outcome =
        s.winner === 'human'
          ? s.human.length
            ? 'The round is blocked. You win with fewer pips.'
            : 'You empty your hand first.'
          : s.winner === 'bot'
            ? s.bot.length
              ? 'The round is blocked. The keeper wins with fewer pips.'
              : 'The keeper empties its hand first.'
            : s.winner === 'draw'
              ? 'The round is blocked. Equal pips make a draw.'
              : '';
    return `${heading('Draw Dominoes.', 'THE GAMES ROOM / 04', 'Match the open ends. Draw carefully. Empty your hand first.')}${status()}<div class="club-playlayout"><section class="club-boardpanel domino-panel"><div class="domino-meta"><span class="seed-label">SEED / ${esc(s.seed)}</span><span>STOCK <strong>${s.stock.length}</strong></span><span>YOUR PIPS <strong>${E().dominoes.pips(s.human)}</strong></span><span>KEEPER <strong>${s.bot.length}</strong> tiles</span></div><div class="domino-chain-wrap"><div class="domino-end-row"><span class="eyebrow">OPEN ENDS</span>${s.chain.length ? `${B('← Place left', 'domino-end', `data-value="left" ${selectedMoves.some((move) => move.end === 'left') ? '' : 'disabled'}`, 'secondary small')}${B('Place right →', 'domino-end', `data-value="right" ${selectedMoves.some((move) => move.end === 'right') ? '' : 'disabled'}`, 'secondary small')}` : B('Open the chain', 'domino-end', `data-value="start" ${selectedMoves.some((move) => move.end === 'start') ? '' : 'disabled'}`, 'secondary small')}</div><div class="domino-chain" data-scroll-key="domino-${esc(s.seed)}" role="list" aria-label="Played domino chain">${s.chain.length ? s.chain.map((piece, i) => `<span class="domino-chain-piece" role="listitem" aria-label="Played ${piece.left} to ${piece.right}"><i>${piece.left}</i><b></b><i>${piece.right}</i></span>`).join('') : '<span class="domino-empty-chain">Choose a tile to begin.</span>'}</div></div><div id="domino-status" class="domino-status" role="status" tabindex="-1">${s.done ? `<strong>${esc(outcome)}</strong> ${s.humanPips} pips in your hand; ${s.botPips} in the keeper’s.` : s.lastAction || (selected === null ? 'Select a tile, then choose an open end.' : 'Choose where the selected tile should go.')}</div><div class="domino-hand" role="list" aria-label="Your domino tiles">${s.human
      .map((tileId) => {
        const tile = E().dominoes.tile(tileId),
          moves = legal.filter((move) => move.tile === tileId);
        return `<button id="domino-tile-${tileId}" class="domino-hand-tile ${selected === tileId ? 'chosen' : ''}" data-action="club-domino-tile" data-value="${tileId}" aria-pressed="${selected === tileId}" ${s.done ? 'disabled' : ''}>${dominoTileArt(tileId)}<strong>${tile.a}|${tile.b}</strong><small>${moves.length ? 'Playable on ' + moves.map((move) => (move.end === 'start' ? 'opening' : move.end)).join(' / ') : 'No open match'}</small></button>`;
      })
      .join(
        '',
      )}</div><div class="domino-draw-row">${B('Draw a tile', 'domino-draw', `data-id="dominoes" ${canDraw ? '' : 'disabled'}`, 'secondary')}${B('Pass', 'domino-pass', `data-id="dominoes" ${canPass ? '' : 'disabled'}`, 'ghost')}<span>${s.stock.length ? `${s.stock.length} in stock` : 'Stock empty'}</span></div>${toolbar('dominoes', r)}</section><aside class="club-gameaside"><div class="desk-note"><span class="eyebrow">THE DOMINO CARD</span><h2>Make the next end count.</h2><p>Keep a match in reserve. Doubles are ordinary tiles here; the open numbers are what matter.</p>${emblem('dominoes')}</div>${ruleDetails('<p>This is a double-six Draw Dominoes round. The set has 28 unique tiles. You and the offline keeper receive seven each; fourteen stay in the stock.</p><p>Choose a tile, then choose the opening position or an open end. If nothing matches, draw one tile at a time until a tile plays. You may pass only after the stock is empty and no tile matches. The keeper follows the same rule.</p><p>The round ends when either hand is empty, or both players are blocked. In a blocked round, the lower pip total wins. The keeper is deterministic and offline; the same seed deals the same round.</p>', true)}<section class="seed-control"><label for="domino-seed">Start another seeded round</label><input id="domino-seed" value="${esc(s.seed)}" maxlength="32" autocomplete="off" spellcheck="false"><div class="row">${B('Use this seed', 'domino-use-seed', '', 'secondary small')}</div></section><p class="club-local-note">Your hand, replay, undo and redo stay in the device-local Club save. No network or pretend multiplayer room is involved.</p></aside></div>`;
  }
  function blockCabinetPage() {
    ensureRun('blockcabinet');
    const r = state.runs.blockcabinet,
      s = currentGame('blockcabinet'),
      selected = Number.isInteger(selectedBlockSlot) ? selectedBlockSlot : null,
      selectedShape = selected === null ? null : E().blockCabinet.shape(s.tray[selected]),
      legalOrigins = new Set(selected === null ? [] : E().blockCabinet.placements(s, selected));
    return `${heading('Block Cabinet.', 'THE GAMES ROOM / 03', 'Fit the pieces. Clear full lines. Keep the tray moving.')}${status()}<div class="club-playlayout"><section class="club-boardpanel block-panel"><div class="block-meta"><span class="seed-label">SEED / ${esc(s.seed)}</span><span>TURN <strong>${s.turn}</strong></span><span class="score-value"><strong>${E().blockCabinet.score(s)}</strong> points</span></div><div class="block-grid" role="group" aria-label="Block Cabinet board, eight rows and columns">${s.board.map((v, i) => `<button id="block-cabinet-cell-${i}" class="block-cell ${v ? 'filled' : ''} ${legalOrigins.has(i) ? 'legal-origin' : ''}" data-action="club-block-cell" data-cell="${i}" ${s.done ? 'disabled' : ''} aria-label="Row ${Math.floor(i / 8) + 1}, column ${(i % 8) + 1}: ${v ? 'filled' + (legalOrigins.has(i) ? ', legal origin for ' + selectedShape.name : '') : legalOrigins.has(i) ? 'empty, legal origin for ' + selectedShape.name : selected === null ? 'empty, choose a piece first' : 'empty, unavailable for selected piece'}">${v ? '<span class="block-cell-mark"></span>' : ''}</button>`).join('')}</div><div class="block-status" role="status">${s.done ? `<strong>Cabinet closed.</strong> No tray piece fits. Final score ${E().blockCabinet.score(s)}.` : selected === null ? 'Choose one of the three pieces, then tap a highlighted starting square.' : `Selected ${esc(selectedShape.name)}. Tap a highlighted square to place it.`}</div><div class="block-tray" aria-label="Available pieces">${s.tray.map((piece, i) => `<button id="block-cabinet-piece-${i}" class="block-piece ${selected === i ? 'chosen' : ''}" data-action="club-block-piece" data-value="${i}" aria-pressed="${selected === i}" ${s.done ? 'disabled' : ''}>${blockPieceArt(piece)}<strong>${esc(E().blockCabinet.shape(piece).name)}</strong><small>Piece ${i + 1}</small></button>`).join('')}</div>${toolbar('blockcabinet', r)}</section><aside class="club-gameaside"><div class="desk-note"><span class="eyebrow">THE CABINET CARD</span><h2>Leave no corner stranded.</h2><p>Small pieces keep a crowded board alive. Clear a full row or column when it appears, then look at what the next tray may need.</p>${emblem('blockcabinet')}</div>${ruleDetails('<p>Select one of the three pieces, then tap a legal highlighted origin on the 8×8 board. Pieces keep the orientation shown in the tray; rotation is intentionally unavailable in this first edition.</p><p>Every filled row and column clears together after a placement. A piece scores its filled squares, plus ten points for every cleared line. The next piece is drawn from the seeded tray sequence, so the same seed always gives the same game.</p><p>When none of the three pieces fits, the cabinet closes. There is no timer and no claim that every seed remains solvable forever.</p>', true)}<section class="seed-control"><label for="block-seed">Start another seeded cabinet</label><input id="block-seed" value="${esc(s.seed)}" maxlength="32" autocomplete="off" spellcheck="false"><div class="row">${B('Use this seed', 'block-use-seed', '', 'secondary small')}</div></section><p class="club-local-note">Your replay, undo, redo and score stay in the device-local Club save. No network is required.</p></aside></div>`;
  }
  function mahjongPage() {
    ensureRun('mahjong');
    const r = state.runs.mahjong,
      s = currentGame('mahjong'),
      selected = E().mahjong.free(s, selectedMahjongTile) ? selectedMahjongTile : null,
      selectedTile = selected === null ? null : s.tiles[selected],
      targets = new Set(
        selectedTile
          ? E()
              .mahjong.pairs(s)
              .find((pair) => pair.includes(selected))
              ?.filter((tile) => tile !== selected) || []
          : [],
      ),
      free = (tile) => E().mahjong.free(s, tile.id);
    const tiles = s.tiles
      .filter((tile) => !tile.removed)
      .map(
        (tile) =>
          `<button id="mahjong-tile-${tile.id}" class="mahjong-tile ${free(tile) ? 'free' : 'blocked'} ${selected === tile.id ? 'chosen' : ''} ${targets.has(tile.id) ? 'match-target' : ''}" data-action="club-mahjong-tile" data-value="${tile.id}" ${free(tile) && !s.done ? '' : 'disabled'} aria-pressed="${selected === tile.id}" aria-label="${tile.face} tile, layer ${tile.z + 1}, ${free(tile) ? 'free' : 'blocked by another tile'}${targets.has(tile.id) ? ', matching selected tile' : ''}" style="--tile-x:${tile.x};--tile-z:${tile.z};">${esc(tile.face)}</button>`,
      )
      .join('');
    const message = s.won
      ? `<strong>Every pair is clear.</strong> Final score ${E().mahjong.score(s)}.`
      : s.stuck
        ? `<strong>No free matching pair remains.</strong> Score ${E().mahjong.score(s)}.`
        : selected === null
          ? 'Choose one free tile, then choose its matching free tile.'
          : targets.size
            ? `Selected ${esc(selectedTile.face)}. Choose the highlighted match.`
            : `Selected ${esc(selectedTile.face)}. That tile has no free match yet.`;
    return `${heading('Mahjong Solitaire.', 'THE GAMES ROOM / 04', 'Clear the free pairs. Read the layers. Leave a little room.')}${status()}<div class="club-playlayout"><section class="club-boardpanel mahjong-panel"><div class="block-meta"><span class="seed-label">SEED / ${esc(s.seed)}</span><span><strong>${s.pairs}</strong> of ${E().mahjong.pairCount} pairs</span><span class="score-value"><strong>${E().mahjong.score(s)}</strong> points</span></div><div class="mahjong-scroll" tabindex="0" role="region" aria-label="Mahjong table, scroll sideways on narrow screens"><div class="mahjong-board" role="group" aria-label="Mahjong Solitaire layered table, twenty tiles">${tiles}</div></div><p class="control-note">On narrow screens, scroll sideways to see the whole table.</p><div class="block-status mahjong-status" role="status" tabindex="-1">${message}</div>${toolbar('mahjong', r)}</section><aside class="club-gameaside"><div class="desk-note"><span class="eyebrow">THE TABLE CARD</span><h2>Look above, then look beside.</h2><p>Remove matching letters only when both tiles are free. A tile must have nothing above it and at least one open horizontal side.</p></div>${ruleDetails('<p>Choose one free tile, then its matching free tile. A tile is free when no tile sits above it and at least one horizontal side is open.</p><p>This small layered table is dealt from the seed so every new table has a known solvable sequence. The same seed always deals the same letters. Undo and redo keep the move replay in the device-local Club save.</p>', true)}<section class="seed-control"><label for="mahjong-seed">Start another seeded table</label><input id="mahjong-seed" value="${esc(s.seed)}" maxlength="32" autocomplete="off" spellcheck="false"><div class="row">${B('Use this seed', 'mahjong-use-seed', '', 'secondary small')}</div></section><p class="club-local-note">Tiles are original letter marks. No network is required.</p></aside></div>`;
  }
  function boroughPage() {
    ensureRun('borough');
    const r = state.runs.borough,
      s = currentGame('borough'),
      score = E().borough.score(s),
      detail = E().borough.breakdown(s),
      tile = s.offers[selectedPlan],
      preview =
        selectedPlot !== null && !s.board[selectedPlot] && !s.done
          ? E().borough.move(s, selectedPlan, selectedPlot)
          : null,
      gain = preview ? E().borough.score(preview) - score : 0;
    return `${heading('Pocket Borough.', 'THE GAMES ROOM / 02', 'Small plans. Good neighbours. Eighteen decisions.')}${status()}<div class="club-playlayout"><section class="club-boardpanel borough-panel"><div class="borough-meta"><span class="seed-label">SEED / ${esc(s.seed)}</span><span>Plan <strong>${Math.min(s.turn + 1, 18)}</strong> of 18</span><span class="score-value"><strong>${score}</strong> points</span></div><div class="borough-grid" role="group" aria-label="Town planning grid">${s.board.map((v, i) => `<button id="borough-${i}" class="borough-cell ${v ? 'built' : ''} ${selectedPlot === i ? 'plot-selected' : ''} ${s.fixed.includes(i) ? 'fixed-plot' : ''}" data-action="club-plot" data-cell="${i}" ${s.done ? 'disabled' : ''} aria-label="Row ${Math.floor(i / 5) + 1}, column ${(i % 5) + 1}: ${v ? E().borough.typeInfo[v].name + ', ' + detail[i] + ' points' + (s.fixed.includes(i) ? ', existing canal' : '') : selectedPlot === i ? 'empty, selected plot' : s.done ? 'empty, unavailable' : 'empty, available plot'}">${v ? building(v) : selectedPlot === i ? `<span class="ghost-building">${building(tile)}</span>` : '<span class="empty-plot">+</span>'}${v ? `<small>${detail[i]}</small>` : ''}</button>`).join('')}</div>${s.done ? `<div class="town-finished"><h2>A little place of your own.</h2><p>${score} points. Same seed, different decisions, another possible town.</p>${B('Share this challenge', 'share-seed', '', '')}${go('Your records', 'club', '', 'secondary')}</div>` : `<div class="plan-tray"><span class="eyebrow">1. CHOOSE A PLAN <span>2. CHOOSE A PLOT</span></span><div class="plan-offers">${s.offers.map((v, i) => `<button class="plan ${i === selectedPlan ? 'chosen' : ''}" data-action="club-plan" data-value="${i}" aria-pressed="${i === selectedPlan}">${building(v)}<strong>${E().borough.typeInfo[v].name}</strong></button>`).join('')}</div><p class="plan-rule">${E().borough.typeInfo[tile].rule}</p>${B(preview ? `Build here · +${gain} points` : 'Select an empty plot', 'build', preview ? '' : 'disabled', 'build-confirm')}</div>`}${toolbar('borough', r, B('Share seed ↗', 'share-seed', '', 'ghost'))}</section><aside class="club-gameaside"><div class="desk-note"><span class="eyebrow">THE TOWN PLANNER’S NOTE</span><h2>Good company adds up.</h2><p>Every building scores its own neighbours. One garden can improve several cottages. Leave room for the plans you haven’t seen.</p><div class="rule-pair">${building('home')}${building('garden')}</div></div>${ruleDetails(
      '<p>Choose one of three plans, then an empty plot. Confirm to build. The selected plan is replaced with the next tile from the seeded deck. The other two plans stay.</p><p>Only orthogonal neighbours count, not diagonals. Points update across the whole town after every placement. The three original canals also score. Finish after eighteen buildings.</p>' +
        Object.entries(E().borough.typeInfo)
          .map(([k, v]) => `<p><strong>${v.name}:</strong> ${v.rule}</p>`)
          .join(''),
      false,
    )}<section class="seed-control"><label for="club-seed">Visit another town</label><input id="club-seed" value="${esc(s.seed)}" maxlength="32" autocomplete="off" spellcheck="false"><div class="row">${B('Use this seed', 'use-seed', '', 'secondary small')}${B('Today’s town', 'daily', '', 'ghost small')}</div></section><p class="club-local-note">Your records are local. Seed links share a challenge, not a live game or a verified global score.</p></aside></div>`;
  }
  function archivePage() {
    ensureRun('archive');
    const r = state.runs.archive,
      s = currentGame('archive'),
      level = E().warehouse.maps[r.level],
      corners = E().warehouse.corners(s);
    return `${heading('Archive Heist.', 'THE GAMES ROOM / 03', 'Get every record onto a brass plate. Keep a way out.')}${status()}<div class="club-playlayout"><section class="club-boardpanel archive-panel"><div class="archive-header"><div><span class="eyebrow">ROOM ${String(r.level + 1).padStart(2, '0')} / ${String(E().warehouse.maps.length).padStart(2, '0')}</span><h2>${level.name}</h2></div><span>${s.pushes} pushes</span></div><div class="archive-grid" style="--cols:${s.w}" role="group" aria-label="Archive warehouse board">${Array.from(
      { length: s.w * s.h },
      (_, i) => {
        const wall = s.walls.includes(i),
          crate = s.crates.includes(i),
          goal = s.goals.includes(i),
          player = s.player === i;
        return `<button id="archive-${i}" class="archive-cell ${wall ? 'wall' : ''} ${goal ? 'goal' : ''} ${crate ? 'crate' : ''} ${player ? 'archivist' : ''}" ${wall || s.done ? 'disabled' : ''} data-action="club-walkcell" data-cell="${i}" aria-label="Row ${Math.floor(i / s.w) + 1}, column ${(i % s.w) + 1}: ${wall ? 'wall' : player ? 'archivist' : crate ? (goal ? 'crate on plate' : 'crate') : goal ? 'brass plate' : 'floor'}">${player ? '<span class="archivist-head"></span>' : crate ? '<span class="crate-top">A</span>' : goal ? '<span class="goal-plate">◇</span>' : ''}</button>`;
      },
    ).join(
      '',
    )}</div><div class="archive-status" role="status">${s.done ? '<strong>Every record in its place.</strong> Nicely planned.' : corners.length ? 'A crate is in a non-goal corner. It cannot be pulled out. Undo is your way back.' : level.subtitle}</div><div class="direction-pad">${B('↑', 'walk', 'data-value="up" aria-label="Move up"', 'up secondary')}${B('←', 'walk', 'data-value="left" aria-label="Move left"', 'left secondary')}${B('↓', 'walk', 'data-value="down" aria-label="Move down"', 'down secondary')}${B('→', 'walk', 'data-value="right" aria-label="Move right"', 'right secondary')}</div>${toolbar('archive', r)}${s.done && r.level < E().warehouse.maps.length - 1 ? B('Next room →', 'archive-level', `data-value="${r.level + 1}"`) : ''}</section><aside class="club-gameaside"><div class="desk-note"><span class="eyebrow">THE ARCHIVIST’S NOTE</span><h2>Before you push, look behind.</h2><p>You can push a crate, but never pull it. The route around a crate often matters more than the route in front.</p>${emblem('archive')}</div>${ruleDetails('<p>Use the arrow keys, the direction buttons, or tap a square next to the archivist. Walk into a crate to push it one square. You can only push one crate at a time.</p><p>Move every crate onto a brass plate. There are no hidden rules, time limits or move penalties. Corner warnings are advisory and only detect simple deadlocks.</p>', true)}<div class="archive-levels">${E()
      .warehouse.maps.map((m, i) =>
        B(
          `${String(i + 1).padStart(2, '0')} · ${m.name}`,
          'archive-level',
          `data-value="${i}"`,
          i === r.level ? 'active' : 'secondary',
        ),
      )
      .join('')}</div></aside></div>`;
  }
  function record(id, s) {
    if (!s.done) return;
    const r = state.runs[id],
      key =
        id +
        ':' +
        (id === 'borough' || id === 'blockcabinet' || id === 'dominoes' || id === 'mahjong'
          ? r.seed
          : ['archive', 'regiongardens'].includes(id)
            ? r.level
            : r.mode) +
        ':' +
        E().hash(JSON.stringify(r.log));
    if (state.records.some((x) => x.id === key)) return;
    const points =
      id === 'borough'
        ? E().borough.score(s)
        : id === 'duel'
          ? E().reversi.score(s).gold - E().reversi.score(s).ink
          : id === 'tictactoe'
            ? s.winner
            : id === 'blockcabinet'
              ? E().blockCabinet.score(s)
              : id === 'regiongardens'
                ? r.log.length
                : id === 'dominoes'
                  ? E().dominoes.score(s)
                  : id === 'mahjong'
                    ? E().mahjong.score(s)
                    : s.pushes;
    state.records.unshift({
      id: key,
      type: id,
      label:
        id === 'regiongardens'
          ? E().regionGardens.layouts[r.level].title
          : id === 'borough'
            ? r.seed
            : id === 'archive'
              ? E().warehouse.maps[r.level].name
              : id === 'tictactoe'
                ? r.mode === 'bot'
                  ? 'Against the keeper'
                  : 'Two at the table'
                : id === 'blockcabinet'
                  ? 'Block Cabinet · ' + r.seed
                  : id === 'dominoes'
                    ? 'Draw Dominoes · ' + r.seed
                    : id === 'mahjong'
                      ? 'Mahjong Solitaire · ' + r.seed
                      : r.mode === 'bot'
                        ? 'Against the keeper'
                        : 'Two at the table',
      score: points,
      date: new Date().toISOString(),
    });
    state.records = state.records.slice(0, 100);
    save();
  }
  function profile() {
    const runs = bridge.records(),
      solved = runs.filter((r) => r.firstCompletedAt || r.completedAt),
      families = new Set(solved.map((r) => r.puzzle.type)),
      towns = state.records
        .filter((r) => r.type === 'borough')
        .slice()
        .sort((a, b) => b.score - a.score),
      gameRecords = state.records.filter((r) => r.type !== 'borough'),
      unique = new Map();
    for (const r of towns) if (!unique.has(r.label)) unique.set(r.label, r);
    const achievements = [
      ['First light', 'Solve your first puzzle.', solved.length > 0, 'lightup'],
      ['A curious mind', 'Solve three puzzle families.', families.size >= 3, 'dossier'],
      ['Town planner', 'Complete a Pocket Borough.', towns.length > 0, 'borough'],
      [
        'A seat at the table',
        'Finish a Lantern Duel.',
        state.records.some((r) => r.type === 'duel'),
        'duel',
      ],
      [
        'In good order',
        'Finish an archive room.',
        state.records.some((r) => r.type === 'archive'),
        'archive',
      ],
      ['A quiet practice', 'Enter Zen mode.', state.stamps.includes('zen'), 'garden'],
    ];
    const gameRecordOutcome = (r) => {
      if (r.type === 'tictactoe')
        return r.score === 1 ? 'X wins' : r.score === -1 ? 'O wins' : 'Draw';
      if (r.type === 'duel')
        return r.score > 0
          ? `Gold wins · ${r.score} point lead`
          : r.score < 0
            ? `Ink wins · ${-r.score} point lead`
            : 'Draw';
      if (r.type === 'regiongardens') return `${r.score} moves`;
      if (r.type === 'archive') return `${r.score} pushes`;
      if (r.type === 'dominoes')
        return r.score > 0
          ? `You win · ${r.score} pips`
          : r.score < 0
            ? `Keeper wins · ${-r.score} pips`
            : 'Draw';
      return `${r.score} points`;
    };
    return `${heading('Your club journal.', 'NO AUDIENCE REQUIRED', 'A record of curiosity, not a to-do list.')}${status()}<div class="club-stats"><div><strong>${solved.length}</strong><span>puzzles solved</span></div><div><strong>${families.size}</strong><span>families explored</span></div><div><strong>${towns.length}</strong><span>towns completed</span></div><div><strong>${achievements.filter((a) => a[2]).length}</strong><span>stamps collected</span></div></div><section class="club-section"><div class="club-section-head"><h2>A little stamp book.</h2><span class="eyebrow">NO STREAK TO LOSE</span></div><div class="stamp-grid">${achievements.map(([title, desc, earned, icon], index) => `<div class="club-stamp ${earned ? 'earned' : ''}">${root.AlibiAssets.badge(['club-first-light', 'club-curious', 'club-town', 'club-duel', 'club-archive', 'club-zen'][index], earned)}<strong>${title}</strong><span>${desc}</span><small>${earned ? 'COLLECTED' : 'NOT YET'}</small></div>`).join('')}</div></section><section class="panel"><div class="club-section-head"><div><span class="eyebrow">POCKET BOROUGH / PERSONAL BESTS</span><h2>The local leaderboard.</h2></div><span class="local-label">THIS BROWSER ONLY</span></div><p>One personal best per seed. Different seeds are not directly comparable. No other players or global rankings are implied.</p>${unique.size ? `<div class="record-table club-town-records">${[...unique.values()].map((r, i) => `<div><span>${String(i + 1).padStart(2, '0')}</span><strong>${esc(r.label)}</strong><span>${r.score} points</span><small>${esc(String(r.date).slice(0, 10))}</small></div>`).join('')}</div>` : '<div class="empty-records">Your first town will go here. There is no sample score to beat.</div>'}${go('Build a town →', 'salon', 'borough')}</section><section class="panel club-game-records"><div class="club-section-head"><div><span class="eyebrow">GAMES ROOM / COMPLETED RECORDS</span><h2>Completed games.</h2></div><span class="local-label">THIS BROWSER ONLY</span></div><p>Completed games stay here with their local outcome.</p>${gameRecords.length ? `<div class="record-table">${gameRecords.map((r, i) => `<div><span>${String(i + 1).padStart(2, '0')}</span><strong>${esc(r.label)}</strong><span>${esc(gameRecordOutcome(r))}</span><small>${esc(String(r.date).slice(0, 10))}</small></div>`).join('')}</div>` : '<div class="empty-records">Your first completed game will go here.</div>'}</section><section class="club-two-panels"><div class="panel"><h2>Club progress travels as a file.</h2><p>The games-room save is separate from the original cabinet save. Export both before changing devices or website addresses.</p>${B('Export Club save', 'export')}${B('Restore Club save', 'import', '', 'secondary')}${go('Cabinet saves', 'settings', '', 'ghost')}${go('Quiet Wing journal', 'quiet', 'journal', 'ghost')}</div><div class="panel"><h2>What online would add.</h2><p>Private two-device Lantern Duel is available with the optional room server. Ranked matches, public accounts, moderation and cloud saves are not enabled in this static preview.</p>${B('Private room settings', 'online-settings', '', 'secondary')}</div></section>`;
  }
  function exportSave(value = state, label = 'club') {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
      a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'alibi-' + label + '-' + day() + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function commitGame(id, value) {
    if (saveError && storageMode !== 'session') {
      notify('Resolve the save conflict or export before continuing.', true);
      return;
    }
    const r = state.runs[id],
      before = currentGame(id);
    r.rulesVersion = 1;
    if (id === 'duel') E().reversi.move(before, value);
    if (id === 'tictactoe') E().tictactoe.move(before, value);
    if (id === 'blockcabinet') E().blockCabinet.move(before, value.slot, value.cell);
    if (id === 'regiongardens') E().regionGardens.move(before, value);
    if (id === 'dominoes') E().dominoes.move(before, value);
    if (id === 'mahjong') E().mahjong.move(before, value.a, value.b);
    if (id === 'borough') E().borough.move(before, value.slot, value.cell);
    if (id === 'archive' && E().warehouse.move(before, value) === before) return;
    r.log.push(value);
    r.redo = [];
    r.updatedAt = new Date().toISOString();
    const s = currentGame(id);
    record(id, s);
    save();
    render();
  }
  function bot() {
    if (
      route.page !== 'salon' ||
      !['duel', 'tictactoe'].includes(route.id) ||
      room ||
      botPending ||
      !E()
    )
      return;
    const game = route.id,
      r = state.runs[game],
      s = currentGame(game);
    if (r.mode !== 'bot' || s.turn !== -1 || s.done) return;
    botPending = true;
    const job = ++botJob;
    try {
      const source = `${cfg().engineSource || ''}\n${cfg().engineSource ? '' : `importScripts(${JSON.stringify(new URL(cfg().engine, location.href).href)});`}\nconst game=${JSON.stringify(game)};\nonmessage=e=>{try{postMessage({id:e.data.id,...(game==='duel'?AlibiClubEngines.reversi.best(e.data.state,4):AlibiClubEngines.tictactoe.best(e.data.state,9))})}catch(err){postMessage({id:e.data.id,error:err.message})}};`;
      const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      botWorker = new Worker(url);
      URL.revokeObjectURL(url);
      botWorker.onmessage = (e) => {
        if (e.data.id !== botJob || route.id !== game) return;
        botPending = false;
        botWorker.terminate();
        botWorker = null;
        if (e.data.error) {
          notify(e.data.error, true);
          return;
        }
        commitGame(game, e.data.cell).then(() => {
          if (game === 'tictactoe')
            document.getElementById('tictactoe-status')?.focus({ preventScroll: true });
        });
      };
      botWorker.onerror = () => {
        botPending = false;
        botWorker?.terminate();
        botWorker = null;
        notify('The worker could not start. Switch to two-player mode or reload.', true);
        render();
      };
      botWorker.postMessage({ id: job, state: s });
    } catch (e) {
      botPending = false;
      notify('This browser could not start the offline opponent.', true);
    }
    const status = document.querySelector('.club-turn-status');
    if (status && botPending) status.textContent = 'The keeper is considering the corners…';
  }
  function confirmation(title, text, action, extra = {}) {
    bridge.dialog(title, `<p>${esc(text)}</p>`, [
      { label: 'Continue', action: 'club-' + action, ...extra },
      { label: 'Cancel', action: 'close-dialog', secondary: true },
    ]);
  }
  async function action(el) {
    const a = el.dataset.action.slice(5),
      v = el.dataset.value,
      id = el.dataset.id;
    try {
      if (a === 'rotate') {
        hero = (hero + 1) % stories.length;
        state.lastHero = hero;
        state.settings.pinned = null;
        save();
        render();
      } else if (a === 'pin') {
        state.settings.pinned = state.settings.pinned === hero ? null : hero;
        save();
        render();
      } else if (a === 'zen') {
        state.settings.zen = !state.settings.zen;
        if (state.settings.zen && !state.stamps.includes('zen')) state.stamps.push('zen');
        save();
        render();
        if (state.settings.zen && !['play', 'salon', 'lab'].includes(route.page))
          notify('Zen is on. Open any puzzle or game; only the essentials will remain.');
      } else if (a === 'assist') {
        state.settings.assist =
          v ||
          ['off', 'candidates', 'tidy'][
            (['off', 'candidates', 'tidy'].indexOf(state.settings.assist) + 1) % 3
          ];
        save();
        render();
      } else if (a === 'assist-explain') {
        bridge.dialog(
          'Helpful, not all-knowing.',
          '<p><strong>Candidates</strong> marks choices excluded by the current row, column, clue or local rule. Tap a dimmed choice to learn why.</p><p><strong>Tidy</strong> also projects logic-grid exclusions, completed picture-line crosses, and unavailable tent squares. These are derived marks, not permanent edits. Change the premise and they disappear.</p><p>Assistance never reads the stored answer. It checks local rules, not whether the entire puzzle is globally solvable. Your manual notes are preserved.</p>',
          [{ label: 'Back to the board', action: 'close-dialog' }],
        );
      } else if (a === 'forced') {
        const run = bridge.current();
        if (!run) return;
        const d = root.AlibiCore.insights.deduction(run.puzzle, run.state);
        if (!d || d.value === undefined || d.cells?.length !== 1) {
          notify(
            d?.message || 'No supported forced step found. Your board may need another technique.',
          );
          return;
        }
        root.__clubForced = {
          key: run.key,
          before: clone(run.state),
          cell: d.cells[0],
          value: d.value,
        };
        bridge.dialog(
          'One forced step.',
          `<p><strong>${esc(d.rule)}</strong></p><p>${esc(d.message)}</p><p class="fine">This follows from your current entries, not the stored solution. A wrong premise may still lead to a wrong conclusion. Apply it as one undoable move.</p>`,
          [
            { label: 'Apply this step', action: 'club-forced-apply' },
            { label: 'Keep thinking', action: 'close-dialog', secondary: true },
          ],
        );
      } else if (a === 'forced-apply') {
        const d = root.__clubForced,
          run = bridge.current();
        document.getElementById('dialog').close();
        if (!d || !run || d.key !== run.key || !root.AlibiCore.equal(d.before, run.state)) {
          notify('The board changed. Ask for the deduction again.');
          return;
        }
        delete root.__clubForced;
        bridge.apply({ type: 'set', cell: d.cell, value: d.value });
      } else if (a === 'export') exportSave();
      else if (a === 'recovery') {
        if (!db || storageMode !== 'indexeddb')
          throw Error('A Club recovery copy requires device storage.');
        const saved = await new Promise((resolve, reject) => {
          const tx = db.transaction('club', 'readonly'),
            r = tx.objectStore('club').get('recovery');
          watch(tx, reject);
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        if (!saved) throw Error('No Club backup has been restored yet.');
        exportSave(saved.data, 'club-recovery');
      } else if (a === 'import') document.getElementById('club-import').click();
      else if (a === 'restore-confirm') {
        document.getElementById('dialog').close();
        if (root.__alibiPendingClub) {
          if (storageMode !== 'indexeddb' || saveError)
            throw Error(
              'Restore needs healthy device storage. Export this session before reloading.',
            );
          const next = root.__alibiPendingClub;
          delete root.__alibiPendingClub;
          await persist(next);
          if (saveError) throw Error(saveError);
          state = next;
          await onRoute(route);
          render();
        }
      } else if (a === 'duel-mode' || a === 'tictactoe-mode') {
        const mode = v;
        const game = a === 'duel-mode' ? 'duel' : 'tictactoe';
        if (game === 'duel' && room) {
          try {
            sessionStorage.removeItem('alibi-club-room');
          } catch {}
          stopPoll();
          room = null;
        }
        if (state.runs[game].log.length || state.runs[game].redo.length) {
          root.__clubReset = { id: game, mode };
          confirmation(
            game === 'duel' ? 'Take a new seat?' : 'Start a new match?',
            'This starts a fresh match. Your completed records stay in the journal.',
            'reset-confirm',
          );
        } else {
          state.runs[game] = { mode, log: [], redo: [] };
          save();
          render();
        }
      } else if (a === 'garden-cell') {
        await commitGame('regiongardens', Number(el.dataset.cell));
        if (currentGame('regiongardens').done)
          document.getElementById('garden-status')?.focus({ preventScroll: true });
      } else if (a === 'garden-level') {
        const level = Number(v),
          r = state.runs.regiongardens;
        E().regionGardens.initial(level);
        if (level === r.level) return;
        if (r.log.length || r.redo.length) {
          root.__clubReset = { id: 'regiongardens', level };
          confirmation(
            'Open another garden?',
            'This replaces the current board. Solved garden records are kept.',
            'reset-confirm',
          );
        } else {
          r.level = level;
          save();
          render();
        }
      } else if (a === 'block-piece') {
        const slot = Number(v),
          s = currentGame('blockcabinet');
        if (!s || s.done || !Number.isInteger(slot) || slot < 0 || slot > 2) return;
        selectedBlockSlot = selectedBlockSlot === slot ? null : slot;
        render();
      } else if (a === 'block-cell') {
        const slot = selectedBlockSlot,
          cell = Number(el.dataset.cell),
          s = currentGame('blockcabinet');
        if (slot === null) {
          notify('Choose a piece from the tray first.');
          return;
        }
        if (!s || !E().blockCabinet.legal(s, slot, cell)) {
          notify('That piece does not fit there. Choose a highlighted square.');
          return;
        }
        selectedBlockSlot = null;
        await commitGame('blockcabinet', { slot, cell });
        document.getElementById('block-cabinet-cell-' + cell)?.focus({ preventScroll: true });
      } else if (a === 'block-use-seed') {
        const seed = E().seedText(document.getElementById('block-seed').value),
          r = state.runs.blockcabinet;
        if (r.seed === seed && !r.log.length) return;
        root.__clubReset = { id: 'blockcabinet', seed };
        confirmation(
          'Start another cabinet?',
          'Your current cabinet is replaced. Completed records remain in the Club journal.',
          'reset-confirm',
        );
      } else if (a === 'domino-tile') {
        const tile = Number(v),
          s = currentGame('dominoes');
        if (!s || s.done || !Number.isInteger(tile) || !s.human.includes(tile)) return;
        selectedDominoTile = selectedDominoTile === tile ? null : tile;
        render();
      } else if (a === 'domino-end') {
        const tile = selectedDominoTile,
          end = v,
          s = currentGame('dominoes');
        if (tile === null) {
          notify('Choose a tile from your hand first.');
          return;
        }
        if (!s || !E().dominoes.canPlay(s, tile, end)) {
          notify('That tile does not match this open end.');
          return;
        }
        selectedDominoTile = null;
        await commitGame('dominoes', { kind: 'play', tile, end });
        document.getElementById('domino-status')?.focus({ preventScroll: true });
      } else if (a === 'domino-draw') {
        if (!currentGame('dominoes')?.done) {
          selectedDominoTile = null;
          await commitGame('dominoes', { kind: 'draw' });
          document.getElementById('domino-status')?.focus({ preventScroll: true });
        }
      } else if (a === 'domino-pass') {
        if (!currentGame('dominoes')?.done) {
          selectedDominoTile = null;
          await commitGame('dominoes', { kind: 'pass' });
          document.getElementById('domino-status')?.focus({ preventScroll: true });
        }
      } else if (a === 'domino-use-seed') {
        const seed = E().seedText(document.getElementById('domino-seed').value),
          r = state.runs.dominoes;
        if (r.seed === seed && !r.log.length) return;
        root.__clubReset = { id: 'dominoes', seed };
        confirmation(
          'Start another domino round?',
          'Your current round is replaced. Completed records remain in the Club journal.',
          'reset-confirm',
        );
      } else if (a === 'mahjong-tile') {
        const tile = Number(v),
          s = currentGame('mahjong');
        if (!s || s.done || !Number.isInteger(tile) || !E().mahjong.free(s, tile)) return;
        if (selectedMahjongTile === null) {
          selectedMahjongTile = tile;
          render();
        } else if (selectedMahjongTile === tile) {
          selectedMahjongTile = null;
          render();
        } else if (!E().mahjong.matching(s, selectedMahjongTile, tile)) {
          notify('Choose the matching free tile.');
        } else {
          const pair = { a: selectedMahjongTile, b: tile };
          selectedMahjongTile = null;
          await commitGame('mahjong', pair);
          (
            document.querySelector('.mahjong-tile.free:not(:disabled)') ||
            document.querySelector('.mahjong-status')
          )?.focus({ preventScroll: true });
        }
      } else if (a === 'mahjong-use-seed') {
        const seed = E().seedText(document.getElementById('mahjong-seed').value),
          r = state.runs.mahjong;
        if (r.seed === seed && !r.log.length) return;
        root.__clubReset = { id: 'mahjong', seed };
        confirmation(
          'Start another table?',
          'Your current table is replaced. Completed records remain in the Club journal.',
          'reset-confirm',
        );
      } else if (a === 'duel-cell' || a === 'tictactoe-cell') {
        const game = a === 'duel-cell' ? 'duel' : 'tictactoe';
        if (game === 'duel' && room) return await roomMove(Number(el.dataset.cell));
        const s = currentGame(game);
        if (state.runs[game].mode === 'bot' && s.turn !== 1) return;
        const cell = Number(el.dataset.cell);
        await commitGame(game, cell);
        if (game === 'tictactoe')
          document.getElementById('tictactoe-status')?.focus({ preventScroll: true });
      } else if (a === 'undo' || a === 'redo') {
        const r = state.runs[id];
        if (!r) return;
        botJob++;
        botWorker?.terminate();
        botWorker = null;
        botPending = false;
        if (a === 'undo') {
          if (['duel', 'tictactoe'].includes(id) && r.mode === 'bot') {
            do {
              if (!r.log.length) break;
              r.redo.push(r.log.pop());
            } while (r.log.length && currentGame(id).turn !== 1);
          } else if (r.log.length) r.redo.push(r.log.pop());
        } else {
          if (['duel', 'tictactoe'].includes(id) && r.mode === 'bot') {
            do {
              if (!r.redo.length) break;
              r.log.push(r.redo.pop());
            } while (r.redo.length && !currentGame(id).done && currentGame(id).turn !== 1);
          } else if (r.redo.length) r.log.push(r.redo.pop());
        }
        selectedPlot = null;
        selectedDominoTile = null;
        selectedMahjongTile = null;
        save();
        render();
      } else if (a === 'restart') {
        root.__clubReset = { id };
        confirmation(
          'Start this game again?',
          'The current moves will be cleared. Completed records are kept.',
          'reset-confirm',
        );
      } else if (a === 'reset-confirm') {
        const reset = root.__clubReset;
        if (!reset) return;
        document.getElementById('dialog').close();
        botJob++;
        botWorker?.terminate();
        botWorker = null;
        botPending = false;
        const r = state.runs[reset.id];
        r.log = [];
        r.redo = [];
        if (reset.mode) r.mode = reset.mode;
        if (reset.seed) r.seed = reset.seed;
        if (Number.isInteger(reset.level)) r.level = reset.level;
        selectedPlot = null;
        selectedDominoTile = null;
        selectedMahjongTile = null;
        save();
        render();
        delete root.__clubReset;
      } else if (a === 'plan') {
        selectedPlan = Number(v);
        render();
      } else if (a === 'plot') {
        const i = Number(el.dataset.cell),
          s = currentGame('borough');
        if (s.board[i])
          notify(
            `${E().borough.typeInfo[s.board[i]].name}: ${E().borough.breakdown(s)[i]} points. Only side neighbours count.`,
          );
        else {
          selectedPlot = i;
          render();
        }
      } else if (a === 'build') {
        if (selectedPlot === null) return;
        const s = currentGame('borough');
        E().borough.move(s, selectedPlan, selectedPlot);
        const move = { slot: selectedPlan, cell: selectedPlot };
        selectedPlot = null;
        await commitGame('borough', move);
        document.getElementById('borough-' + move.cell)?.focus({ preventScroll: true });
      } else if (a === 'daily') {
        const seed = 'DAY-' + day();
        if (state.runs.borough?.seed === seed) {
          bridge.navigate('salon', 'borough');
          render();
          return;
        }
        if (
          state.runs.borough?.log.length &&
          !currentGame('borough').done &&
          state.runs.borough.seed !== seed
        ) {
          root.__clubReset = { id: 'borough', seed };
          confirmation(
            'Start today’s town?',
            'This replaces your unfinished town. Export the Club save first to keep it.',
            'daily-confirm',
          );
          return;
        }
        state.runs.borough = { seed, log: [], redo: [] };
        save();
        bridge.navigate('salon', 'borough');
        render();
      } else if (a === 'daily-confirm') {
        document.getElementById('dialog').close();
        state.runs.borough = { seed: root.__clubReset.seed, log: [], redo: [] };
        delete root.__clubReset;
        save();
        bridge.navigate('salon', 'borough');
        render();
      } else if (a === 'use-seed') {
        const seed = E().seedText(document.getElementById('club-seed').value);
        root.__clubReset = { id: 'borough', seed };
        confirmation(
          'Visit a new town?',
          'Your current town is replaced. Completed records remain.',
          'reset-confirm',
        );
      } else if (a === 'share-seed') {
        const seed = state.runs.borough.seed,
          url = new URL(location.href);
        url.hash = '/salon/borough?seed=' + encodeURIComponent(seed);
        const webLink = /^https?:$/.test(location.protocol),
          text = webLink ? url.href : 'Pocket Borough seed: ' + seed;
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'A town for two approaches',
              text: 'Build Pocket Borough seed ' + seed + '. No account needed.',
              url: webLink ? url.href : undefined,
            });
            return;
          } catch (e) {
            if (e.name === 'AbortError') return;
          }
        }
        try {
          await navigator.clipboard.writeText(text);
          notify('Challenge copied. The seed is ' + seed + '.');
        } catch {
          bridge.dialog(
            'Share this town.',
            `<p>Use seed <strong>${esc(seed)}</strong> in Pocket Borough.</p><input readonly value="${esc(text)}" aria-label="Challenge link">`,
            [{ label: 'Close', action: 'close-dialog' }],
          );
        }
      } else if (a === 'walk' || a === 'walk-key') {
        const r = state.runs.archive,
          s = currentGame('archive'),
          q = E().warehouse.move(s, v);
        if (q !== s) await commitGame('archive', v);
      } else if (a === 'walkcell') {
        const s = currentGame('archive'),
          cell = Number(el.dataset.cell),
          delta = cell - s.player,
          dir =
            delta === -s.w
              ? 'up'
              : delta === s.w
                ? 'down'
                : delta === 1 && Math.floor(cell / s.w) === Math.floor(s.player / s.w)
                  ? 'right'
                  : delta === -1 && Math.floor(cell / s.w) === Math.floor(s.player / s.w)
                    ? 'left'
                    : null;
        if (dir) await action({ dataset: { action: 'club-walk', value: dir } });
        else notify('Tap a square directly next to the archivist, or use the arrows.');
      } else if (a === 'archive-level') {
        const level = Number(v),
          r = state.runs.archive;
        if (level === r.level) return;
        if (r.log.length && !currentGame('archive').done) {
          root.__clubReset = { id: 'archive', level };
          confirmation(
            'Change archive rooms?',
            'This replaces your unfinished room. Other completed records stay.',
            'reset-confirm',
          );
        } else {
          r.level = level;
          r.log = [];
          r.redo = [];
          save();
          render();
        }
      } else if (a === 'online-settings') onlineDialog();
      else if (a === 'room-create') await createRoom();
      else if (a === 'room-join') await joinRoom();
      else if (a === 'room-refresh') await pollRoom();
      else if (a === 'room-leave') {
        try {
          sessionStorage.removeItem('alibi-club-room');
        } catch {}
        stopPoll();
        room = null;
        roomError = '';
        render();
      } else if (a === 'lab-toggle') {
        if (lab) {
          lab.paused = !lab.paused;
          lab.send({ type: 'pause', value: lab.paused });
          document.getElementById('lab-pause').textContent = lab.paused
            ? 'Resume harbour'
            : 'Pause harbour';
        }
      } else if (a === 'lab-quality') {
        if (lab) {
          lab.quality = Number(v);
          lab.send({ type: 'quality', value: lab.quality });
          document
            .querySelectorAll('[data-action="club-lab-quality"]')
            .forEach((b) => b.classList.toggle('active', b.dataset.value === v));
        }
      }
    } catch (e) {
      notify(e.message, true);
    }
  }
  function apiBase() {
    const raw = state.settings.api || cfg().apiBase || '';
    if (!raw) return '';
    const u = new URL(raw, location.href);
    if (
      u.protocol !== 'https:' &&
      !(u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname))
    )
      throw Error('Use an HTTPS API, or localhost for development.');
    return u.href.replace(/\/$/, '');
  }
  function onlineDialog() {
    bridge.dialog(
      'A private table for two.',
      `<p>Lantern Duel can run across two devices using the optional room server in this bundle. The static preview alone does not create online rooms.</p><label for="club-api">Room API address</label><input id="club-api" type="url" value="${esc(state.settings.api || cfg().apiBase || '')}" placeholder="https://your-worker.workers.dev/api"><label for="club-room-code">Invite code (to join)</label><input id="club-room-code" maxlength="8" autocomplete="off" placeholder="ABCDEFGH"><p class="fine">Create a room, then give the eight-character code to a friend. Room credentials stay on your device. No public profile, chat, rating, or leaderboard is created.</p>`,
      [
        { label: 'Create a room', action: 'club-room-create' },
        { label: 'Join with code', action: 'club-room-join', secondary: true },
        { label: 'Close', action: 'close-dialog', secondary: true },
      ],
    );
  }
  async function request(path, method = 'GET', body, token) {
    const base = apiBase();
    if (!base) throw Error('Deploy the optional room server, then enter its HTTPS API address.');
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    let json;
    try {
      json = await response.json();
    } catch {
      const error = Error('This address is not a configured Alibi room API.');
      error.status = response.status;
      throw error;
    }
    if (!response.ok) {
      const error = Error(json.error || 'The room request failed.');
      error.status = response.status;
      throw error;
    }
    return json;
  }
  function privateRoomToken() {
    return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
  }
  function roomAttemptFor(kind, code = '') {
    if (!roomAttempt || roomAttempt.kind !== kind || roomAttempt.code !== code)
      roomAttempt = { kind, code, requestId: privateRoomToken(), seatToken: privateRoomToken() };
    return roomAttempt;
  }
  async function requestRoomSeat(path, intent) {
    const payload = { requestId: intent.requestId, seatToken: intent.seatToken };
    try {
      return await request(path, 'POST', payload);
    } catch (error) {
      if (error.status && error.status < 500) throw error;
      return request(path, 'POST', payload);
    }
  }
  function rememberRoom() {
    try {
      sessionStorage.setItem(
        'alibi-club-room',
        JSON.stringify({ code: room.code, token: room.token, seat: room.seat, api: apiBase() }),
      );
    } catch {
      notify('This browser could not save your room credential. Keep this tab open.', true);
    }
  }
  function resumeRoom() {
    if (room) return;
    try {
      const r = JSON.parse(sessionStorage.getItem('alibi-club-room') || 'null');
      if (r && r.api === apiBase() && /^[A-Z2-9]{8}$/.test(r.code) && typeof r.token === 'string') {
        room = { ...r, state: E().reversi.initial(), version: 0, joined: false };
        pollRoom();
      }
    } catch {}
  }
  async function configureApi() {
    const value = document.getElementById('club-api')?.value.trim();
    if (value !== undefined) state.settings.api = value;
    apiBase();
    await persist();
  }
  async function createRoom() {
    if (roomBusy) return;
    roomBusy = true;
    try {
      await configureApi();
      const intent = roomAttemptFor('create');
      const result = await requestRoomSeat('/rooms', intent);
      room = { ...result, token: intent.seatToken };
      roomAttempt = null;
      roomError = '';
      rememberRoom();
      document.getElementById('dialog').close();
      bridge.navigate('salon', 'duel');
      render();
      notify('Room ' + room.code + ' is open. Share the code with one friend.');
    } catch (error) {
      if (error.status && error.status < 500) roomAttempt = null;
      throw error;
    } finally {
      roomBusy = false;
    }
  }
  async function joinRoom() {
    if (roomBusy) return;
    roomBusy = true;
    try {
      await configureApi();
      const code = document.getElementById('club-room-code')?.value.trim().toUpperCase();
      if (!/^[A-Z2-9]{8}$/.test(code || '')) throw Error('Enter the eight-character room code.');
      const intent = roomAttemptFor('join', code);
      const result = await requestRoomSeat('/rooms/' + code + '/join', intent);
      room = { ...result, token: intent.seatToken };
      roomAttempt = null;
      roomError = '';
      rememberRoom();
      document.getElementById('dialog').close();
      bridge.navigate('salon', 'duel');
      render();
    } catch (error) {
      if (error.status && error.status < 500) roomAttempt = null;
      throw error;
    } finally {
      roomBusy = false;
    }
  }
  async function pollRoom() {
    if (!room || document.hidden || route.page !== 'salon' || route.id !== 'duel') return;
    try {
      const value = await request('/rooms/' + room.code + '/state', 'GET', undefined, room.token);
      const changed = value.version !== room.version || value.joined !== room.joined;
      Object.assign(room, value);
      roomError = '';
      if (changed) render();
    } catch (e) {
      roomError = e.message;
      const msg = document.querySelector('.club-turn-status');
      if (msg) msg.textContent = roomError;
    } finally {
      startPoll();
    }
  }
  async function roomMove(cell) {
    if (!room || roomBusy || room.seat !== room.state.turn || !room.joined) return;
    roomBusy = true;
    try {
      const value = await request(
        '/rooms/' + room.code + '/move',
        'POST',
        { cell, expectedVersion: room.version, moveId: crypto.randomUUID() },
        room.token,
      );
      Object.assign(room, value);
      roomError = '';
      render();
    } catch (e) {
      roomError = e.message;
      notify(roomError, true);
      await pollRoom();
    } finally {
      roomBusy = false;
    }
  }
  function stopPoll() {
    clearTimeout(roomTimer);
    roomTimer = null;
  }
  function startPoll() {
    stopPoll();
    if (
      room &&
      route.page === 'salon' &&
      route.id === 'duel' &&
      !document.hidden &&
      !room.state.done
    )
      roomTimer = setTimeout(pollRoom, 4000);
  }
  function labPage() {
    return `${heading('The living atlas.', 'THE GAMES ROOM / 04 · GRAPHICS EXPERIMENT', 'No image sequence. No video. A little harbour drawn in real time.')}<section class="club-atlas"><div class="atlas-caption"><span>WEST QUAY / A PROCEDURAL STUDY</span><span id="lab-engine">Preparing the harbour…</span></div><canvas id="club-canvas" aria-label="Animated harbour with water, lanterns and passing boats. Decorative, not a puzzle." role="img"></canvas><div class="atlas-bottom"><div><h2>Leave a little light on the water.</h2><p>Tap the harbour to send a ripple. Pause it and the world waits.</p></div><div class="row">${B('Pause harbour', 'lab-toggle', 'id="lab-pause"', 'secondary')}</div></div></section><section class="lab-instruments"><div><span class="eyebrow">ACTUAL RENDERING RATE</span><strong id="lab-fps">—</strong><small>Frames drawn / second, not a device benchmark</small></div><div><span class="eyebrow">DRAW WORK</span><strong id="lab-cost">—</strong><small>Mean canvas draw time per frame</small></div><div><span class="eyebrow">QUALITY BUDGET</span><div class="row">${B('Quiet · 30 fps', 'lab-quality', 'data-value="30"', 'small secondary active')}${B('Fluid · 60 fps', 'lab-quality', 'data-value="60"', 'small secondary')}</div><small>Pixel ratio capped at 1.5. Hidden tabs stop drawing.</small></div></section><div class="club-two-panels"><section class="panel"><h2>More atmosphere, not more baggage.</h2><p>The scene is generated from drawing instructions. Water, boats, windows and floating lanterns reuse a few shapes. No textures, map API or continuous network traffic.</p><p>Supporting browsers run the canvas in a worker. The fallback draws on the main thread. The controls remain ordinary accessible HTML.</p></section><section class="panel"><h2>An experiment, not a promise.</h2><p>These counters describe this scene on this device. They are not a measured claim about Android battery life, input latency, or a steady 60 frames per second.</p><p>Reduced-motion preferences pause it initially. Zen suppresses the instruments and motion. Real games keep crisp, semantic boards instead of putting everything on a canvas.</p></section></div>`;
  }
  function stopLab() {
    if (lab) {
      lab.stop();
      lab = null;
    }
  }
  function mountLab() {
    const canvas = document.getElementById('club-canvas');
    if (!canvas) return;
    if (lab?.canvas === canvas) return;
    stopLab();
    const paused =
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      state.settings.zen ||
      bridge.settings().reducedMotion;
    const stats = (data) => {
      const fps = document.getElementById('lab-fps'),
        cost = document.getElementById('lab-cost');
      if (fps) fps.textContent = data.fps + ' fps';
      if (cost) cost.textContent = data.cost.toFixed(2) + ' ms';
    };
    const bounds = () => {
      const b = canvas.getBoundingClientRect();
      return {
        width: Math.round(b.width),
        height: Math.round(b.height),
        dpr: Math.min(devicePixelRatio || 1, 1.5),
      };
    };
    let worker, url, send, stop;
    try {
      if (!canvas.transferControlToOffscreen || !root.Worker) throw Error('fallback');
      const offscreen = canvas.transferControlToOffscreen();
      url = URL.createObjectURL(
        new Blob(
          [
            'const Atlas=' +
              root.AlibiAtlas.toString() +
              ';let scene=null;onmessage=e=>{if(e.data.type==="init")scene=new Atlas(e.data.canvas,{...e.data,onStats:data=>postMessage(data)});else scene?.message(e.data);};',
          ],
          { type: 'text/javascript' },
        ),
      );
      worker = new Worker(url);
      URL.revokeObjectURL(url);
      worker.onmessage = (e) => stats(e.data);
      worker.postMessage({ type: 'init', canvas: offscreen, ...bounds(), paused }, [offscreen]);
      send = (data) => worker.postMessage(data);
      stop = () => worker.terminate();
      document.getElementById('lab-engine').textContent = 'OFFSCREEN CANVAS · WORKER';
    } catch {
      const scene = new root.AlibiAtlas(canvas, { ...bounds(), paused, onStats: stats });
      send = (data) => scene.message(data);
      stop = () => scene.stop();
      document.getElementById('lab-engine').textContent = 'CANVAS 2D · FALLBACK';
    }
    lab = {
      canvas,
      paused,
      quality: 30,
      send,
      stop: () => {
        observer.disconnect();
        stop();
      },
    };
    const observer = new ResizeObserver(() => send({ type: 'resize', ...bounds() }));
    observer.observe(canvas);
    canvas.addEventListener('pointerdown', (e) => {
      const b = canvas.getBoundingClientRect();
      send({
        type: 'ripple',
        x: (e.clientX - b.left) / b.width,
        y: (e.clientY - b.top) / b.height,
      });
    });
    document.getElementById('lab-pause').textContent = paused ? 'Resume harbour' : 'Pause harbour';
  }
  function assistance() {
    return state.settings.assist;
  }
  function projected(p, s) {
    return root.AlibiAssist.project(p, s, state.settings.assist === 'tidy');
  }
  function assistBar() {
    return `<div class="assist-bar"><span>Desk assistant</span><div>${['off', 'candidates', 'tidy'].map((v) => B(v === 'off' ? 'Off' : v === 'tidy' ? 'Candidates + tidy' : 'Candidates', 'assist', `data-value="${v}" aria-pressed="${state.settings.assist === v}"`, state.settings.assist === v ? 'small active' : 'small ghost')).join('')}</div>${bridge?.current?.() && ['sudoku', 'futoshiki', 'binary', 'nonogram'].includes(bridge.current().puzzle.type) ? B('Fill next forced', 'forced', '', 'small secondary') : ''}${B('How it works', 'assist-explain', '', 'small ghost')}</div>`;
  }
  function decorateAssist(p, s, cell, person, pencil) {
    const A = root.AlibiAssist,
      { derived } = projected(p, s);
    if (state.settings.assist === 'off') return;
    for (const [i, why] of Object.entries(derived)) {
      const el = document.getElementById((p.type === 'dossier' ? 'mark-' : 'cell-') + i);
      if (el) {
        el.classList.add('derived-mark');
        el.title = why;
        el.setAttribute('aria-label', el.getAttribute('aria-label') + '; automatic mark: ' + why);
      }
    }
    if (['sudoku', 'futoshiki'].includes(p.type)) {
      for (const el of document.querySelectorAll('[data-action="value"]')) {
        const why = pencil ? '' : A.reason(p, s, cell, Number(el.dataset.value));
        el.classList.toggle('unavailable', !!why);
        if (why) {
          el.setAttribute('aria-description', why + ' Activate to hear why.');
          el.title = why;
        }
      }
      for (let i = 0; i < p.size * p.size; i++) {
        if (s.cells[i] || s.notes[i]?.length) continue;
        const el = document.getElementById('cell-' + i);
        if (el) {
          const values = A.candidates(p, s, i);
          el.insertAdjacentHTML(
            'beforeend',
            `<span class="derived-candidates" aria-hidden="true">${values.join(' ')}</span>`,
          );
          el.setAttribute(
            'aria-label',
            el.getAttribute('aria-label') +
              `; current local candidates ${values.join(', ') || 'none'}`,
          );
        }
      }
    }
    if (p.type === 'scene' && !pencil)
      for (let i = 0; i < p.size * p.size; i++) {
        if (Object.values(s.placements).includes(i) || p.objects.some((o) => o.cell === i))
          continue;
        const why = A.reason(p, s, i, null, person);
        const el = document.getElementById('cell-' + i);
        if (el && why) {
          el.classList.add('unavailable-square');
          el.title = why;
          el.setAttribute(
            'aria-label',
            el.getAttribute('aria-label') + '; excluded for selected person: ' + why,
          );
        }
      }
  }
  function afterRender(r) {
    route = r;
    const playing = ['play', 'salon', 'lab'].includes(r.page) && !(r.page === 'salon' && !r.id);
    document.body.classList.toggle('club-zen', state.settings.zen && playing);
    document.body.classList.toggle('club-home', r.page === 'home');
    document.body.classList.toggle(
      'club-experiment',
      r.page === 'salon' || r.page === 'lab' || r.page === 'club',
    );
    let exit = document.getElementById('zen-exit');
    if (state.settings.zen) {
      if (!exit) {
        exit = document.createElement('button');
        exit.id = 'zen-exit';
        exit.className = 'zen-exit';
        exit.dataset.action = 'club-zen';
        document.body.append(exit);
      }
      exit.innerHTML = '◌ Exit Zen';
    } else exit?.remove();
    if (r.page === 'salon' && ['duel', 'tictactoe'].includes(r.id)) {
      bot();
      startPoll();
      for (const el of document.querySelectorAll('.duel-cell.legal')) {
        el.onpointerenter = () => {
          if (!E()) return;
          const s = room?.state || currentGame('duel');
          const flips = E().reversi.flips(s, Number(el.dataset.cell));
          for (const cell of document.querySelectorAll('.duel-cell'))
            cell.classList.toggle('capture-preview', flips.includes(Number(cell.dataset.cell)));
        };
        el.onpointerleave = () =>
          document
            .querySelectorAll('.capture-preview')
            .forEach((c) => c.classList.remove('capture-preview'));
      }
    } else stopPoll();
    if (r.page === 'lab') mountLab();
    else stopLab();
  }
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input,textarea,select') || document.getElementById('dialog')?.open)
      return;
    if (e.key === 'Escape' && state.settings.zen) {
      e.preventDefault();
      state.settings.zen = false;
      save();
      render();
      return;
    }
    if (route.page === 'salon' && route.id === 'archive') {
      const d = {
        ArrowUp: 'up',
        ArrowRight: 'right',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        w: 'up',
        d: 'right',
        s: 'down',
        a: 'left',
      }[e.key];
      if (d) {
        e.preventDefault();
        action({ dataset: { action: 'club-walk', value: d } });
      }
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        action({ dataset: { action: 'club-undo', id: 'archive' } });
      }
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (lab) lab.send({ type: 'hidden', value: document.hidden });
    if (document.hidden) stopPoll();
    else startPoll();
  });
  root.AlibiClub = {
    init,
    reviewBackup,
    validateBackup: async (value) => {
      await engine();
      return validateSave(value);
    },
    home,
    roomPage,
    profile,
    labPage,
    onRoute,
    action,
    afterRender,
    assistance,
    projected,
    assistBar,
    decorateAssist,
    portrait,
    emblem,
    engine,
    save: () => saveQueue,
    diagnostics: () => ({
      storageMode,
      saveError,
      revision: rev,
      mode: state.settings.assist,
      hero,
      pinned: state.settings.pinned,
      engineLoaded: !!E(),
      labActive: !!lab,
      botPending,
      room: room ? { code: room.code, version: room.version, seat: room.seat } : null,
      state: clone(state),
    }),
  };
})(globalThis);
