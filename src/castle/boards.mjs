import * as E from './engine.mjs';
import { escape, names, places, button } from './html.mjs';
export function renderBoard({ active, answer, selection, walk }) {
  function routeBoard() {
    return `<div class="route-map"><svg viewBox="0 0 540 330" aria-hidden="true">${E.edges
      .map(([a, b, t]) => {
        const p = places[a],
          q = places[b];
        return `<path d="M${p[0] * 5.4} ${p[1] * 3.3}L${q[0] * 5.4} ${q[1] * 3.3}" stroke="#b6b68b" stroke-width="3"/><text x="${(p[0] + q[0]) * 2.7}" y="${(p[1] + q[1]) * 1.65 - 6}" fill="#eee0bb" font-size="16">${t}</text>`;
      })
      .join('')}</svg>${Object.entries(places)
      .map(([id, [x, y]]) =>
        button(
          id,
          'route',
          id,
          `class="route-node" style="left:${x}%;top:${y}%" aria-label="${names[id]}${answer.includes(id) ? ', on the route' : ''}"`,
        ),
      )
      .join(
        '',
      )}</div><p>Route: ${answer.map((id) => names[id]).join(' → ')}. <strong>${E.routeTime(answer)} minutes.</strong></p><details><summary>Read the route distances</summary><table><thead><tr><th>From</th><th>To</th><th>Minutes</th></tr></thead><tbody>${E.edges.map(([a, b, t]) => `<tr><td>${names[a]}</td><td>${names[b]}</td><td>${t}</td></tr>`).join('')}</tbody></table></details>`;
  }
  function bridgeBoard() {
    return `<p>The connections are North–Island twice, South–Island twice, Island–East, North–East and South–East.</p><p>Trace a walk: ${walk.node || 'choose a starting area'}. Used ${walk.edges.length} / 7 bridges.</p><div class="row">${['N', 'S', 'I', 'E'].map((n) => button('Start ' + n, 'river-start', n)).join('')}</div><div class="actions">${E.river.map(([a, b], i) => button(`${i + 1}: ${a}–${b}`, 'river', i, walk.node && !walk.edges.includes(i) && [a, b].includes(walk.node) ? '' : 'disabled')).join('')}</div><p>Mark the odd-degree areas:</p><div class="row">${['N', 'S', 'I', 'E'].map((n) => button(n, 'odd', n, `aria-pressed="${answer.odd.includes(n)}"`)).join('')}</div><div class="choices">${button('A walk across every bridge once is possible.', 'verdict', 'possible', `aria-pressed="${answer.conclusion === 'possible'}"`)}${button('It is impossible: more than two areas have odd degree.', 'verdict', 'impossible', `aria-pressed="${answer.conclusion === 'impossible'}"`)}</div>`;
  }
  function board() {
    switch (active) {
      case 'gate':
        return `<div class="grid">${answer.map((n, i) => `<label>${['Left', 'Middle', 'Right'][i]} wheel<select data-wheel="${i}">${Array.from({ length: 7 }, (_, v) => `<option ${n === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`).join('')}</div>`;
      case 'shelves':
        return `<p>${selection === null ? 'Choose two books to swap.' : `Selected ${escape(answer[selection])}. Choose the other book.`}</p><div class="shelf">${answer.map((n, i) => button(escape(n), 'swap', i, `class="book" aria-pressed="${selection === i}" aria-label="Book ${i + 1}: ${escape(n)}"`)).join('')}</div>`;
      case 'clock':
        return `<label>Corrected departure time (HH:MM)<input id="clock-answer" inputmode="numeric" maxlength="5" autocomplete="off" value="${escape(answer)}"></label>`;
      case 'route':
        return routeBoard();
      case 'lamps':
        return `<div class="grid">${E.lights(answer)
          .map((on, i) =>
            button(
              `${on ? '●' : '○'}<small>${on ? 'LIT' : 'UNLIT'}</small>`,
              'lamp',
              i,
              `class="tile ${on ? 'lit' : ''}" aria-label="Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}, ${on ? 'lit' : 'unlit'}; toggle this and adjacent lanterns"`,
            ),
          )
          .join('')}</div>`;
      case 'hanoi':
        return `<p>${answer.length} moves. ${selection === null ? 'Choose the source peg.' : 'Choose the destination peg.'}</p><div class="pegs">${E.hanoi(
          answer,
        )
          .map((p, i) =>
            button(
              `<span class="peg-label">Peg ${'ABC'[i]}</span>${p.map((n) => `<span class="disk" style="width:${25 + n * 20}%">${n}</span>`).join('')}`,
              'peg',
              i,
              `class="peg" aria-pressed="${selection === i}" aria-label="Peg ${'ABC'[i]}, disks bottom to top: ${p.join(', ') || 'empty'}"`,
            ),
          )
          .join('')}</div>`;
      case 'magic':
        return `<p>${selection === null ? 'Choose two tiles to swap.' : `Tile ${selection + 1} selected.`}</p><div class="grid">${answer.map((n, i) => button(n, 'swap', i, `class="tile" aria-pressed="${selection === i}" aria-label="Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}: ${n}"`)).join('')}</div><p>Row totals: ${[0, 1, 2].map((r) => answer.slice(r * 3, r * 3 + 3).reduce((a, b) => a + b, 0)).join(', ')}.</p>`;
      case 'bridges':
        return bridgeBoard();
      case 'ur':
        return `<div class="patterns">${Array.from({ length: 16 }, (_, n) => {
          const bits = [0, 1, 2, 3].map((i) => (n >> i) & 1);
          return `<span aria-label="${bits.map((x) => (x ? 'marked' : 'unmarked')).join(', ')}">${bits.map((x) => (x ? '◆' : '◇')).join(' ')}<small>${bits.reduce((a, b) => a + b, 0)} marked</small></span>`;
        }).join(
          '',
        )}</div><div class="row">${[0, 1, 2, 3, 4].map((n) => button(String(n), 'ur', n, `aria-pressed="${answer === n}" aria-label="${n} marked tips"`)).join('')}</div>`;
      case 'inference':
        return `<article class="card evidence">Ticket: 21:17. Station clock: 17 minutes fast. Footpath: 7 minutes. Calibrated tower bell: 21:10.</article><div class="choices">${[
          ['too-late', 'The ticket proves Finch was too late.'],
          ['definitely-present', 'The route proves Finch reached the tower before the bell.'],
          [
            'possible-not-proven',
            'Finch could have arrived before the bell. These records do not prove he did.',
          ],
          ['no-knowledge', 'The clock error means we can infer nothing.'],
        ]
          .map(([id, text]) => button(text, 'inference', id, `aria-pressed="${answer === id}"`))
          .join('')}</div>`;
      default:
        return '';
    }
  }
  return board();
}
