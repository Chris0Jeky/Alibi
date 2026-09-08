/* Small host-neutral controls for trusted challenges. The host owns navigation and persistence. */
(function (G) {
  'use strict';
  const esc = (v) =>
    String(v).replace(
      /[&<>"']/g,
      (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[x],
    );
  const copy = (x) => JSON.parse(JSON.stringify(x));
  function mount(host, registry, id, saved, onSave = () => {}) {
    if (!host?.replaceChildren || !registry?.replay) throw Error('Challenge host is unavailable.');
    let run = saved ? registry.validateRun(saved) : registry.begin(id),
      selected = null,
      message = '';
    if (run.challengeId !== id) throw Error('This save belongs to another challenge.');
    const commit = (action) => {
      try {
        const next = copy(run);
        next.log.push(action);
        registry.replay(next);
        run = next;
        selected = null;
        message = '';
        onSave(copy(run));
        draw();
      } catch (error) {
        message = error.message;
        draw();
      }
    };
    const draw = () => {
      const view = registry.replay(run),
        c = view.challenge,
        s = view.state;
      host.innerHTML = `<section class="challenge-launcher"><header><span>TRUSTED CHALLENGE · REVISION ${c.revision}</span><h2>${esc(c.title)}</h2><p>${esc(c.instruction)}</p></header><div class="challenge-controls" data-family="${c.family}">${board(c, s, selected)}</div><p class="challenge-status" role="status">${message ? esc(message) : view.complete ? 'Complete. This replay meets the recorded objective.' : `${run.log.length} moves from the fixed start.`}</p><div class="row"><button data-challenge="undo" ${run.log.length ? '' : 'disabled'}>Undo</button><button data-challenge="reset">Start again</button></div></section>`;
      host.querySelector('[data-challenge="undo"]')?.addEventListener('click', () => {
        run.log.pop();
        selected = null;
        onSave(copy(run));
        draw();
      });
      host.querySelector('[data-challenge="reset"]')?.addEventListener('click', () => {
        run = registry.begin(id);
        selected = null;
        onSave(copy(run));
        draw();
      });
      host.querySelectorAll('[data-action]').forEach((button) =>
        button.addEventListener('click', () =>
          action(
            c,
            button,
            selected,
            commit,
            () => {
              selected = null;
              draw();
            },
            (v) => {
              selected = v;
              draw();
            },
          ),
        ),
      );
    };
    draw();
    return { save: () => copy(run), dispose: () => host.replaceChildren() };
  }
  function board(c, s, selected) {
    if (c.family === 'hanoi')
      return `<div class="challenge-pegs">${s.pegs.map((peg, i) => `<button data-action="peg" data-value="${i}" aria-pressed="${selected === i}">Peg ${i + 1}<strong>${peg.join(' · ') || 'empty'}</strong></button>`).join('')}</div>`;
    if (c.family === 'sliding')
      return grid(
        s.tiles,
        3,
        (v, i) =>
          `<button data-action="cell" data-value="${i}" ${v ? '' : 'disabled'}>${v || ''}</button>`,
      );
    if (c.family === 'river')
      return `<div class="challenge-river">${['Ferryman', 'Wolf', 'Goat', 'Cabbage'].map((name, i) => `<button data-action="item" data-value="${i}">${name} · ${s.side[i] ? 'far bank' : 'home bank'}</button>`).join('')}</div>`;
    if (c.family === 'jugs')
      return `<div class="challenge-jugs">${s.v.map((v, i) => `<div><strong>${v} L / ${[3, 5][i]} L</strong>${['fill', 'pour', 'empty'].map((kind) => `<button data-action="jug" data-value="${i}" data-kind="${kind}">${kind}</button>`).join('')}</div>`).join('')}</div>`;
    if (c.family === 'queens' || c.family === 'knight') {
      const n = c.family === 'queens' ? 8 : 5,
        occupied = c.family === 'queens' ? s.q : s.path;
      return grid(
        Array.from({ length: n * n }, (_, i) => i),
        n,
        (_, i) =>
          `<button data-action="cell" data-value="${i}" ${c.fixedCells?.includes(i) || (c.fixedPrefixLength && s.path.includes(i)) ? 'disabled aria-label="Fixed square"' : ''}>${c.family === 'queens' ? (occupied.includes(i) ? '♛' : '') : occupied.indexOf(i) + 1 || ''}</button>`,
      );
    }
    if (c.family === 'magic')
      return grid(
        s.values,
        3,
        (v, i) =>
          `<button data-action="magic" data-value="${i}" aria-pressed="${selected === i}">${v}</button>`,
      );
    if (c.family === 'warehouse')
      return `${grid(
        Array.from({ length: s.w * s.h }, (_, i) => i),
        s.w,
        (_, i) =>
          `<button disabled>${s.walls.includes(i) ? '■' : s.player === i ? '@' : s.crates.includes(i) ? '$' : s.goals.includes(i) ? '◇' : ''}</button>`,
      )}<div class="row">${['up', 'left', 'down', 'right'].map((v) => `<button data-action="walk" data-value="${v}">${v}</button>`).join('')}</div>`;
    if (c.family === 'reversi')
      return grid(
        s.board,
        6,
        (v, i) =>
          `<button data-action="cell" data-value="${i}" ${v || !G.AlibiClubEngines.reversi.legal(s).includes(i) ? 'disabled' : ''}>${v === 1 ? '●' : v === -1 ? '○' : '·'}</button>`,
      );
    if (c.family === 'borough')
      return `<div class="row">${s.offers.map((v, i) => `<button data-action="slot" data-value="${i}" aria-pressed="${selected === i}">${esc(v)}</button>`).join('')}</div>${grid(s.board, 5, (v, i) => `<button data-action="plot" data-value="${i}" ${v ? 'disabled' : ''}>${esc(v || '+')}</button>`)}<p>Score: ${G.AlibiClubEngines.borough.score(s)} / ${c.targetScore}</p>`;
    return '';
  }
  function grid(values, columns, render) {
    return `<div class="challenge-grid" style="grid-template-columns:repeat(${columns},1fr)">${values.map(render).join('')}</div>`;
  }
  function action(c, button, selected, commit, clear, select) {
    const kind = button.dataset.action,
      value = Number(button.dataset.value);
    if (kind === 'peg' || kind === 'magic') {
      if (selected === null) return select(value);
      if (selected === value) return clear();
      return commit({ from: selected, to: value });
    }
    if (kind === 'cell') return commit({ cell: value });
    if (kind === 'item') return commit({ item: value });
    if (kind === 'jug') return commit({ i: value, kind: button.dataset.kind });
    if (kind === 'walk') return commit(button.dataset.value);
    if (kind === 'slot') return select(value);
    if (kind === 'plot') {
      const chosen = button
        .closest('.challenge-controls')
        .querySelector('[data-action="slot"][aria-pressed="true"]');
      if (chosen) commit({ slot: Number(chosen.dataset.value), cell: value });
    }
  }
  G.AlibiChallengeLauncher = { mount };
  if (typeof module !== 'undefined') module.exports = G.AlibiChallengeLauncher;
})(globalThis);
