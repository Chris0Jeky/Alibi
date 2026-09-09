/* Wrenmere's original SVG illustrations are optional, same-origin scene assets. */
const ROOM_MEDIA = Object.freeze([
  'cartography',
  'conservatory',
  'gatehouse',
  'library',
  'museum',
  'observatory',
  'orangery',
  'study',
  'west-stair',
  'workshop',
]);

const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );

function media() {
  const value = globalThis.ALIBI_QUIET_CONFIG?.castle?.media;
  return value && typeof value === 'object' ? value : {};
}

function source(id) {
  const value = media()[id];
  return typeof value === 'string' && value ? value : '';
}

function image(id, description) {
  const url = source(id);
  if (!url)
    return `<div class="castle-painting castle-paper" role="img" aria-label="${escape(description)}"></div>`;
  return `<img class="castle-painting" src="${escape(url)}" alt="${escape(description)}" decoding="async">`;
}

function painting(sceneId) {
  return source(sceneId);
}

function estate(era = 'today', secret = false) {
  const historical = era === '1911';
  const id = historical ? 'estate-1911' : 'estate-today';
  const caption = historical
    ? secret
      ? '1911 survey: service route located.'
      : '1911 survey layer'
    : secret
      ? 'Present-day directory · service route located.'
      : 'Present-day directory';
  return `<div class="castle-plan" data-era="${historical ? '1911' : 'today'}">${image(id, historical ? 'A fictional 1911 survey of the Wrenmere estate.' : 'A present-day directory of the Wrenmere estate.')}${secret ? '<svg class="secret-route" viewBox="0 0 1200 760" aria-hidden="true"><path d="M405 453l60-18 0-49" stroke="#e6c986" stroke-width="4" stroke-dasharray="5 4" fill="none"/></svg>' : ''}<p class="castle-map-caption">${caption}</p></div>`;
}

function interior(room, era = 'today') {
  const id = ROOM_MEDIA.includes(room?.id) ? room.id : '';
  const description = id
    ? `${room.name}: an original Wrenmere room illustration. Puzzle clues appear in the text and controls.`
    : 'A Wrenmere room illustration is unavailable in this build.';
  return image(id, description);
}

export { estate, interior, painting };
