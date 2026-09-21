import W from './content.mjs';
import { escape, button, link } from './html.mjs';

function card(record, selectable) {
  const room = W.rooms.find((candidate) => candidate.puzzle === record.requires);
  return `<article class="card evidence" data-record-id="${escape(record.id)}"><small>${escape(record.kind)} · ${escape(record.from)}</small><h3>${escape(record.title)}</h3><p>${escape(record.text)}</p><p><em>${escape(record.question)}</em></p>${selectable ? `<label class="theory-citation"><input type="checkbox" value="${escape(record.id)}" data-compare-record> Compare this record</label>` : ''}<p>${link(`Return to ${escape(room.name)}`, 'room', room.id)}</p></article>`;
}

export function evidenceBoard(records) {
  return records.length
    ? `<section class="evidence-board" aria-label="Collected records"><div class="row"><h2>Collected records</h2>${button('Compare selected', 'compare-records', '', 'disabled')}</div><p class="small" id="compare-status" role="status">Choose two or three records.</p><div class="directory">${records.map((record) => card(record, true)).join('')}</div></section>`
    : '<h2>Collected records</h2><p>The library is a useful place to start looking.</p>';
}

export function evidenceComparison(records) {
  return `<ol class="evidence-comparison">${records.map((record) => `<li>${card(record, false)}</li>`).join('')}</ol><p class="small">Comparison changes no record, score or hypothesis.</p>`;
}
