// Experimental escape rooms inside the Castle (#467). Built as its own lazily imported module so
// the Castle script never carries room sources. Session-only: rooms, drafts and hint stages live in
// this module until reload; nothing touches the Castle save or any other Alibi store (#442).
import { createEscapeHost, roomMarkup, inspectorMarkup } from './escape-room.mjs';
import { escape, button } from './html.mjs';
import tidekeeper from '../../content/escape-rooms/tidekeeper-workshop.json' with { type: 'json' };
import printmaker from '../../content/escape-rooms/printmaker-cabinet.json' with { type: 'json' };
import moonseed from '../../content/escape-rooms/moonseed-conservatory.json' with { type: 'json' };
import herbarium from '../../content/escape-rooms/herbarium-lift.json' with { type: 'json' };
import counterweight from '../../content/escape-rooms/counterweight-loft.json' with { type: 'json' };
import clockmaker from '../../content/escape-rooms/clockmaker-rehearsal.json' with { type: 'json' };

const ROOMS = [tidekeeper, printmaker, moonseed, herbarium, counterweight, clockmaker];
const BASE = '#/quiet/castle/case/escape';
const LEVELS = ['Orientation', 'Constraint', 'Method'];
const NOTICE =
  'Experimental. Untimed. Escape progress is not saved yet: it lasts until you reload or close Alibi.';
const host = createEscapeHost(ROOMS);
const drafts = new Map(); // answer handle -> unsent text
const hints = new Map(); // action handle -> hint stages shown
const started = new Set();

// The Castle owns the route, dialog (show/close) and focus return; this owns only its controls.
export function mount({ root, store, show, close }) {
  const shadow = root.getRootNode();
  const abort = new AbortController();
  const id = location.hash.split('/')[5];
  const source = ROOMS.find((r) => r.id === id);
  const story = () => store.state.preferences.story !== false;
  let token = source ? host.enter(source.id) : host.enter(null),
    inspecting = null,
    message = '';
  const view = () => host.view(story());
  const $ = (selector) => root.querySelector(selector);

  // Castle marks nav links by view, which would name the case; this route is the escape link.
  function markNav() {
    for (const a of shadow.querySelectorAll('header nav a'))
      if (a.hash === BASE) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
  }
  function say(text) {
    message = text;
    const live = shadow.querySelector('#castle-live');
    if (live) live.textContent = text;
  }
  function list() {
    return `<section class="page escape-player"><p class="eyebrow">Experimental · escape rooms</p><h1 tabindex="-1">Escape rooms</h1><p>${NOTICE}</p><p>Six original fictional rooms, separate from Wrenmere Chapter I. Every object and action is a labelled button. Difficulty has not been calibrated with players.</p><ul class="escape-rooms">${ROOMS.map(
      (r) =>
        `<li><a href="${BASE}/${escape(r.id)}">${escape(r.title)}</a> <small>${started.has(r.id) ? 'Visited this session' : 'Not started'}</small></li>`,
    ).join('')}</ul></section>`;
  }
  function roomPage(v) {
    const text = story() ? 'storyOn' : 'storyOff';
    return `<section class="page escape-player"><p class="eyebrow">Experimental escape room · revision ${escape(source.revision)}</p><h1 tabindex="-1">${escape(v.title)}</h1><p>${NOTICE}</p><p>${escape(source.intro[text])}</p><p class="status" role="status" aria-live="polite" data-escape-status>${escape(message)}</p>${v.won ? `<h2>Room complete</h2><p>${escape(source.ending[text])}</p>` : ''}${roomMarkup(v)}<div class="actions">${button('Undo', 'escape-undo', '', `data-escape-route="${token}"${v.undoDepth ? '' : ' disabled'}`)}${button('Restart room', 'escape-restart', '', `data-escape-route="${token}"`)}<a href="${BASE}">All escape rooms</a></div></section>`;
  }
  function inspector(v, objectId) {
    const body = inspectorMarkup(v, objectId);
    if (!body) return '';
    const o = v.objects.find((entry) => entry.id === objectId);
    // Help covers only the actions this object offers now; stages persist for the session only.
    const help = o.actions
      .filter((a) => a.hints.length)
      .map((a) => {
        const shown = hints.get(a.handle) || 0;
        return `<section aria-label="Help: ${escape(a.label)}"><h3>Help: ${escape(a.label)}</h3>${a.hints
          .slice(0, shown)
          .map((h, i) => `<p>${LEVELS[i] || 'Hint'}: ${escape(h)}</p>`)
          .join(
            '',
          )}${shown < a.hints.length ? button(`Hint ${shown + 1} of ${a.hints.length}`, 'escape-hint', a.handle, `data-escape-route="${token}"`) : '<p>All hints shown.</p>'}</section>`;
      })
      .join('');
    return `${body}<p class="small" role="status" data-escape-status>${escape(message)}</p>${help}`;
  }
  function restoreDrafts() {
    for (const input of shadow.querySelectorAll('[data-escape-answer]'))
      input.value = drafts.get(input.dataset.escapeAnswer) || '';
  }
  // Redraw both representations, then put focus back on the equivalent control when it remains.
  function draw(focus) {
    if (abort.signal.aborted) return;
    const v = source && view();
    root.innerHTML = `<style>.escape-player .escape-rooms{list-style:none;padding:0}.escape-player li a,.escape-player .actions a{display:inline-flex;align-items:center;min-height:44px}.escape-room article{margin:0 0 18px}.escape-room h3 button{font:inherit}.escape-player ul ul{padding-left:18px}.escape-player label{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center}.escape-player .status:empty{display:none}</style>${v ? roomPage(v) : list()}`;
    markNav();
    const dialog = shadow.querySelector('dialog');
    if (inspecting && v) {
      const body = inspector(v, inspecting);
      const o = v.objects.find((entry) => entry.id === inspecting);
      if (!body) {
        // The object is no longer visible, so its controls are gone; Castle returns focus to main.
        inspecting = null;
        close();
      } else if (dialog?.open) {
        show(o.n, body);
      }
    }
    restoreDrafts();
    const scope = inspecting && dialog?.open ? dialog : root;
    const target =
      focus &&
      [...scope.querySelectorAll('[data-do]')].find(
        (el) => el.dataset.do === focus.do && el.dataset.value === focus.value && !el.disabled,
      );
    if (target) target.focus({ preventScroll: true });
    else if (focus && scope === root)
      // The action is no longer offered: fall back to its object, then the room heading.
      (
        $(
          `[data-do="escape-object"][data-value="${CSS.escape(focus.value.split('/')[1] || '')}"]`,
        ) || $('h1')
      )?.focus({ preventScroll: true });
  }
  function act(target) {
    const { escapeRoute: route, value: handle } = target.dataset;
    const input = target.closest('li')?.querySelector('[data-escape-answer]');
    const result = host.act(route, handle, input ? input.value : null);
    if (result.ok) drafts.delete(handle);
    say(result.ok && view().won ? 'Room complete. Nothing was saved.' : result.message);
    draw({ do: 'escape-act', value: handle });
  }
  function click(event) {
    const target = event.target.closest?.('[data-do]');
    const name = target?.dataset.do;
    if (!name?.startsWith('escape-') || !root.isConnected) return;
    // Every control names the visit that rendered it; a stale one is refused by the host.
    if (target.dataset.escapeRoute !== String(token)) {
      say('That is not available here now. Room unchanged.');
      return;
    }
    const value = target.dataset.value;
    if (name === 'escape-object') {
      inspecting = value;
      message = '';
      const body = inspector(view(), value);
      if (body) show(view().objects.find((o) => o.id === value).n, body);
      restoreDrafts();
    } else if (name === 'escape-act') act(target);
    else if (name === 'escape-hint') {
      hints.set(value, Math.min(3, (hints.get(value) || 0) + 1));
      say('Hint shown. The room is unchanged.');
      draw({ do: 'escape-hint', value });
      if (!shadow.querySelector('dialog')?.contains(shadow.activeElement))
        shadow.querySelector('dialog .close')?.focus();
    } else if (name === 'escape-undo') {
      say(host.undo(token) ? 'Last action undone.' : 'Nothing to undo.');
      draw({ do: 'escape-undo', value: '' });
      if (!$('[data-do="escape-undo"]:not(:disabled)')) $('h1').focus();
    } else if (name === 'escape-restart') {
      show(
        'Restart this room?',
        `<p>This clears this room's actions, answers in progress, hints and undo history. Other rooms are unchanged. Nothing is saved either way.</p>${button('Restart room', 'escape-restart-confirm', '', `data-escape-route="${token}"`)}`,
      );
    } else if (name === 'escape-restart-confirm') {
      host.restart(token);
      for (const map of [drafts, hints])
        for (const key of [...map.keys()]) if (key.startsWith(`${source.id}@`)) map.delete(key);
      say('Room restarted.');
      inspecting = null;
      close();
      draw();
      $('h1').focus();
    }
  }
  function input(event) {
    const handle = event.target.dataset?.escapeAnswer;
    if (handle) drafts.set(handle, event.target.value.slice(0, 64));
  }
  function key(event) {
    if (event.key !== 'Enter' || !event.target.dataset?.escapeAnswer) return;
    event.preventDefault();
    event.target.closest('li')?.querySelector('[data-do="escape-act"]')?.click();
  }
  const options = { signal: abort.signal };
  shadow.addEventListener('click', click, options);
  shadow.addEventListener('input', input, options);
  shadow.addEventListener('keydown', key, options);
  // Castle closes its dialog through its own close(); forget the inspected object when it does.
  shadow.querySelector('dialog')?.addEventListener(
    'close',
    () => {
      inspecting = null;
      markNav();
    },
    options,
  );
  if (source) started.add(source.id);
  draw();
  return {
    refresh: () => draw(),
    dispose() {
      abort.abort();
      token = null;
    },
  };
}
