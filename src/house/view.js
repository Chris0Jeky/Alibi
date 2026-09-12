/* Semantic, asset-light presentation shared by the integration and the portable prototype. */
(function (G) {
  'use strict';
  const M = G.AlibiHouseModel;
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const { icon, engraving } = G.AlibiHouseComponents;
  const familyIcon = (type) =>
    icon(
      {
        binary: 'moon',
        scene: 'scene',
        witness: 'scene',
        dossier: 'notebook',
        bridges: 'bridges',
        lightup: 'sun',
        trail: 'bridges',
        network: 'bridges',
      }[type] || 'puzzles',
    );
  const titles = {
    desk: 'Your desk',
    puzzles: 'Puzzles',
    house: 'The house',
    notebook: 'Notebook',
    comfort: 'Comfort',
  };
  const link = (label, state, cls = '') =>
    `<a class="hx-link ${cls}" href="${esc(M.url(state))}">${label}</a>`;
  const button = (label, action, extra = '', cls = '') =>
    `<button type="button" class="hx-button ${cls}" data-house-action="${action}" ${extra}>${label}</button>`;
  const open = (p, label, cls = '') =>
    p
      ? button(label, 'play', `data-key="${esc(M.key(p))}"`, cls)
      : link('Browse puzzles', { view: 'puzzles' });
  const tag = (text) => `<span class="hx-kicker">${esc(text)}</span>`;
  function card(p, d) {
    const r = d.records.find((x) => x.key === M.key(p));
    const status = M.completed(r) ? 'Solved' : r?.moves ? 'In progress' : 'Not started';
    return `<article class="hx-puzzle"><div class="hx-puzzle-art" aria-hidden="true">${familyIcon(p.type)}</div><div class="hx-puzzle-copy">${tag(d.names[p.type] || p.type)}<h3>${esc(p.title)}</h3><p>${esc(p.difficulty)}${Number.isFinite(p.minutes) ? ` · ~${p.minutes} min` : ''}</p><span class="hx-state" data-progress="${M.completed(r) ? 'solved' : r?.moves ? 'active' : 'new'}">${M.completed(r) ? icon('check') : ''}${status}</span></div>${button(icon('arrow'), 'play', `data-key="${esc(M.key(p))}" aria-label="${esc((r?.moves && !M.completed(r) ? 'Continue ' : 'Play ') + p.title)}"`, 'hx-card-play')}</article>`;
  }
  function desk(d) {
    const latest = d.recent[0];
    const game = d.resume?.kind === 'game' ? d.resume : null;
    const p = latest?.puzzle || d.first;
    const cta = game
      ? `<a class="hx-link hx-cream" href="#/salon/${esc(game.id)}">Continue ${esc(game.title)} ${icon('arrow')}</a>`
      : open(
          p,
          `${latest ? 'Continue puzzle' : 'Play your first puzzle'} ${icon('arrow')}`,
          'hx-cream',
        );
    return `<div class="hx-page-title"><div>${tag('Wrenmere / your evening desk')}<h1>A light is still on.</h1><p>Take a seat. There’s something to work out.</p></div></div><div class="hx-opening"><section class="hx-resume" aria-label="Your next game"><div class="hx-resume-top"><div>${tag(game ? 'Pick up where you left off' : latest ? 'Your unfinished puzzle' : 'A good place to begin')}<h2>${esc(game?.title || p?.title || 'The puzzle collection')}</h2><p>${game ? 'Your saved Games Room run.' : latest ? `${latest.moves} ${latest.moves === 1 ? 'move' : 'moves'} · Board and undo history retained` : `${esc(d.names[p?.type] || p?.type || 'Puzzles')} · ${esc(p?.difficulty || 'Choose a puzzle')}`}</p></div><div class="hx-mini-board" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i>${i % 3 === 0 ? icon('moon') : i % 3 === 1 ? icon('sun') : ''}</i>`).join('')}</div></div>${cta}<span class="hx-resume-note">${latest || game ? 'Continue with your existing play settings.' : 'A playable introduction. No account needed.'}</span></section><section class="hx-hero" aria-labelledby="hx-story-title">${d.media['briar-house'] ? `<img data-house-art src="${esc(d.media['briar-house'])}" alt="" width="1536" height="1024" decoding="async">` : ''}<div class="hx-hero-copy">${tag('An optional mystery / desk study')}<h2 id="hx-story-title">A note in<br>the margins.</h2><p>An east-facing room.<br>A clock that stopped keeping time.</p>${button(d.study.letter ? 'Reread the envelope' : 'Open the envelope', 'letter', '', 'hx-cream')}</div><span class="hx-hero-corner" aria-hidden="true">W / 01</span></section></div><a class="hx-next" href="${M.url({ view: d.study.letter ? (d.study.visited.length === 3 ? 'notebook' : 'house') : 'house' })}"><span class="hx-seal" aria-hidden="true">${icon(d.study.solved ? 'check' : 'key')}</span><span><strong>${d.study.solved ? 'Desk study complete' : `${d.study.visited.length} of 3 rooms observed`}</strong><small>${esc(M.nextStep(d.study))}</small></span>${icon('arrow')}</a><section aria-labelledby="hx-choose-title"><div class="hx-section-title"><div>${tag('Pick your kind of thinking')}<h2 id="hx-choose-title">Stay a little.</h2></div>${link(`All ${d.puzzles.length} puzzles ${icon('arrow')}`, { view: 'puzzles' })}</div><div class="hx-paths">${[
      ['Deduce', 'scene', 'Follow the evidence.', 'study'],
      ['Patterns', 'nonogram', 'One square at a time.', 'library'],
      ['Connect', 'bridges', 'Find the missing links.', 'maps'],
    ]
      .map(
        ([name, family, copy, art]) =>
          `<a href="${esc(M.url({ view: 'puzzles', family }))}" class="hx-path">${engraving(art)}<h3>${name}</h3><p>${copy}</p></a>`,
      )
      .join(
        '',
      )}</div></section><a class="hx-quiet-link" href="#/quiet">${icon('moon')}<span><strong>Somewhere quieter</strong><small>Visit the Quiet Wing</small></span>${icon('arrow')}</a>`;
  }
  function filters(d) {
    return `<form id="hx-filter-form" class="hx-filter-fields"><p>Choose what suits you. Changes apply only when you confirm.</p><input type="hidden" name="q" value="${esc(d.route.q)}"><label>Puzzle family<select name="family"><option value="">Every family</option>${M.families.map((f) => `<option value="${f}" ${f === d.route.family ? 'selected' : ''}>${esc(d.names[f] || f)}</option>`).join('')}</select></label><label>Difficulty<select name="level"><option value="">Any difficulty</option>${['Gentle', 'Steady', 'Tricky', 'Expert'].map((v) => `<option ${d.route.level === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>Progress<select name="progress"><option value="">Any progress</option>${[
      ['new', 'Not started'],
      ['active', 'In progress'],
      ['solved', 'Solved'],
    ]
      .map(
        ([v, t]) =>
          `<option value="${v}" ${d.route.progress === v ? 'selected' : ''}>${t}</option>`,
      )
      .join(
        '',
      )}</select></label><div class="hx-sheet-actions">${button('Reset choices', 'filter-reset')}<button class="hx-button hx-primary" type="submit">Apply filters</button></div></form>`;
  }
  function puzzles(d) {
    const results = M.catalogue(d.puzzles, d.records, d.route, d.names);
    const count = ['family', 'level', 'progress'].filter((f) => d.route[f]).length;
    const chip = (label, field, value) =>
      `<a class="hx-chip" href="${esc(M.url({ ...d.route, [field]: d.route[field] === value ? '' : value }))}" ${d.route[field] === value ? 'aria-current="true"' : ''}>${d.route[field] === value ? icon('check') : ''}${label}</a>`;
    return `<div class="hx-page-title"><div>${tag('The puzzle cabinet')}<h1>What catches your eye?</h1><p>Every puzzle is open. Follow your curiosity.</p></div></div><form class="hx-searchbar" id="hx-search-form"><label class="hx-search" for="hx-query"><span class="hx-sr-only">Search the collection</span>${icon('search')}<input id="hx-query" name="q" type="search" maxlength="120" enterkeyhint="search" placeholder="Search puzzles or families" value="${esc(d.route.q)}"></label><button class="hx-button hx-primary" type="submit" aria-label="Find puzzles">${icon('arrow')}</button>${['family', 'level', 'progress'].map((f) => `<input type="hidden" name="${f}" value="${esc(d.route[f])}">`).join('')}</form><div class="hx-filter-row">${button(`${icon('comfort')} Filters${count ? ` (${count})` : ''}`, 'filters', 'id="hx-filters-open" aria-haspopup="dialog" aria-controls="dialog"')}${chip('Gentle', 'level', 'Gentle')}${chip('In progress', 'progress', 'active')}</div><div class="hx-result-line"><p id="hx-results" role="status">${results.length} ${results.length === 1 ? 'puzzle' : 'puzzles'}${results.length > d.limit ? ` · showing ${d.limit}` : ''}${count ? ` · ${count} filters` : ''}</p>${count || d.route.q ? link('Clear filters', { view: 'puzzles' }) : ''}</div>${
      results.length
        ? `<div class="hx-puzzle-grid">${results
            .slice(0, d.limit)
            .map((p) => card(p, d))
            .join(
              '',
            )}</div>${results.length > d.limit ? button(`Show ${Math.min(12, results.length - d.limit)} more`, 'more', 'id="hx-more"', 'hx-more') : ''}`
        : `<section class="hx-empty">${icon('search')}<h2>No matches this time.</h2><p>Try a different title or remove a filter. Your existing progress is unchanged.</p>${link('Show every puzzle', { view: 'puzzles' }, 'hx-primary')}</section>`
    }<p class="hx-footnote">Difficulty and play times are editorial estimates, not calibrated measurements.</p>`;
  }
  function house(d) {
    const room = (r, compact = false) =>
      `<button type="button" class="${compact ? 'hx-map-room' : 'hx-room-card'}" data-house-action="inspect" data-room="${r.id}" aria-label="Inspect ${r.title}${d.study.visited.includes(r.id) ? ', observed' : ''}">${compact ? '' : engraving(r.id)}<span><small>ROOM ${r.mark}</small><strong>${r.title}</strong><span class="hx-room-state">${d.study.visited.includes(r.id) ? icon('check') + 'Observed · read again' : 'Look inside'}</span></span>${icon('arrow')}</button>`;
    return `<div class="hx-page-title"><div>${tag('A note in the margins / desk study')}<h1>Every room has a detail.</h1><p>Three rooms. Two clues. One place to look.</p></div></div><section class="hx-letter-strip">${icon('mail')}<div><strong>${d.study.letter ? '“Look east…”' : 'An envelope, addressed to you.'}</strong><p>${d.study.letter ? 'Find the room that stopped keeping time.' : 'Read the note before comparing the rooms.'}</p></div>${button(d.study.letter ? 'Reread' : 'Read', 'letter', 'aria-label="Read the letter"')}</section><div class="hx-room-progress"><span>${d.study.visited.length} / 3 observed</span><div class="hx-dots" aria-label="${d.study.visited.length} of 3 rooms observed">${M.rooms.map((r) => `<span class="${d.study.visited.includes(r.id) ? 'done' : ''}">${d.study.visited.includes(r.id) ? icon('check') : r.mark}</span>`).join('')}</div>${link('Notebook', { view: 'notebook' })}</div><div class="hx-house-layout"><section class="hx-room-cards" aria-label="Rooms to inspect">${M.rooms.map((r) => room(r)).join('')}</section><aside class="hx-investigation">${tag('Your next lead')}<h2>${d.study.solved ? 'The details agree.' : 'Watch the windows.'}</h2><p>${esc(M.nextStep(d.study))}</p>${link('Compare in notebook ' + icon('arrow'), { view: 'notebook' }, 'hx-primary')}<details class="hx-floor"><summary>View the floor plan</summary><p class="hx-footnote">Schematic only. All clues are also available in the room cards.</p><div class="hx-rooms">${M.rooms.map((r) => room(r, true)).join('')}</div></details><hr><p>This session study is separate from your saved castle story.</p><a class="hx-link" href="#/quiet/castle">Enter Wrenmere Castle ${icon('arrow')}</a></aside></div>`;
  }
  function notebook(d) {
    const ready = d.study.letter && d.study.visited.length === 3;
    return `<div class="hx-page-title"><div>${tag('Your notebook')}<h1>Keep the useful details.</h1><p>Observations first. Conclusions when they agree.</p></div></div><div class="hx-notebook-grid"><section class="hx-paper">${tag('A note in the margins')}<h2>${d.study.solved ? 'The Map Room.' : 'Where was the key left?'}</h2><p>${d.study.letter ? '“Look east for the room that has stopped keeping time.”' : 'An unopened letter is waiting on the desk.'}</p>${d.study.letter ? '' : button('Read the letter', 'letter')}<ul class="hx-observations">${
      M.rooms
        .filter((r) => d.study.visited.includes(r.id))
        .map(
          (r) =>
            `<li><span class="hx-evidence-icon" aria-hidden="true">${icon('check')}</span><div><strong>${r.title}</strong><p>${r.fact}</p></div>${button(icon('arrow'), 'inspect', `data-room="${r.id}" aria-label="Revisit ${r.title}"`)}</li>`,
        )
        .join('') || '<li>No room observations yet. Inspect a room to add its details here.</li>'
    }</ul>${d.study.solved ? '<div class="hx-success" role="status"><strong>Both details fit.</strong><p>The Map Room faces east, and its clock has been removed. The room with no clock was not necessarily the room that lost one.</p></div>' : ready ? `<form id="hx-answer-form"><label for="hx-answer">Your conclusion</label><select id="hx-answer" name="answer"><option value="">Choose a room</option>${M.rooms.map((r) => `<option value="${r.id}" ${d.study.answer === r.id ? 'selected' : ''}>${r.title}</option>`).join('')}</select><button type="submit" class="hx-button hx-primary">Check the evidence</button></form>${d.study.answer ? '<p class="hx-answer-feedback" role="status">That room does not fit both details. Recheck the window and the clock; nothing has been lost.</p>' : ''}` : link('Collect the remaining observations →', { view: 'house' }, 'hx-primary')}<div class="hx-hint">${button(d.study.hint >= 2 ? 'Reveal the explanation (spoiler)' : d.study.hint ? 'A stronger nudge' : 'A nudge, not the answer', 'hint', d.study.hint === 3 ? 'disabled' : '')}${d.study.hint ? `<p role="status">${['', 'The letter describes two features of one room. Check both.', '“Stopped keeping time” implies a clock was once present; compare this with a room that never had one.', 'The Map Room faces east and its clock was removed. Both parts of the letter fit.'][d.study.hint]}</p>` : ''}</div><p class="hx-footnote">This desk study lasts for this page session. It is separate from your saved castle investigation and puzzle runs.</p></section><aside class="hx-records">${tag('Continue playing')}<h2>Your open puzzles.</h2>${
      d.recent.length
        ? d.recent
            .slice(0, 6)
            .map(
              (r) =>
                `<div class="hx-record"><h3>${esc(r.puzzle.title)}</h3><p>${r.moves} moves · ${esc(d.names[r.puzzle.type] || r.puzzle.type)}</p>${open(r.puzzle, 'Continue →')}</div>`,
            )
            .join('')
        : '<p>No unfinished cabinet puzzles yet.</p>'
    }${d.games.length ? `<h3>Games room</h3>${d.games.map((g) => `<a class="hx-link" href="#/salon/${esc(g.id)}">Continue ${esc(g.title)} →</a>`).join('')}` : ''}<a class="hx-link" href="#/journal">All cabinet records →</a><a class="hx-link" href="#/club">Games journal →</a><a class="hx-link" href="#/quiet/castle/journal">Castle notebook →</a></aside></div>`;
  }
  function comfort(d) {
    const settings = [
      ['reducedMotion', 'Reduce motion', 'Still transitions and less decorative movement.'],
      ['contrast', 'Stronger contrast', 'Clearer boundaries and text.'],
      ['largeText', 'Larger text', 'More room for instructions and clues.'],
      ['timer', 'Show the puzzle timer', 'Show or hide elapsed time; your current choice is kept.'],
      ['sound', 'Puzzle sounds', 'Use the existing puzzle sound preference.'],
      ['haptics', 'Touch feedback', 'Uses device vibration where supported.'],
    ];
    return `<div class="hx-page-title"><div>${tag('Make yourself comfortable')}<h1>Your way to play.</h1><p>Adjust the experience without leaving your place behind.</p></div></div><div class="hx-comfort"><section class="hx-paper"><label for="theme-select">Appearance</label><select id="theme-select">${[
      ['light', 'Paper & ink'],
      ['night', 'After dark'],
      ['system', 'Follow my device'],
    ]
      .map(
        ([v, text]) =>
          `<option value="${v}" ${d.settings.theme === v ? 'selected' : ''}>${text}</option>`,
      )
      .join(
        '',
      )}</select>${settings.map(([id, label, note]) => `<label class="hx-setting" for="hx-setting-${id}"><span><strong>${label}</strong><small>${note}</small></span><input id="hx-setting-${id}" type="checkbox" data-setting="${id}" ${d.settings[id] ? 'checked' : ''}></label>`).join('')}</section><aside class="hx-records">${tag('Your data')}<h2>${d.storage === 'session' ? 'This session only.' : 'Keep a recovery copy.'}</h2><p>Cabinet puzzles, Games Room, Quiet Wing and the castle have distinct save systems. The combined export covers four stores; curated challenge replays still need their own export.</p><a class="hx-link hx-primary" href="#/settings">Open saves & recovery →</a><a class="hx-link" href="#/privacy">Privacy & credits →</a><p class="hx-footnote">The house preview adds no accounts, analytics events, external fonts or new puzzle-save store.</p></aside></div>`;
  }
  function render(d) {
    const names = {
      desk: 'Desk',
      puzzles: 'Puzzles',
      house: 'House',
      notebook: 'Notes',
      comfort: 'Comfort',
    };
    const nav = M.views
      .map(
        (v) =>
          `<a href="${esc(M.url({ view: v }))}" aria-label="${titles[v]}" ${d.route.view === v ? 'aria-current="page"' : ''}>${icon(v)}<span>${names[v]}</span></a>`,
      )
      .join('');
    return `<div class="hx-experience"><header class="hx-header"><a class="hx-brand" href="${M.url()}" aria-label="Alibi, your desk">alibi<span>:</span><small>WRENMERE</small></a><nav class="hx-nav" aria-label="House navigation">${nav}</nav><div class="hx-tools"><a class="hx-exit" href="#/home">Classic desk</a>${d.roomAudioAvailable ? `<button class="hx-button" type="button" data-theatre-sound aria-pressed="${d.roomSound}">Sound ${d.roomSound ? 'on' : 'off'}</button>` : ''}<span class="hx-edition">DESK PREVIEW</span></div></header><div class="hx-content">${d.storage === 'session' ? '<p class="hx-storage-warning" role="status">Session-only storage. Export progress before closing.</p>' : ''}${{ desk, puzzles, house, notebook, comfort }[d.route.view](d)}</div><footer class="hx-footer"><span>WRENMERE DESK · REVIEW EDITION</span><span data-house-offline>${d.offline === true ? 'Preview files cached for offline use' : d.offline === null ? 'Source preview · not an installed offline pack' : 'Offline preview copy not ready'}</span><a href="#/settings">Saves & recovery</a></footer><nav class="hx-mobile" aria-label="House mobile navigation">${nav}</nav></div>`;
  }
  G.AlibiHouseView = { render, esc, button, filters };
})(globalThis);
