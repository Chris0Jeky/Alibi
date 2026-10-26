// Adapter from a validated postern-escape-1 room to the Castle inspector's object shape (#467).
// Memory-only: #442 owns persistence and #433 delivery, so the Castle entry does not import this.
import Session from '../../tools/escape-session.cjs';
import { escape, button } from './html.mjs';

const HELD = 'held';
const MESSAGES = {
  applied: 'Done.',
  unchanged: 'Already in that position. Room unchanged.',
  incorrect: 'That answer does not fit. Room unchanged; your draft is kept.',
  invalid: 'Use an answer of at most 64 characters. Room unchanged.',
  mechanism: 'The mechanism did not engage. Room unchanged; inspect the current setup.',
  locked: 'That is not available here now. Room unchanged.',
  stale: 'That is not available here now. Room unchanged.',
  complete: 'This room is already complete.',
};

// One room session. A handle names room@revision/object/action, so a control rendered for another
// room or source revision, or for an object or action no longer offered, changes nothing.
export function createEscapeAdapter(source) {
  const session = Session.createRoomSession(source);
  const room = source.id;
  const revision = source.revision;
  const title = source.title;
  const scope = `${room}@${revision}`;
  // A portable item is a location variable that can be held; one variable is one physical item.
  const items = source.variables.filter((v) => v.values.includes(HELD)).map((v) => v.id);
  function view(storyOn = true) {
    const v = session.view(storyOn);
    const state = session.state();
    return {
      room,
      revision,
      title,
      won: v.won,
      undoDepth: session.undoDepth(),
      inventory: items.filter((id) => state[id] === HELD),
      // n/t/a match objects-runtime, so appendObservation keeps working unchanged.
      objects: v.objects.map((o) => ({
        id: o.id,
        room,
        n: o.title,
        t: o.text,
        a: 1,
        observations: o.observations,
        actions: o.actions.map((a) => ({
          handle: `${scope}/${o.id}/${a.id}`,
          label: a.label,
          input: a.input,
        })),
      })),
    };
  }
  function act(handle, input = null) {
    const parts = typeof handle === 'string' ? handle.split('/') : [];
    const offered =
      parts.length === 3 &&
      parts[0] === scope &&
      session
        .view(true)
        .objects.some((o) => o.id === parts[1] && o.actions.some((a) => a.id === parts[2]));
    const code = offered ? session.attempt(parts[2], input).code : 'stale';
    return { ok: code === 'applied', code, message: MESSAGES[code] };
  }
  return { room, view, act, undo: session.undo, restart: session.restart };
}

// Rooms keep their own sessions across navigation. Each enter() issues a new token; a control
// rendered before the latest route change is refused, so A/B/A cannot commit an older A action.
export function createEscapeHost(sources) {
  const rooms = new Map(sources.map((s) => [s.id, createEscapeAdapter(s)]));
  let current = null,
    token = 0;
  return {
    enter(id) {
      current = rooms.get(id) || null;
      return ++token;
    },
    view(storyOn) {
      const view = current?.view(storyOn);
      return view ? { ...view, routeToken: token } : null;
    },
    act(issued, handle, input) {
      // DOMStringMap values are strings; accept the exact current token in either representation.
      if (
        (issued !== token && !(typeof issued === 'string' && issued === String(token))) ||
        !current
      )
        return { ok: false, code: 'stale', message: MESSAGES.stale };
      return current.act(handle, input);
    },
  };
}

function routeAttribute(view) {
  return view.routeToken == null ? '' : `data-escape-route="${escape(view.routeToken)}"`;
}

function actionMarkup(a, route) {
  if (!a.input) return `<li>${button(escape(a.label), 'escape-act', a.handle, route)}</li>`;
  const attrs = [route, `aria-label="Try answer: ${escape(a.label)}"`].filter(Boolean).join(' ');
  const inputRoute = route ? ` ${route}` : '';
  return `<li><label>${escape(a.label)} <input data-escape-answer="${escape(a.handle)}"${inputRoute} maxlength="64" autocomplete="off" spellcheck="false"></label>${button('Try answer', 'escape-act', a.handle, attrs)}</li>`;
}

const inventoryMarkup = (view) =>
  `<p class="escape-inventory" role="status">${view.inventory.length ? `In hand: ${view.inventory.map((id) => escape(id.replace(/-/g, ' '))).join(', ')}` : 'Nothing in hand.'}</p>`;

// List path: every visible object with its current actions, plus a control that opens the
// inspector. The opener's data-do/data-value pair is stable, which Castle's close() uses to return
// focus while the object stays visible.
export function roomMarkup(view) {
  const route = routeAttribute(view);
  return `<section class="castle-objects escape-room" aria-label="${escape(view.title)}">${inventoryMarkup(view)}${view.objects
    .map(
      (o) =>
        `<article><h3>${button(escape(o.n), 'escape-object', o.id, route)}</h3><ul aria-label="Actions for ${escape(o.n)}">${o.actions.map((a) => actionMarkup(a, route)).join('')}</ul></article>`,
    )
    .join('')}</section>`;
}

// Inspector path: the same object's text, current observations and the same action handles.
export function inspectorMarkup(view, id) {
  const o = view.objects.find((entry) => entry.id === id);
  if (!o) return '';
  const route = routeAttribute(view);
  return `<p>${escape(o.t)}</p>${o.observations.map((text) => `<p>${escape(text)}</p>`).join('')}${inventoryMarkup(view)}<ul aria-label="Actions">${o.actions.map((a) => actionMarkup(a, route)).join('')}</ul>${button('Keep a note', 'keep-observation', o.id, route)}`;
}
