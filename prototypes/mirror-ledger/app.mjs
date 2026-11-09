import { PUZZLES } from './puzzles.mjs';
import { check, hint } from './model.mjs';
const root = document.querySelector('#app');
let index = 0,
  cells,
  history = [],
  message = '',
  selected = null,
  highlight = null;
const name = (v) => (v === 1 ? 'sun' : v === 0 ? 'moon' : 'empty');
const addr = (i) => `row ${Math.floor(i / 4) + 1}, column ${(i % 4) + 1}`;
function start(text = '') {
  cells = PUZZLES[index].givens.map((x) => x.slice());
  history = [];
  message = text;
  highlight = null;
  selected = null;
  render();
}
function render() {
  const p = PUZZLES[index],
    active = document.activeElement,
    focus = active?.dataset.cell,
    action = active?.dataset.action,
    link = active?.dataset.link,
    selector =
      active?.id === 'level'
        ? '#level'
        : focus
          ? `[data-cell="${focus}"]`
          : link !== undefined
            ? `[data-link="${link}"]`
            : action
              ? `[data-action="${action}"]`
              : null;
  root.innerHTML = `<div class="toolbar"><label>Choose puzzle <select id="level">${PUZZLES.map((p, i) => `<option value="${i}" ${i === index ? 'selected' : ''}>${p.title}</option>`).join('')}</select></label><span>Practice session · progress resets on reload</span></div><div class="boards">${cells
    .map(
      (board, b) =>
        `<section class="ledger"><h2>${b ? 'Right' : 'Left'} ledger</h2><div class="grid" role="group" aria-label="${b ? 'Right' : 'Left'} ledger">${board
          .map((v, i) => {
            let links = p.links
              .map((l, j) => ((b ? l.b : l.a) === i ? j + 1 : null))
              .filter(Boolean);
            return `<button class="cell ${p.givens[b][i] !== -1 ? 'fixed' : ''} ${highlight && (b ? highlight.b : highlight.a) === i ? 'highlight' : ''}" data-cell="${b}-${i}" aria-label="${b ? 'Right' : 'Left'} ledger, ${addr(i)}, ${name(v)}${p.givens[b][i] !== -1 ? ', fixed' : ''}${links.length ? ', links ' + links.join(', ') : ''}">${v === 1 ? '☀' : v === 0 ? '☾' : '·'}${links.length ? `<small>${links.join(',')}</small>` : ''}</button>`;
          })
          .join('')}</div></section>`,
    )
    .join(
      '',
    )}</div><section><h2>Links</h2><p>Select a link to outline its two cells.</p><div class="links">${p.links.map((l, i) => `<button data-link="${i}">${i + 1}. Left ${addr(l.a)} ↔ Right ${addr(l.b)}: <strong>${l.relation}</strong></button>`).join('')}</div></section><div class="actions"><button data-action="undo" ${history.length ? '' : 'disabled'}>Undo</button><button data-action="restart">Restart</button><button data-action="check">Check</button><button data-action="hint">Hint</button></div><p class="message" role="status" aria-live="polite">${message}</p>`;
  if (selector) {
    const target = root.querySelector(selector);
    (target && !target.disabled
      ? target
      : root.querySelector(selected ? `[data-cell="${selected.join('-')}"]` : '#level')
    )?.focus();
  }
}
function mark(b, i, v) {
  selected = [b, i];
  if (PUZZLES[index].givens[b][i] !== -1) {
    message = 'This clue is fixed.';
    render();
    return;
  }
  if (cells[b][i] === v) return;
  history = [...history, cells.map((x) => x.slice())].slice(-40);
  cells[b][i] = v;
  message = '';
  render();
}
root.addEventListener('change', (e) => {
  if (e.target.id === 'level') {
    index = Number(e.target.value);
    start();
  }
});
root.addEventListener('click', (e) => {
  const el = e.target.closest('button');
  if (!el) return;
  if (el.dataset.cell) {
    let [b, i] = el.dataset.cell.split('-').map(Number);
    mark(b, i, cells[b][i] === -1 ? 1 : cells[b][i] === 1 ? 0 : -1);
  } else if (el.dataset.link !== undefined) {
    highlight = PUZZLES[index].links[Number(el.dataset.link)];
    message = 'Linked cells outlined.';
    render();
  } else if (el.dataset.action === 'undo') {
    if (history.length) {
      cells = history.pop();
      message = 'Move undone.';
      render();
    }
  } else if (el.dataset.action === 'restart') {
    start('Puzzle restarted.');
  } else if (el.dataset.action === 'check') {
    let c = check(PUZZLES[index], cells);
    message = c.complete
      ? 'Both ledgers are complete.'
      : c.possible
        ? 'Your entries allow at least one completion.'
        : 'No completion fits these entries. Undo or revise a mark.';
    render();
  } else if (el.dataset.action === 'hint') {
    let h = hint(PUZZLES[index], cells);
    message = h
      ? `${h.board ? 'Right' : 'Left'} ledger, ${addr(h.index)} must be ${name(h.value)}. ${h.reason}`
      : 'No forced empty cell is available. Check your entries or finish the boards.';
    render();
  }
});
root.addEventListener('keydown', (e) => {
  const cell = e.target.closest('[data-cell]');
  if (!cell) return;
  let [b, i] = cell.dataset.cell.split('-').map(Number);
  let next = i;
  if (e.key === 'ArrowLeft' && i % 4 > 0) next--;
  else if (e.key === 'ArrowRight' && i % 4 < 3) next++;
  else if (e.key === 'ArrowUp' && i >= 4) next -= 4;
  else if (e.key === 'ArrowDown' && i < 12) next += 4;
  else if (['s', 'S', 'm', 'M', 'Backspace', 'Delete'].includes(e.key)) {
    e.preventDefault();
    mark(b, i, e.key.toLowerCase() === 's' ? 1 : e.key.toLowerCase() === 'm' ? 0 : -1);
    return;
  } else return;
  e.preventDefault();
  selected = [b, next];
  root.querySelector(`[data-cell="${b}-${next}"]`)?.focus();
});
start();
