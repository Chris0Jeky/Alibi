import { FrameLoop, bindDrag, dropOrigin, createFeedback, clamp } from '../game-feel/runtime.mjs';

const palette = ['#62b9a7', '#d8a663', '#a397d3'];
const text = (node, value) => {
  node.textContent = String(value);
};
const extent = (cells) => ({
  w: Math.max(...cells.map(([x]) => x)) + 1,
  h: Math.max(...cells.map(([, y]) => y)) + 1,
});

/** Shared tactile surface. The adapter, not the renderer, owns rules and persistence. */
export function mountSurface(root, adapter, options = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let state = adapter.read(),
    selected = null,
    rotation = 0,
    pointer = null,
    origin = -1,
    disposed = false;
  let pending = false,
    effects = null,
    sound = false,
    haptics = false,
    restoreFocus = false;
  let reduce = !!options.reducedMotion || reduced.matches,
    focusCell = 0;
  root.innerHTML = `<section class="bc-studio" aria-label="Block Cabinet tactile game">
    <header class="bc-header"><div><span class="bc-kicker">ALIBI / THE GAMES ROOM</span><h2></h2></div><button type="button" class="bc-menu-toggle" data-command="menu" aria-expanded="false" aria-label="Game menu">⋯</button><span class="bc-seal" aria-hidden="true">◇</span></header>
    <div class="bc-layout"><div class="bc-play"><div class="bc-scoreboard"><div><span>SCORE</span><strong data-score>0</strong></div><div class="bc-objective"><span data-objective-label>NO CLOCK. YOUR NEXT MOVE.</span><strong data-objective>Make room.</strong></div></div>
    <div class="bc-stage"><div class="bc-board" role="group" aria-label="Eight by eight block puzzle board"></div>
    <div class="bc-status" role="status" aria-live="polite">Drag a piece onto the board, or select it and tap a square.</div>
    <div class="bc-tray" role="group" aria-label="Three available pieces"></div><canvas class="bc-fx" aria-hidden="true"></canvas></div>
    <div class="bc-controls"><button type="button" data-command="undo">↶ <span>Undo</span></button><button type="button" data-command="redo">↷ <span>Redo</span></button><button type="button" data-command="rotate" hidden>⟳ <span>Rotate</span></button><button type="button" data-command="sound" aria-pressed="false">Sound off</button><button type="button" data-command="haptics" aria-pressed="false">Haptics off</button></div>
    <p class="bc-save" data-save></p></div>
    <aside class="bc-aside"><div class="bc-note"><span class="bc-kicker">THE CABINETMAKER'S TABLE</span><h3>One good fit.<br>A little more room.</h3><p data-rules></p><div class="bc-illustration" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></div>
    <div class="bc-next"><span class="bc-kicker">BEYOND THE CLASSIC</span><h3>Cascade Cabinet</h3><p>Clear a line. Let the pieces fall. Chain the next clear and recover the brass relics.</p><button type="button" data-command="switch">Open the Cascade lab ↗</button></div>
    <details class="bc-help"><summary>Controls & comfort</summary><p>Drag with a finger, mouse or pen. Touch pieces lift above your finger. Tap a piece and then a square for precise placement. Tab to the board; arrow keys move between squares. Escape cancels a selection.</p><p>Sound and vibration are optional. Your device may not support vibration. Reduced-motion settings remove the particles and movement.</p><button type="button" data-command="motion" aria-pressed="false">Reduce motion</button><p data-diagnostics></p></details>
    <div class="bc-tools"><button type="button" data-command="new">New seeded game</button><button type="button" data-command="export">Export replay</button><button type="button" data-command="import">Import replay</button><button type="button" data-command="simple" hidden>Simple controls</button></div>
    <p class="bc-footnote">Original Alibi artwork. No lives, ads, countdowns or pretend opponents.</p></aside></div></section>`;
  const $ = (selector) => root.querySelector(selector);
  const board = $('.bc-board'),
    stage = $('.bc-stage'),
    tray = $('.bc-tray'),
    canvas = $('canvas');
  let ctx = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    /* Canvas is decorative; the semantic controls remain playable. */
  }
  const feedback = createFeedback(options.nativeFeedback);
  const cells = Array.from({ length: 64 }, (_, i) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'bc-cell';
    el.dataset.cell = String(i);
    el.tabIndex = i === 0 ? 0 : -1;
    el.innerHTML = '<span class="bc-block"></span>';
    board.append(el);
    return el;
  });
  const slots = Array.from({ length: 3 }, (_, i) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'bc-piece';
    el.dataset.piece = String(i);
    tray.append(el);
    return el;
  });
  const advanced = !!adapter.advanced;
  text($('h2'), advanced ? 'Cascade Cabinet.' : 'Block Cabinet.');
  text(
    $('[data-rules]'),
    advanced
      ? 'Recover all eight brass relics in 35 placements. Clear a full row or column to trigger gravity. Falling pieces can complete another line. Rotation costs one charge; clearing lines restores charges. Empty all three tray slots to get the next set.'
      : 'Fit pieces into the 8×8 cabinet. Complete a row or column to clear it. Each placed square scores one point; each cleared line adds ten. Pieces keep their orientation, and the used tray slot refills immediately.',
  );
  $('[data-command="rotate"]').hidden = !advanced;
  text(
    $('[data-command="switch"]'),
    advanced ? 'Return to the classic ↗' : 'Open the Cascade lab ↗',
  );
  $('.bc-next h3').textContent = advanced ? 'The original cabinet' : 'Cascade Cabinet';
  $('.bc-next p').textContent = advanced
    ? 'A quiet, endless board. Your classic game remains separate and unchanged.'
    : 'Clear a line. Let the pieces fall. Chain the next clear and recover the brass relics.';
  for (const command of ['new', 'export', 'import', 'simple'])
    $('[data-command="' + command + '"]').hidden = !adapter[command];
  const getShape = (slot = selected) =>
    slot === null || state.tray[slot] === null ? null : adapter.shape(state.tray[slot], rotation);
  const legal = (cell) => selected !== null && adapter.legal(state, selected, cell, rotation);
  function announce(message) {
    text($('.bc-status'), message);
  }
  function sync() {
    if (disposed) return;
    state = adapter.read();
    if (selected !== null && state.tray[selected] === null) selected = null;
    text($('[data-score]'), state.score);
    text(
      $('[data-objective-label]'),
      advanced
        ? 'RELICS / ' + (state.limit - state.turn) + ' MOVES LEFT'
        : 'TURN ' + state.turn + ' / SEED ' + state.seed,
    );
    text(
      $('[data-objective]'),
      advanced
        ? state.relics + ' / ' + state.goal + '  ·  ' + state.charges + ' rotations'
        : state.done
          ? 'Cabinet complete'
          : 'Make room.',
    );
    text(
      $('[data-save]'),
      adapter.saveLabel?.() || 'Device-local play. Export a replay to keep a separate backup.',
    );
    const motion = $('[data-command="motion"]'),
      motionFloor = !!options.reducedMotion || reduced.matches;
    motion.setAttribute('aria-pressed', String(reduce));
    motion.setAttribute(
      'aria-label',
      reduce && motionFloor
        ? 'Reduce motion on; follows your device preference'
        : `Reduce motion ${reduce ? 'on' : 'off'}`,
    );
    text(motion, reduce ? 'Reduce motion: on' : 'Reduce motion: off');
    cells.forEach((el, i) => {
      el.classList.toggle('filled', !!state.board[i]);
      el.classList.toggle('relic', state.board[i] === 2 && advanced);
      el.classList.toggle('legal', selected !== null && legal(i));
      el.disabled = pending || state.done;
      el.setAttribute(
        'aria-label',
        `Row ${Math.floor(i / 8) + 1}, column ${(i % 8) + 1}: ${state.board[i] === 2 && advanced ? 'brass relic' : state.board[i] ? 'filled' : 'empty'}${selected === null ? ', select a piece' : legal(i) ? ', legal origin for ' + getShape().name : ', unavailable for selected piece'}`,
      );
    });
    slots.forEach((el, i) => {
      const id = state.tray[i];
      el.disabled = pending || state.done || id === null;
      el.setAttribute('aria-pressed', String(i === selected));
      el.classList.toggle('selected', i === selected);
      el.style.setProperty('--piece-color', palette[i]);
      if (id === null) {
        el.innerHTML = '<span class="bc-empty">Used</span>';
        el.setAttribute('aria-label', `Piece ${i + 1}, used`);
        return;
      }
      const shape = adapter.shape(id, i === selected ? rotation : 0),
        size = extent(shape.cells);
      el.innerHTML = `<span class="bc-piece-shape" style="--pw:${size.w};--ph:${size.h}">${shape.cells.map(([x, y]) => `<i style="grid-column:${x + 1};grid-row:${y + 1}"></i>`).join('')}</span><span class="bc-piece-name"></span>`;
      text(el.querySelector('.bc-piece-name'), shape.name);
      el.setAttribute(
        'aria-label',
        `Piece ${i + 1}: ${shape.name}, ${shape.cells.length} squares${i === selected ? ', selected' : ''}`,
      );
    });
    $('[data-command="undo"]').disabled = pending || !adapter.canUndo();
    $('[data-command="redo"]').disabled = pending || !adapter.canRedo();
    $('[data-command="rotate"]').disabled = pending || selected === null || !state.charges;
    for (const command of ['new', 'export', 'import', 'simple'])
      $('[data-command="' + command + '"]').disabled = pending;
    if (state.done)
      announce(
        advanced
          ? state.won
            ? 'All eight relics recovered. The cabinet is yours.'
            : 'The expedition is over. Undo a move or begin another seed.'
          : 'No tray piece fits. Undo a move or start another cabinet.',
      );
    if (restoreFocus && !pending) {
      cells[focusCell].focus({ preventScroll: true });
      restoreFocus = false;
    }
    loop.invalidate();
  }
  function select(slot) {
    if (pending || state.done || state.tray[slot] === null) return false;
    const preserveRotation = selected === slot;
    selected = slot;
    if (!preserveRotation) rotation = 0;
    origin = -1;
    sync();
    feedback.unlock();
    announce(`${getShape().name} selected. Drag it, or choose a square.`);
    return true;
  }
  function setReducedMotion(value) {
    const next = !!value || !!options.reducedMotion || reduced.matches;
    if (reduce === next) return;
    reduce = next;
    effects = null;
    pending = false;
    board.classList.remove('bc-resolving');
    sync();
    loop.invalidate();
  }
  async function place(cell) {
    if (pending || selected === null) return;
    if (!legal(cell)) {
      feedback.play('reject');
      announce('That piece does not fit there. Try another square.');
      pointer = null;
      origin = -1;
      loop.invalidate();
      return;
    }
    const slot = selected,
      rot = rotation,
      before = state,
      shape = getShape(),
      placed = shape.cells.map(([x, y]) => cell + y * 8 + x);
    restoreFocus = !!document.activeElement?.closest('.bc-cell');
    focusCell = cell;
    pending = true;
    pointer = null;
    origin = -1;
    sync();
    try {
      await adapter.place(slot, cell, rot);
      if (disposed) return;
      const after = adapter.read();
      if (after.turn !== before.turn + 1)
        throw Error('The move was not committed. Resolve the save warning and retry.');
      const waves = after.waves?.length
        ? after.waves
        : after.lastClear.rows.length || after.lastClear.columns.length
          ? [
              {
                depth: 1,
                rows: after.lastClear.rows,
                columns: after.lastClear.columns,
                cells: Array.from({ length: 64 }, (_, i) => i).filter(
                  (i) =>
                    after.lastClear.rows.includes(Math.floor(i / 8)) ||
                    after.lastClear.columns.includes(i % 8),
                ),
                before: before.board.map((v, i) => (placed.includes(i) ? 1 : v)),
                after: after.board,
                falls: [],
              },
            ]
          : [];
      effects = ctx
        ? {
            start: performance.now(),
            placed,
            waves,
            score: after.score - before.score,
            duration: reduce ? 0 : waves.length ? Math.min(1800, waves.length * 300 + 220) : 220,
          }
        : null;
      selected = null;
      rotation = 0;
      pending = !!effects && effects.duration > 0;
      feedback.play(waves.length ? 'clear' : 'place', waves.length || 1);
      announce(
        waves.length
          ? `${waves.length > 1 ? waves.length + '-stage cascade. ' : ''}+${after.score - before.score} points. ${advanced ? after.relics + ' relics recovered.' : ''}`
          : `Placed. +${shape.cells.length} points.`,
      );
      sync();
      if (!pending) effects = null;
    } catch (error) {
      pending = false;
      effects = null;
      announce(error.message || 'The move could not be saved.');
      sync();
    }
  }
  function dimensions() {
    const a = stage.getBoundingClientRect(),
      b = board.getBoundingClientRect();
    return { stage: a, board: b, cell: b.width / 8, x: b.left - a.left, y: b.top - a.top };
  }
  function tile(x, y, size, color, alpha = 1, relic = false) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const pad = Math.max(2, size * 0.06),
      r = size * 0.11;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + pad, y + pad, size - pad * 2, size - pad * 2, r);
    else ctx.rect(x + pad, y + pad, size - pad * 2, size - pad * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.32)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.fillRect(x + pad + 3, y + pad + 3, size - pad * 2 - 6, 3);
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.fillRect(x + pad + 3, y + size - pad - 5, size - pad * 2 - 6, 3);
    if (relic) {
      ctx.fillStyle = '#f9df9b';
      ctx.font = `${size * 0.44}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('◇', x + size / 2, y + size / 2);
    }
    ctx.restore();
  }
  function draw(now) {
    if (!ctx) return false;
    const d = dimensions(),
      w = d.stage.width,
      h = d.stage.height,
      dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    let again = false;
    if (pointer && selected !== null && pointer.moved) {
      const shape = getShape(),
        size = extent(shape.cells),
        valid = origin >= 0 && legal(origin);
      if (origin >= 0) {
        shape.cells.forEach(([x, y]) =>
          tile(
            d.x + ((origin % 8) + x) * d.cell,
            d.y + (Math.floor(origin / 8) + y) * d.cell,
            d.cell,
            valid ? '#87c7b4' : '#ce806d',
            0.38,
          ),
        );
        if (valid) {
          const hypothetical = state.board.slice();
          shape.cells.forEach(([x, y]) => {
            hypothetical[origin + y * 8 + x] = 1;
          });
          ctx.strokeStyle = '#f3d88f';
          ctx.lineWidth = 2;
          for (let n = 0; n < 8; n++) {
            if (Array.from({ length: 8 }, (_, i) => hypothetical[n * 8 + i]).every(Boolean))
              ctx.strokeRect(d.x + 2, d.y + n * d.cell + 2, d.board.width - 4, d.cell - 4);
            if (Array.from({ length: 8 }, (_, i) => hypothetical[i * 8 + n]).every(Boolean))
              ctx.strokeRect(d.x + n * d.cell + 2, d.y + 2, d.cell - 4, d.board.height - 4);
          }
        }
      }
      const x = pointer.x - d.stage.left - (size.w * d.cell) / 2,
        y = pointer.y - d.stage.top - pointer.lift - (size.h * d.cell) / 2;
      ctx.shadowColor = 'rgba(0,0,0,.5)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 10;
      shape.cells.forEach(([dx, dy]) =>
        tile(x + dx * d.cell, y + dy * d.cell, d.cell, palette[selected], 0.95),
      );
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    if (effects) {
      const elapsed = now - effects.start;
      if (elapsed >= effects.duration || reduce) {
        effects = null;
        pending = false;
        board.classList.remove('bc-resolving');
        sync();
      } else {
        again = true;
        const waves = effects.waves,
          index = Math.floor(elapsed / 300),
          wave = waves[index];
        board.classList.toggle('bc-resolving', !!wave);
        if (wave) {
          const p = clamp((elapsed - index * 300) / 300, 0, 1);
          wave.before.forEach((value, i) => {
            if (!value) return;
            if (wave.cells.includes(i)) {
              tile(
                d.x + (i % 8) * d.cell,
                d.y + Math.floor(i / 8) * d.cell,
                d.cell,
                '#edcf87',
                1 - p,
                value === 2 && advanced,
              );
              return;
            }
            const fall = wave.falls.find((f) => f.from === i),
              target = fall ? fall.to : i;
            const y =
              Math.floor(i / 8) + (Math.floor(target / 8) - Math.floor(i / 8)) * (1 - (1 - p) ** 3);
            tile(
              d.x + (i % 8) * d.cell,
              d.y + y * d.cell,
              d.cell,
              value === 2 && advanced ? '#b88b48' : '#4d9e8d',
              1,
              value === 2 && advanced,
            );
          });
          // Deterministic decorative particles. They never enter the game PRNG or replay.
          wave.cells.slice(0, 32).forEach((cell, i) => {
            for (let k = 0; k < 3; k++) {
              const angle = i * 2.399 + k * 2.094,
                distance = p * d.cell * (1 + k * 0.55);
              ctx.globalAlpha = (1 - p) * 0.8;
              ctx.fillStyle = k === 1 ? '#bce3cd' : '#ebc987';
              ctx.fillRect(
                d.x + ((cell % 8) + 0.5) * d.cell + Math.cos(angle) * distance,
                d.y +
                  (Math.floor(cell / 8) + 0.5) * d.cell +
                  Math.sin(angle) * distance +
                  p * p * 24,
                3,
                3,
              );
            }
          });
          ctx.globalAlpha = 1;
        } else if (!waves.length) {
          effects.placed.forEach((cell) => {
            ctx.strokeStyle = `rgba(232,211,149,${1 - elapsed / 220})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(
              d.x + (cell % 8) * d.cell + 3,
              d.y + Math.floor(cell / 8) * d.cell + 3,
              d.cell - 6,
              d.cell - 6,
            );
          });
        }
        ctx.save();
        ctx.fillStyle = '#f4e2b8';
        ctx.textAlign = 'center';
        ctx.font = '600 24px system-ui';
        ctx.globalAlpha = 1 - elapsed / effects.duration;
        ctx.fillText('+' + effects.score, w / 2, d.y + d.board.height * 0.45 - elapsed * 0.025);
        ctx.restore();
      }
    }
    return again;
  }
  const loop = new FrameLoop(draw);
  const releaseDrag = bindDrag(stage, {
    start(slot, e) {
      if (!select(slot)) return false;
      pointer = {
        x: e.clientX,
        y: e.clientY,
        lift: e.pointerType === 'touch' ? (board.getBoundingClientRect().width / 8) * 1.15 : 0,
        moved: false,
      };
      return true;
    },
    move(e, moved) {
      if (!pointer) return;
      pointer = { ...pointer, x: e.clientX, y: e.clientY, moved };
      origin = dropOrigin(
        pointer,
        board.getBoundingClientRect(),
        getShape().cells,
        undefined,
        pointer.lift,
      );
      loop.invalidate();
    },
    end(e, moved) {
      if (!pointer) return;
      if (moved) {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        const cell = dropOrigin(
          pointer,
          board.getBoundingClientRect(),
          getShape().cells,
          undefined,
          pointer.lift,
        );
        pointer = null;
        place(cell);
      } else {
        pointer = null;
        loop.invalidate();
      }
    },
    cancel() {
      pointer = null;
      origin = -1;
      loop.invalidate();
    },
  });
  async function command(name) {
    if (pending) return;
    const restoreCommand =
      ['undo', 'redo'].includes(name) && document.activeElement?.dataset.command === name
        ? name
        : null;
    const locks = ['undo', 'redo', 'new', 'export', 'import', 'simple'].includes(name);
    if (locks) {
      pending = true;
      sync();
    }
    try {
      if (name === 'menu') {
        const open = $('.bc-studio').classList.toggle('bc-menu-open');
        $('[data-command="menu"]').setAttribute('aria-expanded', String(open));
      } else if (name === 'sound') {
        sound = !sound;
        feedback.configure({ sound, haptics });
        feedback.unlock();
        text($('[data-command="sound"]'), sound ? 'Sound on' : 'Sound off');
        $('[data-command="sound"]').setAttribute('aria-pressed', String(sound));
      } else if (name === 'haptics') {
        haptics = !haptics;
        feedback.configure({ sound, haptics });
        text($('[data-command="haptics"]'), haptics ? 'Haptics on' : 'Haptics off');
        $('[data-command="haptics"]').setAttribute('aria-pressed', String(haptics));
        feedback.play();
      } else if (name === 'motion') {
        if (!!options.reducedMotion || reduced.matches) {
          reduce = true;
          announce('Reduced motion follows your device preference.');
        } else {
          reduce = !reduce;
        }
        effects = null;
        pending = false;
        board.classList.remove('bc-resolving');
        sync();
        loop.invalidate();
      } else if (name === 'rotate' && advanced && selected !== null && state.charges) {
        rotation = (rotation + 1) % 4;
        origin = -1;
        sync();
        announce(getShape().name + ' rotated. Charge is spent only when placed.');
      } else if (name === 'switch') {
        options.onSwitch?.();
      } else if (adapter[name]) {
        await adapter[name]();
        selected = null;
        rotation = 0;
        sync();
      }
    } catch (error) {
      announce(error.message || 'The action could not complete.');
    } finally {
      if (locks) {
        pending = false;
        sync();
        if (restoreCommand) {
          const target = root.querySelector(`[data-command="${restoreCommand}"]`),
            fallback = root.querySelector(
              `[data-command="${restoreCommand === 'undo' ? 'redo' : 'undo'}"]`,
            );
          (target && !target.disabled
            ? target
            : fallback && !fallback.disabled
              ? fallback
              : cells[focusCell]
          )?.focus({ preventScroll: true });
        }
      }
    }
  }
  function click(e) {
    const el = e.target.closest('button');
    if (!el || !root.contains(el)) return;
    if (el.dataset.command) {
      command(el.dataset.command);
      return;
    }
    if (el.dataset.cell !== undefined) {
      focusCell = Number(el.dataset.cell);
      place(focusCell);
      return;
    }
    // Pointer gestures already selected the piece. Keyboard/screen-reader clicks still work.
    if (el.dataset.piece !== undefined && e.detail === 0) select(Number(el.dataset.piece));
  }
  function key(e) {
    if (e.target.closest('input,textarea,select')) return;
    if (e.key === 'Escape') {
      selected = null;
      rotation = 0;
      pointer = null;
      origin = -1;
      sync();
      announce('Selection cancelled.');
      e.stopPropagation();
      return;
    }
    const cell = e.target.closest('[data-cell]');
    if (!cell) return;
    const delta = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 8, ArrowUp: -8 }[e.key];
    if (delta) {
      e.preventDefault();
      e.stopPropagation();
      cells[focusCell].tabIndex = -1;
      focusCell = clamp(Number(cell.dataset.cell) + delta, 0, 63);
      cells[focusCell].tabIndex = 0;
      cells[focusCell].focus();
    }
  }
  root.addEventListener('click', click);
  root.addEventListener('keydown', key);
  let boardWidth = board.getBoundingClientRect().width;
  const resize = new ResizeObserver(() => {
    const width = board.getBoundingClientRect().width;
    // Status wrapping is not a cancelled gesture.
    if (Math.abs(width - boardWidth) > 0.5) {
      pointer = null;
      origin = -1;
    }
    boardWidth = width;
    loop.invalidate();
  });
  resize.observe(stage);
  const visibility = () => {
    if (document.hidden) {
      pointer = null;
      origin = -1;
      if (effects) {
        effects = null;
        pending = false;
      }
      board.classList.remove('bc-resolving');
      sync();
    }
  };
  document.addEventListener('visibilitychange', visibility);
  const mediaChange = () => {
    reduce = !!options.reducedMotion || reduced.matches;
    loop.invalidate();
  };
  reduced.addEventListener('change', mediaChange);
  sync();
  return {
    refresh: sync,
    setReducedMotion,
    diagnostics: () => ({
      ...loop.stats(),
      selected,
      rotation,
      pending,
      reducedMotion: reduce,
      mode: advanced ? 'cascade' : 'classic',
    }),
    dispose() {
      disposed = true;
      releaseDrag();
      loop.dispose();
      feedback.dispose();
      resize.disconnect();
      root.removeEventListener('click', click);
      root.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', visibility);
      reduced.removeEventListener('change', mediaChange);
      root.replaceChildren();
    },
  };
}
