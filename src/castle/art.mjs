/* Reuse the locally bundled Alibi paintings. These are presentation assets, never evidence. */
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roomScenes = {
  gatehouse: 'briar-house', library: 'reading-room', observatory: 'bellweather',
  cartography: 'cartographer', orangery: 'glasshouse', museum: 'reading-room',
  workshop: 'briar-house', study: 'briar-house', 'west-stair': 'briar-house',
  conservatory: 'glasshouse',
};
function painting(sceneId) {
  const scenes = globalThis.ALIBI_THEATRE?.scenes ?? [];
  const scene = scenes.find(s => s.id === sceneId) ?? scenes.find(s => s.id === 'reading-room');
  const source = scene && (scene.curation ? globalThis.ALIBI_CURATION_MEDIA : globalThis.ALIBI_MEDIA)?.[scene.art];
  const fallback = globalThis.ALIBI_MEDIA?.['club-reading-room'];
  return source || fallback || '';
}
function image(id, description) {
  const source = painting(id);
  return source ? `<img class="castle-painting" src="${escape(source)}" alt="${escape(description)}" decoding="async">` : '<div class="castle-painting castle-paper" aria-hidden="true"></div>';
}
function estate(era = 'today', secret = false) {
  return `<div class="castle-plan" data-era="${era === '1911' ? '1911' : 'today'}">${image('briar-house', 'Alibi house painting behind a schematic room directory. The numbered positions are navigation aids, not architectural evidence.')}<div class="castle-plan-grid" aria-hidden="true"></div><p class="castle-map-caption">${era === '1911' ? '1911 survey: orchard footpath and service stair recorded.' : 'Present-day directory'}${secret ? ' · Service stair located.' : ''}</p></div>`;
}
function interior(room) {
  return image(roomScenes[room.id], `${room.name}: a reused Alibi atmosphere painting. Puzzle clues appear in the text and controls.`);
}
export { estate, interior, painting };
