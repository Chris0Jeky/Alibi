import W from './content.mjs';
import * as E from './engine.mjs';
import * as Art from './art.mjs';
import { roomObjects } from './objects.mjs';
import { escape, button, link } from './html.mjs';
export function createPages({ state, view, selected, era, search, filter }) {
  const room = () => W.rooms.find((r) => r.id === selected) || W.rooms[0];
  function roomCard(r) {
    const status = E.roomStatus(state, r),
      done = E.has(state, r.puzzle);
    return `<article class="card"><span class="eyebrow">${escape(r.wing)}</span><h3>${escape(r.name)}</h3><p>${escape(r.line)}</p><div class="tag">${!r.implemented ? 'Planned room' : done ? 'Question solved' : status.open ? 'Open' : status.reason}</div>${r.implemented ? button(status.open ? 'Enter room' : 'Inspect the door', 'visit', r.id) : ''}</article>`;
  }
  function rail(r) {
    const status = E.roomStatus(state, r),
      completed = E.has(state, r.puzzle);
    let action = button('Enter room', 'visit', r.id, 'class="primary"');
    if (view === 'room' && status.open)
      action =
        r.puzzle === 'rest'
          ? button('Open the guest book', 'rest', '', 'class="primary"')
          : r.puzzle === 'reveal'
            ? button('Read the margin', 'resolution', '', 'class="primary"')
            : button(
                completed ? 'Revisit the puzzle' : 'Inspect the puzzle',
                'puzzle',
                r.puzzle,
                'class="primary"',
              );
    return `<aside class="rail"><span class="eyebrow">${escape(r.wing)}</span><h2>${escape(r.name)}</h2><p>${escape(r.line)}</p><div class="status">${completed ? 'Question solved' : status.open ? 'The door is open' : escape(status.reason)}</div>${action}<p class="small">Ten points per first completion. Hints are available on every board. Replaying does not add points.</p><hr><p class="small">${state.preferences.story ? 'The ticket in the study concerns the 1911 flood. You can turn the story off in Preferences.' : 'You are browsing with story introductions hidden.'}</p>${button('Read the invitation', 'invitation')}${button('View prologue', 'film')}${['dossier', 'binary', 'trail', 'lightup', 'network', 'witness'].includes(r.family) ? `<p><a href="#/library/${r.family}">Browse related puzzles</a></p><p class="small">The collection keeps its own progress.</p>` : ''}</aside>`;
  }
  function mapPage() {
    const visible = W.rooms.filter(
      (r) => r.implemented && (r.id !== 'west-stair' || E.has(state, 'inference')),
    );
    return `<div class="layout"><section class="scene" aria-label="Castle grounds">${Art.estate(era, E.has(state, 'inference'))}<div class="scene-title"><span class="eyebrow">${era === '1911' ? 'Archive layer · fictional 1911 survey' : 'Your visit'}</span><h1>Wrenmere Castle</h1><p>Choose a room on the grounds, or use the directory below.</p></div>${visible.map((r) => button(String(r.number).padStart(2, '0'), 'select', r.id, `class="pin" style="left:${r.x}%;top:${r.y}%" aria-label="${escape(r.name)}, ${E.roomStatus(state, r).open ? 'open' : 'clue required'}" aria-pressed="${selected === r.id}"`)).join('')}<div class="scene-controls"><div class="row">${button('Today', 'era', 'today', `aria-pressed="${era === 'today'}"`)}${button('1911 survey', 'era', '1911', `aria-pressed="${era === '1911'}"`)}</div>${link('All rooms', 'directory')}</div></section>${rail(room())}</div><section class="page"><h2>Open doors</h2><div class="directory">${visible.map(roomCard).join('')}</div><details><summary>Survey description</summary><p>The 1911 survey records a footpath through the orchard and a service stair behind the study. Neither appears on the later plan. This view supplies their text description; its reused painting is not an architectural reconstruction.</p></details></section>`;
  }
  function roomPage() {
    const r = room();
    return `<div class="layout"><section class="scene transition" aria-label="${escape(r.name)} interior">${Art.interior(r, era)}<div class="scene-title"><span class="eyebrow">${escape(r.wing)}</span><h1>${escape(r.name)}</h1></div><div class="scene-controls">${link('Return to the grounds', 'map')}${button('Notebook', 'notebook')}</div></section>${rail(r)}</div><section class="castle-objects" aria-label="Room details"><p>On a closer look<small>Optional observations. No points or hidden timer.</small></p>${roomObjects(
      r.id,
    )
      .map((object) => button(escape(object.title), 'object', object.id))
      .join('')}</section>`;
  }
  function museumPage() {
    return `<section class="page"><span class="eyebrow">The Quiet Wing</span><h1>The Museum of Questions</h1><p>Try the objects at the tables. Their labels explain where the questions came from, and which parts we have reconstructed.</p><div class="directory">${W.exhibits.map((x, i) => `<article class="card"><div class="exhibit-diagram" aria-hidden="true">${['N ⟷ I ⟷ E', '4 · 9 · 2', '◆ ◇ ◆ ◇'][i]}</div><span class="eyebrow">${escape(x.era)}</span><h2>${escape(x.title)}</h2><p>${escape(x.summary)}</p><p class="tag">${E.has(state, x.puzzle) ? 'Explored' : escape(x.method)}</p>${button('Examine the object', 'exhibit', x.id)}</article>`).join('')}</div><p class="small" style="margin-top:25px">Completing Bridges or Lo Shu also opens the Map Room. The fair-dice activity is a modern model, not a reconstruction of the complete Royal Game of Ur.</p>${button('Visit the conservatory', 'visit', 'conservatory')}</section>`;
  }
  function notebook() {
    return `<section class="page"><div class="row"><h1>Castle notebook</h1>${button('Export castle save', 'export')}</div><p class="small">This export contains Wrenmere Chapter I only. It does not include the Cabinet, Club, challenge, garden, companion or realm saves. Castle import is not available in this first integration.</p><label for="notes">Your notes</label><textarea id="notes" maxlength="12000" placeholder="What have you established? What still needs checking?">${escape(state.notes)}</textarea><p class="small" id="notes-count">${state.notes.length} / 12,000 characters</p><h2>Collected records</h2><div class="directory">${
      state.preferences.story
        ? E.evidence(state)
            .map(
              (x) =>
                `<article class="card evidence"><small>${escape(x.kind)} · ${escape(x.from)}</small><h3>${escape(x.title)}</h3><p>${escape(x.text)}</p><p><em>${escape(x.question)}</em></p></article>`,
            )
            .join('') || '<p>The library is a useful place to start looking.</p>'
        : '<p>Story records are hidden. Turn the story back on in Preferences to read them.</p>'
    }</div></section>`;
  }
  function directory() {
    const rooms = W.rooms.filter(
      (r) =>
        (filter === 'all' || r.wing === filter) &&
        `${r.name} ${r.line}`.toLowerCase().includes(search.toLowerCase()),
    );
    return `<section class="page"><h1>Room directory</h1><p>Ten locations are open in this chapter. The other twenty-two entries describe later work; they have no hidden unlock condition in this build.</p><div class="filters"><label>Find a room<input id="search" type="search" value="${escape(search)}"></label><label>Wing<select id="filter"><option value="all">Every wing</option>${[...new Set(W.rooms.map((r) => r.wing))].map((w) => `<option ${filter === w ? 'selected' : ''}>${escape(w)}</option>`).join('')}</select></label></div><p class="small" id="results-count">${rooms.length} rooms</p><div class="directory" id="room-results">${rooms.map(roomCard).join('')}</div></section>`;
  }
  return { roomCard, mapPage, roomPage, museumPage, notebook, directory };
}
