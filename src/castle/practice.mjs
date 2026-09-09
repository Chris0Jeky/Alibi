import { escape } from './html.mjs';

function practicePanel(room, snapshot) {
  const id = typeof room?.id === 'string' ? room.id : '',
    entry = snapshot?.rooms?.[id],
    label = entry?.label || room?.name || 'This room',
    starters = Array.isArray(entry?.starters) ? entry.starters : [],
    unavailable = snapshot?.available === false || !entry,
    planned = room?.implemented === false || entry?.implemented === false,
    completed = Number.isInteger(entry?.completed) ? entry.completed : 0,
    total = Number.isInteger(entry?.total) ? entry.total : 0;
  return `<section class="practice-panel card" data-practice-room="${escape(id)}"><span class="eyebrow">Practice shelves</span><h2>${escape(label)}</h2>${planned ? '<p class="small">This room is planned. These shelves preview future practice; the room is not playable yet.</p>' : ''}${unavailable ? '<p class="small">Practice shelves are unavailable until the Cabinet can read its committed saves.</p>' : `<p class="small">${completed} / ${total} official puzzles familiar here. Repeats and hints do not change this count.</p><div class="stack">${starters.map((starter) => `<button type="button" class="secondary" data-do="practice" data-value="${escape(starter.id)}" data-room="${escape(id)}">${escape(starter.title || starter.id)}${starter.difficulty ? ` <small>· ${escape(starter.difficulty)}</small>` : ''}${starter.completed ? ' · completed' : ''}</button>`).join('')}</div>${completed >= 3 && entry.detail ? `<p class="practice-detail"><small>${escape(entry.detail)} Optional room detail; it is not evidence.</small></p>` : ''}`}</section>`;
}

export { practicePanel };
