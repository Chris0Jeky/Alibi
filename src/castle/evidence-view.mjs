import W from './content.mjs';
import { escape as e, button, link } from './html.mjs';

function card(r, select) {
  const room = W.rooms.find((room) => room.puzzle === r.requires);
  return `<article class="card evidence" data-record-id="${e(r.id)}"><small>${e(r.kind)} · ${e(r.from)}</small><h3>${e(r.title)}</h3><p>${e(r.text)}</p><p><em>${e(r.question)}</em></p>${select ? `<label class="theory-citation"><input type="checkbox" value="${e(r.id)}" data-compare-record aria-label="Compare ${e(r.title)}" aria-describedby="compare-guidance"> Compare</label>` : ''}<p>${link(`Return to ${e(room.name)}`, 'room', room.id)}</p></article>`;
}

export function evidenceBoard(items) {
  return items.length
    ? `<section class="evidence-board" aria-label="Collected records"><div class="row"><h2 id="compare-guidance">Choose 2 or 3 records</h2>${button('Compare', 'compare-records', '', 'aria-describedby="compare-guidance"')}</div><div class="directory">${items.map((r) => card(r, true)).join('')}</div></section>`
    : '<h2>Collected records</h2><p>The library is a useful place to start looking.</p>';
}

export function evidenceComparison(items) {
  return `<ol class="evidence-comparison">${items.map((r) => `<li>${card(r, false)}</li>`).join('')}</ol><p class="small">Comparison changes no save or score.</p>`;
}
