/* Small host-neutral controls for trusted challenges. The host owns navigation and persistence. */
(function (G) {
  'use strict';
  const esc = (v) =>
    String(v).replace(
      /[&<>"']/g,
      (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[x],
    );
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const pl = (word, n) => (n === 1 ? word : word.replace(/y$/, 'ie') + 's');
  const moves = (n) => `${n} ${pl('move', n)}`;
  const at = (i, n) => `Row ${Math.floor(i / n) + 1}, column ${(i % n) + 1}`;
  const names = {
    hanoi: 'Tower of Hanoi',
    sliding: 'Sliding tiles',
    river: 'River crossing',
    jugs: 'Water jugs',
    queens: 'Eight queens',
    magic: 'Magic square',
    knight: 'Knight’s tour',
    warehouse: 'Archive Heist',
    reversi: 'Lantern Duel endgames',
    borough: 'Pocket Borough',
  };
  const steps = { up: 0, left: 1, down: 2, right: 3 };
  const key = (b) =>
    [b.dataset.action, b.dataset.value, b.dataset.kind, b.dataset.challenge].join();
  // The player keeps Gold. Ink follows the recorded line while the player does, then the
  // strongest bounded search; with at most six empty squares that search reaches every ending.
  function settle(registry, run) {
    const R = G.AlibiClubEngines.reversi;
    for (let v; (v = registry.replay(run)).challenge.family === 'reversi' && v.state.turn < 0;) {
      const line = v.challenge.principalVariation,
        n = run.log.length;
      run.log.push(
        n < line.length && run.log.every((m, i) => m === line[i])
          ? line[n]
          : R.best(v.state, R.strengths.expert.depth).cell,
      );
    }
    return run;
  }
  function mount(host, registry, id, saved, onSave = () => {}, onNav) {
    if (!host?.replaceChildren || !registry?.replay) throw Error('Challenge host is unavailable.');
    let run = settle(registry, saved ? registry.validateRun(saved) : registry.begin(id)),
      selected = null,
      message = '',
      confirming = false;
    if (run.challengeId !== id) throw Error('This save belongs to another challenge.');
    const c = registry.get(id),
      siblings = registry.entries().filter((x) => x.family === c.family),
      next = siblings[siblings.indexOf(c) + 1];
    const say = (text) => {
      message = text;
      draw();
    };
    const commit = (action) => {
      try {
        const attempt = copy(run);
        attempt.log.push(action);
        run = settle(registry, attempt);
        selected = null;
        message = '';
        onSave(copy(run));
        draw();
      } catch (error) {
        say(
          /replay|nvalid|llegal/.test(error.message)
            ? c.family === 'warehouse'
              ? 'That way is blocked.'
              : 'That move isn’t allowed here.'
            : error.message,
        );
      }
    };
    const draw = () => {
      const view = registry.replay(run),
        s = view.state,
        n = run.log.length,
        R = G.AlibiClubEngines.reversi,
        score = c.family === 'reversi' && R.score(s),
        lost =
          score &&
          n &&
          !view.complete &&
          (run.log[0] !== c.solutionFirstMove ||
            s.done ||
            R.best(s, R.strengths.expert.depth).value <= 0),
        focused = host.getRootNode().activeElement,
        refocus = host.contains(focused) && key(focused);
      host.innerHTML = `<section class="challenge-launcher"><p>${esc(c.instruction.replace(/ Picture mode.*/, ''))}</p><div class="challenge-controls" data-family="${c.family}" tabindex="-1">${board(c, s, selected, run.log.at(-1))}</div><p class="challenge-status" role="status">${
        message
          ? esc(message)
          : view.complete
            ? `Complete in ${moves(n)}.`
            : score
              ? `Gold ${score.gold} · Ink ${score.ink}. ${lost ? 'Gold can no longer force a win on this line. Undo to try another move.' : 'Gold to move.'}`
              : moves(n) + ' so far.'
      }</p>${lost && c.hint ? `<details class="challenge-hint"><summary>A hint</summary><p>${esc(c.hint)}</p></details>` : ''}${
        view.complete
          ? `<div class="result"><div class="eyebrow">${c.difficulty ? esc(c.difficulty) + ' · ' : ''}Challenge complete</div><h3>You found a way.</h3>${onNav ? `<div class="row">${next ? '<button class="primary" data-challenge="next">Next challenge →</button>' : ''}<button data-challenge="list">Back to the list</button></div>` : ''}</div>`
          : ''
      }${
        confirming
          ? '<p>Clear your finished route and start again?</p><div class="row"><button class="primary" data-challenge="reset">Start again</button><button data-challenge="keep">Keep my route</button></div>'
          : `<div class="row"><button data-challenge="undo" ${n ? '' : 'disabled'}>Undo</button><button data-challenge="reset">Start again</button></div>`
      }</section>`;
      // Keep keyboard focus on the equivalent control after each redraw.
      if (refocus)
        (
          [...host.querySelectorAll('button:enabled')].find((b) => key(b) === refocus) ||
          host.querySelector('.challenge-controls')
        ).focus();
    };
    const control = (kind) => {
      if (kind === 'next' || kind === 'list') return onNav(kind === 'next' ? next.id : '');
      if (kind === 'undo') {
        // An Ink reply is undone together with the Gold move that prompted it.
        do run.log.pop();
        while (c.family === 'reversi' && run.log.length && registry.replay(run).state.turn < 0);
      }
      if (kind === 'reset') {
        if (!confirming && registry.replay(run).complete) {
          confirming = true;
          return draw();
        }
        run = registry.begin(id);
      }
      confirming = false;
      selected = null;
      message = '';
      if (kind !== 'keep') onSave(copy(run));
      draw();
    };
    host.onclick = (event) => {
      const button = event.target.closest('button'),
        kind = button?.dataset.action,
        value = Number(button?.dataset.value);
      if (button?.dataset.challenge) return control(button.dataset.challenge);
      if (kind === 'peg' || kind === 'magic') {
        if (selected !== null && selected !== value) return commit({ from: selected, to: value });
        selected = selected === value ? null : value;
        return say('');
      }
      if (kind === 'cell') return commit(c.family === 'reversi' ? value : { cell: value });
      if (kind === 'item') return commit({ item: value });
      if (kind === 'jug') return commit({ i: value, kind: button.dataset.kind });
      if (kind === 'walk' || kind === 'step') return commit(button.dataset.value);
      if (kind === 'slot') {
        selected = value;
        return say('');
      }
      if (kind === 'plot')
        return selected === null
          ? say('Choose a plan first.')
          : commit({ slot: selected, cell: value });
    };
    host.onkeydown = (event) => {
      const direction = /^Arrow(Up|Down|Left|Right)$/.exec(event.key)?.[1].toLowerCase();
      if (!direction || c.family !== 'warehouse' || registry.replay(run).state.done) return;
      event.preventDefault();
      commit(direction);
    };
    draw();
    return {
      save: () => copy(run),
      dispose: () => {
        host.onclick = host.onkeydown = null;
        host.replaceChildren();
      },
    };
  }
  function board(c, s, selected, last) {
    if (c.family === 'hanoi')
      return `<div class="challenge-pegs">${s.pegs.map((peg, i) => `<button data-action="peg" data-value="${i}" aria-pressed="${selected === i}" aria-label="Peg ${i + 1}: ${peg.join(', ') || 'empty'}"><span>${peg.map((d) => `<i style="width:${d * 18}%">${d}</i>`).join('')}</span>Peg ${i + 1}</button>`).join('')}</div>`;
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
        (_, i) => {
          const fixed =
            c.fixedCells?.includes(i) ||
            (c.fixedPrefixLength && s.path.slice(0, c.fixedPrefixLength).includes(i));
          const visited = occupied.indexOf(i);
          const state =
            c.family === 'queens'
              ? visited >= 0
                ? 'queen'
                : 'empty'
              : visited >= 0
                ? `visit ${visited + 1}`
                : 'unvisited';
          const disabled = fixed || (c.family === 'knight' && visited >= 0);
          return `<button data-action="cell" data-value="${i}" aria-label="${at(i, n)}, ${fixed ? 'fixed ' : ''}${state}" ${disabled ? 'disabled' : ''}>${c.family === 'queens' ? (visited >= 0 ? '♛' : '') : visited + 1 || ''}</button>`;
        },
      );
    }
    if (c.family === 'magic')
      return grid(
        s.values,
        3,
        (v, i) =>
          `<button data-action="magic" data-value="${i}" aria-pressed="${selected === i}">${v}</button>`,
      );
    if (c.family === 'warehouse') {
      const W = G.AlibiClubEngines.warehouse,
        near = {};
      for (const d in steps)
        if (W.move(s, d) !== s) near[s.player + [-s.w, -1, s.w, 1][steps[d]]] = d;
      return `${grid(
        Array.from({ length: s.w * s.h }, (_, i) => i),
        s.w,
        (_, i) => {
          const goal = s.goals.includes(i),
            crate = s.crates.includes(i),
            kind = s.walls.includes(i)
              ? 'wall'
              : s.player === i
                ? 'you'
                : crate
                  ? 'crate'
                  : goal
                    ? 'plate'
                    : '';
          return `<button class="${kind}" ${near[i] ? `data-action="step" data-value="${near[i]}"` : 'disabled'} aria-label="${at(i, s.w)}, ${{ plate: 'brass plate', '': 'floor' }[kind] ?? kind}${goal && /you|crate/.test(kind) ? ' on a brass plate' : ''}">${kind === 'you' ? '●' : crate ? (goal ? '▣' : '▢') : goal ? '◇' : ''}</button>`;
        },
      )}<p class="challenge-legend">● you · ▢ crate · ◇ brass plate · ▣ crate on a plate · dark squares are walls. Tap a square beside you, or use the arrows or arrow keys.</p><div class="challenge-pad">${Object.keys(
        steps,
      )
        .map(
          (d) =>
            `<button data-action="walk" data-value="${d}" aria-label="Move ${d}" ${s.done ? 'disabled' : ''}>${'↑←↓→'[steps[d]]}</button>`,
        )
        .join('')}</div>`;
    }
    if (c.family === 'reversi') {
      const legal = G.AlibiClubEngines.reversi.legal(s);
      return `${grid(
        s.board,
        6,
        (v, i) =>
          `<button class="${v > 0 ? 'gold' : v ? 'ink' : ''}${i === last ? ' last' : ''}" data-action="cell" data-value="${i}" aria-label="${at(i, 6)}, ${v > 0 ? 'Gold' : v ? 'Ink' : legal.includes(i) ? 'legal move' : 'empty'}${i === last ? ', just played' : ''}" ${legal.includes(i) && s.turn > 0 ? '' : 'disabled'}>${v ? '●' : legal.includes(i) ? '·' : ''}</button>`,
      )}<p class="challenge-legend"><b class="gold">●</b> Gold, your lanterns · <b class="ink">●</b> Ink, who replies by itself</p>`;
    }
    if (c.family === 'borough') {
      const B = G.AlibiClubEngines.borough,
        T = B.typeInfo;
      return `<div class="challenge-offers">${s.offers.map((v, i) => `<button data-action="slot" data-value="${i}" aria-pressed="${selected === i}" ${s.done ? 'disabled' : ''}><strong>${T[v].name}</strong><small>${T[v].rule}</small></button>`).join('')}</div>${grid(s.board, 5, (v, i) => `<button class="${v || ''}" data-action="plot" data-value="${i}" aria-label="${at(i, 5)}, ${v ? T[v].name : 'empty plot'}" ${v || s.done ? 'disabled' : ''}>${v ? T[v].name : '+'}</button>`)}<section class="challenge-objectives" aria-label="Planning contract progress"><p>Score: ${B.score(s)} / ${c.targetScore}</p>${G.AlibiChallenges.boroughRequirements(
        c,
        s,
      )
        .map(
          (r) =>
            `<p class="challenge-requirement">${r.actual} / ${r.count} ${pl(T[r.building].name, r.count)} beside at least ${r.minimumNeighbors} ${pl(T[r.neighbor].name, r.minimumNeighbors)}</p>`,
        )
        .join('')}</section>`;
    }
    return '';
  }
  function grid(values, columns, render) {
    return `<div class="challenge-grid" style="grid-template-columns:repeat(${columns},1fr)">${values.map(render).join('')}</div>`;
  }
  G.AlibiChallengeLauncher = { mount, names, settle };
  if (typeof module !== 'undefined') module.exports = G.AlibiChallengeLauncher;
})(globalThis);
