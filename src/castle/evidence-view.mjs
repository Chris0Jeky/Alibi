import W from './content.mjs';
import { escape, button, link } from './html.mjs';

function sourceRoom(record) {
  return W.rooms.find((room) => room.puzzle === record.requires);
}

function recordCard(record, selectable) {
  const room = sourceRoom(record);
  if (!room) throw Error(`Evidence record ${record.id} has no source room.`);
  return `<article class="card evidence" data-record-id="${escape(record.id)}"><small>${escape(record.kind)} · ${escape(record.from)}</small><h3>${escape(record.title)}</h3><p>${escape(record.text)}</p><p><em>${escape(record.question)}</em></p>${selectable ? `<label class="theory-citation"><input type="checkbox" value="${escape(record.id)}" data-compare-record> Compare this record</label>` : ''}<p>${link(`Return to ${escape(room.name)}`, 'room', room.id)}</p></article>`;
}

export function evidenceBoard(records) {
  if (!Array.isArray(records) || records.length > W.evidence.length)
    throw Error('Collected evidence must be a bounded record list.');
  if (!records.length) return '<h2>Collected records</h2><p>The library is a useful place to start looking.</p>';
  return `<section class="evidence-board" aria-label="Collected records"><div class="row"><h2>Collected records</h2>${button('Compare selected', 'compare-records', '', 'disabled')}</div><p class="small" id="compare-status" role="status">Choose two or three collected records to compare.</p><div class="directory">${records.map((record) => recordCard(record, true)).join('')}</div></section>`;
}

export function evidenceComparison(records) {
  if (
    !Array.isArray(records) ||
    records.length < 2 ||
    records.length > 3 ||
    new Set(records.map((record) => record?.id)).size !== records.length ||
    records.some((record) => !W.evidence.some((known) => known.id === record?.id))
  )
    throw Error('Compare two or three distinct collected records.');
  return `<ol class="evidence-comparison">${records.map((record) => `<li>${recordCard(record, false)}</li>`).join('')}</ol><p class="small">Comparison changes no record, score or hypothesis. Return to the notebook to revise your interpretation.</p>`;
}
